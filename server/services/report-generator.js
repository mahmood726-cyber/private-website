'use strict';

/**
 * report-generator.js — Auto-generate patient reports for London Cardiology Clinic
 *
 * Produces structured report objects consumed by:
 *   - The admin dashboard (display + PDF export)
 *   - The email service (narrative text)
 *   - The patient portal (progress view)
 *
 * All functions are pure (no database or network I/O) for easy unit-testing.
 *
 * BP thresholds follow NICE NG136 home blood pressure measurement guidelines.
 *
 * Cardiovascular health benefit estimates cite:
 *   Banach M et al. (2023) "Steps for cardiovascular health" — ~15% reduction
 *   in cardiovascular health per additional 1,000 steps/day (up to ~7,000 steps).
 */

// ─── generateWeek1Report ──────────────────────────────────────────────────────

/**
 * Generate a Week 1 (monitoring phase) report combining ECG and BP data.
 *
 * @param {object} patient     — Row from the patients table
 * @param {object} ecgSummary  — Output of ecg-parser.generateEcgSummary()
 * @param {Array}  bpReadings  — Array of { systolic, diastolic, date } objects
 *                               from daily_logs (bp_systolic / bp_diastolic)
 * @returns {{
 *   flagLevel: string,
 *   title: string,
 *   sections: { ecg: object, bp: object },
 *   narrative: string,
 *   recommendations: string[]
 * }}
 */
function generateWeek1Report(patient, ecgSummary, bpReadings) {
  if (!patient) throw new Error('generateWeek1Report: patient is required');
  if (!ecgSummary) throw new Error('generateWeek1Report: ecgSummary is required');

  const firstName = _firstName(patient.name);
  const readings  = Array.isArray(bpReadings) ? bpReadings : [];

  // ── ECG section ──────────────────────────────────────────────────────────
  const ecgSection = {
    summary:    ecgSummary.summary  ?? 'No ECG data available.',
    flagged:    ecgSummary.flaggedRecordings ?? [],
    avgHr:      ecgSummary.avgHr   ?? null,
    minHr:      ecgSummary.minHr   ?? null,
    maxHr:      ecgSummary.maxHr   ?? null,
    total:      ecgSummary.total   ?? 0,
    afDetected: ecgSummary.afDetected ?? false,
    flagLevel:  ecgSummary.flagLevel  ?? 'green',
  };

  // ── BP section ───────────────────────────────────────────────────────────
  const bpSection = _buildBpSection(readings);

  // ── Overall flag level — worst of ECG and BP ─────────────────────────────
  const FLAG_ORDER = { green: 0, amber: 1, red: 2 };
  const overallFlag = FLAG_ORDER[ecgSection.flagLevel] >= FLAG_ORDER[bpSection.flagLevel]
    ? ecgSection.flagLevel
    : bpSection.flagLevel;

  // ── Narrative ────────────────────────────────────────────────────────────
  const ecgSentence = ecgSummary.total > 0
    ? `${ecgSummary.total} KardiaMobile ECG${ecgSummary.total === 1 ? '' : 's'} reviewed over 7 days. ` +
      (ecgSummary.afDetected
        ? 'Atrial fibrillation or possible AF detected — cardiology review recommended.'
        : 'No atrial fibrillation detected.')
    : 'No KardiaMobile ECG recordings were submitted during Week 1.';

  const bpSentence = readings.length > 0
    ? `Average home BP ${bpSection.average ?? 'unavailable'} (${bpSection.classification}).`
    : 'No BP readings were submitted during Week 1.';

  const narrative = `${ecgSentence} ${bpSentence}`;

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = _week1Recommendations(ecgSection, bpSection, firstName);

  return {
    flagLevel: overallFlag,
    title:     'Week 1 Monitoring Report',
    sections: {
      ecg: ecgSection,
      bp:  bpSection,
    },
    narrative,
    recommendations,
  };
}

// ─── generateWeek7Report ──────────────────────────────────────────────────────

/**
 * Generate a Week 7 (programme completion) lifestyle report.
 *
 * @param {object} patient — Row from the patients table
 * @param {Array}  logs    — All daily_logs rows for this patient
 * @returns {{
 *   flagLevel: string,
 *   title: string,
 *   sections: { steps: object, food: object, completion: object },
 *   narrative: string,
 *   recommendations: string[]
 * }}
 */
function generateWeek7Report(patient, logs) {
  if (!patient) throw new Error('generateWeek7Report: patient is required');

  const firstName = _firstName(patient.name);
  const allLogs   = Array.isArray(logs) ? logs : [];

  // ── Steps section ─────────────────────────────────────────────────────────
  const stepsLogs = allLogs.filter((l) => l.steps != null && isFinite(l.steps));
  const baseline  = patient.baseline_steps ?? null;

  let finalSteps    = null;
  let improvement   = null;
  let healthBenefitText = null;

  if (stepsLogs.length > 0) {
    // Use the median of the last 7 days' step counts as the "final" figure
    const lastWeekLogs = stepsLogs.slice(-7);
    const sorted       = [...lastWeekLogs].sort((a, b) => a.steps - b.steps);
    finalSteps         = sorted[Math.floor(sorted.length / 2)].steps;

    if (baseline != null && baseline > 0) {
      improvement = Math.round(((finalSteps - baseline) / baseline) * 100);
      healthBenefitText = estimateHealthBenefit(finalSteps - baseline);
    }
  }

  const stepsSection = {
    baseline:          baseline,
    final:             finalSteps,
    improvement:       improvement,   // percentage, may be null
    healthBenefit: healthBenefitText, // e.g. "~30%", may be null
  };

  // ── Food section ──────────────────────────────────────────────────────────
  const foodSection = _buildFoodSection(allLogs);

  // ── Completion section ────────────────────────────────────────────────────
  const daysLogged  = new Set(allLogs.map((l) => l.log_date)).size;
  const totalDays   = 42; // 6-week programme
  const rate        = Math.round((daysLogged / totalDays) * 100);

  const completionSection = { daysLogged, totalDays, rate };

  // ── Overall flag level ────────────────────────────────────────────────────
  // Week 7 is a lifestyle report — flag stays green unless completion is very low
  const flagLevel = rate < 40 ? 'amber' : 'green';

  // ── Narrative ────────────────────────────────────────────────────────────
  let narrative = '';

  if (baseline != null && finalSteps != null) {
    const direction = finalSteps >= baseline ? 'increased' : 'decreased';
    narrative += `Over 6 weeks, ${firstName} ${direction} daily steps from ${baseline.toLocaleString()} to ${finalSteps.toLocaleString()}`;
    if (improvement != null) {
      narrative += ` (${improvement > 0 ? '+' : ''}${improvement}%)`;
    }
    narrative += '. ';
  } else if (finalSteps != null) {
    narrative += `${firstName} recorded a final step count of ${finalSteps.toLocaleString()} steps/day. `;
  }

  if (foodSection.adherence != null) {
    narrative += `Food plan adherence averaged ${foodSection.adherence}% across all tracked items. `;
  }

  narrative += `Programme log completion: ${daysLogged}/${totalDays} days (${rate}%).`;

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = _week7Recommendations(stepsSection, foodSection, completionSection);

  return {
    flagLevel,
    title:   'CardioTrack Programme Final Report',
    sections: {
      steps:      stepsSection,
      food:       foodSection,
      completion: completionSection,
    },
    narrative,
    recommendations,
  };
}

// ─── classifyBp ──────────────────────────────────────────────────────────────

/**
 * Classify a single BP reading using NICE NG136 home measurement thresholds.
 *
 * Home BP thresholds differ from clinic thresholds:
 *   Normal:  sys < 135  AND dia < 85
 *   Stage 1: sys 135–149 OR  dia 85–94
 *   Stage 2: sys ≥ 150  OR  dia ≥ 95
 *   Severe:  sys ≥ 180  OR  dia ≥ 110  → RED flag
 *
 * @param {number} systolic
 * @param {number} diastolic
 * @returns {{ classification: string, flagLevel: 'green'|'amber'|'red' }}
 */
function classifyBp(systolic, diastolic) {
  if (!isFinite(systolic) || !isFinite(diastolic)) {
    throw new TypeError('classifyBp: systolic and diastolic must be finite numbers');
  }

  if (systolic >= 180 || diastolic >= 110) {
    return { classification: 'Severe', flagLevel: 'red' };
  }
  if (systolic >= 150 || diastolic >= 95) {
    return { classification: 'Stage 2', flagLevel: 'amber' };
  }
  if (systolic >= 135 || diastolic >= 85) {
    return { classification: 'Stage 1', flagLevel: 'amber' };
  }
  return { classification: 'Normal', flagLevel: 'green' };
}

// ─── calculateBpTrend ─────────────────────────────────────────────────────────

/**
 * Determine the BP trend over a series of readings by comparing the mean of
 * the first third against the mean of the last third (requires ≥ 3 readings).
 *
 * @param {Array<{systolic: number, diastolic: number}>} readings
 * @returns {'improving'|'stable'|'worsening'|'insufficient data'}
 */
function calculateBpTrend(readings) {
  const valid = (Array.isArray(readings) ? readings : [])
    .filter((r) => isFinite(r.systolic) && isFinite(r.diastolic));

  if (valid.length < 3) return 'insufficient data';

  const third = Math.max(1, Math.floor(valid.length / 3));

  const meanSys = (slice) =>
    slice.reduce((s, r) => s + r.systolic, 0) / slice.length;

  const earlyMean = meanSys(valid.slice(0, third));
  const lateMean  = meanSys(valid.slice(-third));
  const delta     = lateMean - earlyMean;

  // ±5 mmHg tolerance before calling a trend
  if (delta < -5) return 'improving';
  if (delta >  5) return 'worsening';
  return 'stable';
}

// ─── estimateHealthBenefit ────────────────────────────────────────────────────

/**
 * Estimate cardiovascular health improvement from an increase in daily step count.
 *
 * Based on: Banach M et al. (2023). "The association between daily step count
 * and all-cause and cardiovascular mortality." European Journal of Preventive
 * Cardiology. https://doi.org/10.1093/eurjpc/zwad230
 *
 * Finding: ~15% cardiovascular health improvement per additional 1,000 steps/day,
 * with gains plateauing around 7,000–8,000 steps/day.
 *
 * Improvement is capped at ~55% (corresponding to ~4,000+ step increase) to
 * avoid overstating benefit beyond what the evidence supports.
 *
 * @param {number} stepIncrease — Additional steps per day vs baseline
 * @returns {string} — e.g. "~30%"
 */
function estimateHealthBenefit(stepIncrease) {
  if (!isFinite(stepIncrease)) return 'N/A';

  if (stepIncrease <= 0) return '~0%';

  // 15% per 1,000 steps, plateau at ~55%
  const RATE_PER_1000 = 15;
  const MAX_IMPROVEMENT = 55;

  const thousands      = stepIncrease / 1000;
  const rawImprovement = Math.round(thousands * RATE_PER_1000);
  const capped         = Math.min(rawImprovement, MAX_IMPROVEMENT);

  return `~${capped}%`;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

/** Extract first name from a full name string. */
function _firstName(fullName) {
  if (!fullName) return 'Patient';
  return fullName.trim().split(/\s+/)[0];
}

/**
 * Build the BP report section from an array of daily log rows.
 *
 * @param {Array} readings — daily_logs rows with bp_systolic / bp_diastolic
 */
function _buildBpSection(readings) {
  const valid = readings.filter(
    (r) => r.bp_systolic != null && r.bp_diastolic != null &&
           isFinite(r.bp_systolic) && isFinite(r.bp_diastolic)
  );

  if (valid.length === 0) {
    return {
      average:        null,
      classification: 'No data',
      trend:          'insufficient data',
      flagged:        [],
      flagLevel:      'green',
      count:          0,
    };
  }

  const avgSys = Math.round(valid.reduce((s, r) => s + r.bp_systolic,  0) / valid.length);
  const avgDia = Math.round(valid.reduce((s, r) => s + r.bp_diastolic, 0) / valid.length);

  const { classification, flagLevel } = classifyBp(avgSys, avgDia);
  const trend = calculateBpTrend(valid.map((r) => ({
    systolic:  r.bp_systolic,
    diastolic: r.bp_diastolic,
  })));

  const flagged = valid
    .map((r) => ({ ...r, ...classifyBp(r.bp_systolic, r.bp_diastolic) }))
    .filter((r) => r.flagLevel !== 'green');

  return {
    average:        `${avgSys}/${avgDia}`,
    classification,
    trend,
    flagged,
    flagLevel,
    count:          valid.length,
  };
}

/**
 * Build the food adherence section from all daily log rows.
 *
 * food_stop_* columns: 1 = avoided (good), 0 = ate it (bad)
 * food_start_* columns: 1 = ate it (good), 0 = didn't eat (bad)
 */
function _buildFoodSection(logs) {
  const _adherence = (col, goodValue) => {
    const relevant = logs.filter((l) => l[col] != null);
    if (relevant.length === 0) return null;
    const successes = relevant.filter((l) => l[col] === goodValue).length;
    return Math.round((successes / relevant.length) * 100);
  };

  const stopFood1  = _adherence('food_stop_1',  1);
  const stopFood2  = _adherence('food_stop_2',  1);
  const startFood1 = _adherence('food_start_1', 1);
  const startFood2 = _adherence('food_start_2', 1);

  // Overall adherence = mean of all non-null adherence values
  const allValues = [stopFood1, stopFood2, startFood1, startFood2].filter((v) => v != null);
  const overall   = allValues.length > 0
    ? Math.round(allValues.reduce((s, v) => s + v, 0) / allValues.length)
    : null;

  return {
    adherence:          overall,
    stopFood1Adherence: stopFood1,
    stopFood2Adherence: stopFood2,
    startFood1Adherence: startFood1,
    startFood2Adherence: startFood2,
  };
}

/**
 * Build Week 1 recommendation list based on ECG and BP results.
 */
function _week1Recommendations(ecgSection, bpSection, firstName) {
  const recs = [];

  if (ecgSection.afDetected) {
    recs.push('Urgent cardiology review for detected atrial fibrillation episodes');
  }

  if (ecgSection.flagLevel === 'amber') {
    recs.push('Review flagged ECG recordings with your clinician');
  }

  if (bpSection.flagLevel === 'red') {
    recs.push('Urgent GP review for severely elevated blood pressure');
  } else if (bpSection.flagLevel === 'amber') {
    recs.push('GP review for blood pressure management');
  }

  if (bpSection.trend === 'worsening') {
    recs.push('Repeat BP monitoring — readings show a worsening trend during the monitoring week');
  }

  if (recs.length === 0) {
    recs.push('Continue monitoring — all Week 1 readings within normal parameters');
  }

  recs.push('Proceed to 6-week CardioTrack lifestyle programme');

  return recs;
}

/**
 * Build Week 7 recommendation list based on steps, food, and completion.
 */
function _week7Recommendations(stepsSection, foodSection, completionSection) {
  const recs = [];

  if (stepsSection.improvement != null && stepsSection.improvement >= 20) {
    recs.push('Continue current activity levels — excellent step count improvement achieved');
  } else if (stepsSection.improvement != null && stepsSection.improvement > 0) {
    recs.push('Continue to build on step count progress');
  } else if (stepsSection.improvement != null && stepsSection.improvement <= 0) {
    recs.push('Consider structured walking programme to increase daily activity');
  }

  if (foodSection.adherence != null && foodSection.adherence >= 80) {
    recs.push('Continue current lifestyle changes — strong food plan adherence');
  } else if (foodSection.adherence != null && foodSection.adherence < 60) {
    recs.push('Review food plan with a dietitian to improve adherence');
  }

  if (completionSection.rate < 70) {
    recs.push('Incomplete programme data — consider a follow-up monitoring period');
  }

  recs.push('Consider GP follow-up for ongoing cardiovascular risk monitoring');

  return recs;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  generateWeek1Report,
  generateWeek7Report,
  classifyBp,
  calculateBpTrend,
  estimateHealthBenefit,
};
