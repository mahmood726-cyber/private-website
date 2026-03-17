'use strict';

/**
 * ecg-parser.js — KardiaMobile PDF parser for London Cardiology Clinic
 *
 * Parses the text layer of KardiaMobile PDF exports using pdf-parse.
 * Returns structured ECG record arrays and summary objects for storage
 * and display.
 *
 * All functions are pure (no I/O side effects) for easy unit-testing.
 */

const pdfParse = require('pdf-parse');

// ─── Regex patterns for Kardia PDF text layer ────────────────────────────────

// Kardia classifications (order matters — more specific before less specific)
const RE_CLASSIFICATION = /(Normal Sinus Rhythm|Possible Atrial Fibrillation|Atrial Fibrillation|Sinus Tachycardia|Sinus Bradycardia|Unclassified|No Analysis|Unreadable)/gi;

// Heart rate — e.g. "72 BPM" or "72bpm"
const RE_HEART_RATE = /(\d{2,3})\s*(?:BPM|bpm)/g;

// Date + time — e.g. "Mar 15, 2026 8:30 AM" or "March 15 2026 08:30 AM"
const RE_DATETIME = /([A-Za-z]+ \d{1,2},?\s*\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)/gi;

// Recording duration — e.g. "30 sec" or "30 seconds"
const RE_DURATION = /(\d+)\s*(?:seconds?|sec)/gi;

// ─── parseKardiaPdf ───────────────────────────────────────────────────────────

/**
 * Parse a KardiaMobile PDF buffer and return an array of ECG records.
 *
 * Each record represents one individual recording within the PDF:
 *   {
 *     classification: string,   // e.g. "Normal Sinus Rhythm"
 *     heartRate:      number,   // bpm
 *     recordingTime:  string,   // e.g. "Mar 15, 2026 8:30 AM"
 *     duration:       number    // seconds (default 30 if not found)
 *   }
 *
 * Returns an empty array if no recordings are found rather than throwing,
 * so callers can distinguish "no data" from a hard parse error.
 *
 * @param {Buffer} buffer — Raw PDF file contents
 * @returns {Promise<Array<{classification:string, heartRate:number, recordingTime:string, duration:number}>>}
 */
async function parseKardiaPdf(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new TypeError('parseKardiaPdf: buffer must be a Buffer instance');
  }
  if (buffer.length === 0) {
    throw new Error('parseKardiaPdf: buffer is empty');
  }

  let text;
  try {
    const result = await pdfParse(buffer);
    text = result.text ?? '';
  } catch (err) {
    throw new Error(`parseKardiaPdf: failed to extract PDF text — ${err.message}`);
  }

  if (!text.trim()) {
    // Scanned image PDF with no text layer — return empty, not an error
    return [];
  }

  return _parseKardiaText(text);
}

/**
 * Internal: extract records from the raw PDF text string.
 * Exported for unit testing without needing a real PDF buffer.
 *
 * @param {string} text
 * @returns {Array}
 */
function _parseKardiaText(text) {
  // Reset regex lastIndex (they are module-level with /g)
  RE_CLASSIFICATION.lastIndex = 0;
  RE_HEART_RATE.lastIndex     = 0;
  RE_DATETIME.lastIndex       = 0;
  RE_DURATION.lastIndex       = 0;

  // Collect all matches with their character positions so we can associate
  // classification → nearest HR / date / duration in the text.

  const classifications = _matchesWithPos(RE_CLASSIFICATION, text);
  if (classifications.length === 0) return [];

  const heartRates  = _matchesWithPos(RE_HEART_RATE, text);
  const datetimes   = _matchesWithPos(RE_DATETIME,   text);
  const durations   = _matchesWithPos(RE_DURATION,   text);

  // For each classification, find the nearest preceding or following HR, date,
  // and duration within a reasonable window (2000 chars).
  const WINDOW = 2000;

  return classifications.map((cls) => {
    const hr  = _nearest(heartRates, cls.pos, WINDOW);
    const dt  = _nearest(datetimes,  cls.pos, WINDOW);
    const dur = _nearest(durations,  cls.pos, WINDOW);

    // Reconstruct datetime string from two capture groups
    const recordingTime = dt
      ? `${dt.groups[1].trim()} ${dt.groups[2].trim()}`
      : null;

    return {
      classification: _normaliseClassification(cls.groups[1]),
      heartRate:      hr  ? parseInt(hr.groups[1], 10) : null,
      recordingTime:  recordingTime,
      duration:       dur ? parseInt(dur.groups[1], 10) : 30,
    };
  });
}

// ─── classifyRecording ────────────────────────────────────────────────────────

/**
 * Map a Kardia classification string (and optional HR) to a traffic-light
 * flag level.
 *
 * @param {string} classification — Kardia classification text
 * @param {number} [heartRate]    — Heart rate bpm (used for tachycardia/bradycardia thresholds)
 * @returns {'green'|'amber'|'red'}
 */
function classifyRecording(classification, heartRate) {
  if (!classification || typeof classification !== 'string') return 'amber';

  const c = classification.trim().toLowerCase();

  if (c === 'normal sinus rhythm') return 'green';

  if (c === 'atrial fibrillation' || c === 'possible atrial fibrillation') return 'red';

  if (c === 'sinus tachycardia') {
    // Amber only if HR is actually elevated; default amber if HR unknown
    return (heartRate == null || heartRate > 100) ? 'amber' : 'green';
  }

  if (c === 'sinus bradycardia') {
    // Amber only if HR is actually low; default amber if HR unknown
    return (heartRate == null || heartRate < 50) ? 'amber' : 'green';
  }

  if (c === 'unclassified' || c === 'no analysis' || c === 'unreadable') return 'amber';

  // Unknown classification — treat as amber rather than silently green
  return 'amber';
}

// ─── generateEcgSummary ───────────────────────────────────────────────────────

/**
 * Aggregate an array of parsed ECG records into a summary object.
 *
 * @param {Array} records — Output of parseKardiaPdf()
 * @returns {{
 *   total: number, normal: number, abnormal: number, unclassified: number,
 *   afDetected: boolean, avgHr: number|null, minHr: number|null, maxHr: number|null,
 *   flagLevel: 'green'|'amber'|'red',
 *   flaggedRecordings: Array,
 *   summary: string
 * }}
 */
function generateEcgSummary(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      total:             0,
      normal:            0,
      abnormal:          0,
      unclassified:      0,
      afDetected:        false,
      avgHr:             null,
      minHr:             null,
      maxHr:             null,
      flagLevel:         'green',
      flaggedRecordings: [],
      summary:           'No ECG recordings found.',
    };
  }

  // Annotate each record with its flag level
  const annotated = records.map((r) => ({
    ...r,
    flagLevel: classifyRecording(r.classification, r.heartRate),
  }));

  // Counts
  let normal       = 0;
  let abnormal     = 0;
  let unclassified = 0;
  let afDetected   = false;

  // Classification tallies for summary text
  const classCounts = {};

  for (const r of annotated) {
    const c = (r.classification ?? '').toLowerCase();
    classCounts[r.classification] = (classCounts[r.classification] ?? 0) + 1;

    if (r.flagLevel === 'green') {
      normal++;
    } else if (c === 'unclassified' || c === 'no analysis' || c === 'unreadable') {
      unclassified++;
    } else {
      abnormal++;
    }

    if (c === 'atrial fibrillation' || c === 'possible atrial fibrillation') {
      afDetected = true;
    }
  }

  // HR statistics — exclude null HR values
  const hrs = annotated.map((r) => r.heartRate).filter((h) => h != null && isFinite(h));
  const avgHr = hrs.length > 0 ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null;
  const minHr = hrs.length > 0 ? Math.min(...hrs) : null;
  const maxHr = hrs.length > 0 ? Math.max(...hrs) : null;

  // Overall flag level — worst across all recordings
  const FLAG_ORDER = { green: 0, amber: 1, red: 2 };
  const flagLevel = annotated.reduce((worst, r) => {
    return FLAG_ORDER[r.flagLevel] > FLAG_ORDER[worst] ? r.flagLevel : worst;
  }, 'green');

  const flaggedRecordings = annotated.filter((r) => r.flagLevel !== 'green');

  // Human-readable summary sentence
  const classStrings = Object.entries(classCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cls, count]) => `${count} ${cls}`)
    .join(', ');

  const afText = afDetected ? 'AF detected.' : 'No AF detected.';
  const hrText = avgHr != null
    ? `Avg HR ${avgHr} bpm (${minHr}–${maxHr}).`
    : 'Heart rate data unavailable.';

  const summary = `${classStrings}. ${afText} ${hrText}`;

  return {
    total:   records.length,
    normal,
    abnormal,
    unclassified,
    afDetected,
    avgHr,
    minHr,
    maxHr,
    flagLevel,
    flaggedRecordings,
    summary,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Run a regex with /g flag over text and return an array of
 * { pos: number, groups: RegExpExecArray } objects.
 * Resets lastIndex before and after use.
 */
function _matchesWithPos(re, text) {
  re.lastIndex = 0;
  const results = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push({ pos: m.index, groups: m });
  }
  re.lastIndex = 0;
  return results;
}

/**
 * Find the match in `matches` that is closest to `targetPos`
 * and within `window` characters. Returns null if none found.
 */
function _nearest(matches, targetPos, window) {
  let best     = null;
  let bestDist = Infinity;

  for (const m of matches) {
    const dist = Math.abs(m.pos - targetPos);
    if (dist < bestDist && dist <= window) {
      bestDist = dist;
      best     = m;
    }
  }

  return best;
}

/**
 * Normalise classification string to title-case canonical form.
 * Handles variations in capitalisation from different Kardia firmware versions.
 */
function _normaliseClassification(raw) {
  if (!raw) return 'Unclassified';

  const map = {
    'normal sinus rhythm':           'Normal Sinus Rhythm',
    'possible atrial fibrillation':  'Possible Atrial Fibrillation',
    'atrial fibrillation':           'Atrial Fibrillation',
    'sinus tachycardia':             'Sinus Tachycardia',
    'sinus bradycardia':             'Sinus Bradycardia',
    'unclassified':                  'Unclassified',
    'no analysis':                   'No Analysis',
    'unreadable':                    'Unreadable',
  };

  return map[raw.trim().toLowerCase()] ?? raw.trim();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  parseKardiaPdf,
  classifyRecording,
  generateEcgSummary,
  // Exported for unit testing
  _parseKardiaText,
};
