# Milestone 1 status

Milestone 1 per `CLAUDE.md`: fetch + verify only. No tag logic, no matching
logic, no UI.

## Blocked: Parts A, B, D need live network access

This session's environment blocks outbound requests to `clinicaltrials.gov`
at the network egress proxy (policy denial, HTTP 403 on `CONNECT`) — confirmed
both via direct `curl` and via the `WebFetch` tool, so it isn't a client-side
problem. All three fetch-dependent parts of Milestone 1 are therefore **not
run yet**:

- **Part A** (fetch + cache raw JSON) — script written and tested against a
  synthetic fixture shaped like the real API v2 response, but never run
  against the live API.
- **Part B** (field coverage report) — script written and tested; needs Part
  A's output to run for real.
- **Part D** (10-record eligibility dump) — same.

**Part C** (persona field categorization) required no live data — it's a
structured-vs-free-text analysis against the field list in
`docs/TAGGING_SPEC_v0.3.md` §2 — and is done: see
`reports/persona_field_categorization.md`.

## To unblock

Add `clinicaltrials.gov` to this Claude Code on the web environment's network
egress allowlist (environment settings → network access), then start a **new
session** on this branch — the egress policy is loaded when a session's proxy
starts, so a session already running won't pick up a mid-session change.

## To run once unblocked

```bash
cd trial-finder
python3 scripts/fetch_trials.py "uterine fibroids"
python3 scripts/field_coverage_report.py "uterine fibroids"
python3 scripts/dump_eligibility_sample.py "uterine fibroids" --n 10
```

`fetch_trials.py` is safe to re-run — it caches by page under
`data/raw/uterine_fibroids/` with a `_manifest.json` cursor, and no-ops once
`complete: true` (pass `--force` to refetch from scratch). The report scripts
never hit the network; they only read the local cache.

## What's committed now

- `scripts/fetch_trials.py` — Part A. Cursor pagination via `nextPageToken`,
  writes raw unmodified page responses, resumable cache.
- `scripts/field_coverage_report.py` — Part B. Walks every field in spec §2's
  module table, computes % populated, and value distributions for the eight
  fields the task named.
- `scripts/dump_eligibility_sample.py` — Part D. Random sample of N records'
  verbatim `eligibilityCriteria`.
- `reports/persona_field_categorization.md` — Part C, complete.
- `data/raw/` — empty, pending the fetch above.
