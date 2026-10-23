# UI decisions log

Pre-Milestone-6 decisions, made deliberately before any UI code exists so the
choices aren't biased by whatever gets built first. Each entry: the question,
options considered, the choice, and why. Revisit here if a later milestone
finds a decision doesn't hold up — don't silently override it in code.

---

## D1 — Where do Job 1 and Job 2 live?

**Question:** Job 1 (find a trial to enroll in, R1–R4) and Job 2 (stay
informed on a disease, R8) have distinct success metrics in the PRD (§7).
Does the UI give them separate destinations, or one surface?

**Options considered:**
- A — Two separate surfaces (explicit "Find a Trial" / "Disease Landscape" tabs)
- B — Landscape strip above results (one page, persistent stat strip above the ranked list)
- C — One view that mode-shifts (intake infers intent, same view reshapes)

**Decision: B — Landscape strip above results.**

One surface. Every search opens with a compact, persistent summary (e.g.
"501 trials · 62 recruiting · 243 completed · 21 flagged") sitting above the
ranked results list — always visible, never a separate destination a user has
to choose between up front.

**Why:** avoids A's cost (searching the same condition twice if intent shifts
mid-session) and C's cost (fuzzy intent inference, messier metric
instrumentation per PRD §7's job split). Landscape context is free even for a
Job-1 user, and nobody has to declare their intent before seeing anything.

**Open follow-on to watch:** a Job-2-only user (not ready to search, just
watching) still lands in a search-shaped page rather than a landscape-shaped
one. If usage data later shows this reads wrong for pure Job-2 sessions,
revisit — don't just add a mode-switch on top without coming back here.

---

## D2 — UI stack (Milestone 6)

**Question:** `CLAUDE.md` explicitly left the UI stack "undecided... do not
scaffold it ahead of the milestone that needs it." Milestone 6 is that
milestone.

**Options considered:**
- A — A framework (React/Next or similar) with a build step
- B — A static page: plain HTML/CSS/vanilla JS, no framework, no build step
- C — Reuse the diagnostic Artifact viewer's approach (same idea as B, just
  published as a Claude Artifact instead of repo files)

**Decision: B — static HTML/CSS/vanilla JS, no build step**, with an
Artifact publish of the same file for interactive preview (not a
replacement for the repo files — belt and suspenders, not option C alone).

**Why:** Phase 1 is explicitly client-side-only (PRD R1b — "nothing leaves
the device," no server, no auth). A static page that reads the pipeline's
own JSON output needs nothing a framework would add — no routing, no
server state, no build pipeline to maintain. This also matches the
project's own established pattern: `scripts/` is stdlib-only Python with
no dependencies "so ... scripts run anywhere without an install step"
(`CLAUDE.md`). A framework becomes worth its cost once Phase 2 introduces
real server state (R1 progressive intake persisted server-side, contact
template generation, matching across many conditions) — revisit then, not
now.

---

## D3 — Oversight flag display for the "undetermined" status (Milestone 6)

**Question:** Milestone 4 found TAG 5 produces three outcomes, not two:
confirmed `flagged` (27.5% of the corpus), confirmed `not_flagged` (1.6%),
and `undetermined` (70.9% — could reach the 4-of-8 threshold once TAG 6 and
a body-system taxonomy exist, but isn't confirmed either way yet). The
published rubric (`TAGGING_SPEC_v0.5.md` §3 TAG 5) only describes two UI
states ("≥4: show the label" / "<4: no label"). `docs/oversight_flag_brief.md`
§1 flagged this as open, pending this number.

**Options considered:**
- A — Treat `undetermined` the same as `not_flagged` (show nothing)
- B — Treat `undetermined` the same as `flagged` (show the warning label)
- C — A third, distinct, low-key state: facts panel always shown (per
  spec, unconditionally), a confirmed-flagged verdict badge only for
  `flagged`, and a quiet, separate note for `undetermined` that says
  plainly that the check is incomplete — not a warning, not a clean bill

**Decision: C.**

**Why:** A silently hides the real possibility that 70.9% of trials might
belong in the 27.5% once more data exists — exactly the false-negative
direction P1 says costs more than a false positive. B would put a warning
label on 7 of 10 trials in this corpus, most of which are ordinary small
academic studies (per `CLAUDE.md`'s own calibration note) — that's alarm
fatigue dressed as safety, and it's the specific harm `docs/oversight_flag_brief.md`
§2 already exists to avoid. C keeps the facts panel honest and
unconditional (nothing is hidden), reserves the verdict language the spec
mandates for the cases it's actually confirmed for, and names the
uncertainty instead of resolving it either direction. Revisit once TAG 6 /
a body-system taxonomy exist and `undetermined` mostly resolves to one of
the other two.

---

## D4 — "Sort by how promising" (declined), evidence-level sort (built)

**Question:** Requested directly during Milestone 6: sort trials by how
promising the therapy is, and flag dicey sponsors / unproven pay-to-enroll
therapies (stem cell clinics named as the motivating example).

**The oversight-flagging half was already built** — TAG 5 / `UI_DECISIONS.md`
D3, and the stem-cell-clinic scenario is the literal case its criteria
cite (ISSCR guidelines, FDA warnings). The gap is that criterion 1
("participants pay") needs TAG 6, not yet built — motivation to prioritize
Milestone 7 next, not a new decision.

**The "promising" half was declined**, not built. `PRD_trial_finder.md`
Non-goal §4.2 ("we do not rank trials by likelihood of benefit — we cannot
know this") already covers this, and §5.3 already explains why: there's no
honest computable signal, the spec's own results-framing rule says an LLM
summarizing outcome tables "will sometimes call a failed trial promising,"
and the PRD's risk table names "false hope" as a High-severity risk with
"no ranking by benefit" as its stated mitigation. Confirmed this with the
product owner rather than assuming the non-goal still held — see PRD
versioning 0.7.

**Built instead: evidence-level sort.** A toggle between "Lowest burden
first" (the existing default) and "Most evidence first" — the latter
sorts by TAG 1's phase ladder (`EARLY_PHASE1` → ... → `PHASE4`), which the
spec already frames as an evidence-accumulation order ("Large-scale
confirmation... more evidence stands behind the treatment at this stage
than at any earlier one"), never a benefit claim.

**One subtlety worth naming.** Trials with no FDA phase (`NA` — normal for
behavioral, device, and observational studies) aren't placed at the bottom
of the evidence sort. The spec is explicit that `NA` "is not a quality
signal," so ranking them last would visually assert the opposite of what
the spec says is true. They're shown in their own labeled group below the
phased trials instead, with a one-line note saying why — a separate fact,
not a lower rank.

---

## D5 — "Common signs of a predatory trial" tips content (raised 2026-10-20)

**Question:** Following D4, the oversight rubric (TAG 5) still only catches
what's computable from structured fields and TAG 6, and can't catch a
scientifically-unvalidated therapy run with clean oversight (an FDA-reviewed,
multi-site, DMC-monitored trial testing something speculative). Raised
directly: a static "tips/warnings" section teaching patients to recognize
predatory patterns themselves, reviewed twice a year. Where should it live?

**Options considered:**
- A — Standalone tab/page (a separate destination, closer to a FAQ/help page)
- B — Linked from the oversight panel (a small link next to each trial's
  facts panel, pointing at one shared section)
- C — Both: a teaser from the oversight panel plus a fuller standalone page

**Decision: B.** Confirmed directly rather than assumed, given D1's "one
surface" precedent would otherwise seem to argue against any new tab.

**Why this doesn't repeat D1's problem.** D1 was about not splitting Job 1
and Job 2 into two destinations a user has to choose between *before seeing
anything*. This is different in kind: one shared, reusable explainer,
surfaced contextually at the exact moment a user is already looking at
oversight information, never a page someone has to find on their own. No
new navigation, no URL, no choice to make up front — an inline `<details>`
block (same pattern as "More about this trial") anchored once in the page,
linked to from every card's oversight note.

**Scope boundary, same reasoning as TAG 5 and D4.** Content stays procedural
and financial (cost, evidence type, who's administering, oversight status) —
never a claim that a specific therapy modality doesn't work. That line is
what keeps this consistent with Non-goal §4.2/§4.3; "stem cell clinics
charging patients and relying on testimonials instead of published data" is
a pattern fact, not a verdict on stem cell therapy itself. Sourced from
ISSCR's patient handbook and FDA consumer guidance (both already the
implicit basis for TAG 5's own criteria per D4) — see citations in the page
itself.

**Maintenance:** a manually-edited static block, reviewed twice a year per
the request — no new mechanism needed, consistent with D2's no-build-step
stack. A "last reviewed" date is shown in the content itself so staleness is
visible rather than silently assumed-current.

---

## D6 — Real intake (R1/R1b), replacing the hardcoded example patient

**Question:** Every trial card's Tier A exclusion was baked at pipeline
time against one hardcoded example patient (30F, no prior surgery) passed
via `tag_trials.py --patient-*` CLI flags — not a real visitor's own
profile. R1 (structured intake) and R1b (local-only patient profile)
were speced but never built. How should real intake work, given Phase 1's
"nothing leaves the device" boundary?

**Options considered:**
- A — Keep Tier A exclusion server/pipeline-side; regenerate the tagged
  JSON per visitor profile (requires a server — Phase 2, out of scope)
- B — Expose the raw structured eligibility fields
  (`minimumAge`/`maximumAge`/`sex`/`healthyVolunteers`) per trial in the
  tagged JSON, unevaluated, and recompute Tier A exclusion **live in the
  browser** against whatever profile the visitor enters
- C — Client-side intake UI only, still evaluated against the one baked
  example profile (cosmetic form, no real effect)

**Decision: B.**

**Why:** A needs a server, which is exactly the Phase 1/Phase 2 boundary
R1b already drew ("nothing leaves the device," `UI_DECISIONS.md` D2). C
would be a form that does nothing — worse than not building it, since it
implies personalization that isn't real. B keeps everything client-side:
`tag_trials.py` now also emits an `eligibility_raw` field per trial (the
same four fields `tier_a_exclusion` was already computed from, just not
re-evaluated), and `web/index.html` carries a JS port of
`tier_a_exclusion()`/`parse_age_to_years()` — same logic, same reasons
text, verified to produce identical results to the Python original on
this corpus (spot-checked age/sex/healthy-volunteer mismatches against
known records).

**Placement, per R1b's progressive-disclosure requirement:** a collapsed
`<details>` panel ("Tell us about yourself (optional)") right below the
landscape strip, not a blocking modal or a separate screen before results
show — consistent with D1's "nobody has to declare intent before seeing
anything." Three fields only: age, sex, healthy-volunteer status — the
exact three Tier A already uses. The free-text attributes from
`reports/persona_field_categorization.md` (prior surgery, fertility
intent, anemia severity) are **not** in this panel; they'd feed Tier B/C,
which isn't wired into the UI yet (Milestone 7 status: only 10/501 records
have Stage 3 structuring) — adding fields that don't affect anything yet
would be the same "cosmetic form" problem option C had.

**Storage and disclosure:** `localStorage`, one JSON blob, wrapped in
try/catch (private browsing, blocked storage). The panel states plainly,
every time it's open, that this never leaves the browser and is lost on
clearing data or switching devices — R1b's own requirement, not a new
decision.

**Default behavior preserved:** with no saved profile, every card still
renders exactly as before (the baked example-persona result) — a first-time
visitor sees the same thing Milestone 6 already shipped, personalization is
additive, not a precondition for seeing anything.

---

## D7 — Shortlist + export (R9), and the confirm-step it unblocked

**Question:** R9 ("save trials; export a physician-ready file") was speced
but never built. Building it also directly answers
`oversight_flag_brief.md` §4's confirm-step question, which was explicitly
blocked on shortlisting not existing yet — "nothing to decide here until
R9 exists to attach a confirm step to" (this doc's own D6 entry said as
much).

**Decision:** Client-side only, same storage model as R1b (`localStorage`,
nothing transmitted). A "☆ Save for later" / "✓ Saved" toggle on every
visible card; a shortlist bar (count + "Download for your doctor") that
only appears once something's saved. Export is a self-contained static
HTML file — no app JS inside it, so it's genuinely something to hand to a
clinician (PRD G2), not an export of our interface. Each entry: title,
NCT ID + link, phase, placebo exposure, intervention category, brief
summary, oversight status, cost status — the same facts already on the
card, not new content.

**The confirm step, resolved:** saving a flagged trial (`tag5_oversight.status
=== "flagged"`) triggers one `window.confirm()` with the brief's own
proposed copy: *"You're saving a trial flagged on N of 8 oversight
criteria. Save anyway?"* Cancel just declines the save — the trial stays
fully visible and nothing else changes, preserving G7. This is a
simplification of the brief's exact proposal (native `confirm()` only
offers OK/Cancel, not the brief's suggested [Save]/[Learn more first]
button pair) — judged not worth a custom modal for a two-button decision;
revisit if usage data says otherwise.

**Scope boundary:** no multi-condition support (there's only one condition's
data to save from), and no "shared list" or server sync — purely a local
list of NCT IDs re-joined against `allData` at export time.

**Bug caught by testing, not inspection:** the shortlist bar's own CSS
(`display: flex`) silently overrode its `hidden` attribute — same
specificity, author rule wins, so it rendered even when JS had correctly
set `hidden`. Found by asserting `is_hidden()` in a real browser rather
than trusting the attribute was being respected; fixed with an explicit
`.shortlist-bar[hidden] { display: none; }` override. Worth remembering
for any future element that combines the native `hidden` attribute with
its own `display` override.

---

## D8 — Multi-condition support: a fixed picker, not free-text search

**Question:** The page was hardcoded to one condition (uterine fibroids).
R1's "describe disease and current condition" implies real search. What's
actually buildable in Phase 1?

**Options considered:**
- A — Free-text condition search, fetching + tagging on demand
- B — A picker among a small, fixed set of conditions, each pre-fetched
  and pre-tagged ahead of time by actually running
  `fetch_trials.py`/`tag_trials.py`

**Decision: B.**

**Why:** A needs a live backend - fetching from ClinicalTrials.gov and
running the full tagging pipeline (TAG 1-6, Tier A) takes real time and
can't happen client-side in response to a keystroke, which is exactly the
Phase 1 "nothing leaves the device, no server" boundary again (same
reasoning as D6). B stays genuinely client-side: each condition's data is
a real, already-tagged static JSON file, same as the original uterine
fibroids one. Added a second condition, endometriosis (959 records,
fetched and tagged for real, not fixture data) to prove the picker
actually swaps datasets rather than just relabeling the same one.

**Real finding from adding it:** endometriosis's TAG 5 flagged rate is
50.4% (483/959), nearly double uterine fibroids' 27.5% (Milestone 4).
Not investigated further here (out of scope for a UI change) but worth
the spec/product owner knowing before assuming the 27.5% baseline
generalizes across conditions.

**Shortlist/export, revised to make this safe:** R9 (D7) originally stored
bare NCT IDs and re-joined against whichever condition's data happened to
be loaded - correct only when exactly one condition ever loads. Changed to
store full trial snapshots at save time, so a trial saved under one
condition survives switching to another and still exports correctly. A
test proved the gap this fixes: saving under uterine fibroids, switching
to endometriosis, saving again, and exporting now correctly includes both,
verified by content-matching the export file.

**Scope boundary:** still no free-text search, no "add your own condition,"
and the patient profile (R1b) and shortlist (R9) are both intentionally
condition-independent - they're about the person, not the search.

---

## D9 — Contact templates (R10): mailto, not sending on the user's behalf

**Question:** R10 was speced (Template A "Am I a fit?", Template B "Keep me
posted," with explicit constraints) but never built. How to implement
"the user copies the text and sends it from their own email client"
without a backend?

**Decision:** `tag_trials.py` now resolves a `contact` field per trial
(first entry with an email, `centralContacts[]` then `locations[].contacts[]`
— checked against the real corpus: `PRINCIPAL_INVESTIGATOR`/`SUB_INVESTIGATOR`
entries often have a name but no email, so "first contact" alone would
silently pick an unreachable one on real records). 143/501 uterine
fibroids records and the equivalent share of endometriosis resolve to a
real contact; the rest show R10's own fallback ("no contact is listed...
see the full listing") rather than a fabricated route.

Each card's "more" details gets a `mailto:` link (prefilled subject +
body, opens the visitor's own configured email client) plus a "Copy
text" button (clipboard, with a manual-select fallback for browsers
without Clipboard API access) - two ways to get the same text into an
email the visitor sends themselves, never sent by this product.

**Trigger logic, per spec, verified against real records in all four
branches:** Template A alone when `overall_status === "RECRUITING"` and
not hesitant; Template B alone when not recruiting; **both together**
when recruiting but early-phase (`EARLY_PHASE1`/`PHASE1`) or high-burden
(rank ≥ 4) - confirmed on a real record that hits this exact combination,
not just reasoned about in the abstract.

**Constraints already in the spec, not new decisions, confirmed in the
implementation:** never "I qualify," never prefilled with intake-panel
(R1b) answers, one trial at a time (no bulk-contact UI exists to misuse).

---

## D10 — Filtering (R4's remaining dimension), and why cost isn't one

**Question:** R4 names five filter/sort dimensions: burden, placebo
probability, cost, oversight, recency. Burden and evidence (a proxy for
recency of research stage, not record freshness) already have sort
toggles. The other three had neither sort nor filter.

**Decision:** Added filter checkboxes (not sort — these are binary
hide/show, not orderings) for oversight ("Flagged trials"), placebo
("Trials with placebo risk"), and recency ("Records not updated in 2+
years" — `tag4_status.record_out_of_date`). **Deliberately no cost
filter**: `tag6_cost.status` is `"not_stated"` on every single record in
both corpora (Milestone 7's real finding, unchanged since). A filter
checkbox that can never remove a single trial is the same non-functional-
control problem D6 and D8 already named and avoided — building it now
would imply a capability that doesn't exist. Revisit once some corpus
actually resolves a cost status.

**`tag2_placebo` gained a `has_placebo` boolean** (`tag_trials.py`) rather
than the UI string-matching the existing label text — a label is
copy, not data, and matching against it would break the moment the
copy changes for an unrelated reason.

**Real finding from checking the distribution before building the UI:**
73.7% of the uterine fibroids corpus (369/501) is `record_out_of_date`
(no update in 2+ years) — a strikingly high share. Not a bug (verified
the field's own logic in Milestone 2/4), but worth the product owner
knowing: a staleness filter this aggressive-sounding will remove nearly
three-quarters of the corpus if used alone.

**Composability and scope:** filters apply on top of (never instead of)
the existing Tier A/TAG4 structured exclusion — a trial hidden by a
filter is a completely different thing from a trial in the "not shown
above" drawer (R6), and filters never add to that drawer. Filter state is
session-only (not `localStorage`) — unlike the patient profile (R1b) and
shortlist (R9), there's no "losing something real" cost to resetting on
reload, and persisting it would be unrequested scope.

---

## D11 — Surface TAG 1's phase explanation (found via a live screenshot, not a planned milestone)

**Finding:** The product owner spotted a real trial in production — an
esketamine trial for postoperative endometriosis pain, Phase 4, 50%
placebo arm — whose phase pill just said **"Already approved,"** with no
context, right next to "You may receive a placebo (about 50%)." Read on
its own, that reads as "this is proven to work," when what `PHASE4`
actually means (per `TAGGING_SPEC_v0.5.md`'s own table) is that the
underlying drug is approved *for something* — esketamine is approved for
treatment-resistant depression, not this use — and this trial exists
*because* that's still unproven for this condition, hence the placebo arm.
`tag1_phase()` has always computed an `explanation` field for exactly this
("Studies a treatment already on the market, usually for long-term or
real-world effects") — it was simply never rendered anywhere, for any
phase, since Milestone 2. Not a new bug from this session's work; a
pre-existing gap this screenshot happened to surface.

**First fix (insufficient):** the phase pill gained the explanation as a
native `title` (hover, desktop), plus an explicit "What '{label}' means:
..." line in "More about this trial." Shipped, verified in a desktop
browser against the exact record — and wrong-sized for how this product
is actually used. The product owner hit the *identical* confusion again
immediately after, on a phone, looking at the collapsed card: `title`
doesn't exist on touch, and nobody taps "More about this trial" before
forming a first impression. A fix that only helps once you've already
gone looking for more context doesn't help with a pill that's misleading
at a glance — the whole problem.

**Actual fix:** changed the always-visible pill text itself, no
interaction required. `TAGGING_SPEC_v0.5.md`'s own `PHASE4` row changed
from **"Already approved"** to **"Already approved (for other uses)"**,
with the explanation sharpened to say directly what was previously only
implied: *"The treatment is already approved and sold for a different
use — this trial is testing whether it also works for this one. That's
exactly why there's a placebo or comparison group: it isn't proven for
this yet."* This is a spec wording change, not just a UI one — treated
that way (`TAGGING_SPEC_v0.5.md` edited in the same change as
`tag_trials.py`), since the previous entry's "flagged for later" on
exactly this point turned out not to survive contact with a real user for
even one more exchange. Reverified on the same record
(`NCT07881562`), this time confirming the pill text alone, collapsed, no
hover, no tap, already says the disambiguating thing.

**Why this one became the actual fix and the hover/expand version
didn't:** this product's own screenshots, across this entire session,
are consistently phone-shaped. Designing a safety-relevant disambiguation
to depend on hover was never going to hold up — worth remembering for any
future case like this: if the fact matters enough to clarify, it belongs
in the string that's always on screen, not behind an interaction.

---
