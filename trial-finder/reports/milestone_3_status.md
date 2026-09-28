# Milestone 3 status

Milestone 3 per `CLAUDE.md` build order: **TAG 2 (placebo exposure) + TAG 3
(intervention type and burden)**. Run against the same live "uterine
fibroids" corpus (501 records). `scripts/tag_trials.py` now computes TAG 1,
2, 3, and 4 together in one pass.

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"
```

**Two real spec gaps found, both corpus-verified, neither invented around**
— same posture as Milestone 1's TAG 4 finding. This milestone was not "pure
lookups" like Milestone 1/2; TAG 2 and TAG 3 both require branching on
combinations the spec states as a short pseudocode/keyword list, and in both
cases the real corpus hits real combinations the list doesn't cover.

## TAG 2 — placebo exposure

| Outcome | Count |
|---|---:|
| "Everyone receives the treatment" (single-group / 1 arm) | 142 |
| "All participants receive an active treatment..." | 101 |
| "You may receive a placebo" (randomized, chance shown) | 84 |
| "...Assignment is not random..." (placebo, non-randomized) | 2 |
| "Not stated" (no arm groups) | 45 |
| **Gap — not covered by spec** | **126** |

**Finding: 126/501 records (25%) fall through all four of TAG 2's named
branches.** Checked what these actually are, not just that they don't match:

- **101 of the 126** have **multiple `EXPERIMENTAL`-only arms** (e.g. two
  different doses of the same drug against each other, no placebo and no
  active comparator) or an `EXPERIMENTAL` + `NO_INTERVENTION` combination.
  The spec's four branches (single-group, placebo/sham present,
  active-comparator present, no arm groups) don't name this case at all,
  and it's common — this isn't a rounding error.
- **The remaining ~25** have `armGroups` present but **every arm's `type`
  field is `null`** (label + description only, e.g. `NCT00001850`:
  `[{"label": "Children", "description": "..."}, ...]` with no `type` key
  at all). The spec's "empty or missing" branch covers an empty/absent
  `armGroups` *list*, not a populated list whose items lack `type` — a
  different failure mode the current wording doesn't address.

Not implemented — flagged as `{"gap": true, "arm_types_raw": [...], ...}`
per record, per the working agreement. A plausible direction for the spec
owner: multiple `EXPERIMENTAL`-only arms could reasonably read as
"Everyone receives an active treatment" (a variant of the existing
single-group branch, since every arm is *some* treatment) — but that's a
product call, not mine to make silently.

## TAG 3 — intervention type and burden

| Rank | Meaning | Count |
|---:|---|---:|
| 0 | No treatment given (observational) | 131 |
| 1 | Non-invasive | 20 |
| 2 | Minimally invasive | 43 |
| 3 | Experimental drug/biologic | 162 |
| 4 | Implant/surgical device | 5 |
| 5 | Procedure/radiation/gene therapy | 100 |
| **Gap — burden withheld** | | **40** |

Layer A (category) and Layer B (explanation, verbatim-first) are computed
for every record with no ambiguity — those layers are direct field reads
per spec's own P6 ("categories are factual, never wrong"). Layer C (burden
rank) is where the gap is, and it's a correctness issue, not just a
coverage one.

**Finding: the spec's rank-1 device keyword list is unsafe as written.**
`TAGGING_SPEC_v0.5.md` §3 TAG 3 lists `"ultrasound"` and `"external"` as
rank-1 ("non-invasive") signals for `DEVICE`-type interventions. In this
corpus, those two words also appear in **18 records** describing **MR-guided
HIFU (High-Intensity Focused Ultrasound) systems** — e.g. `Exablate 2100`,
`Philips MR-guided HIFU system`, `Sonata System` — which perform **thermal
tissue ablation under sedation**, not diagnostic imaging. A literal keyword
match would label a sedation-requiring tissue-destruction procedure the same
burden level as a fitness tracker. That's not a rounding error either: it
directly contradicts **P5** ("never default a missing value to the
optimistic case") and the spec's own stated purpose for this tag ("for a
patient deciding whether a trial is worth pursuing").

**Not implemented as specified.** `scripts/tag_trials.py` detects the
collision (an "ablation-family" word — `hifu`, `focused ultrasound`,
`ablation` — co-occurring with a rank-1 keyword) and **withholds
`burden_rank`** for that intervention rather than assign a rank I already
know is wrong, flagging it as `burden_gap: true` with the specific reason.
The other rank-1 keywords (`wearable`, `patch`, `monitor`, `sensor`, `app`,
`smartphone`, `wristband`, `non-invasive`) are unaffected and implemented as
specified — verified against a synthetic wearable-device fixture.

Proposed fix direction for the spec owner (not applied): require an
imaging/diagnostic-context word (e.g. "diagnostic", "imaging", "scan") to
trust `"ultrasound"`/`"external"` as rank-1, or add `hifu`, `focused
ultrasound`, `ablation`, `thermal`, `radiofrequency ablation` to the rank-4/5
signal list so they win the match outright. Not applying either fix myself —
this changes what the tool tells a patient about their own physical safety,
and needs the spec owner's sign-off, not a judgment call embedded silently
in a tagging script.

**Second, smaller gap: `OTHER` isn't in the burden ladder at all.** 27
records have at least one `OTHER`-typed intervention. Sampled what `OTHER`
actually contains in this corpus: **major surgery under general anesthesia,
a placebo capsule, and a study questionnaire all appear under the same
enum value.** No default rank is defensible across that range — flagged,
not guessed. (`PROCEDURE`, by contrast, is *not* a new gap here: the spec's
own "Known gap" note already accepts ranking all `PROCEDURE` as 5, and this
milestone follows that as written — it's a documented, deliberate v0.2
simplification, not an unaddressed one.)

**Withholding, not partial-crediting.** When a study has both a resolved
intervention (say `DRUG`, rank 3) and an unresolved one (say the ambiguous
`DEVICE`), `burden_rank` is `None` for the whole study — not `3`. Taking
`max()` of only the resolved components could understate the true burden if
the unresolved one turns out to be higher. Verified with a synthetic mixed
fixture (`reports` below).

## Fixture checks (hand-verified against `TAGGING_SPEC_v0.5.md` §3)

| NCT ID / synthetic | Scenario | Expected | Got | ✓ |
|---|---|---|---|---|
| NCT02323646 | 3 arms, 1 placebo, randomized | "You may receive a placebo (about 33%)" | Matches | ✓ |
| NCT01092988 | Single-arm HIFU device trial | TAG2: "Everyone receives the treatment"; TAG3: burden withheld (ablation collision) | Matches | ✓ |
| NCT03134157 | 3 `EXPERIMENTAL` arms, all-`DRUG` interventions | TAG2: gap; TAG3: rank 3 | Matches | ✓ |
| NCT03948789 | Active comparator, 2× `PROCEDURE` | TAG2: active-treatment label; TAG3: rank 5 | Matches | ✓ |
| NCT04856306 | `armGroups` present, `type: null` throughout; observational | TAG2: gap; TAG3: rank 0 | Matches | ✓ |
| NCT02812186 | `OTHER`-typed arm groups, but `PROCEDURE`/`PROCEDURE`/`DRUG` interventions | TAG2: gap (arm types); TAG3: rank 5 (from interventions, unaffected by arm-type gap) | Matches | ✓ |
| *(synthetic)* | Empty `armGroups`, multi-arm model | "Not stated" | Matches | ✓ |
| *(synthetic)* | Placebo present, `NON_RANDOMIZED` | "...not random..." label | Matches | ✓ |
| *(synthetic)* | `DEVICE`, "surgically placed subdermal implant" | rank 4 | Matches | ✓ |
| *(synthetic)* | `DEVICE`, "wearable activity monitor" (no ablation words) | rank 1 | Matches | ✓ |
| *(synthetic)* | `OTHER`-typed intervention | burden withheld, gap flagged | Matches | ✓ |
| *(synthetic)* | `DRUG` (resolved, rank 3) + ambiguous `DEVICE` in same study | burden **withheld entirely**, not `3` | Matches | ✓ |

All 12 checks pass.

## To re-run

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids"
```

Console output now reports gap counts per tag (TAG1/TAG2/TAG3/TAG4)
separately, since TAG2/TAG3 gaps are expected and common in this milestone,
unlike TAG1/TAG4's zero-gap result in Milestone 2.

## Next per `CLAUDE.md` build order

Milestone 4: **TAG 5 (oversight facts panel and rubric)** — the eight-criterion
"below our oversight standard" flag (PRD G5/R5). Directly relevant to "trials
people should beware of," which is already a named product goal, not a new
idea — see the PM discussion in the same reply as this report.
