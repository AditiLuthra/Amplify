#!/usr/bin/env python3
"""
Milestone 1, Part D: dump full eligibilityCriteria text for N randomly
selected records, for manual review.

Reads from the local raw cache (data/raw/<slug>/page_*.json) - no network
calls. Writes one markdown file with each record's NCT ID, title, and the
verbatim (unparsed) eligibilityCriteria string.

Usage:
    python3 scripts/dump_eligibility_sample.py "uterine fibroids"
    python3 scripts/dump_eligibility_sample.py "uterine fibroids" --n 10 --seed 42
"""
import argparse
import json
import random
import re
from pathlib import Path


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
    cur = obj
    for part in dotted.split("."):
        if cur is None:
            return None
        cur = cur.get(part) if isinstance(cur, dict) else None
    return cur


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("condition")
    parser.add_argument("--n", type=int, default=10)
    parser.add_argument("--seed", type=int, default=None,
                         help="RNG seed, for a reproducible sample. Omit for a fresh random draw.")
    parser.add_argument("--raw-dir", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    slug = slugify(args.condition)
    raw_dir = Path(args.raw_dir) if args.raw_dir else repo_root / "data" / "raw" / slug
    out_path = Path(args.out) if args.out else repo_root / "reports" / "eligibility_criteria_sample.md"

    manifest_path = raw_dir / "_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(
            f"No cached data at {raw_dir}. Run scripts/fetch_trials.py {args.condition!r} first."
        )

    studies = load_studies(raw_dir)
    if not studies:
        raise SystemExit(f"No studies found in {raw_dir}.")

    rng = random.Random(args.seed)
    sample_size = min(args.n, len(studies))
    sample = rng.sample(studies, sample_size)

    lines = []
    lines.append(f"# Eligibility criteria sample — {args.condition}")
    lines.append("")
    lines.append(f"{sample_size} record(s) randomly selected from {len(studies)} cached studies "
                  f"(seed={args.seed if args.seed is not None else 'none, fresh draw'}). "
                  "Verbatim `eligibilityCriteria` text, unparsed, for manual review per "
                  "TAGGING_SPEC_v0.5.md section 6.")
    lines.append("")
    lines.append("---")
    lines.append("")

    for study in sample:
        nct_id = dig(study, "protocolSection.identificationModule.nctId") or "UNKNOWN"
        title = dig(study, "protocolSection.identificationModule.briefTitle") or "(no title)"
        criteria = dig(study, "protocolSection.eligibilityModule.eligibilityCriteria")

        lines.append(f"## {nct_id} — {title}")
        lines.append("")
        if criteria:
            lines.append("```")
            lines.append(criteria)
            lines.append("```")
        else:
            lines.append("_No `eligibilityCriteria` present on this record._")
        lines.append("")
        lines.append("---")
        lines.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines) + "\n")
    print(f"[done] wrote {sample_size} record(s) to {out_path}")


if __name__ == "__main__":
    main()
