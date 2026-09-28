#!/usr/bin/env python3
"""
Milestone 2: TAG 1 (phase) + TAG 4 (freshness and status).

Pure lookups per TAGGING_SPEC_v0.5.md sec. 3 - no inference, no text
extraction (that's later milestones). Reads cached raw pages from
data/raw/<slug>/ (written by fetch_trials.py) and writes one tag record per
trial to data/tagged/<slug>.json.

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


def tag_study(study: dict, as_of: datetime.date) -> dict:
    protocol = study.get("protocolSection", {})
    nct_id = protocol.get("identificationModule", {}).get("nctId")
    design_module = protocol.get("designModule", {}) or {}
    status_module = protocol.get("statusModule", {}) or {}
    has_results = study.get("hasResults")

    return {
        "nct_id": nct_id,
        "spec_version": SPEC_VERSION,
        "computed_at": as_of.isoformat(),
        "tag1_phase": tag1_phase(design_module),
        "tag4_status": tag4_status(status_module, has_results, as_of),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("condition")
    parser.add_argument("--raw-dir", default=None)
    parser.add_argument("--out", default=None)
    parser.add_argument("--as-of", default=None, help="YYYY-MM-DD; default today (UTC)")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    slug = slugify(args.condition)
    raw_dir = Path(args.raw_dir) if args.raw_dir else repo_root / "data" / "raw" / slug
    out_path = Path(args.out) if args.out else repo_root / "data" / "tagged" / f"{slug}.json"
    as_of = (
        datetime.date.fromisoformat(args.as_of)
        if args.as_of else datetime.datetime.now(datetime.timezone.utc).date()
    )

    manifest_path = raw_dir / "_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"No cached data at {raw_dir}. Run scripts/fetch_trials.py {args.condition!r} first.")

    studies = load_studies(raw_dir)
    if not studies:
        raise SystemExit(f"No studies found in {raw_dir}.")

    tagged = [tag_study(s, as_of) for s in studies]

    gaps = [t for t in tagged if t["tag1_phase"].get("gap") or t["tag4_status"].get("gap")]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(tagged, indent=2) + "\n")

    print(f"[done] tagged {len(tagged)} records -> {out_path}")
    if gaps:
        print(f"[gap] {len(gaps)} record(s) hit an unrecognized shape - see output for nct_id + reason. "
              f"Not tagged; spec fix needed (CLAUDE.md working agreement).")
        for t in gaps:
            reason = t["tag1_phase"].get("reason") or "tag4 gap (missing overallStatus)"
            print(f"       {t['nct_id']}: {reason}")


if __name__ == "__main__":
    main()
