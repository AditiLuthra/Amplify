# Milestone 5 status

Milestone 5 per `CLAUDE.md` build order: **Tier A exclusions** —
structured fields only (`TAGGING_SPEC_v0.5.md` §5): age outside range, sex
mismatch, healthy-volunteer mismatch. The only tier allowed to hide a trial
outright (P1); Tiers B/C/D are free-text and explicitly out of scope until
Milestone 7 (TAG 6 / eligibility-criteria parsing).

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"
```

## Why this milestone needed a patient, not just a trial

Every prior milestone tagged a trial on its own. Tier A is the first
exclusion that's relative to a *person* — there's no way to say "age
outside range" without an age to compare against. No intake UI exists yet
(that's Milestone 6+), so `scripts/tag_trials.py` takes `--patient-age`,
`--patient-sex`, `--patient-healthy-volunteer` flags and defaults to
**Milestone 1's own test persona** (`reports/persona_field_categorization.md`:
30-year-old female, not a healthy volunteer) — the same persona that
report already identified as the only one with Tier-A-evaluable attributes
(age, sex). This keeps the fixture consistent with work already in the repo
instead of inventing a new test subject.

## One implicit decision, surfaced rather than left silent

The spec's Tier A table (§5) says only `healthyVolunteers` — no detail on
which direction counts as a "mismatch." Checked `CLAUDE.md`'s own
calibration note isn't about this field, so looked at what
`healthyVolunteers` actually means per the registry: it's a yes/no on
whether the study's enrollment *includes* healthy volunteers, not whether
it's *restricted to* them. That makes only one direction unambiguous:

- `healthyVolunteers == False` means the trial requires the condition —
  a patient who self-identifies as a healthy volunteer is a clean,
  confirmed mismatch.
- `healthyVolunteers == True` does **not** imply patients with the
  condition are excluded (a trial can enroll a healthy-control arm
  alongside a patient arm). So `True` never triggers an exclusion here.

This is implemented as a one-directional check (`tier_a_exclusion()` in
`scripts/tag_trials.py`), with the reasoning in a code comment rather than
left for a reader to infer — flagging it here too since it's filling a gap
the spec's table left unstated, even though the direction chosen doesn't
seem genuinely contestable the way the TAG 2/3 findings were.

## Results on this corpus (n=501)

**Default persona (30F, not a healthy volunteer): 22/501 excluded (4.4%).**
All 22 reasons are either an unmet minimum age (most common — several
trials in this corpus target perimenopausal/postmenopausal fibroid
populations starting at 33-50 years) or a sex mismatch (one male-only
trial in an otherwise overwhelmingly female-coded corpus, as expected for
this condition).

**For comparison, a 70-year-old male healthy volunteer: 493/501 excluded
(98.4%)** — sex alone disqualifies all but 21 of 501 records (479 are
`FEMALE`-only), and age/healthy-volunteer status further narrow that. Run
to confirm the function actually responds to the patient profile rather
than hard-coding the default persona's numbers; not a milestone finding on
its own, just a sanity check worth recording.

## Fixture checks (hand-verified against `TAGGING_SPEC_v0.5.md` §5)

| Case | Input | Expected | Got | ✓ |
|---|---|---|---|---|
| NCT04250766 | `minimumAge: "35 Years"`, patient age 30 | Excluded, age-too-young reason | Matches | ✓ |
| NCT06949124 | `sex: "MALE"`, patient `FEMALE` | Excluded, sex-mismatch reason | Matches | ✓ |
| *(synthetic)* | `maximumAge: "45 Years"`, patient age 50 | Excluded, age-too-old reason | Matches | ✓ |
| *(synthetic)* | `healthyVolunteers: false`, patient is a healthy volunteer | Excluded, healthy-volunteer reason | Matches | ✓ |
| *(synthetic)* | `healthyVolunteers: true`, patient has the condition | **Not** excluded (the directional decision above) | Matches | ✓ |
| *(synthetic)* | `sex: "ALL"`, patient `MALE` | Not excluded — `ALL` never mismatches | Matches | ✓ |
| *(synthetic)* | Age given as `"6 Months"` | Parses to 0.5 years | `0.5` | ✓ |
| *(synthetic)* | Trial states no age/sex/healthy-volunteer restriction at all | Never excluded regardless of patient | Matches | ✓ |

All 8 checks pass, including both directions of the healthy-volunteer
decision above (so the reasoning is tested, not just assumed).

## To re-run

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"                                    # default persona (30F)
python3 scripts/tag_trials.py "uterine fibroids" --patient-age 70 --patient-sex MALE --patient-healthy-volunteer
```

## Next per `CLAUDE.md` build order

Milestone 6: **UI**. This is the first milestone this project's build order
reaches that isn't a backend tagging pass — per `CLAUDE.md`, "stack for
later milestones (matching, UI) is still undecided," so that's a real
decision to make before writing code, not just an implementation task.
`docs/oversight_flag_brief.md`'s open question (list-vs-detail display,
informed by Milestone 4's 27.5% flag rate) is also live input into this
milestone specifically.
