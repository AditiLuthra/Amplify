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
