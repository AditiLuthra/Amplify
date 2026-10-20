# Milestone 2 status

Milestone 2 per `CLAUDE.md` build order: **TAG 1 (phase) + TAG 4 (freshness
and status)**. Pure lookups, no inference beyond what the spec itself states,
no text extraction, no UI. Run against the same live "uterine fibroids"
corpus cached in Milestone 1 (501 records).

## Run summary

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"
```

Reads `data/raw/uterine_fibroids/`, writes one tag record per trial to
`data/tagged/uterine_fibroids.json`. Never hits the network. `--as-of` lets
the freshness computation date be pinned for reproducible runs (defaults to
today).

**Zero gap records.** Every `phases[]` shape and every `overallStatus` value
in the 501-record corpus was covered by the spec — no unrecognized
combination was hit, so nothing needed to fall back to a flagged gap.

## TAG 1 — phase, label distribution (n=501)

| Label | Count |
|---|---:|
| No FDA phase | 311 |
| Large-scale confirmation | 70 |
| Already approved | 42 |
| Testing whether it works | 37 |
| Early safety testing | 20 |
| Mid-to-late: Large-scale confirmation | 10 |
| Very early research | 8 |
| Early-to-mid: Testing whether it works | 3 |

**Note on "No FDA phase" (311/501, 62%).** This includes both explicit
`phases: ["NA"]` and an *empty* `phases[]` array. The spec's TAG 1 table only
describes the explicit `"NA"` enum value; an empty array isn't named
separately. All 131 empty-array records in this corpus have
`studyType == OBSERVATIONAL` — confirmed directly, not assumed — which
matches the spec's own explanation text for `NA` ("normal for behavioral,
device, dietary, and **observational** studies"). Treated as the same case
rather than a new rule. Flagging here per the working agreement rather than
treating it as self-evidently settled — a good place for the spec owner to
confirm on next spec pass.

**Combined-phase pairs.** The spec names two prefixes ("Early-to-mid",
"Mid-to-late") without giving the full mapping. Checked the live corpus
before implementing: only two 2-element combinations occur —
`{PHASE1, PHASE2}` (3 records) and `{PHASE2, PHASE3}` (10 records) — which
maps cleanly onto the two named prefixes. `scripts/tag_trials.py` hard-codes
only these two; any other pair (or an unrecognized single phase value) is
returned as a flagged gap, never guessed at.

## TAG 4 — freshness and status (n=501)

| Outcome | Count |
|---|---:|
| **Excluded from default results** | **363** |
| — `overallStatus == UNKNOWN` | 97 |
| — `TERMINATED` | 55 |
| — `WITHDRAWN` | 21 |
| — `COMPLETED`, no results posted | 190 |
| Completed, routed to "What this trial found" (not excluded) | 53 |
| `ENROLLING_BY_INVITATION` (shown, labeled, not excluded) | 5 |
| Fresh, no label (`RECRUITING`/`NOT_YET_RECRUITING`/`ACTIVE_NOT_RECRUITING`) | 80 |
| `record_out_of_date` flag set (`lastUpdatePostDateStruct.date` > 24mo) | 369 |
| `derived_stale` (active-sounding + `statusVerifiedDate` > 24mo + completion passed/absent) | 0 |

**Product-relevant finding, not a bug.** 72% of this condition's trials
(363/501) are excluded from the default results view by TAG 4 alone, before
Tier A exclusions (age/sex/healthy-volunteer) even apply. That's expected —
`overallStatus == UNKNOWN` and stale completed-without-results trials are
exactly what TAG 4 exists to filter — but it's worth the product owner
seeing the number before Milestone 5/6, since a results view that starts at
~28% of the corpus changes how "N trials found" should be framed in the UI.

**`derived_stale` never fired on real data (0/501).** Checked directly: no
record in this corpus has both an active-sounding status *and* a
`statusVerifiedDate` over 24 months old *and* a completion date that has
passed or is absent. `record_out_of_date` (the separate `lastUpdatePostDateStruct`
check) fires constantly — 369/501 — because it isn't gated on status at all,
per the spec's table. This asymmetry is real, not a bug: confirmed the
`derived_stale` code path works via a synthetic fixture (below), since the
live corpus doesn't happen to exercise it.

## Fixture checks (hand-verified against `TAGGING_SPEC_v0.5.md` §3)

Pinned NCT IDs, one per TAG 4 branch plus the phase-combination cases,
verified by hand against the printed tag output.

| NCT ID | Scenario | Expected | Got | ✓ |
|---|---|---|---|---|
| NCT03134157 | `overallStatus == UNKNOWN` | Excluded, "Status unknown", shows `lastKnownStatus: RECRUITING` | Matches | ✓ |
| NCT00001850 | `TERMINATED` | Excluded, "Terminated" | Matches | ✓ |
| NCT03156127 | `WITHDRAWN` | Excluded, "Withdrawn" | Matches | ✓ |
| NCT02323646 | `COMPLETED` + `hasResults=true` | Not excluded, routed to completed view | Matches | ✓ |
| NCT06067971 | `COMPLETED` + `hasResults=false` | Excluded, "no results posted" | Matches | ✓ |
| NCT07335432 | `ENROLLING_BY_INVITATION` | Shown, invitation-only label, not excluded | Matches | ✓ |
| NCT05386615 | `RECRUITING`, fresh | No label, not excluded | Matches | ✓ |
| NCT06576362 | `NOT_YET_RECRUITING`, `statusVerifiedDate` 25mo stale, **completion date in 2028 (not passed)** | `derived_stale` must be **False** (negative case for the completion-date guard) | `derived_stale: False` | ✓ |
| NCT01026805 | Observational, empty `phases[]` | "No FDA phase" | Matches | ✓ |
| NCT06067971 | `phases: ["NA"]` explicit | "No FDA phase" | Matches | ✓ |
| NCT00584207 | `phases: ["EARLY_PHASE1"]` | "Very early research" | Matches | ✓ |
| NCT01069094 | `phases: ["PHASE1","PHASE2"]` | "Early-to-mid: Testing whether it works" | Matches | ✓ |
| NCT00712595 | `phases: ["PHASE2","PHASE3"]` | "Mid-to-late: Large-scale confirmation" | Matches | ✓ |
| *(synthetic)* | Active-sounding + stale `statusVerifiedDate` + completion **passed** | `derived_stale` must be **True** | `derived_stale: True`, label "Status unverified..." | ✓ |
| *(synthetic)* | `phases: ["EARLY_PHASE1","PHASE3"]` (unlisted pair) | Flagged as gap, not guessed | `gap: True` | ✓ |

All 15 checks pass. No spec ambiguity found beyond the "No FDA phase" note
above, which is a documentation gap (worth a spec clarification pass) rather
than a behavioral one — the implemented behavior already follows the spec's
own stated rationale.

## To re-run

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"                    # writes data/tagged/uterine_fibroids.json
python3 scripts/tag_trials.py "uterine fibroids" --as-of 2026-09-28 # pin the freshness reference date
```

## Next per `CLAUDE.md` build order

Milestone 3: **TAG 2 (placebo exposure) + TAG 3 (intervention type and
burden)** — "light logic," first milestone needing the device-disambiguation
keyword pass rather than pure lookups.
