# PRD — Clinical Trial Finder

**Version:** 0.3
**Owner:** Aditi Luthra (Product)
**Status:** Draft — pre-validation
**Related:** `TAGGING_SPEC_v0.4.md` (implementation detail)

---

## 1. Problem

ClinicalTrials.gov is not a bad product. It is a **compliance registry**, and it
is very good at being one. Sponsors are legally required to post under FDAAA
801, so the registry optimizes for completeness and transparency. Its design
follows from that mandate, and so do its failures for patients.

**The root barrier is health literacy.** Using the registry effectively requires
reading investigator-facing eligibility criteria, interpreting trial design,
and extracting meaning from dense results tables. Most patients cannot do this.
Today that translation work is done manually, by someone who can — which is
exactly why the owner of this product has run these searches on behalf of
others. **The product is a translation layer for work that currently has no
scalable form.**

Concretely, the registry fails patients in five ways:

1. **Input is too coarse.** A user can barely describe their disease or current
   condition, so queries return broad, unsorted result sets.
2. **Eligibility must be deciphered by hand.** Criteria are a free-text blob
   written for research staff, mixing structured facts with clinical qualifiers.
3. **No sorting on what matters.** No filter or rank by burden, placebo
   probability, cost, safety oversight, or results.
4. **Results are dense and unread.** Where a trial has posted findings, they sit
   in outcome tables that require training to interpret. There is no way to ask
   the simpler question: *where does treatment for my disease actually stand?*
5. **Stale and irrelevant records persist.** Terminated, withdrawn, and
   unverified trials appear alongside actively recruiting ones.

None of this will be fixed by the registry, because fixing it would conflict
with its purpose. Transparency requires showing everything. Usefulness requires
showing the right things.

**One failure is more serious than friction.** There is no way to distinguish a
rigorous NIH-funded trial from a single-site clinic charging patients for an
unapproved intervention. Both appear in the registry. Both look equally
official.

---

## 2. Primary user

**A patient who is dissatisfied with their current treatment options and
willing to do research — or a caregiver acting on their behalf.**

The defining traits are dissatisfaction and research-willingness, not
desperation. This spans patients who have exhausted standard care and patients
whose condition is poorly controlled on existing treatment.

Characteristics:

- Actively unhappy with current options; motivated to look further
- Willing to accept **some** burden and risk, but weighing it — not accepting
  anything at any cost
- Often lacks the health literacy to navigate primary sources unaided
- **Targeted by pay-to-participate operations**, which market directly to people
  looking beyond standard care

**Who this is not.** Patients living normally on a treatment that works are not
in market. Interview evidence from prior work with chronic-disease patients
found they were consistently unwilling to leave a proven medication while
functioning well. Burden and risk tolerance is conditional, not absolute — which
is why burden tagging matters rather than being decoration.

Secondary users (not designed for first, likely heavy users): caregivers
searching for someone else, and clinicians doing a quick scan for a patient.

---

## 3. Goals

**G1. Assemble a shortlist worth acting on.** Trials the user can bring to their
physician, or take directly to a trial coordinator or study medical team.

**G2. Produce an exportable file for the physician conversation.** The output of
a session is a document the user can hand to a clinician, not just a saved list
inside our product.

**G3. Enable direct contact with the trial team.** Provide copy-and-paste
templates so a user can email a trial contact themselves — either to ask whether
they might be a fit, or to ask to be notified when a study reopens or reports
results.

**G4. Make each trial's real commitment legible.** What's involved, odds of
receiving the treatment, what it costs, how far along it is — in plain language.

**G5. Surface oversight concerns** so the user can distinguish rigorous research
from pay-to-participate operations.

**G6. Show where treatment for a disease actually stands.** Many users are not
ready for a trial today but want to follow what is developing so they can act
later. This is a distinct job to be done: *staying informed*, not *enrolling*.

**G7. Never hide a trial the user might qualify for.**

---

## 4. Non-goals

Explicit scope boundaries, not oversights.

1. **We do not tell users whether they qualify.** Eligibility determination
   belongs to the trial site.
2. **We do not rank trials by likelihood of benefit.** We cannot know this.
3. **We do not provide medical advice.**
4. **We do not attempt deep eligibility matching in Phase 1.**
5. **We do not take sponsor-paid placement or per-referral revenue in Phase 1.**
   A tool paid per enrollment, serving users looking beyond standard care, is
   structurally incentivized to encourage enrollment. Scope decision and
   integrity decision. Revisit only with a disclosed model.

---

## 5. Alternatives considered and rejected

### 5.1 Disease-specific vs. broad coverage

**Considered:** start with one disease area and encode deep specialized
eligibility logic.

**Chose:** broad coverage.

**Reasoning:** the two halves generalize differently. **Tagging** derives from
structured metadata present on all ~500,000 records, so it generalizes for free.
**Matching** requires disease-specific criteria and does not. Splitting them
lets us be broad on tagging and deliberately shallow on matching — honest,
stated as a non-goal, and still a large improvement on the incumbent.

### 5.2 Hard exclusion vs. downranking

**Considered:** filter out trials whose exclusion criteria the user appears to
meet.

**Chose:** hide only on structured-field mismatches; downrank everything derived
from text.

**Reasoning:** asymmetric error cost. A false inclusion wastes an afternoon. A
false exclusion means a patient never learns a trial existed, and never finds
out that happened. Text criteria carry qualifiers ("uncontrolled diabetes" ≠
"diabetes") that make confident exclusion unsafe.

### 5.3 Facts-only vs. judgment labels vs. published rubric

**Considered:** (a) neutral facts only; (b) evaluative labels like
"controversial."

**Chose:** a published, versioned rubric with a label naming its criteria.

**Reasoning:** facts-only under-serves a user who lacks the literacy to assemble
six data points into a conclusion — which is the same literacy gap the whole
product exists to close. Unfalsifiable adjectives are legally exposed and carry
no information. A named rubric is useful and defensible: a sponsor can check
whether we applied our own stated standard correctly.

### 5.4 Single burden score vs. layered category

**Considered:** one burden level per trial from intervention type.

**Chose:** factual category + explanation + ranking hint.

**Reasoning:** `DEVICE` covers both a wristband and a surgical implant. A single
derived score would sometimes assert "non-invasive" about an implant — a false
statement. Separating the factual category from the ranking converts a potential
lie into a sorting error.

---

## 6. Requirements

High-level only. Implementation detail in `TAGGING_SPEC_v0.4.md`.

**R1. Structured intake.** Let the user describe disease and current condition
in enough detail to sort results — progressive questions in a side panel,
ordered by how much each narrows the set. Directly addresses Problem §1.1.

**R2. Plain-language tag display.** Phase, placebo exposure, intervention
category with explanation, cost status, freshness. Phase and placebo render
adjacent. Every tag written for a reader without clinical training.

**R3. Parsed eligibility.** Inclusion and exclusion criteria broken into atomic,
readable items with qualifiers preserved. Addresses Problem §1.2.

**R4. Sorting and filtering** on burden, placebo probability, cost, oversight,
and recency. Addresses Problem §1.3.

**R5. Oversight rubric.** Seven published criteria; label at ≥4 with the
specific criteria met.

**R6. Excluded Trials view.** Every excluded trial visible with reason, verbatim
criterion text, and a per-trial override.

**R7. Results summaries.** Where results are posted, a neutral "What this trial
found" summary on demand. Addresses Problem §1.4.

**R8. Disease landscape view.** A high-level picture of what is being tested for
a condition and how far along it is, independent of whether the user is
currently seeking a trial. Serves G6.

**R9. Shortlist and export.** Save trials; export a physician-ready file. Serves
G1 and G2.

**R10. Contact templates.** Serves G3. Two templates, generated per trial and
prefilled with the trial's identifiers and contact address from
`contactsLocationsModule` (`centralContacts[]`, then `locations[].contacts[]`).

*Template A — Am I a fit?* For recruiting trials. Asks whether the study is
enrolling, what the main eligibility requirements are, where and how often
participants are seen, and whether there are costs to participants.

*Template B — Keep me posted.* For trials not currently recruiting, or completed
ones. Asks to be notified if enrollment reopens, whether there are related
studies to watch, and when results become available. This converts a
non-recruiting trial from a dead end into an ongoing thread, and is the bridge
between Job 1 and Job 2.

**Constraints on R10:**

- **We never send on the user's behalf.** The user copies the text and sends it
  from their own email client. Sending would make us a recruitment intermediary,
  conflicting with §4.5, and coordinators give more weight to a message from the
  patient.
- **Templates never assert eligibility.** Phrasing is "I'd like to learn whether
  I might be a fit," never "I qualify." This is §4.1 expressed in copy.
- **Templates are not prefilled with the user's health information.** Intake
  answers are not auto-inserted. The user chooses what to add.
- **No bulk contact.** Templates are generated one trial at a time. Making it
  trivial to email twenty coordinators at once would flood them and degrade
  response rates for every user (see §8).
- **Fallback.** Where no contact is listed, say so and point to the trial's
  registry page rather than fabricating a route.

---

## 7. Success metrics

The product serves two jobs, and they need different measures.

### Job 1 — Assemble a shortlist and make contact (G1, G2, G3)

**Primary: contact template copy rate** — share of sessions in which the user
copies a Template A. This is the closest observable behavior to the real
outcome, because copying a contact email is a deliberate act immediately
preceding a real-world action. It is a stronger intent signal than saving.

**Secondary: shortlist creation rate** — share of sessions producing at least
one saved trial. A leading indicator; saving requires less commitment than
contacting.

**Secondary: export rate** — share of shortlists exported for a physician
conversation.

**Still proxies.** We cannot observe whether the email was actually sent, or
whether a conversation happened. Copying is the last event inside our product on
the path to the outcome we want. Replace when better instrumentation exists.

### Job 2 — Stay informed (G6)

**Primary: return rate** — share of users who come back within 90 days without
having shortlisted anything. A user following their disease area is succeeding
even if they never save a trial. Measuring this job by shortlists alone would
misread satisfied users as failures.

**Secondary: Template B copy rate** — share of sessions copying a "keep me
posted" template. The only observable action available to a user who is
following rather than enrolling.

### Counter-metric

**Flagged-trial shortlist rate** — share of shortlisted trials meeting 4+
oversight criteria. If users routinely save flagged trials, the flagging is not
working, regardless of how good the primary metrics look. Prevents the product
from succeeding on engagement while failing on safety.

### Guardrail

**Exclusion override rate** — how often users override an exclusion. A high rate
means the matcher is too aggressive and G7 is being violated in practice.

---

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| False exclusion hides a viable trial | High | Tier system; Excluded Trials view; override control; override rate as guardrail |
| False hope — product implies benefit likelihood it cannot know | High | Non-goal §4.2; neutral results framing; no ranking by benefit |
| Plain-language translation introduces clinical inaccuracy | High | Verbatim source text always available alongside any paraphrase; generated summaries marked as such |
| Oversight rubric draws sponsor dispute | Medium | Published criteria; verbatim source values; basis cited to ISSCR/FDA guidance; no adjectives |
| Device or procedure misclassification | Medium | Layered model (§5.4) — category stays factual, only ranking degrades |
| Phase 2 record upload triggers state consumer health privacy law | Medium | Phase 1 client-side only; privacy architecture decided before Phase 2 build |
| **Coordinator flooding** | Medium | If contact becomes trivial at scale, research staff are overwhelmed and stop responding — degrading the product for every user. No bulk contact (§6, R10); templates generated one trial at a time; monitor if coordinator response rates become measurable |
| **Founder-as-user bias** | Medium | Owner has personally run these searches — a sophisticated searcher whose friction points may differ from a patient's. Validate §9 before building further. |

---

## 9. Assumptions to validate

**Current evidence base:** informal conversations about trials; domain knowledge
from founding and running a clinical laboratory; the owner's direct experience
searching for trials on behalf of chronic-disease patients and patients out of
standard options; and prior structured interviews with chronic-disease patients
conducted for a related product.

**That prior interview work supports one assumption already:** chronic-disease
patients reported being unwilling to leave a proven medication while living
normally. Risk tolerance is conditional. This is evidence for A4 and for the
user definition in §2.

**No structured interviews have been conducted for this product specifically.**
Listed in priority order — the first would invalidate the product if false.

| # | Assumption | If false |
|---|---|---|
| A1 | The bottleneck is **finding** plausible trials, not **qualifying** for them | Better search doesn't help; address screening or site contact instead |
| A2 | Patients search themselves rather than relying entirely on their specialist | Primary user is the clinician; the interface changes |
| A3 | Placebo probability materially affects decisions | TAG 2 is decoration, not a differentiator |
| A4 | Burden is weighed rather than accepted unconditionally | Burden ranking is lower value than assumed. *Partially supported by prior interviews.* |
| A5 | Oversight flagging reads as protective, not as gatekeeping | Rubric may reduce trust; framing needs rework |
| A6 | Shortlisting is a behavior this user performs | Job 1 primary metric is wrong |
| A7 | A meaningful set of users want to follow developments without seeking a trial now | G6, R8, and the Job 2 metrics are unjustified |
| A8 | Patients will email a research coordinator directly if given the words | R10 is unused; contact needs a mediated route instead |
| A9 | Expanded access is relevant and wanted by this user | TAG 4b and the expanded-access surface are unjustified |

**Validation plan:** 12–15 interviews. Target mix: patients or caregivers who
searched for a trial in the last 12 months, and 2–3 trial coordinators who
screen inbound inquiries. Coordinators answer A1 directly — they know how many
inbound candidates fail screening and why.

Interview question shape: *"Walk me through the last time you looked for a
trial. Where did it break down?"* Not *"would you use this?"*

---

## 10. Open questions

1. Does gene therapy outrank implants at the top of the burden ladder?
2. Is the results summary a premium feature? (Deferred until usage data exists.)
3. Phase 2 privacy architecture — client-side parsing, or server-side with
   explicit consent and retention?
4. Should sponsor-level track record enter the oversight rubric in Phase 2?
5. Is the disease landscape view (R8) a separate surface or a mode of the same
   search?
6. Should expanded access (compassionate use) be a first-class surface rather
   than a tag? It may be more relevant to our primary user than trials are.

---

## 11. Versioning

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-08-26 | Initial draft |
| 0.3 | 2026-08-26 | G3 (direct contact) added; goals renumbered. R10 contact templates added with constraints on sending, eligibility claims, health data, and bulk use. Job 1 primary metric changed to contact template copy rate. Template B copy rate added to Job 2. Coordinator flooding risk added. Assumption A8 added. |
| 0.2 | 2026-08-26 | Problem reframed around health literacy; five concrete failure modes named. User redefined by dissatisfaction and research-willingness rather than desperation; prior interview evidence added. Goals G2 (export) and G5 (stay informed) added. Requirements R1, R3, R4, R7, R8, R9 added. Metrics split by job; return rate added for Job 2. Assumption A7 added. |
