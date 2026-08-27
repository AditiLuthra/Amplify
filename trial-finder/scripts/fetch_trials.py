#!/usr/bin/env python3
"""
Milestone 1, Part A: fetch all ClinicalTrials.gov API v2 records for a condition.

Saves raw, unmodified JSON responses (one file per page) to data/raw/<slug>/.
Follows cursor pagination via nextPageToken (TAGGING_SPEC_v0.3.md sec. 2,
"API mechanics"). Maintains a manifest so re-runs resume instead of
re-fetching pages already on disk, and no-op once a fetch is marked complete.

Usage:
    python3 scripts/fetch_trials.py "uterine fibroids"
    python3 scripts/fetch_trials.py "uterine fibroids" --force   # refetch from scratch
"""
import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API_BASE = "https://clinicaltrials.gov/api/v2/studies"
PAGE_SIZE = 1000  # API v2 max
REQUEST_DELAY_SECONDS = 0.5  # be reasonable with request rate (CLAUDE.md)
MANIFEST_NAME = "_manifest.json"


def slugify(condition: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", condition.lower()).strip("_")
    return slug or "condition"


def fetch_page(condition: str, page_token: str | None, first: bool) -> dict:
    params = {
        "query.cond": condition,
        "pageSize": str(PAGE_SIZE),
        "format": "json",
    }
    if first:
        params["countTotal"] = "true"
    if page_token:
        params["pageToken"] = page_token

    url = f"{API_BASE}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "clinical-trial-finder/0.1 (research; milestone-1)"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw_bytes = resp.read()
    return json.loads(raw_bytes), raw_bytes


def load_manifest(out_dir: Path) -> dict:
    manifest_path = out_dir / MANIFEST_NAME
    if manifest_path.exists():
        return json.loads(manifest_path.read_text())
    return {}


def save_manifest(out_dir: Path, manifest: dict) -> None:
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("condition", help='e.g. "uterine fibroids"')
    parser.add_argument("--out", default=None, help="output dir (default: data/raw/<slug>)")
    parser.add_argument("--force", action="store_true", help="ignore cache, refetch everything")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    slug = slugify(args.condition)
    out_dir = Path(args.out) if args.out else repo_root / "data" / "raw" / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {} if args.force else load_manifest(out_dir)

    if manifest.get("complete") and not args.force:
        print(f"[cache] {args.condition!r} already fully fetched "
              f"({manifest['page_count']} pages, {manifest['total_count']} records) "
              f"on {manifest['completed_at']}. Nothing to do. Use --force to refetch.")
        return

    page_index = manifest.get("page_count", 0)
    next_page_token = manifest.get("next_page_token")
    total_count = manifest.get("total_count")
    resuming = page_index > 0

    if resuming:
        print(f"[resume] {page_index} page(s) already cached, continuing from stored pageToken.")

    first_request = page_index == 0

    while True:
        page_file = out_dir / f"page_{page_index + 1:04d}.json"
        if page_file.exists() and not args.force:
            # Page already on disk (e.g. crashed mid-run after writing but before
            # manifest update) - trust it, don't re-fetch.
            data = json.loads(page_file.read_text())
        else:
            try:
                data, raw_bytes = fetch_page(args.condition, next_page_token, first_request)
            except urllib.error.URLError as e:
                print(f"[error] request failed on page {page_index + 1}: {e}", file=sys.stderr)
                print("[error] manifest left in resumable state; re-run to continue.", file=sys.stderr)
                save_manifest(out_dir, manifest)
                sys.exit(1)
            page_file.write_bytes(raw_bytes)

        if first_request and total_count is None:
            total_count = data.get("totalCount")

        page_index += 1
        n_studies = len(data.get("studies", []))
        print(f"[fetch] page {page_index}: {n_studies} studies -> {page_file.name}")

        next_page_token = data.get("nextPageToken")

        manifest = {
            "condition": args.condition,
            "slug": slug,
            "total_count": total_count,
            "page_count": page_index,
            "next_page_token": next_page_token,
            "complete": next_page_token is None,
        }
        save_manifest(out_dir, manifest)

        first_request = False
        if next_page_token is None:
            break
        time.sleep(REQUEST_DELAY_SECONDS)

    import datetime
    manifest["completed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    save_manifest(out_dir, manifest)

    print(f"[done] {manifest['page_count']} pages, total_count={manifest['total_count']} "
          f"saved under {out_dir}")


if __name__ == "__main__":
    main()
