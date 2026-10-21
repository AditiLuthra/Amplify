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

**Built instead: evidence-level sort.** A toggle between "Lowest involvement
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
