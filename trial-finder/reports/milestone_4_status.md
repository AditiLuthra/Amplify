# Milestone 4 status

Milestone 4 per `CLAUDE.md` build order: **TAG 5 (oversight facts panel and
rubric)**. Run against the same live "uterine fibroids" corpus (501
records). `scripts/tag_trials.py` now computes TAG 1-5 in one pass.

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"
```

## Finding: the published rubric isn't fully computable yet — and the build order itself says so

`TAGGING_SPEC_v0.5.md` §3 TAG 5 names eight criteria. Two of them are not
structured-field lookups at all:

- **Criterion 1 ("participants pay to enroll")** requires TAG 6's free-text
  cost extraction. `CLAUDE.md`'s own build order places **TAG 6 at
  Milestone 7** ("the only part needing an LLM") — after this one. TAG 5 as
  specified has a dependency on a milestone that hasn't run.
- **Criterion 7 ("unrelated conditions... spans 3+ unrelated body
  systems")** has no body-system taxonomy defined anywhere in the spec.
  Classifying free-text `conditions[]` into body systems is inference, not
  a lookup — inventing a taxonomy here would be exactly the kind of
  silent invention the working agreement exists to prevent.

This isn't implemented around. `tag5_oversight()` computes the other six
criteria and is explicit that the result is a **partial** count, not the
full published rubric.

**The asymmetry that makes partial results still useful.** Unlike TAG 2/3's
gaps (where an unresolved component meant withholding the whole result,
per P5), TAG 5's missing criteria can be reasoned through safely, because
every additional criterion can only **add** to the count, never subtract:

- If the **6 computable criteria alone already total ≥ 4**, the trial is
  confirmed flagged — the 2 missing criteria can't un-flag it. Waiting on
  Milestone 7 before surfacing this would only delay a true positive,
  which is the wrong direction to err on a safety-relevant label (P1).
- If even the most generous assumption (every unresolved/uncomputable
  criterion turns out true) still can't reach 4, the trial is confirmed
  **not** flagged.
- Otherwise: **undetermined** — depends on data this milestone doesn't
  have.

## Results on this corpus (n=501)

| Status | Count | % |
|---|---:|---:|
| **Flagged** (confirmed ≥4 of 8, from 6 computable criteria alone) | **138** | **27.5%** |
| Undetermined (could reach 4+ once TAG 6 / body-system taxonomy exist) | 355 | 70.9% |
| Not flagged (confirmed — can't reach 4 even in the most generous case) | 8 | 1.6% |

**27.5% of this single-condition corpus is already confirmed flagged, before
two of the eight criteria even exist yet.** This is the single most
important number this milestone produced, and it directly changes an open
question in `docs/oversight_flag_brief.md` §1 (whether a list-level badge
on every card is the right call, versus detail-view-only) — a flag on
roughly 1 in 4 cards is a very different UI problem than a flag on a rare
outlier. Revisit that brief section with this number in hand before
Milestone 6 UI work starts.

## Per-criterion breakdown

| Criterion | True | False | Unresolved (field missing) |
|---|---:|---:|---:|
| Private sponsor (`class` in `{OTHER, INDIV}`) | 314 (62.7%) | 187 | 0 |
| No FDA regulation | 215 | 66 | 220 (43.9%) |
| Single site | 311 (62.1%) | 190 | 0 |
| No data monitoring committee | 255 | 165 | 81 (16.2%) |
| No control group | 283 | 218 | 0 |
| Unapproved device | 6 | **0** | 495 (98.8%) |

Two things worth flagging on their own:

**`isFdaRegulatedDevice`/`isFdaRegulatedDrug` are missing on 44% of
records** — materially worse coverage than most fields checked in
Milestone 1. Half the time, "no FDA regulation" simply can't be confirmed
either way from this field.

**`isUnapprovedDevice` is populated on only 6/501 records (1.2%), and every
one of those six is `true` — never an explicit `false`.** This looks like
a real pattern in how sponsors fill out this field (likely only entered
when actually relevant), not a parsing bug — worth the spec owner knowing
this criterion will almost never contribute a confirmed "false" signal in
practice, only an occasional confirmed "true" one.

**Why the two most common criteria (private sponsor, single site) hit
60%+ of the corpus.** This matches `CLAUDE.md`'s own calibration warning
almost exactly: "most registered trials are small, single-site studies...
sponsored by universities, hospitals, and foundations (class `OTHER`)."
`OTHER` is an overloaded bucket covering both legitimate academic sponsors
and private clinics — which is the entire reason the spec requires 4+
criteria together rather than treating any one as meaningful alone.

## Fixture checks (hand-verified against `TAGGING_SPEC_v0.5.md` §3 TAG 5)

| NCT ID | Facts | Computed criteria | Expected status | Got | ✓ |
|---|---|---|---|---|---|
| NCT04250766 | `OTHER` sponsor, 1 site, no DMC, no FDA reg, no control group, device-approval unknown | 5 of 6 met, 1 unresolved | `flagged` (5≥4, confirmed regardless of the unknown) | `flagged`, met_count=5 | ✓ |
| NCT02654054 | `INDUSTRY` sponsor, 96 sites, has DMC, FDA-regulated, has control group | 0 of 6 met, 1 unresolved | `not_flagged` (max possible 0+1+2=3, confirmed can't reach 4) | `not_flagged`, max_possible=3 | ✓ |
| NCT03948789 | `OTHER` sponsor, 4 sites, has DMC, has control group, no FDA reg | 2 of 6 met, 1 unresolved | `undetermined` (max possible 2+1+2=5≥4, but confirmed count <4) | `undetermined`, max_possible=5 | ✓ |

All 3 checks pass. Chose these three specifically to cover all three
`status` branches of the asymmetric logic above, not just "does the math
run" — each confirms the boundary reasoning (safe-positive, safe-negative,
genuinely-unknown) is doing the right thing, not just producing *a*
number.

## To re-run

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"
```

Console output now also reports the TAG 5 status distribution
(flagged/undetermined/not_flagged counts).

## Next per `CLAUDE.md` build order

Milestone 5: **Tier A exclusions** (structured fields only: age, sex,
healthy-volunteer mismatch). Pure lookups again, closer to Milestone 2's
shape than this one's.

**Open item carried forward, not for this milestone:** `docs/oversight_flag_brief.md`
§1's list-vs-detail display question should be revisited with the 27.5%
flagged-rate number above before Milestone 6 UI work begins.
