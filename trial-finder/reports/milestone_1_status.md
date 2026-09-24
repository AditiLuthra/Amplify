# Milestone 1 status

Milestone 1 per `CLAUDE.md`: fetch + verify only. No tag logic, no matching
logic, no UI. **All four parts are complete**, run against live data.

## Run summary

- Condition: "uterine fibroids"
- 501 records fetched from ClinicalTrials.gov API v2 in a single page,
  cached to `data/raw/uterine_fibroids/` (raw, unmodified JSON).
- Part B: `reports/field_coverage_report.md` — population rate for every
  field in `TAGGING_SPEC_v0.3.md` §2, plus the eight requested value
  distributions.
- Part C: `reports/persona_field_categorization.md` — structured-vs-free-text
  categorization for the test persona. Needed no live data; done earlier.
- Part D: `reports/eligibility_criteria_sample.md` — verbatim
  `eligibilityCriteria` for 10 randomly selected records.

## Finding: spec §3 TAG 4 is factually wrong about `overallStatus`

**This is the headline result of this test run, and it needs a spec fix
before Milestone 2 (TAG 4) starts.** Per `CLAUDE.md`'s working agreement,
this is *say so and stop*, not "fix it in code": TAG 4 isn't implemented in
Milestone 1, so nothing downstream had to be worked around, but the logic as
written won't be safe to implement until the spec is corrected.

`TAGGING_SPEC_v0.3.md` §3, TAG 4 states, as its headline v0.3 correction:

> **Correction (v0.3).** Earlier drafts keyed staleness off
> `overallStatus == UNKNOWN`. **That value does not exist in API v2.**

This is false. In the live "uterine fibroids" corpus, `UNKNOWN` is the
**second most common** `overallStatus` value: **97 of 501 records (19.4%)**.
Confirmed on a live record, not a parsing artifact:

```json
{
  "nctId": "NCT03134157",
  "overallStatus": "UNKNOWN",
  "statusVerifiedDate": "2020-10",
  "lastKnownStatus": "RECRUITING"
}
```

Full `overallStatus` distribution observed (n=501):

| Value | Count | % |
|---|---:|---:|
| COMPLETED | 243 | 48.5% |
| UNKNOWN | 97 | 19.4% |
| TERMINATED | 55 | 11.0% |
| RECRUITING | 40 | 8.0% |
| NOT_YET_RECRUITING | 23 | 4.6% |
| WITHDRAWN | 21 | 4.2% |
| ACTIVE_NOT_RECRUITING | 17 | 3.4% |
| ENROLLING_BY_INVITATION | 5 | 1.0% |

**Implication for TAG 4 as currently written.** The whole point of the v0.3
"correction" was that the ClinicalTrials.gov *website* derives an "Unknown
status" label the API supposedly doesn't expose, so the spec built a
from-scratch staleness heuristic (`statusVerifiedDate` > 24 months +
active-sounding status + completion date passed/absent) to reconstruct it.
That premise is wrong: the API does expose `UNKNOWN` directly, on a fifth of
records in this corpus. Before Milestone 2 implements TAG 4, the spec needs
to decide how `UNKNOWN` (real, structured, common) relates to the derived
staleness heuristic (inferred, only applies to "active-sounding" statuses) —
they may be overlapping signals rather than one replacing the other. Not
fixing this now; flagging for the spec owner per the working agreement.

Everything else checked out: every other field name in spec §2's module
table resolved and populated at a plausible rate (see the full coverage
table in `reports/field_coverage_report.md`) — no other field-name mismatches
found. `contactsLocationsModule.locations[].contacts[]` showed 0% population,
which looks like real sparsity (trials list `centralContacts` instead) rather
than a wrong path, since `centralContacts[]` itself populates on 27.3% of
records.

## To re-run

```bash
cd trial-finder
python3 scripts/fetch_trials.py "uterine fibroids"          # no-ops, already cached
python3 scripts/field_coverage_report.py "uterine fibroids"
python3 scripts/dump_eligibility_sample.py "uterine fibroids" --n 10
```

`fetch_trials.py` caches by page under `data/raw/uterine_fibroids/` with a
`_manifest.json` cursor; pass `--force` to refetch from scratch. The report
scripts never hit the network.
