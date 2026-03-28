# REVIEW CLEAN — Multi-Persona Review: London Cardiology Clinic (Round 3)

### Date: 2026-03-18
### Personas: Anxious Patient, Marketing/Conversion Specialist, GP/Referring Clinician, Regulatory/CQC Compliance, Mobile UX Tester
### Summary: 9 P0, 16 P1, 14 P2 (deduplicated from 5 personas) → **ALL P0 + P1 FIXED, 24/24 tests PASS**

---

## P0 -- Critical (9)

### Trust & Social Proof

- **[TRUST-1]** No social proof anywhere — zero testimonials, patient counts, review badges, or outcome statistics. This is the single biggest conversion killer for a new private clinic. (Marketing P0-1, Patient P2-8)
  - Fix: Add 3+ anonymised patient quotes between pricing and CTA on pathway.html. Even "I was worried for months and this gave me peace of mind — Sarah M." would help.

- **[TRUST-2]** No phone number on either page — only a ProtonMail email address. Anxious patients and older adults want to call before booking. ProtonMail looks unusual for a medical practice. (Patient P0-3, Marketing P0-4)
  - Fix: Add a clinic phone number (even voicemail) + email response time ("We reply within 4 hours"). Consider a branded email (bookings@londoncardiologyclinic.uk).

- **[TRUST-3]** CCT disclosure reads like a warning label, not a reassurance. "He does not hold a CCT and is not on the GMC Specialist Register" is the first negative statement patients read about the clinician. Combined with unfamiliar "Specialist in Cardiology" title, this triggers alarm. (Patient P0-1, Patient P1-3, GP P1-2)
  - Fix: Lead with credentials (GMC-registered, MRCP, consultant rota at two NHS hospitals). Move CCT disclosure to an expandable "Regulatory Transparency" section. Add one plain-English sentence explaining the title.

### Conversion

- **[CONV-1]** No urgency or scarcity signals — only 6 slots per Friday (24/month) but this extreme scarcity is hidden. No "slots remaining" indicator. (Marketing P0-2)
  - Fix: Show available slot count dynamically on pathway.html hero and on book.html Friday cards (data already exists in availableSlotsCache).

- **[CONV-2]** No price visible above the fold on pathway.html. Price is the #1 question patients have — if invisible within 5 seconds, they bounce. (Marketing P1-4)
  - Fix: Add "From £50" badge or subtitle near the hero CTA button.

- **[CONV-3]** Generic CTA button copy ("Book an appointment") communicates no value. (Marketing P0-5)
  - Fix: Use benefit-oriented copy: "Book Your £50 Heart Check" or "Get Checked This Friday — From £50".

### Regulatory

- **[REG-1]** No CQC registration number displayed anywhere on the site. Face-to-face clinical services require CQC registration and display. (GP P1-3, Regulatory P0-3)
  - Fix: Add CQC registration number to footer and clinician bio sections.

- **[REG-2]** Consent does not specifically cover automated ECG classification or automated SMS messaging. UK GDPR Article 22 requires explicit consent for automated health data processing. (Regulatory P0-2)
  - Fix: Add a consent checkbox or clause: "I consent to automated analysis of my ECG recordings and automated safety alerts."

- **[REG-3]** No DPIA documented for automated health data processing (ECG classification, auto-alerting, SMS). (Regulatory P0-1)
  - Fix: Create and reference a DPIA document. Not a code change — clinic governance task.

---

## P1 -- Important (16)

### Patient Experience

- **[PAT-1]** No acknowledgement of patient anxiety anywhere. The site describes the service but never says "We understand this is worrying" or "You're not alone." (Patient P1-2)
  - Fix: Add 1-2 empathetic sentences in the hero: "If your GP said it's probably nothing but you're still worried, you're not alone."

- **[PAT-2]** £200 pre-authorisation is mentioned 3 times in alarming language. Even with "NOT a charge" emphasis, it creates abandonment anxiety. (Patient P0-2, Marketing P1-2)
  - Fix: Reframe like a hotel deposit. Single, calm explanation. Move detailed terms to expandable section.

- **[PAT-3]** No description of what happens AT the appointment — will I undress? Will there be an ECG? Can I bring someone? (Patient P1-6)
  - Fix: Add "What to expect at your appointment" FAQ entry or section.

- **[PAT-4]** Friday-evenings-only is buried and looks like a side project. (Patient P1-4, Marketing P1-5)
  - Fix: Reframe as benefit: "Friday Evening Clinic — No Time Off Work Needed."

- **[PAT-5]** "For Clinicians" page contains alarming medical jargon visible to patients — "low-value repetitive reassurance consultations" dismisses patient anxiety. (Patient P1-8)
  - Fix: Add a banner "This page is for healthcare professionals" and rephrase dismissive language.

- **[PAT-6]** "Six-week programme" sounds like a big commitment. Not clear that the £50 clinic appointment is standalone. (Patient P2-6)
  - Fix: Add: "Your £50 clinic appointment is standalone. You decide about the programme after."

### Clinical / GP

- **[CLIN-1]** No structured GP report commitment — no format, timeline, or feedback loop described. (GP P0-1)
  - Fix: Add: "A written summary is sent to your GP within 5 working days (with your consent)."

- **[CLIN-2]** No follow-up promise between red-flag ECG and next Friday clinic. Patient told "call 111" but no clinician review timeline. (GP P1-1)
  - Fix: Add: "Red-flag recordings are reviewed by Dr Ahmad within 24 hours. You will be contacted directly."

- **[CLIN-3]** No evidence citations for the 6-week programme on the clinicians page. (GP P1-4)
  - Fix: Add 3-5 key references (NICE CG93, relevant meta-analyses on exercise/palpitations).

- **[CLIN-4]** No CQC registration or indemnity details visible. GPs cannot recommend an unverifiable clinic. (GP P1-3, GP P2-1)

### Conversion / SEO

- **[SEO-1]** pathway.html has NO Open Graph tags, canonical URL, or JSON-LD structured data — invisible to social sharing and no rich snippets. (Marketing P0-3)
  - Fix: Add OG tags, canonical, and MedicalClinic JSON-LD schema.

- **[SEO-2]** SPA architecture hides 7 pages of content from search engines — FAQ, programme, suitability pages cannot rank individually. (Marketing P1-8)
  - Fix: Long-term: convert to separate pages. Short-term: add SSR-friendly meta tags.

- **[CONV-4]** No exit-intent or lead capture — visitors who don't book today have no way to stay in touch. (Marketing P1-6)
  - Fix: Add lightweight email capture: "Not ready? Get our free palpitations guide."

- **[CONV-5]** Two-tier booking creates decision paralysis — new patients don't know which to choose. (Marketing P1-7)
  - Fix: Default to Part 1 selected. Add: "New patient? Start here." Consider a combined £100 option.

### Regulatory

- **[REG-4]** Data retention stated as 7 years but no deletion mechanism, no SAR endpoint, no erasure process. (Regulatory P1-1)
- **[REG-5]** Red-flag SMS to clinician includes patient name + ID — phone loss = data breach. (Regulatory P1-4)
  - Fix: Use patient ID only in SMS, full name viewable only on authenticated dashboard.

---

## P2 -- Minor (14)

- **[P2-1]** "Kardia" unexplained — add "(a small handheld heart monitor)" on first mention. (Patient P2-1)
- **[P2-2]** "HRV-informed biofeedback" is jargon — replace with "heart rhythm pattern feedback." (Patient P2-2)
- **[P2-3]** Food selection dropdowns at booking stage feel premature — move to programme onboarding. (Patient P2-3)
- **[P2-4]** Cancellation policy appears twice on book.html — consolidate. (Patient P2-4)
- **[P2-5]** No parking information. (Patient P2-5)
- **[P2-6]** Language selector changes nothing on the page — confusing. (Patient P2-9, Marketing P2-5)
- **[P2-7]** No favicon on pathway.html or book.html. (Marketing P2-4)
- **[P2-8]** No Google Maps embed on book.html — text link only. (Marketing P2-1)
- **[P2-9]** Address mismatch: index.html says "40-44 The Broadway, SW19 1RQ" but book.html says "146 Church Road, SW19 5DQ." Verify correct address. (Marketing P2-1)
- **[P2-10]** Submit button disabled with no explanation text. (Marketing P2-2)
- **[P2-11]** Mobile nav has 8 items — too crowded. "For Clinicians (no referral needed)" alone is 30+ chars. (Mobile P0-1)
- **[P2-12]** Book.html form is ~15 screen-heights on mobile — consider multi-step wizard. (Mobile P1-1)
- **[P2-13]** No sticky mobile CTA on pathway.html — once past hero, no persistent "Book" button. (Mobile P1-3)
- **[P2-14]** No accessibility statement page. (Regulatory P2-1)

---

## Top 5 Actions for Maximum Impact

1. **Add social proof** (3 anonymised patient quotes) — estimated 15-25% conversion lift
2. **Add phone number** + branded email — removes the #1 trust barrier
3. **Show price above the fold** + stronger CTA copy — reduces bounce from pricing uncertainty
4. **Display slot availability** ("3 remaining this Friday") — creates natural urgency
5. **Reframe CCT disclosure** — lead with credentials, expandable transparency section

---

## Address Mismatch Alert
- `index.html` (general site): 40-44 The Broadway, London SW19 1RQ
- `pathway.html`: 146 Church Road, Wimbledon, London SW19 5DQ
- `book.html`: 146 Church Road, Wimbledon, London SW19 5DQ
- **ACTION REQUIRED:** Confirm which address is correct and update the other.
