#!/usr/bin/env python3
"""Cache each persona's RoboHash set1 avatar in the repository, never at page-view time.

Requires PyYAML. Run manually or in a controlled CI job with network access:
    python3 scripts/cache_persona_avatars.py
No dependence on a live image service is introduced for published pages.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import time
import urllib.request
import yaml

ROOT = Path(__file__).resolve().parents[1]
PNG = b"\x89PNG\r\n\x1a\n"


def main(force=False):
    manifest = {"version": 1, "set": "set1", "avatars": []}
    for path in sorted((ROOT / "data/personas").glob("*.yaml")):
        d = yaml.safe_load(path.read_text(encoding="utf-8"))
        a = d["avatar"]
        if a["set"] != "set1" or a.get("genre") != "classic-robot":
            raise ValueError(f"Inconsistent robot set/genre in {path}")
        expected = f"https://robohash.org/{a['seed']}.png?set=set1&size=400x400"
        if a["url"] != expected:
            raise ValueError(f"Unexpected image source for {d['id']}")
        target = ROOT / a["localPath"]
        if not target.resolve().is_relative_to(ROOT.resolve()):
            raise ValueError("Unsafe output path")
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.is_file() and not force:
            image = target.read_bytes()
        else:
            image = None
            for attempt in range(6):
                try:
                    req = urllib.request.Request(expected, headers={"User-Agent": "wcag-by-role/1.0 (persona asset build)"})
                    with urllib.request.urlopen(req, timeout=20) as response:
                        image = response.read(2_000_001)
                    if not image.startswith(PNG) or len(image) > 2_000_000:
                        raise RuntimeError("Response is not a reasonable PNG image")
                    target.write_bytes(image)
                    break
                except Exception:
                    if attempt == 5:
                        raise
                    time.sleep(min(2 ** attempt, 10))
            time.sleep(1)
        if not image or not image.startswith(PNG):
            raise ValueError(f"Not a PNG image: {target}")
        digest = hashlib.sha256(image).hexdigest()
        # Keep the canonical YAML's asset metadata in sync with the cached bytes.
        text = path.read_text(encoding="utf-8")
        text = re.sub(r'^(\s*)assetStatus:.*$', r'\1assetStatus: cached', text, count=1, flags=re.M)
        text = re.sub(r'^(\s*)sha256:.*$', rf'\1sha256: {digest}', text, count=1, flags=re.M)
        path.write_text(text, encoding="utf-8")
        manifest["avatars"].append({"persona": d["id"], "path": a["localPath"],
                                    "sourceUrl": expected, "sha256": digest,
                                    "bytes": len(image)})
    out = ROOT / "data/exports/avatar-manifest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Cached {len(manifest['avatars'])} consistent set1 portraits")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true',
                        help='Refetch all portraits from RoboHash; appearance may change')
    args = parser.parse_args()
    main(force=args.force)
