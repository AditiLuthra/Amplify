#!/usr/bin/env python3
"""
Milestone 7, Part B (continued): Tier B/C/D exclusion display.

Takes Stage 3's structured criteria (data/llm_cache/eligibility_structuring.json
- see parse_eligibility.py's docstring for why this is a hand-built cache,
not a full-corpus run) and renders the spec's mandated display string
(TAGGING_SPEC_v0.5.md sec. 5 "Display rule") for Tier B and Tier C
criteria against the Milestone 1/5 test persona. Tier D criteria are
listed but get no special framing, per spec ("show, no penalty").

This is a demonstration/validation script, not a production pipeline
stage - it exists to prove the display rule renders correctly against
real criteria, not to be run at scale (there's no full-corpus Stage 3
output yet to run it against).

Usage:
    python3 scripts/eligibility_tier_demo.py
"""
import json
from pathlib import Path

# The same test persona as Milestone 5 (reports/persona_field_categorization.md),
# extended with its free-text-only attributes now that Stage 3 can resolve
# tier against them. Not a real intake - same caveat as Milestone 5/6.
PERSONA_ANSWERS = {
    "prior surgery": "No prior surgery",
    "fertility/future pregnancy intent": "I want to have children in the future",
    "anemia severity": "Moderate anemia",
}
# Concepts matched by substring against each criterion's `concept` field -
# deliberately permissive (e.g. "abdominal surgical scarring" and "prior
# surgical hardware" both match on "surgical" / "surgery") so the few
# genuine Tier B/C matches in the sample all resolve correctly; see
# reports/milestone_7_status.md for why a real system needs a proper
# concept vocabulary (spec sec. 6) instead of substring matching at scale.
CONCEPT_TO_ANSWER_KEY = {
    "surg": "prior surgery",  # matches both "surgery" and "surgical"
    "fertility": "fertility/future pregnancy intent",
    "anemia": "anemia severity",
}


def answer_for_concept(concept: str):
    low = concept.lower()
    for fragment, key in CONCEPT_TO_ANSWER_KEY.items():
        if fragment in low:
            return PERSONA_ANSWERS[key]
    return None


def render_tier_b_or_c(criterion: dict) -> str:
    answer = answer_for_concept(criterion["concept"]) or "(not asked)"
    return (
        "**This trial's exclusion criteria include:**\n"
        f'*"{criterion["verbatim"]}"*\n'
        f"You told us: {answer}. If this doesn't describe your situation, "
        "this trial may still be an option."
    )


def main():
    cache_path = Path(__file__).resolve().parent.parent / "data" / "llm_cache" / "eligibility_structuring.json"
    data = json.loads(cache_path.read_text())["records"]

    lines = []
    for nct_id, criteria in data.items():
        if not criteria:
            continue
        b_or_c = [c for c in criteria if c["tier"] in ("B", "C")]
        d_only = [c for c in criteria if c["tier"] == "D"]
        if not b_or_c:
            continue
        lines.append(f"## {nct_id}")
        for c in b_or_c:
            lines.append(f"\n**Tier {c['tier']}**\n")
            lines.append(render_tier_b_or_c(c))
            lines.append("")
        if d_only:
            lines.append(f"\n_{len(d_only)} other exclusion criterion/criteria shown with no special "
                          f"framing (Tier D - not addressed by anything we asked)._\n")
        lines.append("---\n")

    report = "\n".join(lines)
    print(report)


if __name__ == "__main__":
    main()
