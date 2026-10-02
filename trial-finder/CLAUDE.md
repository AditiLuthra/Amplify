# Clinical Trial Finder

A patient-facing tool that makes ClinicalTrials.gov usable for people without
clinical training.

## Read these first

- `docs/PRD_trial_finder.md` — why we're building this, who for, what's in and
  out of scope. Read when a decision needs justifying.
- `docs/TAGGING_SPEC_v0.5.md` — exact rules for every tag, exclusion, and
  display string. **This is the source of truth for implementation.**

## Working agreement

**The spec governs.** If a rule in `TAGGING_SPEC_v0.5.md` is ambiguous or wrong,
say so and stop — do not invent behavior to fill the gap. We fix the spec first,
then implement. A spec that drifts from the code is worse than no spec.

**Do not simplify safety rules without asking.** Several rules look
over-engineered and are not:

- The oversight rubric threshold is **4 of 8**. Lowering it flags ordinary
  academic research. Do not "simplify" it into a weighted score.
- Text-derived exclusions **downrank, never hide**. Only structured-field
  mismatches (age, sex, healthy-volunteer status) may remove a trial from the
  main list.
- Cost defaults to **"Not stated"**, never "free".
- Unrecognized devices default to burden rank **2**, never 1.

**Plain language is the product.** Every user-facing string is written for
someone without clinical training. If a tag label reads like it was written for
a researcher, it's wrong.

**Preserve verbatim source text.** Any paraphrase or generated summary must keep
the original trial text available alongside it, and generated text must be
marked as generated.

## Data source

ClinicalTrials.gov API v2 — public, no key, no auth.
Base: `https://clinicaltrials.gov/api/v2/studies`

Field names verified 2026-08-26. Gotchas:

- Pagination is **cursor-based** (`nextPageToken`), not offset. Pass
  `countTotal=true` on the first request.
- The `fields` request parameter uses **PascalCase** (`NCTId|BriefTitle`) but
  the JSON response uses **camelCase** (`nctId`, `briefTitle`).
- `overallStatus` has **no `UNKNOWN` value**. Staleness is derived from
  `statusVerifiedDate`. See TAG 4.
- Be reasonable with request rate. Cache aggressively; the corpus barely moves
  day to day.

## Build order

Each milestone is verifiable before the next begins. Do not scaffold ahead.

1. **Fetch + verify** — pull trials for one condition, cache to disk, dump raw
   JSON, confirm every field name in spec §2 against a live record
2. **TAG 1 + TAG 4** — phase and freshness. Pure lookups, no inference
3. **TAG 2 + TAG 3** — placebo exposure and burden. Light logic
4. **TAG 5** — oversight facts panel and rubric
5. **Tier A exclusions** — structured fields only
6. **UI**
7. **Text extraction** — TAG 6 cost, and exclusion Tiers B/C. Last, because it's
   the only part needing an LLM

## Testing

Pin a handful of known NCT IDs as fixtures and check tag output by hand after
each milestone. Domain review catches what unit tests miss — a wrong burden
level or a misleading label is not a crash.

## Stack

Milestone 1 (fetch + verify) is plain Python 3 stdlib — `urllib`, `json`,
`argparse` — no dependencies, so ingest/report scripts run anywhere without an
install step. Scripts live in `scripts/`. **Stack for later milestones
(matching, UI) is still undecided** — do not scaffold it ahead of the
milestone that needs it.
