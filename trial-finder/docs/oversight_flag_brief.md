# Feature brief: TAG 5 oversight flag, patient-facing presentation

**Status:** Draft — first pass, not reviewed. Written as a strawman to react
to, per the PM mentorship thread, not a decided design.

**Scope:** How the TAG 5 oversight rubric (`TAGGING_SPEC_v0.5.md` §3 TAG 5,
PRD R5/G5) actually reads to a patient, given the spec's own calibration
warning that most of the eight criteria are individually normal for
legitimate small academic trials. The rubric and its threshold (4 of 8) are
already decided and out of scope here — this brief is about presentation
only, and does not reopen the threshold or criteria list.

---

## 1. Where it appears

Shown on **every trial card in the results list**, not gated behind the
detail view — consistent with the facts panel already being "always shown"
per spec. Unflagged trials show no badge, but **the underlying facts panel
(FDA-regulated, DMC, sponsor class, site count, control group) is shown on
every trial regardless of flag status** — flagged or not. This matters
specifically so silence doesn't read as "vetted": the facts are always
visible, the flag is just a computed summary layered on top of facts the
user could already see for any trial.

## 2. The headline

The spec already mandates the literal label text when the rubric fires
(§3 TAG 5: **"Below our oversight standard (N of 8)"**, followed by the
criteria met) — this brief doesn't propose changing that line; it's the
published rubric output and shouldn't be softened or reworded per-surface.

What's missing is the **one sentence of context around it** that keeps a
legitimate small trial from reading this as an accusation. Proposed
standing sub-line, shown every time the label appears, not just on
request:

> *Most of these, on their own, are normal for small academic studies.
> This flag means several appear together — which is also true of some
> predatory operations, so we check for the combination.*

This doesn't water down the label (P2 still requires naming the specific
criteria), but it answers the question a scared user with a legitimate
university trial will otherwise ask: "wait, is MY trial bad?"

## 3. On click / expand

A plain list of the specific criteria met, each as three lines, no icons
implying danger (no warning triangles/red — same neutral visual treatment
as the rest of the facts panel):

```
Sponsored by a private clinic or individual
  Source: leadSponsor.class = "OTHER"
  Why this is checked: university, hospital, and government-sponsored
  trials have institutional oversight a private sponsor doesn't.

No independent data monitoring committee
  Source: oversightModule.oversightHasDmc = false
  Why this is checked: a DMC is an outside check on whether a trial
  should keep running. Most trials without one are still legitimate —
  this is one signal among eight, not a standalone concern.
```

Basis line once at the bottom of the expanded list (not per-criterion,
to avoid repeating the same citation eight times): "Criteria adapted from
ISSCR guidelines on unproven cell therapies and FDA warnings on unapproved
stem cell products." (Spec's own citation requirement, P2.)

## 4. Override / acknowledgment

Oversight-flagged trials are **never hidden** — R6's "this doesn't apply to
me" override is for Tier A exclusions and doesn't literally apply here,
since nothing was excluded. But the counter-metric (flagged-trial shortlist
rate) only means something if saving a flagged trial is a **deliberate**
act, not an accidental tap identical to saving any other trial.

Proposed: shortlisting a flagged trial takes one extra confirmation step
unflagged trials don't require —

> "You're saving a trial flagged on {N} of 8 oversight criteria. Save
> anyway?" [Save] [Learn more first]

Not a blocker, not hidden, not a second click of friction disguised as
protection — G7 ("never hide a trial the user might qualify for") stays
intact. This just makes "I looked and I'm still interested" an observable
action instead of an assumed one, which is what the counter-metric is
already trying to measure (§7) but currently has no UI event to attach to.

## 5. Explicitly not covered by this brief

- **Re-evaluation over time.** What happens to a flag if a sponsor adds a
  DMC six months later, or a flagged criterion becomes false. Real
  question, not this brief's.
- **Sponsor dispute/appeal.** PRD Risk table already names "oversight
  rubric draws sponsor dispute" as a known risk; this brief doesn't design
  a response process for it.
- **Visual design** (badge color, iconography, exact layout) — this brief
  is about what's *said*, not how it's *drawn*. A later UI pass (Milestone
  6) still owns that.

---

## Open for review

This is a first pass meant to be argued with, not approved. Specific
things worth pushing on:

- Is the extra confirm step (§4) too much friction, or not enough? The
  counter-metric needs *some* signal distinguishing "glanced past it" from
  "saw it and still chose it" — is a confirm dialog the right shape, or
  would a different mechanism (e.g. requiring the expanded list to have
  been opened at least once before saving) serve the same purpose with
  less friction?
- Is showing the flag on every list card (§1) too prominent given how many
  trials will likely hit it — recall Milestone 3's TAG 2/3 gap findings
  suggest heterogeneous, messy real-world data; TAG 5's actual hit rate on
  this corpus isn't known yet until Milestone 4 computes it. If it turns
  out a large fraction of trials flag, that changes whether list-level
  display is still the right call versus detail-view-only.
