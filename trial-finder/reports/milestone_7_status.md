# Milestone 7 status

Milestone 7 per `CLAUDE.md` build order: **text extraction — TAG 6 (cost) and
exclusion Tiers B/C.** The build order calls this out as "the only part
needing an LLM," and that's exactly the constraint that shaped this
milestone: this sandbox has **no `ANTHROPIC_API_KEY`** and no `anthropic`
package installed (checked directly — `env | grep -i anthropic` empty,
`python3 -c "import anthropic"` → `ModuleNotFoundError`). That's an
infrastructure fact, not a bug to route around. Every script here is built
with a pluggable Stage 2/3: call the live API when a key is present, else
look up a committed, clearly-labeled cache, else raise a clear
`RuntimeError` — never guess (working agreement). The deterministic stages
(keyword prefilter, criteria split, criteria atomization) run for real on
the full 501-record corpus; the genuinely semantic stages (sentence
classification, criterion structuring) are demonstrated correctly on
bounded, labeled samples instead of faked at scale.

```bash
cd trial-finder
python3 scripts/tag6_cost.py "uterine fibroids"
python3 scripts/parse_eligibility.py "uterine fibroids"
python3 scripts/eligibility_tier_demo.py
python3 scripts/tag_trials.py "uterine fibroids" --as-of 2026-09-28
```

## Part A: TAG 6 (cost and compensation)

`scripts/tag6_cost.py` implements `TAGGING_SPEC_v0.5.md` §3 TAG 6, the only
tag with no structured field — free text only. Three stages:

1. **Stage 1 (keyword prefilter)** — deterministic, regex over
   `briefSummary` / `detailedDescription` / `eligibilityCriteria`, sentence
   by sentence. Runs on the full corpus.
2. **Stage 2 (sentence → status/confidence)** — real language understanding.
   Pluggable: live Anthropic API call if `ANTHROPIC_API_KEY` is set, else a
   committed cache (`data/llm_cache/cost_classifications.json`), else a
   `RuntimeError` naming the exact sentence that needs classifying.
3. **Stage 3 (display rule)** — only a `high`-confidence, non-`unclear`
   classification is shown; anything else collapses to `"Not stated"`,
   never an optimistic default (P5).

### Finding: the "fee" keyword was a 100%-false-positive collision on this corpus

The first version of `PARTICIPANT_PAYS` matched `"fee"` as a bare substring.
Run against the real corpus, **every single hit was "breast-feeding" or
"feeding vessels"** — never an actual cost mention. (Same class of bug as
Milestone 3's `"ultrasound"` keyword collision.) Fixed by switching
single-word keywords (`fee`, `stipend`) to word-boundary regex (`\bfee\b`);
multi-word phrases (`"at their own expense"`, etc.) were already specific
enough as substrings.

### Results on this corpus (n=501)

| | Count |
|---|---:|
| Records with a Stage 1 keyword hit | **0** |
| Resolved to a confident cost status | 0 |
| → "Not stated" | 501 |

**Zero real hits.** After the "fee" fix, no record in this condition's
corpus contains language matching any of the three keyword lists. This is a
real result, not a bug — it says cost/compensation language is rare (or
phrased in ways not yet in these keyword lists) in this corpus, which is
itself worth the spec owner knowing: TAG 6 as specified will label almost
this entire corpus "Not stated" today, which is the correct, honest,
non-optimistic default (P5) rather than a sign the pipeline is broken.

### Fixture checks (synthetic — no real corpus hits to check against)

Since the real corpus produced zero hits, verification is against
hand-built sentences covering each branch, including the one a naive
keyword match would get wrong:

| Input | Expected | Got | ✓ |
|---|---|---|---|
| "Participants will be responsible for the cost of standard hospital stay..." | `participant_pays` | `participant_pays` | ✓ |
| "Participants will be compensated $50 for each study visit..." | `compensated` | `compensated` | ✓ |
| "All study-related procedures are provided at no cost to participants." | `no_cost` | `no_cost` | ✓ |
| "There is no fee for parking at the study site, which is provided free of charge..." | `not_stated` (Stage 2 reads this as `unclear`/low-confidence, not a clean no-cost or pays case — negation makes it genuinely ambiguous, not safe to resolve either way) | `not_stated` | ✓ |
| "This is a study of uterine fibroids treated with ultrasound ablation." | `not_stated`, 0 prefilter hits | `not_stated`, 0 hits | ✓ |
| "Known pregnant or breast-feeding patient. Feeding vessels of the fibroid were assessed." | 0 Stage 1 hits (word-boundary fix) | 0 hits | ✓ |

All 6 pass. `data/llm_cache/cost_classifications.json` carries these 4
classified sentences (the parking-fee case doubles as the negation-guard
proof) plus a `_comment` explaining they're hand-classified by Claude in
lieu of a live API call, and that the real corpus produced zero hits so
none of these are actual corpus sentences.

## Part B: eligibility criteria parsing + exclusion Tiers B/C/D

`scripts/parse_eligibility.py` implements `TAGGING_SPEC_v0.5.md` §6 (parsing)
and §5 (tiers). Three stages:

1. **Stage 1 (split inclusion/exclusion)** — regex on header variants.
   Deterministic, full corpus.
2. **Stage 2 (atomize exclusion block into verbatim criteria)** —
   bullet/number/line-break splitting. Deterministic, full corpus.
3. **Stage 3 (structure each criterion into `{verbatim, concept, qualifier,
   threshold, tier}`)** — a semantic judgment call per criterion, the same
   reason `CLAUDE.md` calls this milestone "the only part needing an LLM."
   Not run at full scale (no API key). Run by hand instead, by Claude, on
   Milestone 1's existing 10-record manual-review sample
   (`reports/eligibility_criteria_sample.md`), and recorded as such.

### Results on this corpus (n=501)

| Stage | Result |
|---|---:|
| Stage 1 split failures (no exclusion-criteria header found — logged, never force-split) | 9/501 |
| Stage 2 atomic exclusion criteria extracted | 3754 across 492 successfully-split records |

Split-failed NCT IDs (logged, not guessed at): NCT04272086, NCT00232713,
NCT00005095, NCT00339547, NCT00219778, NCT06208891, NCT03533907,
NCT00067249, NCT01542658.

### Finding: a stray bullet-marker artifact was silently discarding real criteria

`stage2_atomize()`'s first version treated any text before the first bullet
line as "preamble" and dropped it. On NCT03550703, a stray trailing escaped
dash (`\-`) with nothing after it was the *only* thing that looked like a
bullet — so the script kept an empty criterion from that marker and
discarded the real, un-bulleted criterion text that preceded it. Caught by
checking output against Milestone 1's known 10-record sample (expected 1
criterion, got 0). Fixed: pre-bullet text is now only treated as discardable
preamble when at least one other real (non-empty) criterion exists
elsewhere in the block; if none do, that buffered text becomes the single
criterion instead of being dropped. Re-verified against all 10 sample
records, including the two edge cases this bug touches: NCT03550703 (1
criterion, now recovered) and NCT02192606 (0 criteria — a genuine "None"
case, correctly still 0 after the fix).

### Stage 3: hand-structured demonstration sample

`data/llm_cache/eligibility_structuring.json` holds all 54 atomic criteria
across Milestone 1's 10-record sample, each structured into
`{verbatim, concept, qualifier, threshold, tier}` by hand (Claude, this
session) per spec §5/§6, with a `_comment` explaining the scope. Tier
distribution: **48 Tier D, 3 Tier B, 3 Tier C.**

Two structural-complexity cases worth flagging to the spec owner, not
silently resolved:

- **`Hematocrit < 25%`** — tiered C (a lab-value threshold check, mirrors
  the spec's own diabetes/HbA1c worked example).
- **Compound OR criteria**, e.g. *"Contraindication to laparoscopy
  procedure or causes of complications (multiple laparotomies, frozen
  pelvis, severe endometriosis)"* (NCT02288130) — only one disjunct
  ("multiple laparotomies") maps to anything the persona was asked about
  ("prior surgery"); the others (frozen pelvis, severe endometriosis) have
  no concept match today. Tiered C rather than B because of that
  incompleteness. A real system needs a rule for partially-addressed
  compound criteria — the spec doesn't currently say what "addressed" means
  when a criterion has multiple independent conditions joined by "or."
- **Investigator-discretion catch-alls**, e.g. *"Subject has other
  co-morbid condition(s)... in the opinion of the Investigator"*
  (NCT01369758) — inherently subjective, no concept to match against any
  persona answer. Tiered C, shown with "(not asked)" rather than invented.

### Tier B/C display rule, verified

`scripts/eligibility_tier_demo.py` renders the spec's exact mandated string
for every Tier B/C criterion against the Milestone 5 test persona (prior
surgery, fertility intent, anemia severity). Found and fixed one bug along
the way: the concept-matching fragment `"surger"` doesn't match the word
`"surgical"` (not a word-boundary issue — simply not a substring match),
which silently showed `"(not asked)"` for two real Tier B matches
("Extensive scarring...", "Surgical clips..."). Fixed by shortening the
fragment to `"surg"`. All 6 Tier B/C criteria across the 3 affected records
(NCT01504308, NCT01369758, NCT02288130) now render the correct persona
answer or the correct "(not asked)" fallback. Sample output:

```
**Tier B**

**This trial's exclusion criteria include:**
*"Desire for future pregnancy"*
You told us: I want to have children in the future. If this doesn't
describe your situation, this trial may still be an option.
```

## Integration: TAG 5 ↔ TAG 6

Milestone 4 left TAG 5's criterion 1 ("participants pay to enroll")
hardcoded as uncomputable, pending TAG 6. With TAG 6 now built, that wiring
is live: `tag5_oversight()` takes TAG 6's result and resolves
`participant_pays` per record — `True` if TAG 6 confidently says
`participant_pays`, `False` if `compensated`/`no_cost`, `None` (unresolved,
not "clean" — P5) if `not_stated` or TAG 6 hits its own gap case.
`UNCOMPUTABLE_CRITERIA` drops from 2 entries to 1 (only
`unrelated_conditions` remains, still blocked on an undefined body-system
taxonomy).

**Verified this doesn't silently break anything.** Since every record on
this corpus resolves to TAG 6 `not_stated` (Part A above), `participant_pays`
is `None` everywhere today — so the *shape* changed (7 computable criteria,
1 uncomputable, instead of 6/2) but the arithmetic that drives `status`
didn't: `max_possible = met_count + unresolved_among_computed +
N_UNCOMPUTABLE` nets to the same value either way until TAG 6 actually
resolves a real record. Confirmed two ways:

1. **Full-corpus re-run, before vs. after wiring**: flagged/undetermined/
   not_flagged = **138 / 355 / 8**, identical to Milestone 4's numbers.
2. **Synthetic fixture**, NCT03948789 (a Milestone 4 fixture record) with a
   hand-constructed TAG 6 result instead of the real one:

   | TAG 6 status passed in | `participant_pays` | `met_count` | `unresolved` |
   |---|---|---:|---:|
   | `not_stated` (baseline) | `None` | 2 | 2 |
   | `participant_pays` | `True` | 3 | 1 |
   | `no_cost` | `False` | 2 | 1 |

   `met_count` increases only when TAG 6 actually confirms payment;
   `no_cost` resolves the unknown without inflating the flagged count. All
   three match the P1/P5 asymmetric-logic reasoning from Milestone 4.

## Scope notes / deferred, not done this milestone

- **Stage 3 (cost sentence classification, eligibility criteria
  structuring) is not run at full scale.** Both are gated behind
  `ANTHROPIC_API_KEY`, which this sandbox doesn't have. The code path is
  real and pluggable, not stubbed — it just hasn't been exercised beyond
  the labeled samples above.
- **Tier B/C/D eligibility output is not wired into `tag_trials.py`'s main
  pipeline or into `web/index.html`.** Only 10/501 records have Stage 3
  structuring. Wiring partial coverage into the production UI would
  misrepresent what the tool actually knows about the other 491 records —
  this needs full-corpus Stage 3 first, which needs an API key.
- `data/tagged/uterine_fibroids_tag6_cost.json` (a transient side-output
  from running `tag6_cost.py` standalone) was removed rather than
  committed — it's fully redundant with the `tag6_cost` block now embedded
  in each record of `data/tagged/uterine_fibroids.json`.
  `data/tagged/uterine_fibroids_eligibility.json` is kept — it's genuinely
  separate data (Stage 1/2 eligibility output) not present anywhere in the
  main tagged file.

## Next per `CLAUDE.md` build order

Milestone 7 is the last milestone `CLAUDE.md` lists. Open items for
whenever this project continues:

- Get an `ANTHROPIC_API_KEY` into the environment and run Stage 2/3 at full
  corpus scale for both TAG 6 and eligibility structuring.
- Decide how Tier B/C/D should surface in `web/index.html` once full
  coverage exists (this wasn't speced during Milestone 6's UI work, since
  TAG 6/eligibility didn't exist yet).
- The compound-OR-criterion and investigator-discretion-catch-all cases
  above are spec gaps, not implementation gaps — worth a decision from the
  spec owner on how "addressed" should be defined for a multi-condition
  criterion before Stage 3 runs at scale (a wrong call here, unlike a
  crash, won't be caught by re-running the code).
