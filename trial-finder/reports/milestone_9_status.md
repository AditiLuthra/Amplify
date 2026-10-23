# Milestone 9 status

Not part of `CLAUDE.md`'s original 7-milestone build order, or Milestone 8's
four-requirement follow-up. Raised directly by the product owner reacting to
a live screenshot: the `PHASE4` label was still unclear after one fix, and
the intake panel's "tell us about yourself" section covered age/sex/healthy-
volunteer only — none of the exclusion concepts that actually drive most
real decisions (diabetes, prior surgery, and so on). This milestone covers
both: the second-round `PHASE4` fix, and a new keyword-matched exclusion-
concern checklist.

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids" --as-of 2026-10-23
python3 scripts/tag_trials.py "endometriosis" --as-of 2026-10-23
```

## PHASE4 label, second round (`UI_DECISIONS.md` D11)

The first fix this project shipped — "Already approved" → "Already approved
(for other uses)" — was verified on desktop and still confused the product
owner on the next live screenshot, viewed on a phone, collapsed card, no
hover or tap performed. They named the fix directly: **"Repurposing."**
`PHASE4` is now **"Repurposing an FDA-approved drug"**, with the explanation
spelling out why there's a placebo arm *because* the condition itself
remains unproven. `TAGGING_SPEC_v0.5.md`'s `PHASE4` row changed alongside
`tag_trials.py`, same as the first round — this is a spec wording question,
not a UI-only one.

Separately investigated and **not built**: a "learn more about this drug's
approved use" feature, which would need either openFDA or DailyMed. Both
are reachable in principle (unlike FDA warning letters, investigated and
rejected earlier this project for genuinely not existing in structured
form) but this sandbox's network policy rejects both
(`api.fda.gov`/`dailymed.nlm.nih.gov` — confirmed via
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` showing `connect_rejected`,
while `clinicaltrials.gov` itself is reachable). Parked pending either a
wider network policy or an explicit decision to design it unverified.

## Exclusion-concept keyword flags (`UI_DECISIONS.md` D12)

Full design rationale is in `UI_DECISIONS.md` D12 — this is the
verification record.

**Why a keyword match, not Tier B/C.** `TAGGING_SPEC_v0.5.md` §6's Stage 3
(qualifier/threshold structuring, the thing that actually tells "uncontrolled
diabetes" from "diabetes, well-controlled" apart) needs an LLM this sandbox
has no key for. `exclusion_keyword_flags()` (`scripts/tag_trials.py`) stops
at Stage 2: reuses `parse_eligibility.stage1_split`/`stage2_atomize`,
regex-matches each atomic exclusion criterion against 11 concepts, and
returns the first verbatim match per concept. Per spec §5.2 (text-derived
signals downrank, never hide — P1's asymmetric cost), a match can only ever
produce a visible, non-hiding note.

**The 11 concepts**, picked from real atomic-criterion frequency in the
existing Milestone 7 `uterine_fibroids_eligibility.json` output (3,754
criteria) rather than guessed, confirmed with the product owner before
building: pregnancy, diabetes, cancer/malignancy, prior surgery, kidney
disease, allergy/hypersensitivity, liver disease, breastfeeding, bleeding
disorder/blood thinner use, heart disease, psychiatric/mental health
condition.

**Per-trial match rate, both corpora** (share of trials with at least one
atomic exclusion criterion mentioning the concept — a different, coarser
metric than the earlier per-criterion corpus frequency used to pick the
list):

| Concept | Uterine fibroids (n=501) | Endometriosis (n=959) |
|---|---|---|
| Pregnancy | 50.1% | 49.5% |
| Cancer/malignancy | 43.9% | 32.3% |
| Prior surgery | 34.9% | 37.7% |
| Allergy | 22.8% | 16.6% |
| Liver disease | 22.0% | 14.9% |
| Breastfeeding | 21.8% | 22.9% |
| Kidney disease | 21.4% | 14.0% |
| Bleeding disorder | 12.2% | 2.2% |
| Heart disease | 12.0% | 9.1% |
| Psychiatric condition | 11.6% | 12.9% |
| Diabetes | 8.0% | 9.9% |

**False-positive check before shipping.** This project has two known
false-positive regex bugs on record (TAG6's `"fee"` inside "breast-
**fee**ding"; TAG3's `"ultrasound"` over-match). The three riskiest new
patterns — `heart`, `depression`, `lactat` — were checked as bare
substrings against the full 3,754-criterion corpus before shipping. All
three came back clean; no unrelated word contains any of them.

**Bug found by testing, fixed before shipping.** Playwright testing (check
a concern, confirm the note appears with correct text; uncheck, confirm it
disappears; confirm the rendered card count never changes either way)
surfaced a real atomization gap: 23/492 uterine fibroids records (~4.7%)
have no bullets or line breaks in their exclusion section at all, so
`stage2_atomize` returns the whole section as one "atomic" criterion. On
one such record (`NCT07474688`), checking both "Pregnancy" and "Cancer or
other malignancy" rendered the identical run-on block of unrelated text
twice — once per header. Fixed in `renderCard()` by grouping matched
concepts by their verbatim text before rendering, so a shared blob (a
genuine compound sentence like "pregnant or breastfeeding," or an unsplit
run-on) renders once with combined labels. Confirmed visually before and
after (`git log` for this change has the before/after screenshots'
findings; not re-attached here). Does not fix `stage2_atomize`'s underlying
inability to split bullet-less text — a known, pre-existing Milestone 7
limitation, still correctly out of scope until Stage 3's LLM step exists.

**Verified end-to-end:** JS syntax check, local server, Playwright
(concept checked → note appears with correct label/text; unchecked → note
disappears; card count identical in both states — the explicit assertion
that nothing is ever hidden), and a visual screenshot of the rendered note
on a real card at phone viewport width (390×844, matching every other
screenshot this project has used, since that's confirmed to be how this
product is actually viewed).
