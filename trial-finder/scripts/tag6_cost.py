#!/usr/bin/env python3
"""
Milestone 7, Part A: TAG 6 (cost and compensation).

TAGGING_SPEC_v0.5.md sec. 3 TAG 6. The only tag with no structured field -
free text only (briefSummary, detailedDescription, eligibilityCriteria).

Stage 1 (keyword prefilter) is deterministic and runs here on the full
corpus. Stage 2 (sentence -> status/confidence) needs real language
understanding - CLAUDE.md calls this milestone "the only part needing an
LLM" for exactly this reason. This script calls the Anthropic API when
ANTHROPIC_API_KEY is set; otherwise it falls back to a committed cache
(data/llm_cache/cost_classifications.json) and raises a clear error on an
uncached sentence rather than guessing. See reports/milestone_7_status.md
for why: this sandbox has no API key configured, and the "fee" keyword
produced a real false-positive-only result on the live corpus (matched
"breast-feeding" and "feeding vessels" every time, never cost) that had to
be fixed (word-boundary matching) before Stage 1 was even safe to run.

Usage:
    python3 scripts/tag6_cost.py "uterine fibroids"
"""
import argparse
import json
import os
import re
from pathlib import Path

PARTICIPANT_PAYS = [
    r"at their own expense", r"responsible for the cost", r"self-pay",
    r"payment is required", r"out-of-pocket", r"\bfee\b", r"insurance will be billed",
]
COMPENSATED = [
    r"will be compensated", r"will receive \$", r"\bstipend\b",
    r"reimbursed for travel", r"payment for participation",
]
NO_COST = [
    r"at no cost", r"free of charge", r"no cost to participants",
    r"study-related procedures are provided",
]
# Single-word keywords get \b boundaries (see milestone report - "fee" as a
# bare substring matches "breast-feeding"/"feeding" in this domain 100% of
# the time on the real corpus). Multi-word phrases are specific enough as
# substrings.
ALL_KEYWORDS = [(kw, re.compile(kw, re.IGNORECASE)) for kw in PARTICIPANT_PAYS + COMPENSATED + NO_COST]

CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "llm_cache" / "cost_classifications.json"


def slugify(condition: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", condition.lower()).strip("_")
    return slug or "condition"


def load_studies(raw_dir: Path) -> list:
    studies = []
    for page_file in sorted(raw_dir.glob("page_*.json")):
        data = json.loads(page_file.read_text())
        studies.extend(data.get("studies", []))
    return studies


def split_sentences(text):
    if not text:
        return []
    # Deliberately simple (stdlib, no NLP dependency) - good enough to hand
    # a human-readable candidate sentence to Stage 2, not a linguistic
    # sentence boundary detector.
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def stage1_prefilter(protocol: dict):
    """Returns a list of {keyword, sentence, source_field} candidate hits."""
    description_module = protocol.get("descriptionModule", {}) or {}
    eligibility_module = protocol.get("eligibilityModule", {}) or {}
    sources = [
        ("briefSummary", description_module.get("briefSummary")),
        ("detailedDescription", description_module.get("detailedDescription")),
        ("eligibilityCriteria", eligibility_module.get("eligibilityCriteria")),
    ]
    hits = []
    for field_name, text in sources:
        for sentence in split_sentences(text):
            for kw, pattern in ALL_KEYWORDS:
                if pattern.search(sentence):
                    hits.append({"keyword": kw, "sentence": sentence, "source_field": field_name})
    return hits


def _load_cache():
    if CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text())
    return {}


def classify_cost_sentence(sentence: str) -> dict:
    """Stage 2. Returns {"status": participant_pays|compensated|no_cost|unclear,
    "confidence": high|low}. Uses the Anthropic API if ANTHROPIC_API_KEY is
    set; otherwise a committed cache, raising clearly on a miss rather than
    guessing (CLAUDE.md working agreement - no invented behavior)."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import anthropic  # optional dependency - only imported when a key is present
        except ImportError:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is set but the 'anthropic' package isn't installed. "
                "Run: pip install anthropic"
            )
        client = anthropic.Anthropic(api_key=api_key)
        prompt = (
            "Classify this sentence from a clinical trial record for whether "
            "it says the participant pays, is compensated, or incurs no cost.\n\n"
            f"Sentence: {sentence!r}\n\n"
            'Respond with only JSON: {"status": "participant_pays|compensated|no_cost|unclear", '
            '"confidence": "high|low"}'
        )
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001", max_tokens=100,
            messages=[{"role": "user", "content": prompt}],
        )
        return json.loads(resp.content[0].text)

    cache = _load_cache()
    if sentence in cache:
        return cache[sentence]
    raise RuntimeError(
        f"No ANTHROPIC_API_KEY set and no cached classification for this sentence: "
        f"{sentence!r}. Set ANTHROPIC_API_KEY to classify new sentences, or add an "
        f"entry to {CACHE_PATH}."
    )


def tag6_cost(protocol: dict) -> dict:
    hits = stage1_prefilter(protocol)
    if not hits:
        return {"status": "not_stated", "evidence_sentence": None, "confidence": None, "prefilter_hits": 0}

    # Stage 2 on each hit sentence; Stage 3 display rule: only a high-
    # confidence classification with its evidence sentence is shown. Never
    # default to the optimistic case (P5) - "unclear" or low-confidence
    # results in "not_stated", same as no hit at all.
    best = None
    for hit in hits:
        result = classify_cost_sentence(hit["sentence"])
        if result.get("confidence") == "high" and result.get("status") != "unclear":
            best = {"status": result["status"], "evidence_sentence": hit["sentence"],
                    "confidence": "high", "prefilter_hits": len(hits)}
            break
    if best:
        return best
    return {"status": "not_stated", "evidence_sentence": None, "confidence": None, "prefilter_hits": len(hits)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("condition")
    parser.add_argument("--raw-dir", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    slug = slugify(args.condition)
    raw_dir = Path(args.raw_dir) if args.raw_dir else repo_root / "data" / "raw" / slug
    out_path = Path(args.out) if args.out else repo_root / "data" / "tagged" / f"{slug}_tag6_cost.json"

    manifest_path = raw_dir / "_manifest.json"
    if not manifest_path.exists():
        raise SystemExit(f"No cached data at {raw_dir}. Run scripts/fetch_trials.py {args.condition!r} first.")

    studies = load_studies(raw_dir)
    results = []
    errors = []
    for s in studies:
        nct_id = s["protocolSection"]["identificationModule"]["nctId"]
        try:
            tag = tag6_cost(s["protocolSection"])
        except RuntimeError as e:
            errors.append((nct_id, str(e)))
            continue
        results.append({"nct_id": nct_id, "tag6_cost": tag})

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2) + "\n")

    n_hits = sum(1 for r in results if r["tag6_cost"]["prefilter_hits"] > 0)
    n_resolved = sum(1 for r in results if r["tag6_cost"]["status"] != "not_stated")
    print(f"[done] {len(results)} records -> {out_path}")
    print(f"[tag6] {n_hits} had a Stage 1 keyword hit; {n_resolved} resolved to a confident cost status; "
          f"{len(results) - n_resolved} -> \"Not stated\"")
    if errors:
        print(f"[blocked] {len(errors)} record(s) had a keyword hit with no cached classification "
              f"and no ANTHROPIC_API_KEY - see reports/milestone_7_status.md:")
        for nct_id, msg in errors[:5]:
            print(f"       {nct_id}: {msg}")


if __name__ == "__main__":
    main()
