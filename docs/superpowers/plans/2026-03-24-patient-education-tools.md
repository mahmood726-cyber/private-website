# Patient Education Tools + PDF Booklet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 7 interactive patient education HTML tools (stateless, no data storage) + downloadable PDF booklet, consistent with existing OpenPalp branding and content.

**Architecture:** Each tool is a self-contained HTML file in a new `tools/` directory. All use the shared `css/pages.css` stylesheet + inline CSS/JS. Zero server calls, zero localStorage, zero cookies — purely educational. Content mirrors the booklet and website exactly.

**Tech Stack:** HTML5, CSS3 (pages.css + inline), vanilla JS (no frameworks), @media print for PDF

**Key constraint:** NO patient data stored in any tool. The booking form is the only place data is collected. Patients record their own data in the printed PDF booklet which the clinician reviews at appointment 2.

---

## File Structure

```
tools/                          (NEW directory)
  index.html                    — Tools hub page (links to all 7 tools)
  symptom-triage.html           — "Should I worry?" decision tree
  weekly-quiz.html              — 6 weekly knowledge quizzes (tabbed)
  sleep-scorecard.html          — Sleep hygiene self-assessment
  caffeine-guide.html           — Caffeine experiment walkthrough
  vagal-techniques.html         — Animated vagal manoeuvre guides
  trigger-explorer.html         — Interactive trigger mechanism map
  hr-interpreter.html           — HR/HRV plain-English interpreter

booklet.html                    (MODIFY — add PDF download + @media print)
articles/index.html             (MODIFY — add tools section + fix prices)
articles/*.html                 (MODIFY — fix £49.99 → £60 in 6 files)
ecg-wimbledon.html              (MODIFY — fix prices)
palpitations.html               (MODIFY — fix prices)
heart-monitoring.html           (MODIFY — fix prices)
terms.html                      (MODIFY — fix prices)
booklet.html                    (MODIFY — fix prices)
index.html                      (MODIFY — add tools link in nav/footer)
```

## Shared HTML Template (all tools follow this pattern)

Every tool file uses the same structure as existing articles:
- Safety banner (call 999)
- Nav bar (OpenPalp logo, links to Home/Programme/Device/Suitability/Evidence/Articles/Tools)
- `<main>` with tool content
- CTA section ("Book Your £60 Assessment")
- Footer (address, links, GMC)
- Hamburger menu JS

The only difference: tool pages have interactive JS sections inside `<main>`.

All content must be **medically consistent** with booklet.html and index.html. Cross-reference the booklet when writing educational content — do not invent new medical claims.

---

### Task 0: Fix Old Prices Across All Active Files

**Files:**
- Modify: `articles/index.html`, `articles/breathing-exercises-for-palpitations.html`, `articles/what-are-ectopic-beats.html`, `articles/caffeine-and-heart-rhythm.html`, `articles/when-to-worry-about-palpitations.html`, `articles/palpitations-at-night.html`
- Modify: `ecg-wimbledon.html`, `palpitations.html`, `heart-monitoring.html`, `terms.html`, `booklet.html`

- [ ] **Step 1:** In every file listed above, replace all `£49.99` / `&pound;49.99` with `£60` / `&pound;60`
- [ ] **Step 2:** In every file listed above, replace all `£99.99` / `&pound;99.99` with `£70` / `&pound;70`
- [ ] **Step 3:** In every file listed above, replace all `£149.98` / `&pound;149.98` with `£130` / `&pound;130`
- [ ] **Step 4:** Grep to verify zero remaining occurrences of `49.99`, `99.99`, `149.98` in active HTML files (exclude `*-archived*`, `*-old-*`, `mockups/`)
- [ ] **Step 5:** Deploy updated files to server via scp + verify

---

### Task 1: PDF Download for Booklet

**Files:**
- Modify: `booklet.html`

- [ ] **Step 1:** Add `@media print` CSS block at end of booklet.html `<style>` section:
  - Hide: nav, safety-banner, footer, print button, download button
  - Force: white background, black text, no shadows
  - Page breaks: before each `.part-header`
  - Max-width: 100%

- [ ] **Step 2:** Add download button next to existing print button in the booklet header area:
  ```html
  <button class="btn btn-primary" onclick="window.print()" style="margin-right:12px;">Print Booklet</button>
  <button class="btn btn-outline" onclick="window.print()">Download as PDF</button>
  <p style="font-size:13px;color:var(--mid-grey);margin-top:8px;">Use your browser's "Save as PDF" option when the print dialog appears.</p>
  ```

- [ ] **Step 3:** Test print preview in browser — verify clean layout, no nav/footer, proper page breaks
- [ ] **Step 4:** Deploy to server

---

### Task 2: Tools Directory + Hub Page

**Files:**
- Create: `tools/index.html`
- Modify: `index.html` (add Tools link to nav + footer)

- [ ] **Step 1:** Create `tools/index.html` — hub page listing all 7 tools with descriptions. Follow the exact same HTML structure as `articles/index.html` (safety banner, nav, grid of cards, CTA, footer). Each card links to the corresponding tool HTML file. Card descriptions:

  1. **Should I Worry?** — "An interactive guide to understanding your symptoms. Learn which signs are reassuring and which need attention."
  2. **Weekly Quizzes** — "Test your understanding each week of the 6-week programme. Short, focused questions to reinforce what you are learning."
  3. **Sleep Scorecard** — "Rate your current sleep habits and discover which changes could make the most difference to your heart rhythm."
  4. **Caffeine Experiment** — "A guided walkthrough of the two-week caffeine experiment from your booklet. Understand what to expect and why it matters."
  5. **Vagal Techniques** — "Step-by-step animated guides for the Valsalva manoeuvre and cold water technique, with important safety information."
  6. **Trigger Explorer** — "An interactive map of common palpitation triggers and the mechanisms behind them."
  7. **Heart Rate Interpreter** — "Enter your resting heart rate or HRV reading and get a plain-English explanation of what it means."

- [ ] **Step 2:** Add "Tools" link to nav in `index.html` (alongside existing nav items) and footer links section
- [ ] **Step 3:** Deploy tools/index.html and updated index.html to server

---

### Task 3: Symptom Triage Decision Tree

**Files:**
- Create: `tools/symptom-triage.html`

**Content source:** booklet.html Part 5 ("When You Feel Palpitations") + index.html #suitability section + articles/when-to-worry-about-palpitations.html

- [ ] **Step 1:** Create `tools/symptom-triage.html` with standard template (safety banner, nav, footer)

- [ ] **Step 2:** Build interactive decision tree in `<main>`:
  - One question at a time, large clear buttons for Yes/No
  - Questions (in order):
    1. "Are you experiencing chest pain right now?" → YES: red card "Call 999 immediately"
    2. "Have you fainted or feel like you might faint?" → YES: red card "Call 999"
    3. "Are you severely breathless right now?" → YES: red card "Call 999"
    4. "Is your heart racing continuously and won't stop?" → YES: amber card "Go to A&E or call 111"
    5. "Do your palpitations only happen during heavy exercise?" → YES: amber card "See your GP — exercise-related palpitations should be assessed"
    6. "Do you have known heart disease, a heart valve problem, or a previous heart operation?" → YES: amber card "This pathway is not suitable — see your cardiologist"
    7. "Are your palpitations brief, intermittent, and you feel well between episodes?" → YES: green card "Your symptoms sound like they could be suitable for the OpenPalp pathway"
  - Each result card includes: clear heading, 1-2 sentence explanation, appropriate next step, and a "Start again" button
  - Red cards: bold 999 message + "Do not use this tool as a substitute for medical advice"
  - Green card: brief reassurance + link to booking
  - Progress indicator showing question N of 7

- [ ] **Step 3:** Style with inline CSS matching the site's pastel palette (green for reassuring, amber for caution, red for urgent). Cards should be large and readable.

- [ ] **Step 4:** Add accessibility: focus management on question change, aria-live region for result, keyboard support (Enter/Space on buttons)

- [ ] **Step 5:** Deploy to server

---

### Task 4: Weekly Quizzes

**Files:**
- Create: `tools/weekly-quiz.html`

**Content source:** booklet.html Part 7 ("Your 6-Week Journey") — each week's focus area

- [ ] **Step 1:** Create `tools/weekly-quiz.html` with standard template

- [ ] **Step 2:** Build tabbed quiz interface:
  - 6 tabs across the top: "Week 1: Listen" / "Week 2: Breathe" / "Week 3: Discover" / "Week 4: Change" / "Week 5: Move" / "Week 6: Understand"
  - Each tab contains 5 multiple-choice questions (4 options each)
  - Questions are specific to that week's content from the booklet

- [ ] **Step 3:** Write quiz questions (30 total). Examples:

  **Week 1 (Listen — observation):**
  - Q: "During Week 1, what is the main thing you should focus on?" A: Observing your symptoms without trying to change them
  - Q: "How often should you record a Kardia reading at rest?" A: Once each morning
  - Q: "What does 'Unclassified' on your Kardia usually mean?" A: The device could not categorise the rhythm — it does not mean something is wrong
  - Q: "When should you record an additional Kardia reading?" A: Whenever you feel symptoms
  - Q: "What is the purpose of the daily diary?" A: To spot patterns between your symptoms and daily habits

  **Week 2 (Breathe — 4-6 protocol):**
  - Q: "In the 4-6 breathing technique, what do the numbers refer to?" A: Inhale for 4 seconds, exhale for 6 seconds
  - Q: "Why is a longer exhale important?" A: It activates the vagus nerve, which slows the heart
  - Q: "How often should you practise the breathing exercise?" A: Twice daily — morning and evening, 5 minutes each
  - Q: "A meta-analysis of how many studies supports slow breathing for heart rhythm?" A: 31 studies, 1,133 participants
  - Q: "What should you do if you feel dizzy during breathing exercises?" A: Return to normal breathing — do not force it

  **Week 3 (Discover — triggers + caffeine):**
  - Q: "What is the 'caffeine test' in the programme?" A: Removing caffeine for 5 days, then reintroducing it, to see if your symptoms change
  - Q: "Name three common palpitation triggers." A: Caffeine, poor sleep, stress (also: alcohol, dehydration, large meals)
  - Q: "What is the 'attention loop'?" A: Noticing palpitations → anxiety → more awareness → palpitations feel worse
  - Q: "Why might your palpitations feel worse at night?" A: Reduced ambient noise makes your heartbeat more noticeable
  - Q: "What should you record when you notice a trigger?" A: What you ate/drank, how you slept, your stress level, and when symptoms occurred

  **Week 4 (Change — sleep anchor):**
  - Q: "What is a 'sleep anchor'?" A: A fixed wake time every day, including weekends
  - Q: "Why does poor sleep affect heart rhythm?" A: Sleep disruption increases sympathetic nervous system activity and reduces HRV
  - Q: "Which study found a link between sleep and atrial fibrillation?" A: UK Biobank study of 403,000 people (JACC 2021)
  - Q: "What is HRV?" A: Heart rate variability — the variation in time between heartbeats. Higher is generally better.
  - Q: "If your sleep experiment improves symptoms, what should you do?" A: Keep the new routine and note it in your progress tracker

  **Week 5 (Move — graded activity):**
  - Q: "What type of movement does the programme recommend starting with?" A: Gentle daily walking with gradual increases
  - Q: "A 14-year study of 22,000 adults found regular activity reduced AF risk by how much?" A: About 35%
  - Q: "Should you exercise during a palpitation episode?" A: No — rest, use breathing or vagal techniques, and record on Kardia
  - Q: "What is a reasonable daily step goal to work towards?" A: Gradually increase from your baseline — there is no single target
  - Q: "Why is movement good for palpitations even when your heart is structurally normal?" A: It improves autonomic balance and reduces resting sympathetic tone

  **Week 6 (Understand — review):**
  - Q: "What happens at the results appointment on day 30?" A: You and Dr Ahmad review all Kardia recordings and your booklet together
  - Q: "What should you bring to the results appointment?" A: Your completed booklet and your phone with the Kardia app
  - Q: "If monitoring finds atrial fibrillation, what happens?" A: You will be referred to an appropriate NHS specialist with documented findings
  - Q: "What does the CAST trial (1989) teach us?" A: That suppressing ectopic beats with drugs can be harmful — reassurance and lifestyle are safer
  - Q: "After the programme, how can you manage future episodes?" A: Continue breathing exercises, maintain trigger awareness, and record on Kardia if concerned

- [ ] **Step 4:** Build scoring UI:
  - After answering all 5 questions in a week, show score (e.g., "4 out of 5")
  - Correct answers shown in green, incorrect in amber with the correct answer displayed
  - "Try again" button resets that week's quiz
  - Scores not persisted — vanish on page reload

- [ ] **Step 5:** Add accessibility: radio button groups for each question, fieldset/legend, focus management on submit

- [ ] **Step 6:** Deploy to server

---

### Task 5: Sleep Hygiene Scorecard

**Files:**
- Create: `tools/sleep-scorecard.html`

**Content source:** booklet.html Week 4 (sleep anchor experiment) + index.html #programme sleep section

- [ ] **Step 1:** Create `tools/sleep-scorecard.html` with standard template

- [ ] **Step 2:** Build scorecard with 8 yes/no statements:
  1. "I wake up at the same time every day, including weekends" (good)
  2. "I use my phone or tablet in bed before sleep" (bad)
  3. "I avoid caffeine after 2pm" (good)
  4. "I often fall asleep with the TV on" (bad)
  5. "My bedroom is cool, dark, and quiet" (good)
  6. "I go to bed at very different times on weeknights vs weekends" (bad)
  7. "I have a wind-down routine in the 30 minutes before bed" (good)
  8. "I regularly wake up feeling unrefreshed" (bad)

- [ ] **Step 3:** Build result display:
  - Score 0-8, with a traffic light band:
    - 7-8: Green — "Your sleep habits are strong"
    - 4-6: Amber — "There are a few areas that could improve your heart rhythm"
    - 0-3: Red — "Sleep may be a significant factor in your palpitations"
  - For each "bad" answer, show a specific tip (e.g., "Try setting a fixed wake time — even at weekends. The UK Biobank study of 403,000 people found disrupted sleep patterns increase arrhythmia risk.")
  - Include: "Record your sleep observations in your OpenPalp booklet (Week 4) and discuss them at your results appointment."

- [ ] **Step 4:** Style as interactive cards (click to flip between "This is me" / "Not me"), not a boring form
- [ ] **Step 5:** Deploy to server

---

### Task 6: Caffeine Experiment Guide

**Files:**
- Create: `tools/caffeine-guide.html`

**Content source:** booklet.html Week 3 + articles/caffeine-and-heart-rhythm.html

- [ ] **Step 1:** Create `tools/caffeine-guide.html` with standard template

- [ ] **Step 2:** Build as a step-by-step visual timeline (not a form):
  - **Day 1-2:** "You might feel tired or get a mild headache. This is caffeine withdrawal — it passes."
  - **Day 3-5:** "Most withdrawal symptoms settle by now. Notice your heart rhythm."
  - **Day 6:** "Reintroduce one cup of coffee or tea. Note any change in palpitations."
  - **Day 7-14:** "If symptoms returned with caffeine, you have your answer. If not, caffeine may not be your trigger."

  Each step is a visual card that expands on click, showing:
  - What to expect (symptoms, timeline)
  - What to record in the booklet
  - Tips for that phase
  - The science (adenosine receptor upregulation, individual metabolism variation)

- [ ] **Step 3:** Add an interactive "Caffeine calculator" section:
  - User selects drinks they typically have (coffee, tea, energy drink, cola, dark chocolate)
  - Shows estimated daily caffeine in mg
  - Contextualises: "<200mg = low, 200-400mg = moderate, >400mg = high"
  - Does NOT store any data

- [ ] **Step 4:** Include safety note: "Some people have genetic variations that slow caffeine metabolism. If you notice palpitations within an hour of drinking coffee, this may apply to you."

- [ ] **Step 5:** Deploy to server

---

### Task 7: Vagal Techniques Guide

**Files:**
- Create: `tools/vagal-techniques.html`

**Content source:** booklet.html Part 5 (6-step protocol) + existing breathing tool in index.html

- [ ] **Step 1:** Create `tools/vagal-techniques.html` with standard template

- [ ] **Step 2:** Build 3 technique cards, each with animated visual guide:

  **1. Valsalva Manoeuvre:**
  - Animated: chest/diaphragm visual showing bear-down pressure
  - Steps: "Take a deep breath in → Bear down as if straining on the toilet → Hold for 10-15 seconds → Release and breathe normally"
  - Timer: click "Start" → visual countdown 15 seconds → "Release" prompt
  - Safety: "Do NOT do this if you have glaucoma, eye disease, or a known heart valve problem."

  **2. Cold Water Technique:**
  - Animated: face + bowl visual
  - Steps: "Fill a bowl with cold water → Hold your breath → Submerge your face for 10-20 seconds → Lift and breathe normally"
  - Timer: click "Start" → visual countdown 20 seconds
  - Alternative: "If no bowl available, press a cold flannel or ice pack to your forehead and cheeks."
  - Safety: "Not suitable if you have Raynaud's or severe cold sensitivity."

  **3. 4-6 Breathing (link to main tool):**
  - Brief description + link to the interactive breathing tool on the main site (#evidence section)
  - "This is the foundation technique. Practise morning and evening, even when you feel fine."

- [ ] **Step 3:** Add a "When to use these" section:
  - "If you feel palpitations starting: sit or lie down → try one technique → record on Kardia after"
  - "If palpitations don't stop within 30 minutes, or you feel unwell, call 111 or attend A&E."

- [ ] **Step 4:** Animations: use CSS keyframes only (no JS animation libraries). Simple, clear, not distracting. `prefers-reduced-motion: reduce` → show static diagrams instead.

- [ ] **Step 5:** Deploy to server

---

### Task 8: Trigger Explorer

**Files:**
- Create: `tools/trigger-explorer.html`

**Content source:** booklet.html Part 2 ("Common triggers") + index.html #home (attention loop)

- [ ] **Step 1:** Create `tools/trigger-explorer.html` with standard template

- [ ] **Step 2:** Build interactive trigger map — a grid of 8 trigger category cards:
  1. **Caffeine** — adenosine receptor blocking, dose-response, individual variation
  2. **Alcohol** — vagal withdrawal effect, dehydration, electrolyte shifts
  3. **Poor sleep** — sympathetic activation, reduced HRV, circadian disruption
  4. **Stress & anxiety** — adrenaline surge, attention loop amplification
  5. **Dehydration** — reduced blood volume, compensatory heart rate increase
  6. **Large meals** — vagal activation from stomach distension, especially with alcohol
  7. **Exercise** — normal sinus tachycardia vs pathological (context matters)
  8. **Hormonal changes** — menstrual cycle, perimenopause, thyroid (with note: "discuss with your doctor")

  Each card: click to expand revealing:
  - **What happens:** 2-3 sentence mechanism explanation
  - **What you might notice:** typical symptom pattern
  - **What to try:** actionable advice (from booklet)
  - **Record in your booklet:** which section to fill in

- [ ] **Step 3:** Add "The Attention Loop" explainer at the top — animated cycle diagram:
  - Notice palpitations → Feel anxious → Heart rate increases → Notice more palpitations → cycle repeats
  - "Understanding this loop is the first step to breaking it."

- [ ] **Step 4:** Deploy to server

---

### Task 9: HR/HRV Interpreter

**Files:**
- Create: `tools/hr-interpreter.html`

**Content source:** booklet.html Part 6 (HRV explanation) + index.html #programme HRV callout

- [ ] **Step 1:** Create `tools/hr-interpreter.html` with standard template

- [ ] **Step 2:** Build two interpreter sections:

  **Section 1: Resting Heart Rate**
  - Input: number field (30-200 range)
  - Output: colour-coded band + plain-English explanation
    - <50: "This is a low resting heart rate (bradycardia). If you feel well, this can be normal — especially if you are physically fit. Mention it at your appointment."
    - 50-59: "Below average but normal. Common in active people."
    - 60-80: "Normal resting heart rate range."
    - 81-100: "Upper end of normal. Stress, caffeine, dehydration, or deconditioning can raise it."
    - >100: "This is above the normal resting range (tachycardia). If persistent, mention it to your clinician."
  - Disclaimer: "This is for educational purposes. It does not replace medical assessment."

  **Section 2: HRV (RMSSD or SDNN)**
  - Input: number field + dropdown (RMSSD / SDNN)
  - Output: contextualised explanation
    - Very simplified bands: "Higher HRV generally indicates good autonomic balance. Lower values can reflect stress, poor sleep, or deconditioning. Track trends over days rather than single readings."
  - Note: "Your Kardia app may not display HRV. If it does, record it in your booklet."

- [ ] **Step 3:** Make clear: "These numbers are for your own understanding. Do NOT make medical decisions based on them. Bring your questions to your appointment."

- [ ] **Step 4:** Deploy to server

---

### Task 10: Navigation + Cross-Linking

**Files:**
- Modify: `index.html` — add "Tools" to nav + footer
- Modify: `articles/index.html` — add "Interactive Tools" section below articles
- Modify: all `tools/*.html` — ensure consistent nav links
- Modify: `booklet.html` — add "Try the interactive tools" callout near Part 7

- [ ] **Step 1:** Add nav link "Tools" to index.html navigation (after "Articles" in footer)
- [ ] **Step 2:** Add a "Try the interactive tools" card section to articles/index.html
- [ ] **Step 3:** Add a callout in booklet.html near the 6-week journey section: "Practise what you're learning with our interactive tools at londoncardiologyclinic.uk/tools"
- [ ] **Step 4:** Verify all cross-links work
- [ ] **Step 5:** Deploy everything to server

---

### Task 11: Final Deploy + Verification

- [ ] **Step 1:** scp all new `tools/*.html` files to server
- [ ] **Step 2:** scp updated `index.html`, `booklet.html`, `articles/*`, `ecg-wimbledon.html`, `palpitations.html`, `heart-monitoring.html`, `terms.html` to server
- [ ] **Step 3:** Verify from server:
  - All 7 tool pages return 200
  - tools/index.html returns 200
  - No old prices (£49.99) in any served page
  - All navigation links work
  - Booklet print/PDF works
  - Sensitive files still blocked
- [ ] **Step 4:** Run full price audit: grep for 49.99, 99.99, 149.98 across all served files
