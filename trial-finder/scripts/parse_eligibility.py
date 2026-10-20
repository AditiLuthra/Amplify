#!/usr/bin/env python3
"""
Milestone 7, Part B: parsing eligibility criteria (TAGGING_SPEC_v0.5.md
sec. 6) and Tier B/C/D exclusion evaluation (sec. 5).

Three stages, only the last of which needs real language understanding:

  Stage 1 - split inclusion from exclusion (regex on header variants).
            Deterministic. Runs on the full corpus here.
  Stage 2 - split the exclusion block into atomic, verbatim criteria
            (bullets/numbers/line breaks). Deterministic. Runs on the
            full corpus here.
  Stage 3 - structure each atomic criterion into
            {verbatim, concept, qualifier, threshold, tier}. This is a
            semantic judgment call per criterion (same reason CLAUDE.md
            calls this "the only part needing an LLM") - not run at full
            scale in this sandbox (no ANTHROPIC_API_KEY configured). Run
            by hand here, by Claude, on Milestone 1's existing 10-record
            manual-review sample (reports/eligibility_criteria_sample.md)
            instead, and recorded as such rather than silently faked or
            skipped - see reports/milestone_7_status.md.

Records that fail Stage 1 go to a logged bucket, never silently mangled
(spec's own instruction).

Usage:
    python3 scripts/parse_eligibility.py "uterine fibroids"
"""
import argparse
import json
import re
from pathlib import Path

HEADER_RE = re.compile(r"(exclusion\s*criteria\s*(?:include)?s?\s*:?|key\s*exclusion\s*criteria\s*:?)", re.IGNORECASE)
BULLET_RE = re.compile(r"^\s*(?:\\?[*\-•]|\\?\[\d+\\?\]|\d+[.)])\s*")


def slugify(condition: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", condition.lower()).strip("_")
    return slug or "condition"


def load_studies(raw_dir: Path) -> list:
    studies = []
    for page_file in sorted(raw_dir.glob("page_*.json")):
        data = json.loads(page_file.read_text())
        studies.extend(data.get("studies", []))
    return studies


def stage1_split(criteria_text: str):
    """Returns (inclusion_text, exclusion_text) or None if no exclusion
    header is found - a real split failure, logged by the caller rather
    than force-split."""
    if not criteria_text or not criteria_text.strip():
        return None
    m = HEADER_RE.search(criteria_text)
    if not m:
        return None
    return criteria_text[: m.start()], criteria_text[m.end():]


def stage2_atomize(exclusion_text: str):
    """Splits an exclusion block into atomic, verbatim criteria. A bullet
    line starts a new criterion; a non-bullet line is appended to the
    current one (handles wrapped lines and nested sub-lists as part of
    their parent criterion, matching how the spec's own worked example
    treats one top-level bullet as one criterion).

    Two real-corpus edge cases this has to get right, not just the common
    case (found by checking output against Milestone 1's known 10-record
    sample - see reports/milestone_7_status.md):
      - A stray trailing bullet marker with nothing after it (e.g. a lone
        "\\-" left over from the registry's own formatting) must not be
        kept as an empty criterion, and must not make the real prose
        before it look like "preamble before the first bullet" (which
        would otherwise be silently dropped).
      - A block with no bullets at all is one criterion (the whole
        prose), not zero - unless it's genuinely "None".
    """
    lines = exclusion_text.split("\n")
    criteria = []
    preamble_parts = []
    current = None
    for line in lines:
        if not line.strip():
            continue
        if BULLET_RE.match(line):
            if current is not None:
                criteria.append(current.strip())
            current = BULLET_RE.sub("", line, count=1)
        elif current is not None:
            current += " " + line.strip()
        else:
            preamble_parts.append(line.strip())
    if current is not None:
        criteria.append(current.strip())

    # Drop empty criteria (a bullet marker with nothing after it - noise,
    # not a blank requirement) rather than keeping a blank entry.
    criteria = [c for c in criteria if c.strip()]

    if criteria:
        return [c for c in criteria if c.lower() != "none"]

    # No real (non-empty) bullets anywhere. Whatever came before the first
    # bullet-like line (if any) is the actual content, not preamble to
    # discard - the only thing that looked like a bullet was noise.
    combined = " ".join(preamble_parts).strip()
    if not combined or combined.lower() == "none":
        return []
    return [combined]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("condition")
    parser.add_argument("--raw-dir", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    slug = slugify(args.condition)
    raw_dir = Path(args.raw_dir) if args.raw_dir else repo_root / "data" / "raw" / slug
    out_path = Path(args.out) if args.out else repo_root / "data" / "tagged" / f"{slug}_eligibility.json"

    manifest_path = raw_dir / "_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"No cached data at {raw_dir}. Run scripts/fetch_trials.py {args.condition!r} first.")

    studies = load_studies(raw_dir)
    results = []
    split_failures = []
    total_criteria = 0

    for s in studies:
        nct_id = s["protocolSection"]["identificationModule"]["nctId"]
        criteria_text = s["protocolSection"].get("eligibilityModule", {}).get("eligibilityCriteria")
        split = stage1_split(criteria_text)
        if split is None:
            split_failures.append(nct_id)
            results.append({"nct_id": nct_id, "split_failed": True, "exclusion_criteria": []})
            continue
        _, exclusion_text = split
        atomized = stage2_atomize(exclusion_text)
        total_criteria += len(atomized)
        results.append({"nct_id": nct_id, "split_failed": False, "exclusion_criteria": atomized})

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2) + "\n")

    print(f"[done] {len(results)} records -> {out_path}")
    print(f"[stage1] split failed (logged, not force-split): {len(split_failures)}/{len(results)}")
    print(f"[stage2] {total_criteria} atomic exclusion criteria extracted across "
          f"{len(results) - len(split_failures)} successfully-split records")
    print(f"[stage3] NOT run at full scale - no ANTHROPIC_API_KEY in this sandbox. "
          f"See reports/milestone_7_status.md and data/llm_cache/eligibility_structuring.json "
          f"for the hand-structured 10-record demonstration sample.")
    if split_failures:
        print(f"         split-failed NCT IDs: {', '.join(split_failures)}")


if __name__ == "__main__":
    main()
