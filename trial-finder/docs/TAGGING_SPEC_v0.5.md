# Trial Tagging Specification

**Version:** 0.5
**Owner:** Aditi Luthra (Product)
**Status:** Draft — Phase 1

This document defines how every clinical trial record is tagged, scored, and
displayed. It is the single source of truth. Code should implement these rules
exactly; if a rule is ambiguous, the spec is wrong and should be fixed here
first, not worked around in code.

---

## 1. Principles

These govern every decision below. When a rule and a principle conflict, the
principle wins and the rule gets rewritten.

**P1. Asymmetric error cost.** A false inclusion wastes a user's time. A false
exclusion means a sick person never learns a trial existed. We accept many
false inclusions to avoid one false exclusion.

**P2. Judgments require a published rubric.** We may evaluate trials against
criteria we define, and we may display an evaluative label. Any such label must
name its rubric, list the specific criteria the trial met, and be versioned in
this spec. We never display an evaluative adjective without its basis.

**P3. Structured data before inference.** If the API has a field for it, use the
field. Only fall back to text extraction when no field exists, and mark those
tags as lower confidence.

**P4. Show the source.** Every exclusion, warning, or evaluative label displays
the actual text from the trial record that triggered it. The user judges; we
surface.

**P5. "Not stated" is a valid answer.** Never default a missing value to the
optimistic case. Absence of cost information is not evidence of no cost. An
unrecognized device is not evidence of low burden.

**P6. Categories are factual; rankings are hints.** A displayed category must be
traceable to a source field and must never be wrong. A ranking derived from
interpretation may be imperfect, and therefore may only order results — never
appear as a claim the user is asked to trust.

---

## 2. Data source

ClinicalTrials.gov API v2. Public, no auth, no key.

```
GET https://clinicaltrials.gov/api/v2/studies
```

All protocol fields live under `protocolSection`, nested by module. Results data
lives under a separate top-level `resultsSection`.

| Module | Fields we use | Drives |
|---|---|---|
| `identificationModule` | `nctId`, `briefTitle` | Primary key, deep link, display |
| `statusModule` | `overallStatus`, `statusVerifiedDate`, `lastKnownStatus`, `lastUpdatePostDateStruct.date`, `completionDateStruct.date` | TAG 4, results eligibility |
| `sponsorCollaboratorsModule` | `leadSponsor.name`, `leadSponsor.class` | TAG 5, sponsor history (future) |
| `oversightModule` | `isFdaRegulatedDrug`, `isFdaRegulatedDevice`, `isUnapprovedDevice`, `oversightHasDmc` | TAG 5 |
| `descriptionModule` | `briefSummary`, `detailedDescription` | Display, TAG 6 text source |
| `conditionsModule` | `conditions[]` | Search matching, TAG 5 criterion 7 |
| `designModule` | `studyType`, `phases[]`, `designInfo.allocation`, `designInfo.interventionModel`, `enrollmentInfo` | TAG 1, TAG 2, TAG 3 |
| `armsInterventionsModule` | `armGroups[].type`, `armGroups[].description`, `interventions[].type`, `interventions[].name`, `interventions[].description` | TAG 2, TAG 3 |
| `eligibilityModule` | `eligibilityCriteria`, `sex`, `minimumAge`, `maximumAge`, `stdAges[]`, `healthyVolunteers` | Exclusion rubric, intake mining |
| `contactsLocationsModule` | `centralContacts[]`, `overallOfficials[]`, `locations[]`, `locations[].contacts[]`, `locations[].geoPoint` | Geography, TAG 5 site count, contact templates |
| `referencesModule` | `references[].pmid`, `references[].type`, `references[].citation` | Disease landscape (R8), published-results linkage |
| `hasResults` (top level) | boolean | Results section eligibility |
| `resultsSection` | `outcomeMeasuresModule`, `adverseEventsModule`, `participantFlowModule` | Results summary |

**Verified** against the API v2 field reference on 2026-08-26. Still worth
dumping one live record before building, but the names above are confirmed.

### API mechanics

- **Pagination is cursor-based.** Follow `nextPageToken`; there is no numeric
  offset. Pass `countTotal=true` on the first request to get `totalCount`.
- **`pageSize`** defaults to 20, max 1000.
- **The `fields` parameter uses different casing than the JSON response.**
  Request `fields=NCTId|BriefTitle|Condition|Phase` (PascalCase), but read
  `protocolSection.identificationModule.nctId` (camelCase) from the response.
  This trips people up.
- **Useful query parameters:** `query.cond` (condition), `query.patient`
  (patient-friendly terms — worth testing against `query.cond` for our users),
  `query.intr` (intervention), `filter.overallStatus`, and `filter.geo` with
  `distance(lat,lon,50mi)` for location filtering.
- **Bulk download** available at `https://clinicaltrials.gov/AllAPIJSON.zip` if
  ingesting the full corpus for the concept vocabulary (§6).

**Unused but retained** (fetch and store; no tag consumes them yet):
`enrollmentInfo.count`, `enrollmentInfo.type`.

---

## 3. Tags

### TAG 1 — Phase

**Source:** `designModule.phases[]` (array; may contain two values, e.g.
`["PHASE1","PHASE2"]`)

| API value | Patient label | Explanation shown |
|---|---|---|
| `EARLY_PHASE1` | Very early research | First tests in humans. The goal is safety, not benefit. Usually very small. |
| `PHASE1` | Early safety testing | Tests safety and dosing in a small group. Not designed to prove the treatment works. |
| `PHASE2` | Testing whether it works | Tests whether the treatment has a real effect. Mid-sized. |
| `PHASE3` | Large-scale confirmation | Large study comparing against current standard care. More evidence stands behind the treatment at this stage than at any earlier one. |
| `PHASE4` | Already approved | Studies a treatment already on the market, usually for long-term or real-world effects. |
| `NA` | No FDA phase | Normal for behavioral, device, dietary, and observational studies. **Not a quality signal.** |

Combined arrays take the later phase's label, prefixed "Early-to-mid" or
"Mid-to-late".

**Display rule (mandatory).** TAG 1 and TAG 2 must render adjacent to each
other. Later phases carry more accumulated evidence, and we say so — but later
phases also more often include a placebo arm. Showing the evidence statement
without the placebo statement lets a reader conclude "more evidence" means
"better odds for me," which does not follow. Neither tag ships alone.

We do not label phases better or worse.

---

### TAG 2 — Placebo exposure

**Source:** `armsInterventionsModule.armGroups[].type` +
`designModule.designInfo.allocation` + `designInfo.interventionModel`

Arm types: `EXPERIMENTAL`, `ACTIVE_COMPARATOR`, `PLACEBO_COMPARATOR`,
`SHAM_COMPARATOR`, `NO_INTERVENTION`, `OTHER`

```
if interventionModel == SINGLE_GROUP or len(armGroups) == 1:
    → "Everyone receives the treatment"

elif any arm type in {PLACEBO_COMPARATOR, SHAM_COMPARATOR}:
    if allocation == RANDOMIZED:
        chance = (count of placebo/sham arms) / (total arms)
        → "You may receive a placebo (about {chance})"
    else:
        → "This study includes a placebo group. Assignment is not random —
           ask the site how groups are chosen."

elif any arm type == ACTIVE_COMPARATOR:
    → "All participants receive an active treatment (you may receive the
       standard treatment rather than the new one)"

elif armGroups is empty or missing:
    → "Not stated"
```

**Why this tag exists.** ClinicalTrials.gov discloses this in a design table
almost no one reads. For a patient deciding whether a trial is worth pursuing,
"will I actually get the treatment" is often the deciding question.

---

### TAG 3 — Intervention type and burden

Two layers, per **P6**.

#### Layer A — Category (factual, never wrong)

Displayed directly from `armsInterventionsModule.interventions[].type`:

`BEHAVIORAL`, `DIETARY_SUPPLEMENT`, `DIAGNOSTIC_TEST`, `DEVICE`, `DRUG`,
`BIOLOGICAL`, `COMBINATION_PRODUCT`, `PROCEDURE`, `RADIATION`, `GENETIC`,
`OTHER` — this is the complete enum
Plus `studyType == OBSERVATIONAL` → "No treatment given"

All filtering operates on this layer. "Show me non-drug trials" filters on
category, so it is correct even where Layer C ranking is uncertain.

#### Layer B — Explanation (what this actually involves)

Resolve in priority order:

1. `interventions[].description` — the sponsor's own words. Quote directly. No
   inference, no marking needed.
2. If absent, generate a short plain-language line from `interventions[].name`
   plus the relevant `armGroups[].description`. **Mark it** with "summarized
   from the trial record" so our paraphrase stays distinguishable from the
   sponsor's text.
3. If both absent, display the intervention name alone. Say nothing further.

This layer carries the interpretive weight. An implant and a wristband are both
`DEVICE`; the explanation is where that difference reaches the user.

#### Layer C — Burden rank (sorting hint only)

Never displayed as a number or level to the user. Used for default ordering and
for "lowest burden first" sorting.

| Rank | Description | Derivation |
|---|---|---|
| 0 | No treatment given | `studyType == OBSERVATIONAL` |
| 1 | Non-invasive | Behavioral, apps, diet/supplements, wearables, external imaging, ultrasound, diagnostic tests |
| 2 | Minimally invasive | Injections, infusions, biopsies, endoscopy, blood draws beyond standard care |
| 3 | Experimental drug or biologic | `DRUG`, `BIOLOGICAL`, or `COMBINATION_PRODUCT` |
| 4 | Implant or surgical device | Device placed in the body requiring a procedure |
| 5 | Procedure, radiation, or gene therapy | Surgery, radiation, genetic modification |

Take the **maximum** rank across all interventions for ordering. Show the
components on the detail view — a trial that is both a drug and monthly biopsies
should read "experimental drug, plus repeated biopsies," not just rank 3.

**Device disambiguation.** `DEVICE` alone cannot separate rank 1 from rank 4.
Keyword pass on `interventions[].name` and `.description`:

- Rank 4 signals: implant, implanted, implantable, catheter, stent, pump,
  electrode, lead, prosthesis, "surgically placed"
- Rank 1 signals: wearable, wristband, patch, monitor, sensor, app, smartphone,
  external, ultrasound, non-invasive
- **Neither matched → default rank 2, not rank 1.** An unrecognized device is
  more likely to involve something than nothing (P5).

**Known gap.** `PROCEDURE` spans a skin punch biopsy and open surgery. Same
split should be applied once the device logic exists. Currently all `PROCEDURE`
ranks 5, which overstates burden for minor procedures. Accepted for v0.2.

---

### TAG 4 — Freshness and status

**Source:** `statusModule.overallStatus` + `statusVerifiedDate` +
`lastUpdatePostDateStruct.date` + `completionDateStruct.date` + `hasResults`

> **Correction (v0.4).** The v0.3 correction below was itself wrong and is
> struck through, not deleted, so the mistake stays visible per this repo's
> working agreement ("the spec is wrong — say so and stop, then fix the spec
> first"):
>
> > ~~**Correction (v0.3).** Earlier drafts keyed staleness off
> > `overallStatus == UNKNOWN`. **That value does not exist in API v2.** The
> > "Unknown status" a user sees on the ClinicalTrials.gov website is
> > *derived* by the site, not stored. We must derive it ourselves.~~
>
> **`UNKNOWN` does exist in API v2, stored directly on `overallStatus`, and
> it is common.** Verified 2026-09-24 against a live fetch of 501
> "uterine fibroids" records (Milestone 1, Part B): `UNKNOWN` was the
> **second most common** `overallStatus` value, on **97 of 501 records
> (19.4%)** — more common than `RECRUITING`. Confirmed on a real record:
>
> ```json
> {
>   "nctId": "NCT03134157",
>   "overallStatus": "UNKNOWN",
>   "statusVerifiedDate": "2020-10",
>   "lastKnownStatus": "RECRUITING"
> }
> ```
>
> So the v0.1/v0.2 approach (key off `overallStatus == UNKNOWN` directly) was
> right all along. The derived-staleness heuristic below is not thrown out,
> though: `UNKNOWN` is the registry's *own* determination and lags — a trial
> can be just as stale before ClinicalTrials.gov gets around to relabeling it.
> The two are complementary signals, not alternatives: `UNKNOWN` first
> (highest confidence, it's what the registry itself concluded), the derived
> heuristic second (catches the ones the registry hasn't relabeled yet).

**Full `overallStatus` enum:** `RECRUITING`, `NOT_YET_RECRUITING`,
`ACTIVE_NOT_RECRUITING`, `ENROLLING_BY_INVITATION`, `COMPLETED`, `SUSPENDED`,
`TERMINATED`, `WITHDRAWN`, `UNKNOWN`, plus expanded-access values `AVAILABLE`,
`NO_LONGER_AVAILABLE`, `TEMPORARILY_NOT_AVAILABLE`, `APPROVED_FOR_MARKETING`,
`WITHHELD`.

**Deriving stale (supplementary to `UNKNOWN`, see above).**
`statusVerifiedDate` (YYYY-MM) is when the sponsor last confirmed the record.
A trial not already `UNKNOWN` is stale when:

```
overallStatus != UNKNOWN
AND statusVerifiedDate is more than 24 months old
AND overallStatus is an active-sounding value
    (RECRUITING, NOT_YET_RECRUITING, ACTIVE_NOT_RECRUITING, ENROLLING_BY_INVITATION)
AND (completionDateStruct.date has passed OR is absent)
```

`lastKnownStatus` is populated on `UNKNOWN` records (see the worked example
above) and can be shown as supporting detail — "last known status before this
became unclear: {lastKnownStatus}".

| Condition | Action |
|---|---|
| `overallStatus == UNKNOWN` | Exclude from default results. Show under Excluded Trials: "ClinicalTrials.gov could not confirm this trial is still active (status unknown since {statusVerifiedDate})." Show `lastKnownStatus` as supporting detail when present. |
| Derived stale (above; only applies when `overallStatus != UNKNOWN`) | "Status unverified — sponsor last confirmed {statusVerifiedDate}". Downrank heavily. |
| Months since `lastUpdatePostDateStruct.date` > 24 | "Record may be out of date" |
| `overallStatus` in `{TERMINATED, WITHDRAWN, SUSPENDED}` | Exclude from default results. Show under Excluded Trials with reason. |
| `overallStatus == ENROLLING_BY_INVITATION` | **Show, clearly labeled** "Enrolling by invitation only — this study is not accepting open inquiries." Suppress Template A; offer Template B. |
| `overallStatus == COMPLETED` and `hasResults == true` | **Not excluded.** Route to Completed Trials view (§4). |
| `overallStatus == COMPLETED` and `hasResults == false` | Exclude from default results. No results to offer. |
| `overallStatus` in `{RECRUITING, NOT_YET_RECRUITING}` and fresh | No label |

**Why ENROLLING_BY_INVITATION matters.** A user who emails an
invitation-only study gets no reply and concludes the product does not work.
This status must be surfaced, not silently treated as recruiting.

---

### TAG 4b — Expanded Access

**Source:** `designModule.studyType == EXPANDED_ACCESS`, plus
`statusModule.expandedAccessInfo.hasExpandedAccess` and its linked `nctId` on
regular trial records.

Expanded access (compassionate use) is how a patient obtains an investigational
treatment **outside** a trial — typically when they do not qualify for one, or
none is enrolling nearby. For our primary user, who is dissatisfied with
standard options, this is frequently more relevant than a trial and is entirely
absent from earlier drafts.

| Condition | Action |
|---|---|
| `studyType == EXPANDED_ACCESS` | Label "Expanded access — not a trial." Explain: treatment provided outside a study, usually requires physician sponsorship. |
| Status `AVAILABLE` | "Currently available" |
| Status `TEMPORARILY_NOT_AVAILABLE` | "Temporarily unavailable" |
| Status `NO_LONGER_AVAILABLE` | Exclude from default; show under Excluded Trials |
| A trial record has `expandedAccessInfo.hasExpandedAccess == true` | Surface a link to the expanded-access record — "this treatment may also be available outside the trial" |

Expanded access records have no phase and no arms, so TAG 1, TAG 2, and parts of
TAG 3 do not apply. Suppress rather than display "Not stated" for all of them.

---

### TAG 5 — Oversight rubric

**Source:** `oversightModule` + `leadSponsor.class` + `locations[]` +
`armGroups[]` + TAG 6

#### Facts panel (always shown)

- FDA-regulated: `isFdaRegulatedDrug` OR `isFdaRegulatedDevice`
- Independent data monitoring committee: `oversightHasDmc`
- Sponsor type: `leadSponsor.class`
- Number of sites: `len(locations)`
- Has a control group: any arm type in `{ACTIVE_COMPARATOR,
  PLACEBO_COMPARATOR, SHAM_COMPARATOR, NO_INTERVENTION}`

#### The Eight Oversight Criteria (published rubric, per P2)

A trial meets a criterion when:

1. **Participants pay to enroll** — TAG 6 returns `participant_pays` at high confidence
2. **Sponsor is a private clinic or individual** — `leadSponsor.class` in `{OTHER, INDIV}`
3. **No FDA regulation** — both `isFdaRegulatedDrug` and `isFdaRegulatedDevice` are false
4. **Single site** — `len(locations) == 1`
5. **No data monitoring committee** — `oversightHasDmc` is false
6. **No control group** — no arm type in the control set above
7. **Unrelated conditions** — `conditions[]` spans three or more unrelated body systems
8. **Unapproved device** — `oversightModule.isUnapprovedDevice` is true

**Label:** when **4 or more** criteria are met, display:

> **Below our oversight standard (N of 8)**
> followed by the specific criteria met, each with its source value.

Fewer than 4: no label. Facts panel still shows.

**Calibration warning — read before changing the threshold.** Most registered
trials are small, single-site studies with no FDA phase, sponsored by
universities, hospitals, and foundations (class `OTHER`). Criteria 2, 3, 4, and
6 are each **normal in isolation**. Only the composite carries meaning. Lowering
the threshold below 4 will flag legitimate academic research and destroy user
trust.

"No results posted" is deliberately **excluded** from the rubric: only about a
third of trials ever post results, making it too common to discriminate.

**Basis.** Criteria derive from published guidance — ISSCR guidelines on
unproven cell therapies and FDA warnings on unapproved stem cell products. Cite
the basis wherever the label appears.

**Never display** the words "controversial", "predatory", or "questionable".
The rubric name and the criteria list carry the judgment; adjectives add legal
exposure and no information.

---

### TAG 6 — Cost and compensation

**Source:** free text only — `briefSummary`, `detailedDescription`,
`eligibilityCriteria`. **No structured field exists for this.**

Lowest-confidence tag in the spec.

**Stage 1 — keyword prefilter:**

- *Participant pays:* "at their own expense", "responsible for the cost",
  "self-pay", "payment is required", "out-of-pocket", "fee", "insurance will be billed"
- *Compensated:* "will be compensated", "will receive $", "stipend",
  "reimbursed for travel", "payment for participation"
- *No cost:* "at no cost", "free of charge", "no cost to participants",
  "study-related procedures are provided"

**Stage 2 — extraction** (on prefilter hits only):

```json
{
  "status": "participant_pays | compensated | no_cost | unclear",
  "evidence_sentence": "<verbatim sentence from the record>",
  "confidence": "high | low"
}
```

**Stage 3 — display:**

- Display a cost tag **only** when `confidence == high` AND
  `evidence_sentence` is present. Show the sentence.
- Otherwise display **"Not stated"**.
- **Never** default to "free" or "no cost" (P5).

---

## 4. Completed trials — "What this trial found"

Completed trials with posted results are not dead ends. They tell a user what a
treatment actually did.

**Eligibility:** `overallStatus == COMPLETED` AND `hasResults == true`.

**Source:** `resultsSection` — `outcomeMeasuresModule` (primary and secondary
outcomes with values), `adverseEventsModule`, `participantFlowModule`.

**Generation:** on click, not in list view. Summaries are slow and expensive to
generate for every row, and most users won't want most of them.

**Summary contents** — 3–4 sentences covering:
1. What the trial tested and in whom
2. Whether the primary endpoint was met, with the actual numbers
3. Notable adverse events
4. Enrollment size

**Framing rule.** Label the section **"What this trial found."** Do **not**
label results promising, encouraging, or successful. Determining whether a
result is good requires judging effect size, endpoint selection, and comparator
choice — an LLM summarizing outcome tables will sometimes call a failed trial
promising. Summarize neutrally, including when the primary endpoint was missed,
and let the reader judge (P4).

**Open product question:** whether generation is gated as a premium feature.
Deferred until usage data exists. Gating the most differentiated feature before
knowing whether people use it is a known early mistake.

---

## 5. Exclusion rubric

Four confidence tiers. Only Tier A may remove a trial from the main list.

### Tier A — Definite (structured; may hide)

| Check | Fields |
|---|---|
| Age outside range | `minimumAge`, `maximumAge` |
| Sex mismatch | `eligibilityModule.sex` |
| Healthy-volunteer mismatch | `healthyVolunteers` |

Hidden trials appear under **Excluded Trials** with the specific reason.

### Tier B — Probable (text; downrank, never hide)

Criterion clearly matches user-provided information. Show inline, downranked,
criterion sentence displayed.

### Tier C — Ambiguous (show, flagged)

Criterion contains a qualifier the user has not addressed — "uncontrolled",
"severe", "active", "unstable", "within the past N months".

**Example.** "Uncontrolled diabetes mellitus (HbA1c > 9%)" is not the same as
diabetes. A user with well-managed type 2 may qualify. This distinction is the
entire reason Tier C exists.

### Tier D — Unknown (show, no penalty)

Trial references something we never asked about.

### Display rule

Never render "You do not qualify." Render:

> **This trial's exclusion criteria include:**
> *"{verbatim criterion sentence}"*
> You told us: {user's answer}. If this doesn't describe your situation, this
> trial may still be an option.

### Override

Every excluded trial gets a "This doesn't apply to me" control returning it to
the main list. Overrides are logged anonymously as labeled data for improving
the matcher.

---

## 6. Parsing eligibility criteria

`eligibilityModule.eligibilityCriteria` is **a single free-text string** — not a
list, not structured fields. Typical shape:

```
Inclusion Criteria:

* Age 18 years or older
* Confirmed diagnosis of moderate to severe plaque psoriasis

Exclusion Criteria:

* Uncontrolled diabetes mellitus (HbA1c > 9%)
* History of malignancy within 5 years
```

Convention is loose and unenforced. Some records use different headers, some run
prose, some omit the split entirely.

**Run once per trial at ingest**, not per user query. Output is
user-independent and this is the expensive step.

### Stage 1 — Split inclusion from exclusion

Regex on header variants: "Exclusion Criteria", "Exclusion:", "Key Exclusion
Criteria", "Exclusion criteria include". Records that fail to split go to a
logged bucket for handling — never silently mangled.

### Stage 2 — Split into atomic criteria

Bullets, numbers, or line breaks. **Preserve verbatim text** for each — the
display rule in §5 requires the original string.

### Stage 3 — Structure each criterion

```json
{
  "verbatim": "Uncontrolled diabetes mellitus (HbA1c > 9%)",
  "concept": "diabetes",
  "qualifier": "uncontrolled",
  "threshold": "HbA1c > 9%",
  "tier": "C"
}
```

The `qualifier` field is what makes Tier C possible. Without it, every diabetic
is excluded from this trial.

### Concept vocabulary

Accumulate extracted concepts across trials. The same conditions recur
constantly; after a few thousand records this becomes a reusable map rather than
a per-trial extraction. The vocabulary is a durable asset and it also generates
the intake questions in §7.

---

## 7. Intake questions

Derive, don't guess:

1. Pull `eligibilityCriteria` for all trials matching a condition
2. Extract and count recurring exclusion concepts (§6 vocabulary)
3. Rank by frequency across the corpus
4. Ask the top N resolving the most exclusions

Present progressively in a side panel, never as an upfront form. Show what each
answer buys: *"3 more questions could rule out 40 trials."*

**Phase 1:** questions only, evaluated client-side, ~~nothing stored~~.

> **Correction (v0.5).** "Nothing stored" was too strong. The actual boundary
> is *nothing leaves the device*: a local-only patient profile (PRD R1b) may
> persist intake answers in browser storage (`localStorage`/IndexedDB) so a
> user doesn't re-answer on a later visit. This is still Phase 1 — no privacy
> architecture decision is needed for data that's never transmitted anywhere.
> What Phase 1 must not do is send that profile to a server.

**Phase 2:** server-side record storage/upload. Requires privacy architecture
decided first — state consumer health privacy law (e.g. Washington My Health
My Data, which carries a private right of action), **not** HIPAA, is the
binding constraint on a direct-to-consumer tool. The line between Phase 1 and
Phase 2 is transmission, not persistence.

---

## 8. Versioning

Every tag assignment records spec version and computation date.

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-08-26 | Initial draft |
| 0.5 | 2026-09-25 | **Reverted the v0.1 "nothing stored" claim in §7 — too strong.** A local-only patient profile (PRD R1b) may persist intake answers in browser storage; the actual Phase 1/2 boundary is transmission (nothing leaves the device), not persistence. Struck through, not deleted, matching this doc's convention for retracted claims. |
| 0.4 | 2026-09-24 | **Reverted the v0.3 TAG 4 correction — it was itself wrong.** Milestone 1's live fetch of 501 "uterine fibroids" records (`trial-finder/reports/milestone_1_status.md`) found `overallStatus == UNKNOWN` on 97/501 records (19.4%), confirmed on `NCT03134157`. `UNKNOWN` is real, stored, and common — added back to the enum. TAG 4 now checks `overallStatus == UNKNOWN` directly (highest confidence, it's the registry's own determination) with the v0.3 derived-staleness heuristic kept as a supplementary signal for records the registry hasn't relabeled yet, gated on `overallStatus != UNKNOWN`. `UNKNOWN` routes to Excluded Trials with `lastKnownStatus` shown as supporting detail. |
| 0.3 | 2026-08-26 | **API verified against v2 field reference.** ~~Corrected TAG 4: `overallStatus == UNKNOWN` does not exist in API v2 — staleness now derived from `statusVerifiedDate` + status + completion date.~~ (Reverted in 0.4 — this was wrong.) Added `ENROLLING_BY_INVITATION` handling. Added TAG 4b Expanded Access. Added `isUnapprovedDevice` as 8th oversight criterion. Added `COMBINATION_PRODUCT` to burden ladder. Added `referencesModule`, `centralContacts`, `stdAges`, `geoPoint` to data source table. Added API mechanics section (cursor pagination, fields-parameter casing, `query.patient`, `filter.geo`). |
| 0.2 | 2026-08-26 | P2 revised to permit rubric-based judgments; P6 added. TAG 3 split into category/explanation/rank layers with 6-level burden ladder and device disambiguation. TAG 5 rubric named and labeled. §4 completed-trials results summary added. §6 eligibility parsing pipeline added. |

---

## 9. Known gaps

- `PROCEDURE` not yet split by invasiveness (§3, TAG 3)
- Sponsor-level track record not yet used in TAG 5 — FDA warning letters, prior
  results-posting history, and PubMed publication history are stronger evidence
  than any single trial record. Natural Phase 2 upgrade; architecture should
  leave room.
- `briefTitle` is often jargon-heavy and may need patient-facing rewriting
- ~~Field names in §2 unverified~~ — verified 2026-08-26 against API v2 field reference
- ~~`overallStatus == UNKNOWN` does not exist in API v2 (TAG 4)~~ — this v0.3 claim was
  wrong; reverted in v0.4 after Milestone 1's live fetch found it on 19.4% of
  a 501-record sample. See §3 TAG 4 and the versioning table.
- ~~"nothing stored" in Phase 1 intake (§7)~~ — too strong; reverted in v0.5.
  Local-only browser storage is fine in Phase 1 (PRD R1b); only server
  transmission is gated behind the Phase 2 privacy decision.
- `query.patient` (patient-friendly search) untested against `query.cond` — may materially improve results for our users
- `referencesModule[].pmid` linkage to published papers not yet used; relevant to the disease landscape view
