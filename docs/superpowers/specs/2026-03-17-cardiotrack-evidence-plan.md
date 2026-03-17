# CardioTrack Programme — Evidence-Based Design

## Research Summary

### 1. Text Message Reminders (STRONG EVIDENCE)
- **+14.2 percentage points** medication adherence improvement over usual care (RCT, JMIR 2017)
- **+4.2 extra exercise days/month** with text reminders (same RCT)
- Community Preventive Services Task Force **recommends** text messaging for chronic disease adherence
- **Optimal frequency**: 1-2x daily for lifestyle, timed to meals/exercise windows
- **Optimal timing**: Morning (7:30am — set intentions) + evening (6pm — prompt action)
- **Key finding**: Effects diminish after intervention ends — must build habits, not just remind
- **Content matters**: Motivation + education + social support > simple reminders alone

**Source**: [PMC5561384](https://pmc.ncbi.nlm.nih.gov/articles/PMC5561384/), [Cochrane](https://www.cochrane.org/CD011851/VASC_can-text-message-reminders-help-people-heart-disease-take-their-medications-regularly)

### 2. Step Count Targets (STRONG EVIDENCE)
- **Every 1,000 extra steps/day → 15% lower all-cause mortality** (meta-analysis, 227K participants)
- **Every 500 extra steps/day → 7% lower CV mortality**
- **As few as 4,000 steps/day** confers significant benefit (not 10,000)
- Dose-response: benefit continues up to ~10,000 but plateaus
- **Best approach**: Start from patient's baseline, increase by 500-1,000/week

**Source**: [European J Prev Cardiology 2023](https://academic.oup.com/eurjpc/article/30/18/1975/7226309), [Circulation 2023](https://www.ahajournals.org/doi/10.1161/CIRCULATIONAHA.122.061288)

### 3. Dietary Intervention (STRONG EVIDENCE)
- Mediterranean diet reduced **CVD incidence by 38%** vs low-fat diet
- **Heart failure reduction: 70%** vs any diet (umbrella review 2025)
- **Food swap** interventions are effective — offering explicit swaps reduced saturated fat intake significantly
- **Simple binary tracking** works: behaviour change meta-analysis found that self-monitoring + feedback are the two most effective techniques
- Key insight: **Don't prescribe a whole new diet — swap 2 foods out, 2 foods in** (lower cognitive load)

**Source**: [PMC10128075](https://pmc.ncbi.nlm.nih.gov/articles/PMC10128075/), [PMC6555993](https://pmc.ncbi.nlm.nih.gov/articles/PMC6555993/)

### 4. KardiaMobile Monitoring (GOOD EVIDENCE)
- **92% sensitivity, 95% specificity** for AF detection vs cardiologist interpretation
- NICE evaluated (MIB232) — suitable for ambulatory AF detection
- **Limitation**: 19% unclassifiable recordings, 8% uninterpretable
- **3 recordings/day is clinically appropriate** — captures different times (morning, afternoon, any symptoms)
- **Important**: Not equivalent to Holter monitor — but suitable for symptom-triggered + routine screening

**Source**: [NICE MIB232](https://www.nice.org.uk/advice/mib232/chapter/The-technology), [AliveCor](https://alivecor.com/resource-hub/kardiamobile-for-the-ambulatory-detection-of-atrial-fibrillation-pdf-2285965569121477.pdf)

### 5. BP Home Monitoring with AF Detection (GOOD EVIDENCE)
- OMRON Complete: validated BP + single-lead ECG in one device
- **Home BP monitoring improves control** by 3-5 mmHg systolic vs clinic-only (multiple meta-analyses)
- **2 readings/day is standard** — morning (before meds) + evening

### 6. Behaviour Change Techniques That Work (META-ANALYSIS)
- **Self-monitoring** (daily logging) — most effective single technique
- **Feedback** (weekly summary from clinician) — second most effective
- **Goal setting** (specific, achievable) — third most effective
- **Rapport** between facilitator and patient — critical enabler
- Digital interventions show improved diet scores when combined with above

**Source**: [PLOS ONE 2016](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0153271), [PMC11930280](https://pmc.ncbi.nlm.nih.gov/articles/PMC11930280/)

---

## CardioTrack Programme Design (Evidence-Informed)

### Programme Structure

```
Week 0: Onboarding (at clinic or remote)
├── Consent + GDPR
├── Receive devices (KardiaMobile + BP cuff)
├── Baseline: current step count, current diet
├── Set targets: step goal, 2 food stops, 2 food starts
├── QR code card given
└── First text reminder sent

Week 1: Monitoring Phase
├── KardiaMobile: 3x/day (morning, afternoon, symptoms)
├── BP cuff: 2x/day (morning before meds, evening)
├── Daily step count entry
├── Daily food check-in (yes/no: stuck to plan?)
├── Daily text reminders (2x: 7:30am + 6pm)
└── Day 7: Return devices at clinic

Weeks 2-7: Lifestyle Phase
├── Daily step count entry (target increases 500/week)
├── Daily food check-in
├── Daily text reminders (2x)
├── Weekly progress summary sent (automated)
└── Week 7: Final report + optional follow-up booking

Week 8 (optional): Review Consultation
├── Patient books follow-up (£49.99) or receives report by email
└── Personalised summary of all data
```

### Daily Text Reminders (2x per day)

**Morning (7:30am) — Intention Setting:**
Rotating messages, personalised with patient name:

- "Good morning [Name]. Today's step goal: [X] steps. You've got this."
- "[Name], remember your food plan today: more [healthy food], less [unhealthy food]."
- "Morning [Name]. Take your BP reading and ECG when you're ready." (Week 1 only)
- "[Name], you've hit your step goal [X] days in a row. Keep it going."

**Evening (6:00pm) — Action Prompt:**
- "[Name], how did you do today? Log your steps and food: [QR link]"
- "Evening check-in [Name]. Did you stick to your food plan? Quick log: [QR link]"
- "[Name], don't forget your evening BP reading." (Week 1 only)
- "You're on week [X] of 6. [Y]% of your goals hit so far. Keep going."

**Implementation**: Twilio API (SMS) — ~2p per text = ~£1.68/patient for 6 weeks (84 texts)

### Step Count Targets (Progressive)

Based on evidence that +500 steps/day = 7% lower CV mortality:

| Week | Target | Rationale |
|------|--------|-----------|
| 1 | Patient's baseline (monitoring only) | Establish baseline |
| 2 | Baseline + 500 | First increment |
| 3 | Baseline + 1,000 | Second increment |
| 4 | Baseline + 1,500 | Third increment |
| 5 | Baseline + 2,000 | Approaching target |
| 6 | Baseline + 2,000 (maintain) | Consolidation |
| 7 | Baseline + 2,000 (maintain) | Habit formation |

If baseline is very low (<2,000), start with +250 increments instead.

### Food Swap System

**STOP list (patient picks 2):**
- Sugary drinks (fizzy drinks, fruit juice, sweet tea/coffee)
- Fried food (chips, pakora, samosa, fried chicken)
- Processed meat (sausages, bacon, deli meats)
- White bread / white rice (large portions)
- Crisps / salty snacks
- Sweets / chocolate / desserts
- Takeaway food (more than 2x/week)

**START list (patient picks 2, culturally aware):**

| Category | Standard | Indian Vegetarian | Other Vegetarian | Halal |
|----------|----------|-------------------|------------------|-------|
| Protein | Fish 2x/week | Dal / lentils daily | Beans / tofu | Lean chicken / fish |
| Vegetables | Mixed veg with meals | Sabzi / palak / bhindi | Roasted veg / salads | Mixed veg / salads |
| Grains | Brown bread / oats | Brown rice / roti (wholemeal) | Quinoa / brown rice | Wholemeal bread |
| Healthy fat | Olive oil / nuts | Nuts / seeds | Avocado / nuts | Olive oil / hummus |
| Dairy/alt | Low-fat yoghurt | Dahi / paneer (small) | Soy yoghurt | Low-fat yoghurt |
| Fruit | 2 portions/day | Seasonal fruit | Berries / banana | Fresh fruit |

**Daily check-in** (simple binary):
- "Did you avoid [STOP food 1] today?" Yes/No
- "Did you avoid [STOP food 2] today?" Yes/No
- "Did you eat [START food 1] today?" Yes/No
- "Did you eat [START food 2] today?" Yes/No
- Optional: free-text note

### Device Lending Policy
- Devices lent at start of programme (clinic visit or posted)
- **Must return within 3 days after Week 1 monitoring ends** (i.e., by Day 10)
- **£70 late return / non-return charge** (covers device replacement cost)
- Patient signs device agreement at onboarding
- Deposit taken? Or charge card on file via Stripe?

### Analytics Dashboard (Clinician)

**Per-patient view:**
- Week 1: ECG summary (normal/abnormal/AF detected), BP trend, average heart rate
- Weeks 2-7: Step count trend (with target line), food adherence %, weekly progress

**Population view (across all patients):**
- Average step count improvement (baseline vs week 7)
- Food adherence rate (% days on plan)
- AF detection rate from KardiaMobile
- BP change (week 1 average vs any follow-up)
- Programme completion rate
- Which food swaps are most popular
- Which interventions correlate with best outcomes

### Multi-Language Support

**9 languages for South London demographics:**

| Language | Coverage | Key community |
|----------|----------|---------------|
| English | Default | All |
| Urdu | ~5% SW London | Pakistani community |
| Hindi | ~3% | Indian community |
| Tamil | ~2% | Sri Lankan / South Indian |
| Polish | ~4% | Polish community |
| Portuguese | ~2% | Brazilian community |
| Arabic | ~2% | Middle Eastern community |
| Somali | ~1% | Somali community |
| French | ~1% | West African francophone |

**What needs translating:**
- Patient-facing web pages (upload form, check-in, food lists)
- Text message templates (84 messages x 9 languages = 756 translations)
- Reports and summaries
- Device instructions
- Consent forms

**NOT translating** (clinician-only): dashboard, admin, analytics

### QR Code Upload Flow

```
Patient receives printed QR card at onboarding
        ↓
Scans QR with phone camera
        ↓
Opens: londoncardiologyclinic.uk/log?token=UNIQUE_TOKEN
        ↓
Language selector at top (remembers choice)
        ↓
Simple form:
  [Date: today auto-filled]
  [Steps: _____ ] (number input)
  [Food check: 4 x yes/no toggles]
  [BP: systolic/diastolic] (Week 1 only)
  [ECG: upload file button] (Week 1 only)
  [Note: optional free text]
  [Submit]
        ↓
"Thank you! See you tomorrow." confirmation
        ↓
Data encrypted → stored on server → visible in clinician dashboard
```

**Token security:**
- Unique per patient
- Valid for duration of programme (7 weeks)
- No login required (QR = authentication)
- HTTPS only
- Rate-limited (max 3 submissions per day)

---

## Technical Stack

```
londoncardiologyclinic.uk (Caddy)
├── /                → Static HTML (main clinic site)
├── /book            → Custom booking (both tiers) + Stripe Checkout
├── /log             → Patient daily log (QR destination)
├── /dashboard       → Clinician admin (password-protected)
├── /api             → REST API
│   ├── POST /api/book          → Create booking + Stripe session
│   ├── POST /api/log           → Submit daily log
│   ├── GET  /api/patients      → List patients (admin)
│   ├── GET  /api/patient/:id   → Patient data (admin)
│   └── POST /api/webhook       → Stripe payment webhook
└── Twilio webhook   → SMS delivery status

Backend: Node.js + Express + SQLite
  - SQLite: simple, no separate database server, backs up easily
  - Encryption: AES-256 for health data at rest
  - Auth: session-based for admin, token-based for patients

SMS: Twilio (~£1.68/patient for full programme)
Payments: Stripe Checkout (£49.99 per tier)
```

## Build Phases

### Phase 1: Custom Booking (replace Cal.com) — 1 session
- Booking page with both tiers
- Stripe Checkout integration
- Admin dashboard (view bookings)
- Confirmation emails

### Phase 2: Patient Onboarding + Daily Log — 1-2 sessions
- Patient registration form
- QR code generation
- Daily log form (steps, food, BP, ECG upload)
- Data storage (encrypted SQLite)
- Device lending agreement

### Phase 3: Text Reminders — 1 session
- Twilio SMS integration
- Morning + evening templates
- Personalised messages (name, targets, progress)
- Multi-language message templates

### Phase 4: Clinician Dashboard — 1-2 sessions
- Per-patient view (ECG, BP trend, steps, food adherence)
- Population analytics
- Outcome tracking
- Export/report generation

### Phase 5: Multi-Language — 1 session
- i18n framework for web pages
- Translated text message templates
- Language selector on patient pages

### Phase 6: Analytics + Evidence — 1 session
- Which interventions correlate with outcomes
- Population-level statistics
- Exportable data for research/audit
