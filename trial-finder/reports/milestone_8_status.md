# Milestone 8 status

Not part of `CLAUDE.md`'s original 7-milestone build order (that order
stopped at Milestone 7). This covers the next round of work once the
product question became "when are we getting into UI?" — the honest
answer being that Milestone 6/7 had already built a UI, but a fixed demo
one: hardcoded to one condition, with a hardcoded example patient standing
in for real intake, no shortlist, no way to contact a trial team. This
milestone builds the four PRD requirements that gap actually names: R1
(intake, partially — Tier A fields only), R1 (condition selection,
partially — a fixed picker, not free-text search), R9 (shortlist/export),
and R10 (contact templates).

Each is documented in full as its own `UI_DECISIONS.md` entry (D6-D9); this
report is the cross-cutting summary and the verification record.

```bash
cd trial-finder
python3 scripts/tag_trials.py "uterine fibroids" --as-of 2026-09-28
python3 scripts/fetch_trials.py "endometriosis"
python3 scripts/tag_trials.py "endometriosis" --as-of 2026-10-23
```

## What was built

**Real intake, replacing the hardcoded example patient (D6).** TAG 5's
Tier A exclusion was baked at pipeline time against one hardcoded patient
(30F, no prior surgery) passed via CLI flags — never a real visitor's own
answers. `tag_trials.py` now also emits `eligibility_raw`
(`minimum_age`/`maximum_age`/`sex`/`healthy_volunteers`) per trial,
unevaluated, and `web/index.html` carries a JS port of
`tier_a_exclusion()`/`parse_age_to_years()` to recompute it live against
whatever a visitor enters in a collapsed "Tell us about yourself" panel.
`localStorage`-only (R1b), persists across reloads, falls back to the
original baked example when nothing's been saved.

**Multi-condition support, as a fixed picker (D8).** Added a second real
condition, endometriosis — actually fetched (959 records) and tagged, not
fixture data — and a picker that swaps between it and uterine fibroids.
Deliberately not free-text search: fetching and tagging a condition on
demand needs a server, the same Phase 1 "nothing leaves the device"
boundary R1b already drew.

**Shortlist + export (D7).** A save/unsave toggle per card, a shortlist
bar that appears once something's saved, and a "Download for your doctor"
button generating a standalone static HTML file (no app logic embedded —
a real document, not an export of the interface). Saving a flagged trial
takes one `window.confirm()` step, using `oversight_flag_brief.md`'s own
proposed copy verbatim — this also resolved that brief's last open
question, which had been explicitly blocked on shortlisting not existing.

**Contact templates (D9).** `tag_trials.py` resolves a real `contact` per
trial (first entry with an email, `centralContacts[]` then
`locations[].contacts[]`) — checked against the real corpus first:
`PRINCIPAL_INVESTIGATOR`/`SUB_INVESTIGATOR` entries often have a name but
no email, so "first contact" alone would have silently picked an
unreachable one. Each card gets a `mailto:` link plus a copy-to-clipboard
button — two ways to get Template A/B's text into an email the visitor
sends themselves, never sent by this product.

## Real data, not assumed

| | uterine fibroids (n=501) | endometriosis (n=959) |
|---|---:|---:|
| TAG 5 flagged | 138 (27.5%) | 483 (**50.4%**) |
| Resolvable contact (`centralContacts`/`locations.contacts` → email) | 143 (28.5%) | — |
| Tier A excluded, default persona | 22 | 27 |

**Endometriosis's flagged rate is nearly double uterine fibroids'.** Not
investigated further here (out of scope for a UI milestone), but a real
finding worth the spec/product owner knowing before treating 27.5% as a
baseline that generalizes — added to PRD §9's validation thinking via the
versioning table (v0.12).

## Bugs found and fixed, via testing not inspection

- **Shortlist bar's own CSS silently overrode its `hidden` attribute.**
  `.shortlist-bar { display: flex }` has equal selector specificity to the
  browser's native `[hidden] { display: none }`, so the author rule won —
  the bar rendered even when JS had correctly set `hidden`. Caught by
  asserting `is_hidden()` in a real browser rather than trusting the
  attribute; fixed with an explicit `.shortlist-bar[hidden] { display:
  none; }` override. Worth remembering for any future element combining
  the native `hidden` attribute with its own `display` override.
- **Shortlist stored bare NCT IDs, re-joined against whichever condition
  happened to be loaded** — correct only when exactly one condition ever
  loads. Caught while building D8 (multi-condition), before it shipped as
  a real gap: switching conditions would have silently lost access to
  previously-saved trials at export time. Fixed by storing full trial
  snapshots at save time instead of bare IDs.

## Verification

All four features tested end-to-end in a real headless browser
(Playwright), not just read over:

- Intake: age=70/sex=MALE profile correctly excludes 496/501 uterine
  fibroids trials (nearly all, correctly — this is a female-only
  condition's corpus) with correct per-trial reason text; persists across
  reload; clearing reverts to the default example-persona behavior.
- Shortlist: save/unsave: the flagged-trial confirm dialog's cancel and
  accept paths; persistence across reload; the exported file's content
  verified against the actual saved trial's title.
- Multi-condition: switching conditions loads genuinely different data
  (confirmed by comparing first-card titles); a trial saved under one
  condition correctly survives switching to the other and appears in the
  export.
- Contact templates: all four branches verified against real records —
  recruiting-only (Template A alone), non-recruiting (Template B alone),
  hesitancy trigger (both shown together, on a real record hitting the
  exact combination), and no-contact (fallback message, no templates).
  Mailto href and copy-to-clipboard both checked against the rendered
  textarea content.

## Scope boundaries, explicit

- No free-text condition search (needs Phase 2).
- Tier B/C free-text intake fields (prior surgery, fertility intent,
  anemia severity) still not collected — nothing to feed them yet
  (Milestone 7's Stage 3 structuring only covers 10/501 records).
- No per-condition shortlist scoping decision needed — the shortlist is
  intentionally condition-independent, like the patient profile.

## Next

Per the same gap list this milestone was named for: Tiers B/C/D still
aren't wired into the UI (blocked on an `ANTHROPIC_API_KEY` for full-corpus
Stage 3), and R7 (results summaries) stays deferred per PRD §7's own open
question. Both unchanged from Milestone 7's status.
