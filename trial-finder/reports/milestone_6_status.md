# Milestone 6 status

Milestone 6 per `CLAUDE.md` build order: **UI**. First milestone that isn't
a backend tagging pass. `trial-finder/web/index.html` — a single static
page, patient-facing, reading the same `data/tagged/uterine_fibroids.json`
every prior milestone produced.

## Two decisions this milestone required, logged in `docs/UI_DECISIONS.md`

**D2 — stack.** Plain HTML/CSS/vanilla JS, no framework, no build step.
`CLAUDE.md` explicitly left this undecided; Phase 1's own architecture
(PRD R1b — client-side only, nothing leaves the device) doesn't need a
framework, and this project's whole "no dependencies" ethos (Milestone 1's
stdlib-only scripts) argues against adding one before Phase 2 actually
needs server state.

**D3 — what to show for TAG 5's "undetermined" status.** Milestone 4 found
three outcomes, not the two the spec's display table describes. Resolved
as: facts panel always shown (per spec, unconditional), the spec's mandated
warning label only for confirmed `flagged` (27.5%), and a quiet, distinct
"we haven't fully checked this yet" note for `undetermined` (70.9%) —
neither silently clean nor falsely alarming. Full reasoning in the decision
log; this directly resolves the open question `docs/oversight_flag_brief.md`
§1 left pending Milestone 4's numbers.

## One pipeline gap this milestone surfaced

The tagged output had no display text — just computed tags. A patient
screen needs more than an NCT code to mean anything (a trial has to have
*a trial* on the card, not just a verdict about one). Extended
`tag_study()` with a pass-through `display` block (`brief_title`,
`brief_summary`, and a verbatim `summary_snippet` — truncated at a word
boundary, never paraphrased, per spec P4). Not a new tag, no judgment
involved, so it didn't need Milestone 2-5's fixture-by-fixture treatment —
but it's a real schema change to `data/tagged/uterine_fibroids.json`,
regenerated and checked in.

## What the page actually does

- Plain-language status strip (count found / recruiting / completed with
  results / worth a closer look) — the exact format `UI_DECISIONS.md` D1
  already specified.
- One scrollable list, sorted by burden (lowest first, per spec's Layer C
  "used for default ordering") — not exposed as a sort control, just
  applied, per "keep it simple."
- Phase and placebo badges rendered **adjacent**, per the spec's mandatory
  display rule (TAG 1) — evidence and placebo-risk shown together so one
  isn't read without the other.
- Intervention category in plain words (`DEVICE` → "Device", etc. — casing
  only, not a new category) plus its first verbatim explanation.
- Oversight note per D3's three-way split.
- A collapsed "More about this trial" per card: full summary text, the
  specific oversight criteria met (named in plain language, not just a
  count), and the facts panel.
- A collapsed drawer at the bottom for trials Tier A or TAG 4 excludes,
  each with its specific reason and a **"this doesn't apply to me"**
  button (R6's override) that moves it into the main list — client-side
  only; see Deferred below for what this doesn't yet do.

## Explicitly deferred (scope boundary, not an oversight)

- **Condition search (R1).** Only "uterine fibroids" has been fetched.
  The page says so plainly rather than showing a search box that doesn't
  work yet.
- **Shortlist, export, contact templates (R9, G2, R10).** No underlying
  data for any of these exists in the pipeline yet (R10 specifically needs
  `contactsLocationsModule` extraction, not yet built).
- **"What this trial found" results summaries (§4).** Completed trials
  with results are labeled and linked to their registry page, not
  summarized inline — real summary generation is Milestone 7 territory
  (the LLM milestone), not something to approximate here.
- **Override logging.** R6 says overrides are "logged anonymously as
  labeled data for improving the matcher." No analytics/backend exists to
  log to — the button works for the user in front of it, nothing is
  transmitted anywhere, consistent with Phase 1's client-only boundary.
- **Real patient profile.** Tier A exclusion still runs against Milestone
  5's fixed 30F test persona, not a real intake — the excluded-trials
  drawer says this explicitly rather than implying personalization that
  doesn't exist yet.

## How to view it

```bash
cd trial-finder/web && python3 -m http.server 8000
# open http://localhost:8000/
```

Or the published preview: https://claude.ai/artifact/LVpYXEiR8VvXdW3ZgDTvke

## Addendum: evidence-level sort, "promising" sort declined

Raised directly after this milestone shipped: flag dicey sponsors/unproven
pay-to-enroll therapies (already built — TAG 5, D3), and sort by how
promising a therapy is (declined — conflicts with PRD Non-goal §4.2 and
§5.3's reasoning, confirmed with the product owner rather than assumed).
Built an evidence-level sort toggle instead (phase progression, with
`NA`-phase trials kept in their own labeled group rather than placed last,
since the spec is explicit that no-phase isn't a lower-quality signal).
Full reasoning in `docs/UI_DECISIONS.md` D4.

## Next per `CLAUDE.md` build order

Milestone 7: **Text extraction** — TAG 6 (cost, free text only) and
exclusion Tiers B/C. The only milestone needing an LLM, and the one that
would finally resolve TAG 5's "undetermined" majority (D3) once the
participant-pays criterion exists. Also now the direct answer to "flag
trials that make you pay for an unproven therapy," per the addendum above.
