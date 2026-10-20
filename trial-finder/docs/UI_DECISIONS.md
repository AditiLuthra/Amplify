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
