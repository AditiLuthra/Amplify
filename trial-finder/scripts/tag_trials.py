#!/usr/bin/env python3
"""
Milestones 2-5: TAG 1 (phase), TAG 2 (placebo exposure), TAG 3 (intervention
type and burden), TAG 4 (freshness and status), TAG 5 (oversight facts panel
and rubric), Tier A exclusions (structured age/sex/healthy-volunteer
mismatch - TAGGING_SPEC_v0.5.md sec. 5).

Per TAGGING_SPEC_v0.5.md sec. 3. Reads cached raw pages from data/raw/<slug>/
(written by fetch_trials.py) and writes one tag record per trial to
data/tagged/<slug>.json. Never hits the network.

A record that hits a case the spec doesn't cover is flagged (`gap`/
`burden_gap`: true) rather than guessed at, per CLAUDE.md's working
agreement. See reports/milestone_2_status.md and milestone_3_status.md for
what was found and why.

Usage:
    python3 scripts/tag_trials.py "uterine fibroids"
    python3 scripts/tag_trials.py "uterine fibroids" --as-of 2026-09-28
"""
import argparse
import datetime
import json
import re
from pathlib import Path

SPEC_VERSION = "0.5"

# --- TAG 1: Phase -----------------------------------------------------

PHASE_LABELS = {
    "EARLY_PHASE1": "Very early research",
    "PHASE1": "Early safety testing",
    "PHASE2": "Testing whether it works",
    "PHASE3": "Large-scale confirmation",
    "PHASE4": "Already approved",
    "NA": "No FDA phase",
}

PHASE_EXPLANATIONS = {
    "EARLY_PHASE1": "First tests in humans. The goal is safety, not benefit. Usually very small.",
    "PHASE1": "Tests safety and dosing in a small group. Not designed to prove the treatment works.",
    "PHASE2": "Tests whether the treatment has a real effect. Mid-sized.",
    "PHASE3": "Large study comparing against current standard care. More evidence stands behind "
              "the treatment at this stage than at any earlier one.",
    "PHASE4": "Studies a treatment already on the market, usually for long-term or real-world effects.",
    "NA": "Normal for behavioral, device, dietary, and observational studies. Not a quality signal.",
}

# Only the two combinations the spec names, and the only two observed in the
# live "uterine fibroids" corpus (see reports/milestone_2_status.md). A
# combination not in this table is a spec gap, not something to guess at
# (CLAUDE.md working agreement: say so and stop).
COMBINED_PHASE_PREFIXES = {
    frozenset({"PHASE1", "PHASE2"}): ("Early-to-mid", "PHASE2"),
    frozenset({"PHASE2", "PHASE3"}): ("Mid-to-late", "PHASE3"),
}


def tag1_phase(design_module: dict) -> dict:
    """Returns a tag dict, or {"gap": True, ...} for a phases[] shape the
    spec doesn't cover - never invents a label for an unrecognized shape."""
    phases = design_module.get("phases") or []

    if len(phases) == 0:
        # Empty phases[] together with studyType == OBSERVATIONAL is the
        # case the spec's own NA row names ("normal for ... observational
        # studies") - reading the spec's existing NA explanation as covering
        # this, not adding a new rule.
        return {
            "phases_raw": [],
            "combined": False,
            "resolved_phase": "NA",
            "label": PHASE_LABELS["NA"],
            "explanation": PHASE_EXPLANATIONS["NA"],
        }

    if len(phases) == 1:
        p = phases[0]
        if p not in PHASE_LABELS:
            return {"gap": True, "phases_raw": phases, "reason": f"unrecognized phase value {p!r}"}
        return {
            "phases_raw": phases,
            "combined": False,
            "resolved_phase": p,
            "label": PHASE_LABELS[p],
            "explanation": PHASE_EXPLANATIONS[p],
        }

    if len(phases) == 2:
        key = frozenset(phases)
        if key not in COMBINED_PHASE_PREFIXES:
            return {
                "gap": True,
                "phases_raw": phases,
                "reason": f"combined-phase pair {phases!r} not in TAGGING_SPEC_v0.5.md sec. 3 TAG 1",
            }
        prefix, later = COMBINED_PHASE_PREFIXES[key]
        return {
            "phases_raw": phases,
            "combined": True,
            "resolved_phase": later,
            "label": f"{prefix}: {PHASE_LABELS[later]}",
            "explanation": PHASE_EXPLANATIONS[later],
        }

    return {"gap": True, "phases_raw": phases, "reason": f"unexpected phases[] length {len(phases)}"}


# --- TAG 4: Freshness and status ---------------------------------------

ACTIVE_SOUNDING = {"RECRUITING", "NOT_YET_RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION"}
EXCLUDE_STATUSES = {"TERMINATED", "WITHDRAWN", "SUSPENDED"}


def parse_partial_date(s):
    """'YYYY-MM' or 'YYYY-MM-DD' -> (year, month); None if unparseable/absent."""
    if not s:
        return None
    m = re.match(r"^(\d{4})-(\d{2})", s)
    return (int(m.group(1)), int(m.group(2))) if m else None


def months_between(later_ym, earlier_ym):
    return (later_ym[0] - earlier_ym[0]) * 12 + (later_ym[1] - earlier_ym[1])


def tag4_status(status_module: dict, has_results, as_of: datetime.date) -> dict:
    overall_status = status_module.get("overallStatus")
    status_verified_date = status_module.get("statusVerifiedDate")
    last_known_status = status_module.get("lastKnownStatus")
    last_update = (status_module.get("lastUpdatePostDateStruct") or {}).get("date")
    completion_date = (status_module.get("completionDateStruct") or {}).get("date")

    as_of_ym = (as_of.year, as_of.month)

    result = {
        "overall_status": overall_status,
        "status_verified_date": status_verified_date,
        "last_known_status": last_known_status,
        "last_update_post_date": last_update,
        "completion_date": completion_date,
        "has_results": has_results,
        "excluded": False,
        "exclusion_reason": None,
        "enrolling_by_invitation": False,
        "completed_with_results": False,
        "derived_stale": False,
        "record_out_of_date": False,
        "label": None,
        "gap": False,
    }

    if overall_status is None:
        result["gap"] = True
        return result

    # Independent flag (spec table row: "Months since lastUpdatePostDateStruct.date > 24"),
    # can co-occur with any status.
    lu_ym = parse_partial_date(last_update)
    if lu_ym is not None and months_between(as_of_ym, lu_ym) > 24:
        result["record_out_of_date"] = True

    # UNKNOWN - highest-confidence exclusion (spec v0.4 correction: real,
    # stored, checked directly).
    if overall_status == "UNKNOWN":
        result["excluded"] = True
        detail = (
            f" Last known status before this became unclear: {last_known_status}."
            if last_known_status else ""
        )
        result["exclusion_reason"] = (
            f"ClinicalTrials.gov could not confirm this trial is still active "
            f"(status unknown since {status_verified_date})." + detail
        )
        result["label"] = "Status unknown"
        return result

    # TERMINATED / WITHDRAWN / SUSPENDED - exclude.
    if overall_status in EXCLUDE_STATUSES:
        result["excluded"] = True
        result["exclusion_reason"] = f"This trial's status is {overall_status.replace('_', ' ').title()}."
        result["label"] = overall_status.replace("_", " ").title()
        return result

    # COMPLETED - route by hasResults.
    if overall_status == "COMPLETED":
        if has_results:
            result["completed_with_results"] = True
            result["label"] = "Completed — results available"
        else:
            result["excluded"] = True
            result["exclusion_reason"] = "This trial is completed and has no results posted."
            result["label"] = "Completed — no results"
        return result

    # ENROLLING_BY_INVITATION - shown, clearly labeled, not excluded.
    if overall_status == "ENROLLING_BY_INVITATION":
        result["enrolling_by_invitation"] = True
        result["label"] = "Enrolling by invitation only — this study is not accepting open inquiries."

    # Derived staleness - only for active-sounding statuses (overall_status
    # != UNKNOWN is already guaranteed at this point).
    if overall_status in ACTIVE_SOUNDING:
        svd_ym = parse_partial_date(status_verified_date)
        completion_ym = parse_partial_date(completion_date)
        if svd_ym is not None and months_between(as_of_ym, svd_ym) > 24:
            completion_passed_or_absent = completion_ym is None or completion_ym <= as_of_ym
            if completion_passed_or_absent:
                result["derived_stale"] = True
                if result["label"] is None:
                    result["label"] = f"Status unverified — sponsor last confirmed {status_verified_date}"

    # Otherwise: RECRUITING/NOT_YET_RECRUITING/ACTIVE_NOT_RECRUITING and
    # fresh -> label stays None, per spec's "No label" row.
    return result


# --- TAG 2: Placebo exposure --------------------------------------------

PLACEBO_SHAM = {"PLACEBO_COMPARATOR", "SHAM_COMPARATOR"}


def tag2_placebo(design_module: dict, arm_groups: list) -> dict:
    design_info = design_module.get("designInfo") or {}
    intervention_model = design_info.get("interventionModel")
    allocation = design_info.get("allocation")
    types = [a.get("type") for a in arm_groups]

    if intervention_model == "SINGLE_GROUP" or len(arm_groups) == 1:
        return {"label": "Everyone receives the treatment", "gap": False}

    if any(t in PLACEBO_SHAM for t in types):
        if allocation == "RANDOMIZED":
            n_placebo = sum(1 for t in types if t in PLACEBO_SHAM)
            n_total = len(types)
            chance = n_placebo / n_total
            return {
                "label": f"You may receive a placebo (about {chance:.0%})",
                "placebo_chance": chance,
                "gap": False,
            }
        return {
            "label": "This study includes a placebo group. Assignment is not "
                     "random — ask the site how groups are chosen.",
            "gap": False,
        }

    if any(t == "ACTIVE_COMPARATOR" for t in types):
        return {
            "label": "All participants receive an active treatment (you may "
                     "receive the standard treatment rather than the new one)",
            "gap": False,
        }

    if not arm_groups:
        return {"label": "Not stated", "gap": False}

    # Falls through all four named branches - most commonly multiple
    # EXPERIMENTAL arms with no comparator arm, or arm groups present but
    # missing `type` entirely. Not covered by TAGGING_SPEC_v0.5.md sec. 3
    # TAG 2 - flagged, not guessed at (CLAUDE.md working agreement).
    return {"gap": True, "arm_types_raw": types, "reason": "arm-type combination not covered by TAG 2"}


# --- TAG 3: Intervention type and burden ----------------------------------

# Layer C ladder (TAGGING_SPEC_v0.5.md sec. 3 TAG 3). PROCEDURE always ranks
# 5 per the spec's own "Known gap" note (accepted simplification for v0.2,
# not something to fix here). OTHER is not in the ladder at all - it spans
# everything from major surgery to a placebo capsule to a questionnaire in
# this corpus (see reports/milestone_3_status.md), so it is always a gap.
TYPE_TO_RANK = {
    "BEHAVIORAL": 1,
    "DIETARY_SUPPLEMENT": 1,
    "DIAGNOSTIC_TEST": 1,
    "DRUG": 3,
    "BIOLOGICAL": 3,
    "COMBINATION_PRODUCT": 3,
    "PROCEDURE": 5,
    "RADIATION": 5,
    "GENETIC": 5,
}

DEVICE_RANK4_SIGNALS = [
    "implant", "implanted", "implantable", "catheter", "stent", "pump",
    "electrode", "lead", "prosthesis", "surgically placed",
]
# KNOWN SPEC DEFECT - see reports/milestone_3_status.md. "external" and
# "ultrasound" collide with MR-guided HIFU / focused-ultrasound ABLATION
# systems, a real and common DEVICE type in this corpus (20/114 records)
# that is not low-burden - it's a sedation-requiring tissue-destruction
# procedure. Kept here verbatim from the spec (not silently dropped) but
# tag3_intervention() below withholds burden_rank rather than trust a rank-1
# match against these two keywords when an ablation-family word is also
# present, per the working agreement (spec fix needed, not a code guess).
DEVICE_RANK1_SIGNALS = [
    "wearable", "wristband", "patch", "monitor", "sensor", "app",
    "smartphone", "external", "ultrasound", "non-invasive",
]
ABLATION_FAMILY_WORDS = ["hifu", "focused ultrasound", "ablation", "hifu system"]


def _device_rank(name: str, description: str) -> tuple:
    """Returns (rank_or_None, is_gap). Device disambiguation per spec, with
    the ultrasound/ablation collision withheld rather than guessed at."""
    text = f"{name or ''} {description or ''}".lower()
    r4 = any(k in text for k in DEVICE_RANK4_SIGNALS)
    if r4:
        return 4, False

    r1 = any(k in text for k in DEVICE_RANK1_SIGNALS)
    if r1:
        if any(k in text for k in ABLATION_FAMILY_WORDS):
            return None, True  # known spec defect - see module docstring above
        return 1, False

    return 2, False  # neither matched -> default rank 2, not rank 1 (P5)


def tag3_intervention(study_type: str, interventions: list) -> dict:
    if study_type == "OBSERVATIONAL":
        return {
            "layer_a_categories": ["No treatment given"],
            "layer_b": [],
            "burden_rank": 0,
            "rank_components": [],
            "burden_gap": False,
            "gap_reasons": [],
        }

    layer_a = []
    layer_b = []
    rank_components = []
    gap_reasons = []
    any_gap = False

    for iv in interventions:
        itype = iv.get("type")
        name = iv.get("name")
        description = iv.get("description")

        layer_a.append(itype)

        # Layer B - explanation, priority order per spec: (1) verbatim
        # description, (2) generated line from name+armGroups description
        # marked as summarized [not implemented - see milestone note, this
        # is deferred rather than done via ad hoc template text], (3) name
        # alone.
        if description:
            layer_b.append({"text": description, "source": "verbatim", "intervention": name})
        elif name:
            layer_b.append({"text": name, "source": "name_only", "intervention": name})

        # Layer C - burden rank.
        if itype in TYPE_TO_RANK:
            rank = TYPE_TO_RANK[itype]
            rank_components.append({"type": itype, "rank": rank})
        elif itype == "DEVICE":
            rank, is_gap = _device_rank(name, description)
            if is_gap:
                any_gap = True
                gap_reasons.append(f"DEVICE {name!r}: rank-1/ablation keyword collision, spec fix needed")
            else:
                rank_components.append({"type": itype, "rank": rank})
        else:
            any_gap = True
            gap_reasons.append(f"{itype!r} not in the TAG 3 Layer C ladder")

    # Withhold burden_rank entirely if any component is unresolved - taking
    # max() of only the resolved ranks could understate the true burden
    # (P5: never default a missing value to the optimistic case).
    if any_gap:
        burden_rank = None
    elif rank_components:
        burden_rank = max(c["rank"] for c in rank_components)
    else:
        burden_rank = None  # no interventions listed at all - "Not stated", not 0

    return {
        "layer_a_categories": layer_a,
        "layer_b": layer_b,
        "burden_rank": burden_rank,
        "rank_components": rank_components,
        "burden_gap": any_gap,
        "gap_reasons": gap_reasons,
    }


# --- TAG 5: Oversight facts panel and rubric ------------------------------

CONTROL_ARM_TYPES = {"ACTIVE_COMPARATOR", "PLACEBO_COMPARATOR", "SHAM_COMPARATOR", "NO_INTERVENTION"}
PRIVATE_SPONSOR_CLASSES = {"OTHER", "INDIV"}

# Two of the spec's eight published criteria (TAGGING_SPEC_v0.5.md sec. 3
# TAG 5) are not computable from structured fields at this milestone:
#   - "Participants pay to enroll" needs TAG 6 (free-text cost extraction).
#     CLAUDE.md's own build order places TAG 6 at Milestone 7, after this
#     one - TAG 5 as specified depends on a milestone that hasn't run yet.
#   - "Unrelated conditions... spans 3+ unrelated body systems" has no
#     body-system taxonomy defined anywhere in the spec. Classifying
#     free-text conditions[] into body systems is inference, not a lookup,
#     and inventing a taxonomy here would be exactly the kind of silent
#     invention the working agreement prohibits.
UNCOMPUTABLE_CRITERIA = [
    "participant_pays (needs TAG 6, Milestone 7 - not yet run)",
    "unrelated_conditions (no body-system taxonomy defined in spec)",
]
N_UNCOMPUTABLE = len(UNCOMPUTABLE_CRITERIA)


def tag5_oversight(protocol: dict) -> dict:
    oversight = protocol.get("oversightModule", {}) or {}
    sponsor = (protocol.get("sponsorCollaboratorsModule", {}) or {}).get("leadSponsor", {}) or {}
    locations = (protocol.get("contactsLocationsModule", {}) or {}).get("locations") or []
    arm_groups = (protocol.get("armsInterventionsModule", {}) or {}).get("armGroups") or []

    is_fda_drug = oversight.get("isFdaRegulatedDrug")
    is_fda_device = oversight.get("isFdaRegulatedDevice")
    has_dmc = oversight.get("oversightHasDmc")
    sponsor_class = sponsor.get("class")
    n_sites = len(locations)
    arm_types = [a.get("type") for a in arm_groups]
    has_control_group = any(t in CONTROL_ARM_TYPES for t in arm_types)
    is_unapproved_device = oversight.get("isUnapprovedDevice")

    fda_regulated = None
    if is_fda_drug is not None or is_fda_device is not None:
        fda_regulated = bool(is_fda_drug) or bool(is_fda_device)

    facts_panel = {
        "fda_regulated": fda_regulated,
        "has_dmc": has_dmc,
        "sponsor_class": sponsor_class,
        "site_count": n_sites,
        "has_control_group": has_control_group,
    }

    # The six criteria computable from structured fields alone. Each is
    # True, False, or None (field missing on this record - a real,
    # observed sparsity, not an implementation gap; see
    # reports/milestone_4_status.md for how common this is per field).
    criteria = {
        "private_sponsor": (sponsor_class in PRIVATE_SPONSOR_CLASSES) if sponsor_class is not None else None,
        "no_fda_regulation": (
            (is_fda_drug is False and is_fda_device is False)
            if (is_fda_drug is not None and is_fda_device is not None) else None
        ),
        "single_site": n_sites == 1,
        "no_dmc": (has_dmc is False) if has_dmc is not None else None,
        "no_control_group": not has_control_group,
        "unapproved_device": bool(is_unapproved_device) if is_unapproved_device is not None else None,
    }

    met_count = sum(1 for v in criteria.values() if v is True)
    unresolved_among_computed = sum(1 for v in criteria.values() if v is None)

    # P1/P5-driven asymmetric logic: additional criteria (the 2 uncomputable
    # ones, and any unresolved-on-this-record ones) can only ever INCREASE
    # the true count, never decrease it. So a confirmed met_count >= 4 is
    # already a safe, valid "flagged" result even with 2 criteria entirely
    # unimplemented - waiting for TAG 6/a body-system taxonomy would only
    # delay a true positive, which is the wrong direction to err for a
    # safety-relevant flag. Conversely, met_count alone can't safely
    # confirm "not flagged" unless even the most generous assumption about
    # every unresolved/uncomputable criterion still can't reach 4.
    max_possible = met_count + unresolved_among_computed + N_UNCOMPUTABLE
    if met_count >= 4:
        status = "flagged"
    elif max_possible < 4:
        status = "not_flagged"
    else:
        status = "undetermined"

    return {
        "facts_panel": facts_panel,
        "criteria": criteria,
        "criteria_met_count": met_count,
        "criteria_unresolved_on_record": unresolved_among_computed,
        "criteria_uncomputable_at_this_milestone": UNCOMPUTABLE_CRITERIA,
        "max_possible_met": max_possible,
        "status": status,
    }


# --- Tier A exclusions (structured fields only) ---------------------------

# Per TAGGING_SPEC_v0.5.md sec. 2, API v2 age fields are a number plus a
# unit string ("18 Years", "6 Months"). "Year"/"Years" and "Months" are what
# this corpus actually contains; Weeks/Days are supported for completeness
# since the API format allows them, though unseen here.
AGE_UNIT_TO_YEARS = {
    "year": 1.0, "years": 1.0,
    "month": 1 / 12, "months": 1 / 12,
    "week": 1 / 52, "weeks": 1 / 52,
    "day": 1 / 365, "days": 1 / 365,
}


def parse_age_to_years(age_str):
    if not age_str:
        return None
    m = re.match(r"^([\d.]+)\s+(\w+)", age_str)
    if not m:
        return None
    value, unit = m.groups()
    factor = AGE_UNIT_TO_YEARS.get(unit.lower())
    if factor is None:
        return None
    return float(value) * factor


def tier_a_exclusion(eligibility_module: dict, patient: dict) -> dict:
    """Structured-field-only exclusion per TAGGING_SPEC_v0.5.md sec. 5 Tier
    A. `patient`: {"age_years": float|None, "sex": "MALE"|"FEMALE"|None,
    "healthy_volunteer": bool|None}. Only a confirmed structured mismatch
    may exclude - everything else (free text, Tiers B/C/D) is out of scope
    per the build order; this never looks at eligibilityCriteria text."""
    reasons = []

    min_age_str = eligibility_module.get("minimumAge")
    max_age_str = eligibility_module.get("maximumAge")
    min_age = parse_age_to_years(min_age_str)
    max_age = parse_age_to_years(max_age_str)
    patient_age = patient.get("age_years")
    if patient_age is not None:
        if min_age is not None and patient_age < min_age:
            reasons.append(f"Age outside range: trial requires at least {min_age_str}; you told us {patient_age}.")
        if max_age is not None and patient_age > max_age:
            reasons.append(f"Age outside range: trial requires at most {max_age_str}; you told us {patient_age}.")

    trial_sex = eligibility_module.get("sex")
    patient_sex = patient.get("sex")
    if trial_sex and trial_sex != "ALL" and patient_sex and trial_sex != patient_sex:
        reasons.append(f"Sex mismatch: trial is for {trial_sex.lower()} participants; you told us {patient_sex.lower()}.")

    # healthyVolunteers == False is the only direction that's unambiguous:
    # per ClinicalTrials.gov's own field semantics, False means the trial
    # does NOT accept healthy volunteers (requires the condition). True
    # means the trial accepts healthy volunteers, but that does not imply
    # it EXCLUDES people who also have the condition (e.g. a trial can
    # enroll a healthy-control arm alongside a patient arm) - so True
    # never triggers an exclusion here, only False does, and only when the
    # patient identifies as a healthy volunteer. Flagging this reasoning
    # explicitly (not in the spec table) rather than leaving it implicit,
    # per the working agreement - see reports/milestone_5_status.md.
    hv = eligibility_module.get("healthyVolunteers")
    patient_hv = patient.get("healthy_volunteer")
    if hv is False and patient_hv is True:
        reasons.append("Healthy-volunteer mismatch: this trial does not accept healthy volunteers.")

    return {"excluded": len(reasons) > 0, "reasons": reasons}


# --- I/O -----------------------------------------------------------------

def slugify(condition: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", condition.lower()).strip("_")
    return slug or "condition"


def load_studies(raw_dir: Path) -> list[dict]:
    studies = []
    for page_file in sorted(raw_dir.glob("page_*.json")):
        data = json.loads(page_file.read_text())
        studies.extend(data.get("studies", []))
    return studies


def tag_study(study: dict, as_of: datetime.date, patient: dict) -> dict:
    protocol = study.get("protocolSection", {})
    nct_id = protocol.get("identificationModule", {}).get("nctId")
    design_module = protocol.get("designModule", {}) or {}
    status_module = protocol.get("statusModule", {}) or {}
    arms_module = protocol.get("armsInterventionsModule", {}) or {}
    eligibility_module = protocol.get("eligibilityModule", {}) or {}
    has_results = study.get("hasResults")
    study_type = design_module.get("studyType")
    arm_groups = arms_module.get("armGroups") or []
    interventions = arms_module.get("interventions") or []

    return {
        "nct_id": nct_id,
        "spec_version": SPEC_VERSION,
        "computed_at": as_of.isoformat(),
        "tag1_phase": tag1_phase(design_module),
        "tag2_placebo": tag2_placebo(design_module, arm_groups),
        "tag3_intervention": tag3_intervention(study_type, interventions),
        "tag4_status": tag4_status(status_module, has_results, as_of),
        "tag5_oversight": tag5_oversight(protocol),
        "tier_a_exclusion": tier_a_exclusion(eligibility_module, patient),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("condition")
    parser.add_argument("--raw-dir", default=None)
    parser.add_argument("--out", default=None)
    parser.add_argument("--as-of", default=None, help="YYYY-MM-DD; default today (UTC)")
    # Milestone 5: no intake UI exists yet (that's Milestone 6+), so the
    # patient profile for Tier A exclusion defaults to Milestone 1's own
    # test persona (reports/persona_field_categorization.md: 30F) - the two
    # structured-evaluable attributes it already identified. Override via
    # flags to test other profiles.
    parser.add_argument("--patient-age", type=float, default=30.0)
    parser.add_argument("--patient-sex", default="FEMALE", choices=["FEMALE", "MALE"])
    parser.add_argument("--patient-healthy-volunteer", action="store_true",
                         help="default off: the persona has an active condition, not healthy-volunteer status")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    slug = slugify(args.condition)
    raw_dir = Path(args.raw_dir) if args.raw_dir else repo_root / "data" / "raw" / slug
    out_path = Path(args.out) if args.out else repo_root / "data" / "tagged" / f"{slug}.json"
    as_of = (
        datetime.date.fromisoformat(args.as_of)
        if args.as_of else datetime.datetime.now(datetime.timezone.utc).date()
    )
    patient = {
        "age_years": args.patient_age,
        "sex": args.patient_sex,
        "healthy_volunteer": args.patient_healthy_volunteer,
    }

    manifest_path = raw_dir / "_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"No cached data at {raw_dir}. Run scripts/fetch_trials.py {args.condition!r} first.")

    studies = load_studies(raw_dir)
    if not studies:
        raise SystemExit(f"No studies found in {raw_dir}.")

    tagged = [tag_study(s, as_of, patient) for s in studies]

    tag1_gaps = [t for t in tagged if t["tag1_phase"].get("gap")]
    tag2_gaps = [t for t in tagged if t["tag2_placebo"].get("gap")]
    tag3_gaps = [t for t in tagged if t["tag3_intervention"].get("burden_gap")]
    tag4_gaps = [t for t in tagged if t["tag4_status"].get("gap")]
    tag5_flagged = [t for t in tagged if t["tag5_oversight"]["status"] == "flagged"]
    tag5_undetermined = [t for t in tagged if t["tag5_oversight"]["status"] == "undetermined"]
    tier_a_excluded = [t for t in tagged if t["tier_a_exclusion"]["excluded"]]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(tagged, indent=2) + "\n")

    print(f"[done] tagged {len(tagged)} records -> {out_path}")
    print(f"[gaps] TAG1: {len(tag1_gaps)}  TAG2: {len(tag2_gaps)}  TAG3 (burden): {len(tag3_gaps)}  TAG4: {len(tag4_gaps)}  "
          f"(out of {len(tagged)}; each is a real record hitting a case not covered by the current spec - "
          f"see reports/milestone_2_status.md and milestone_3_status.md, not silently guessed at)")
    if tag1_gaps:
        for t in tag1_gaps[:5]:
            print(f"       TAG1 {t['nct_id']}: {t['tag1_phase'].get('reason')}")
    if tag4_gaps:
        for t in tag4_gaps[:5]:
            print(f"       TAG4 {t['nct_id']}: missing overallStatus")
    print(f"[tag5] flagged (confirmed >=4 of 8): {len(tag5_flagged)}  "
          f"undetermined (depends on TAG6/body-system taxonomy): {len(tag5_undetermined)}  "
          f"not_flagged (confirmed): {len(tagged) - len(tag5_flagged) - len(tag5_undetermined)}")
    print(f"[tier_a] excluded for patient (age={patient['age_years']}, sex={patient['sex']}, "
          f"healthy_volunteer={patient['healthy_volunteer']}): {len(tier_a_excluded)}/{len(tagged)}")


if __name__ == "__main__":
    main()
