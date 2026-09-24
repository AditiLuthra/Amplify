# Field coverage report — uterine fibroids

- Records analyzed: **501**
- Source: `/home/user/Amplify/trial-finder/data/raw/uterine_fibroids` (1 page(s), fetched via ClinicalTrials.gov API v2, cached raw JSON)
- Spec version: TAGGING_SPEC_v0.4.md section 2

## Field population rate

Percentage of records where the field (per spec §2's module table) has a value.
For list fields (`[]`), "populated" means the list is non-empty; for a nested
`list[].field`, it means at least one item in the list has that field set.

| Module | Field | % populated | n populated |
|---|---|---:|---:|
| `identificationModule` | `nctId` | 100.0% | 501/501 |
| `identificationModule` | `briefTitle` | 100.0% | 501/501 |
| `statusModule` | `overallStatus` | 100.0% | 501/501 |
| `statusModule` | `statusVerifiedDate` | 100.0% | 501/501 |
| `statusModule` | `lastKnownStatus` | 19.4% | 97/501 |
| `statusModule` | `lastUpdatePostDateStruct.date` | 100.0% | 501/501 |
| `statusModule` | `completionDateStruct.date` | 98.8% | 495/501 |
| `sponsorCollaboratorsModule` | `leadSponsor.name` | 100.0% | 501/501 |
| `sponsorCollaboratorsModule` | `leadSponsor.class` | 100.0% | 501/501 |
| `oversightModule` | `isFdaRegulatedDrug` | 56.3% | 282/501 |
| `oversightModule` | `isFdaRegulatedDevice` | 56.3% | 282/501 |
| `oversightModule` | `isUnapprovedDevice` | 1.2% | 6/501 |
| `oversightModule` | `oversightHasDmc` | 83.8% | 420/501 |
| `descriptionModule` | `briefSummary` | 100.0% | 501/501 |
| `descriptionModule` | `detailedDescription` | 67.7% | 339/501 |
| `conditionsModule` | `conditions[]` | 100.0% | 501/501 |
| `designModule` | `studyType` | 100.0% | 501/501 |
| `designModule` | `phases[]` | 73.9% | 370/501 |
| `designModule` | `designInfo.allocation` | 73.3% | 367/501 |
| `designModule` | `designInfo.interventionModel` | 73.3% | 367/501 |
| `designModule` | `enrollmentInfo.count` | 99.0% | 496/501 |
| `designModule` | `enrollmentInfo.type` | 97.2% | 487/501 |
| `armsInterventionsModule` | `armGroups[].type` | 70.7% | 354/501 |
| `armsInterventionsModule` | `armGroups[].description` | 78.4% | 393/501 |
| `armsInterventionsModule` | `interventions[].type` | 89.8% | 450/501 |
| `armsInterventionsModule` | `interventions[].name` | 89.8% | 450/501 |
| `armsInterventionsModule` | `interventions[].description` | 81.6% | 409/501 |
| `eligibilityModule` | `eligibilityCriteria` | 100.0% | 501/501 |
| `eligibilityModule` | `sex` | 99.8% | 500/501 |
| `eligibilityModule` | `minimumAge` | 95.0% | 476/501 |
| `eligibilityModule` | `maximumAge` | 65.3% | 327/501 |
| `eligibilityModule` | `stdAges[]` | 100.0% | 501/501 |
| `eligibilityModule` | `healthyVolunteers` | 98.2% | 492/501 |
| `contactsLocationsModule` | `centralContacts[]` | 27.3% | 137/501 |
| `contactsLocationsModule` | `overallOfficials[]` | 72.9% | 365/501 |
| `contactsLocationsModule` | `locations[]` | 90.0% | 451/501 |
| `contactsLocationsModule` | `locations[].contacts[]` | 0.0% | 0/501 |
| `contactsLocationsModule` | `locations[].geoPoint` | 88.2% | 442/501 |
| `referencesModule` | `references[].pmid` | 39.1% | 196/501 |
| `referencesModule` | `references[].type` | 39.3% | 197/501 |
| `referencesModule` | `references[].citation` | 39.3% | 197/501 |

## Value distributions

### `statusModule.overallStatus`

| Value | Count | % of populated values |
|---|---:|---:|
| `COMPLETED` | 243 | 48.5% |
| `UNKNOWN` | 97 | 19.4% |
| `TERMINATED` | 55 | 11.0% |
| `RECRUITING` | 40 | 8.0% |
| `NOT_YET_RECRUITING` | 23 | 4.6% |
| `WITHDRAWN` | 21 | 4.2% |
| `ACTIVE_NOT_RECRUITING` | 17 | 3.4% |
| `ENROLLING_BY_INVITATION` | 5 | 1.0% |

### `designModule.studyType`

| Value | Count | % of populated values |
|---|---:|---:|
| `INTERVENTIONAL` | 370 | 73.9% |
| `OBSERVATIONAL` | 131 | 26.1% |

### `designModule.phases[]`

| Value | Count | % of populated values |
|---|---:|---:|
| `NA` | 180 | 47.0% |
| `PHASE3` | 80 | 20.9% |
| `PHASE2` | 50 | 13.1% |
| `PHASE4` | 42 | 11.0% |
| `PHASE1` | 23 | 6.0% |
| `EARLY_PHASE1` | 8 | 2.1% |

### `armsInterventionsModule.interventions[].type`

| Value | Count | % of populated values |
|---|---:|---:|
| `DRUG` | 393 | 48.6% |
| `PROCEDURE` | 216 | 26.7% |
| `DEVICE` | 114 | 14.1% |
| `OTHER` | 47 | 5.8% |
| `DIAGNOSTIC_TEST` | 11 | 1.4% |
| `DIETARY_SUPPLEMENT` | 8 | 1.0% |
| `BEHAVIORAL` | 8 | 1.0% |
| `GENETIC` | 4 | 0.5% |
| `RADIATION` | 3 | 0.4% |
| `COMBINATION_PRODUCT` | 3 | 0.4% |
| `BIOLOGICAL` | 1 | 0.1% |

### `armsInterventionsModule.armGroups[].type`

| Value | Count | % of populated values |
|---|---:|---:|
| `EXPERIMENTAL` | 417 | 56.2% |
| `ACTIVE_COMPARATOR` | 176 | 23.7% |
| `PLACEBO_COMPARATOR` | 83 | 11.2% |
| `NO_INTERVENTION` | 33 | 4.4% |
| `OTHER` | 24 | 3.2% |
| `SHAM_COMPARATOR` | 9 | 1.2% |

### `designModule.designInfo.allocation`

| Value | Count | % of populated values |
|---|---:|---:|
| `RANDOMIZED` | 253 | 68.9% |
| `NA` | 84 | 22.9% |
| `NON_RANDOMIZED` | 30 | 8.2% |

### `sponsorCollaboratorsModule.leadSponsor.class`

| Value | Count | % of populated values |
|---|---:|---:|
| `OTHER` | 310 | 61.9% |
| `INDUSTRY` | 156 | 31.1% |
| `OTHER_GOV` | 15 | 3.0% |
| `NIH` | 11 | 2.2% |
| `INDIV` | 4 | 0.8% |
| `NETWORK` | 3 | 0.6% |
| `FED` | 2 | 0.4% |

### `eligibilityModule.sex`

| Value | Count | % of populated values |
|---|---:|---:|
| `FEMALE` | 479 | 95.8% |
| `ALL` | 20 | 4.0% |
| `MALE` | 1 | 0.2% |

