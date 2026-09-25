# Persona field categorization — Milestone 1, Part C

**Persona:** 30-year-old female, no prior surgery, wants future fertility,
moderate anemia, BMI 20.

This is categorization only, per Milestone 1 scope: no matching logic, no
exclusion tiering is implemented here. It maps each persona attribute to
`TAGGING_SPEC_v0.5.md` section 2 (structured fields we use) and section 5
(exclusion tiers), to show which attributes the API's structured fields can
answer directly and which require parsing `eligibilityCriteria` free text.

The only structured fields the spec lists anywhere that touch patient
characteristics live in `eligibilityModule`: `eligibilityCriteria`, `sex`,
`minimumAge`, `maximumAge`, `stdAges[]`, `healthyVolunteers` (spec §2). There
is no structured field for prior surgery, fertility intent, anemia, or BMI in
API v2 — sponsors who restrict on those do so inside the free-text
`eligibilityCriteria` blob (spec §6).

## Structured (Tier A candidates — spec §5)

| Persona attribute | Field | Notes |
|---|---|---|
| Age 30 | `eligibilityModule.minimumAge`, `maximumAge` | Direct numeric comparison. Tier A: may hide a trial outright on structured mismatch. |
| Female | `eligibilityModule.sex` | Direct enum comparison (`FEMALE`/`MALE`/`ALL`). Tier A. |

Both are evaluable with no inference and no confidence discount — a
structured-field mismatch is the only case the spec allows to hide a trial
from the main list (P1, §5 Tier A).

*Adjacent but not applicable to this persona:* `healthyVolunteers` is also
structured Tier A, but this persona has an active condition (fibroids), not
"healthy volunteer" status, so it doesn't bear on any of the four remaining
attributes below.

## Free text only — must be parsed from `eligibilityCriteria` (spec §6)

No field in spec §2 captures any of these. Each would need to be extracted
from the free-text criteria per the §6 pipeline (split → atomicize →
structure into `{verbatim, concept, qualifier, threshold, tier}`), and each
lands in a different exclusion tier depending on how the criterion is
phrased in a given record — the tier is a property of the sentence, not of
the attribute itself.

| Persona attribute | Typical criterion phrasing | Likely tier (spec §5) | Why |
|---|---|---|---|
| No prior surgery | "No prior myomectomy," "history of uterine surgery," "prior pelvic surgery within N years" | Tier B or C | Tier B when the criterion names the same procedure the user reports none of; Tier C when it carries an unaddressed qualifier (which surgery, how long ago) — exactly the "uncontrolled diabetes" ambiguity the spec calls out in §5's Tier C example. |
| Wants future fertility | "Desires future fertility," "not seeking fertility preservation," "willing to undergo hysterectomy" | Tier B | Usually stated plainly enough to match directly against the user's stated intent, without a qualifier needing resolution — but only when the trial's criterion actually addresses fertility intent explicitly. |
| Moderate anemia | "Hemoglobin < 8 g/dL," "Hgb ≥ 10.5 g/dL," "anemia requiring transfusion" | Tier C | "Moderate" is not itself a term criteria use — it has to be resolved against a numeric threshold per record, which is the qualifier-matching problem Tier C exists for (spec §5, §6 `threshold` field). |
| BMI 20 | "BMI 18–40," "BMI < 35 kg/m²" | Tier B or C | Tier B when the record gives a simple numeric range 20 falls inside/outside cleanly; Tier C when the range is unstated or qualified (e.g. "morbidly obese excluded" without a number). |

## Summary

Of the six evaluated attributes, **2 of 6** (age, sex) can be checked against
structured fields today. The remaining **4 of 6** (prior surgery, fertility
intent, anemia severity, BMI) exist only in free text and require the §6
eligibility-parsing pipeline — none of which is built in Milestone 1. This
matches the PRD's framing (§5.1): tagging generalizes for free from
structured metadata, but this persona's most decision-relevant attributes
(fertility-sparing intent, anemia severity) are exactly the ones the registry
buries in prose, which is the gap R3 and R1 exist to close later.
