#!/usr/bin/env python3
"""
Milestone 1, Part B: field coverage report.

For every field listed in TAGGING_SPEC_v0.4.md section 2 ("Data source"),
compute what percentage of cached records populate it, plus value
distributions for the fields the task calls out by name.

Reads raw pages from data/raw/<slug>/page_*.json (written by fetch_trials.py).
Does not hit the network - operates entirely on the local cache.

Usage:
    python3 scripts/field_coverage_report.py "uterine fibroids"
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path


# Field paths transcribed from TAGGING_SPEC_v0.4.md sec. 2's module table.
# "[]" marks a list; presence = the list is non-empty.
# "[].field" marks a field read off each item in a list; presence = at least
# one item in the list has that field populated.
SPEC_FIELDS = [
    ("identificationModule", "nctId"),
    ("identificationModule", "briefTitle"),
    ("statusModule", "overallStatus"),
    ("statusModule", "statusVerifiedDate"),
    ("statusModule", "lastKnownStatus"),
    ("statusModule", "lastUpdatePostDateStruct.date"),
    ("statusModule", "completionDateStruct.date"),
    ("sponsorCollaboratorsModule", "leadSponsor.name"),
    ("sponsorCollaboratorsModule", "leadSponsor.class"),
    ("oversightModule", "isFdaRegulatedDrug"),
    ("oversightModule", "isFdaRegulatedDevice"),
    ("oversightModule", "isUnapprovedDevice"),
    ("oversightModule", "oversightHasDmc"),
    ("descriptionModule", "briefSummary"),
    ("descriptionModule", "detailedDescription"),
    ("conditionsModule", "conditions[]"),
    ("designModule", "studyType"),
    ("designModule", "phases[]"),
    ("designModule", "designInfo.allocation"),
    ("designModule", "designInfo.interventionModel"),
    ("designModule", "enrollmentInfo.count"),
    ("designModule", "enrollmentInfo.type"),
    ("armsInterventionsModule", "armGroups[].type"),
    ("armsInterventionsModule", "armGroups[].description"),
    ("armsInterventionsModule", "interventions[].type"),
    ("armsInterventionsModule", "interventions[].name"),
    ("armsInterventionsModule", "interventions[].description"),
    ("eligibilityModule", "eligibilityCriteria"),
    ("eligibilityModule", "sex"),
    ("eligibilityModule", "minimumAge"),
    ("eligibilityModule", "maximumAge"),
    ("eligibilityModule", "stdAges[]"),
    ("eligibilityModule", "healthyVolunteers"),
    ("contactsLocationsModule", "centralContacts[]"),
    ("contactsLocationsModule", "overallOfficials[]"),
    ("contactsLocationsModule", "locations[]"),
    ("contactsLocationsModule", "locations[].contacts[]"),
    ("contactsLocationsModule", "locations[].geoPoint"),
    ("referencesModule", "references[].pmid"),
    ("referencesModule", "references[].type"),
    ("referencesModule", "references[].citation"),
]

# (module, field) pairs to compute value distributions for, per the task.
DISTRIBUTION_FIELDS = [
    ("statusModule", "overallStatus"),
    ("designModule", "studyType"),
    ("designModule", "phases[]"),
    ("armsInterventionsModule", "interventions[].type"),
    ("armsInterventionsModule", "armGroups[].type"),
    ("designModule", "designInfo.allocation"),
    ("sponsorCollaboratorsModule", "leadSponsor.class"),
    ("eligibilityModule", "sex"),
]


def slugify(condition: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", condition.lower()).strip("_")
    return slug or "condition"


def load_studies(raw_dir: Path) -> list[dict]:
    studies = []
    for page_file in sorted(raw_dir.glob("page_*.json")):
        data = json.loads(page_file.read_text())
        studies.extend(data.get("studies", []))
    return studies


def dig(obj, dotted: str):
    """obj.a.b.c -> obj['a']['b']['c'], tolerating missing keys/None."""
    cur = obj
    for part in dotted.split("."):
        if cur is None:
            return None
        cur = cur.get(part) if isinstance(cur, dict) else None
    return cur


def is_populated(value) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True  # booleans, numbers - False/0 are still "stated"


def field_present(study: dict, module: str, field: str) -> bool:
    """True if `field` (possibly containing one '[]' list hop) is populated
    somewhere in `study.protocolSection.<module>`."""
    base = dig(study, f"protocolSection.{module}")
    if base is None:
        return False

    if "[]" not in field:
        return is_populated(dig(base, field))

    list_part, _, rest = field.partition("[]")
    list_part = list_part.rstrip(".")
    items = dig(base, list_part) if list_part else base
    if not isinstance(items, list) or not items:
        return False

    rest = rest.lstrip(".")
    if rest == "":
        return True  # the list itself being non-empty is the "populated" signal
    return any(is_populated(dig(item, rest)) for item in items if isinstance(item, dict))


def field_values(study: dict, module: str, field: str) -> list:
    """All scalar values found at `field` (flattening any '[]' list hop)."""
    base = dig(study, f"protocolSection.{module}")
    if base is None:
        return []

    if "[]" not in field:
        v = dig(base, field)
        return [v] if is_populated(v) else []

    list_part, _, rest = field.partition("[]")
    list_part = list_part.rstrip(".")
    items = dig(base, list_part) if list_part else base
    if not isinstance(items, list):
        return []

    rest = rest.lstrip(".")
    if rest == "":
        return [v for v in items if is_populated(v)]
    out = []
    for item in items:
        if isinstance(item, dict):
            v = dig(item, rest)
            if is_populated(v):
                out.append(v)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("condition")
    parser.add_argument("--raw-dir", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    slug = slugify(args.condition)
    raw_dir = Path(args.raw_dir) if args.raw_dir else repo_root / "data" / "raw" / slug
    out_path = Path(args.out) if args.out else repo_root / "reports" / "field_coverage_report.md"

    manifest_path = raw_dir / "_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(
            f"No cached data at {raw_dir}. Run scripts/fetch_trials.py {args.condition!r} first."
        )
    manifest = json.loads(manifest_path.read_text())
    if not manifest.get("complete"):
        print(f"[warn] fetch for {args.condition!r} is not marked complete "
              f"({manifest.get('page_count')} pages so far). Reporting on partial data.")

    studies = load_studies(raw_dir)
    n = len(studies)
    if n == 0:
        raise SystemExit(f"No studies found in {raw_dir}.")

    lines = []
    lines.append(f"# Field coverage report — {args.condition}")
    lines.append("")
    lines.append(f"- Records analyzed: **{n}**")
    lines.append(f"- Source: `{raw_dir}` ({manifest.get('page_count')} page(s), "
                  f"fetched via ClinicalTrials.gov API v2, cached raw JSON)")
    lines.append(f"- Spec version: TAGGING_SPEC_v0.4.md section 2")
    lines.append("")
    lines.append("## Field population rate")
    lines.append("")
    lines.append("Percentage of records where the field (per spec §2's module table) has a value.")
    lines.append("For list fields (`[]`), \"populated\" means the list is non-empty; for a nested")
    lines.append("`list[].field`, it means at least one item in the list has that field set.")
    lines.append("")
    lines.append("| Module | Field | % populated | n populated |")
    lines.append("|---|---|---:|---:|")
    for module, field in SPEC_FIELDS:
        count = sum(1 for s in studies if field_present(s, module, field))
        pct = 100.0 * count / n
        lines.append(f"| `{module}` | `{field}` | {pct:.1f}% | {count}/{n} |")

    lines.append("")
    lines.append("## Value distributions")
    lines.append("")
    for module, field in DISTRIBUTION_FIELDS:
        counts = Counter()
        for s in studies:
            counts.update(field_values(s, module, field))
        total = sum(counts.values())
        lines.append(f"### `{module}.{field}`")
        lines.append("")
        if total == 0:
            lines.append("_No populated values found._")
        else:
            lines.append("| Value | Count | % of populated values |")
            lines.append("|---|---:|---:|")
            for value, c in counts.most_common():
                lines.append(f"| `{value}` | {c} | {100.0 * c / total:.1f}% |")
        lines.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n")
    print(f"[done] wrote {out_path}")


if __name__ == "__main__":
    main()
