#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate keyword queries by expanding {place} templates with California places.

Inputs:
- master_templates_v3_complete.txt
- places_california_complete_v2.txt
- intent_weights_v2.json (optional)

Outputs:
- keywords.csv (or .jsonl)

Examples:
  python3 generate_keywords.py --templates master_templates_v3_complete.txt --places places_california_complete_v2.txt --out keywords.csv
  python3 generate_keywords.py --templates master_templates_v3_complete.txt --places places_california_complete_v2.txt --weights intent_weights_v2.json --min-score 10 --out keywords_high_intent.csv
  python3 generate_keywords.py --templates master_templates_v3_complete.txt --places places_california_complete_v2.txt --limit 80000 --out keywords_80k.csv

Pair templates:
- Templates with TWO {place} tokens (e.g. "{place} vs {place}") can explode to N^2.
  Enable only if you need them: --include-pairs --max-pairs 2000000
"""

import argparse
import csv
import json
import os
import re
from typing import Dict, Iterable, List, Optional, Set, Tuple

PLACE_TOKEN = "{place}"

COMMENT_RE = re.compile(r"^\s*#")
SEPARATOR_RE = re.compile(r"^\s*[-─]{3,}")


def read_lines(path: str) -> List[str]:
    with open(path, "r", encoding="utf-8") as f:
        return [line.rstrip("\n") for line in f]


def load_places(path: str) -> List[str]:
    """
    Reads places_california*.txt and returns place strings.
    Skips comments/section headers and obvious top document headers.
    """
    lines = read_lines(path)
    places: List[str] = []

    for line in lines:
        s = line.strip()
        if not s:
            continue
        if COMMENT_RE.match(s):
            continue
        lower = s.lower()
        if lower.startswith("places"):
            continue
        if lower.startswith("notes:"):
            continue
        if lower.startswith("use this"):
            continue
        if lower.startswith("includes"):
            continue

        places.append(s)

    # de-dupe (case-insensitive), keep order
    seen: Set[str] = set()
    out: List[str] = []
    for p in places:
        k = p.casefold()
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out


def load_templates(path: str) -> List[str]:
    """
    Reads master_templates*.txt and returns templates containing {place}.
    Skips headings/separators.
    """
    lines = read_lines(path)
    templates: List[str] = []

    for line in lines:
        s = line.strip()
        if not s:
            continue
        if SEPARATOR_RE.match(s):
            continue
        lower = s.lower()
        if lower.startswith("master keyword"):
            continue
        if lower.startswith("{place}"):
            continue
        if lower.startswith("tip:"):
            continue

        if PLACE_TOKEN in s:
            templates.append(s)

    # de-dupe templates (case-insensitive), keep order
    seen: Set[str] = set()
    out: List[str] = []
    for t in templates:
        k = t.casefold()
        if k not in seen:
            seen.add(k)
            out.append(t)
    return out


def load_weights(path: Optional[str]) -> Dict[str, int]:
    if not path:
        return {}
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {k.casefold(): int(v) for k, v in data.items()}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def score_keyword(keyword: str, weights: Dict[str, int]) -> int:
    if not weights:
        return 0
    k = keyword.casefold()
    total = 0
    for phrase, w in weights.items():
        if phrase in k:
            total += w
    return total


def gen_single_place(
    templates: List[str],
    places: List[str],
    weights: Dict[str, int],
    min_score: int = 0,
) -> Iterable[Tuple[str, int, str, str]]:
    """Templates with exactly one {place}"""
    for t in templates:
        if t.count(PLACE_TOKEN) != 1:
            continue
        for p in places:
            kw = normalize(t.replace(PLACE_TOKEN, p))
            sc = score_keyword(kw, weights)
            if sc >= min_score:
                yield (kw, sc, t, p)


def gen_two_place(
    templates: List[str],
    places: List[str],
    weights: Dict[str, int],
    min_score: int = 0,
    avoid_same: bool = True,
    max_pairs: Optional[int] = None,
) -> Iterable[Tuple[str, int, str, str, str]]:
    """Templates with exactly two {place} tokens (N^2)"""
    pairs_done = 0
    for t in templates:
        if t.count(PLACE_TOKEN) != 2:
            continue
        for p1 in places:
            for p2 in places:
                if avoid_same and p1.casefold() == p2.casefold():
                    continue
                kw = t.replace(PLACE_TOKEN, p1, 1).replace(PLACE_TOKEN, p2, 1)
                kw = normalize(kw)
                sc = score_keyword(kw, weights)
                if sc >= min_score:
                    yield (kw, sc, t, p1, p2)
                pairs_done += 1
                if max_pairs is not None and pairs_done >= max_pairs:
                    return


def write_csv(
    out_path: str,
    rows: Iterable[Tuple],
    header: List[str],
    dedupe: bool = True,
    limit: Optional[int] = None,
) -> int:
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    seen: Set[str] = set()
    written = 0

    with open(out_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for row in rows:
            kw = row[0]
            if dedupe:
                k = kw.casefold()
                if k in seen:
                    continue
                seen.add(k)
            w.writerow(row)
            written += 1
            if limit is not None and written >= limit:
                break
    return written


def write_jsonl(
    out_path: str,
    records: Iterable[dict],
    dedupe: bool = True,
    limit: Optional[int] = None,
) -> int:
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    seen: Set[str] = set()
    written = 0

    with open(out_path, "w", encoding="utf-8") as f:
        for rec in records:
            kw = rec.get("keyword", "")
            if dedupe:
                k = kw.casefold()
                if k in seen:
                    continue
                seen.add(k)
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            written += 1
            if limit is not None and written >= limit:
                break
    return written


def main():
    ap = argparse.ArgumentParser(description="Expand keyword templates with places.")
    ap.add_argument("--templates", required=True, help="master_templates_*.txt")
    ap.add_argument("--places", required=True, help="places_california_*.txt")
    ap.add_argument("--weights", default=None, help="intent_weights*.json (optional)")
    ap.add_argument("--out", default="keywords.csv", help="Output .csv or .jsonl")
    ap.add_argument("--min-score", type=int, default=0, help="Filter by score (needs --weights)")
    ap.add_argument("--limit", type=int, default=None, help="Stop after N keywords")
    ap.add_argument("--no-dedupe", action="store_true", help="Disable dedupe")
    ap.add_argument("--include-pairs", action="store_true", help="Enable templates with 2x {place} (N^2)")
    ap.add_argument("--pairs-avoid-same", action="store_true", help="For pairs, skip p1==p2")
    ap.add_argument("--max-pairs", type=int, default=None, help="Safety cap for pair loops")
    args = ap.parse_args()

    templates = load_templates(args.templates)
    places = load_places(args.places)
    weights = load_weights(args.weights)
    dedupe = not args.no_dedupe

    is_jsonl = args.out.lower().endswith(".jsonl")

    single = gen_single_place(templates, places, weights, min_score=args.min_score)

    pairs = None
    if args.include_pairs:
        pairs = gen_two_place(
            templates, places, weights,
            min_score=args.min_score,
            avoid_same=args.pairs_avoid_same,
            max_pairs=args.max_pairs
        )

    if is_jsonl:
        def recs():
            for kw, sc, t, p in single:
                yield {"keyword": kw, "score": sc, "template": t, "place1": p}
            if pairs is not None:
                for kw, sc, t, p1, p2 in pairs:
                    yield {"keyword": kw, "score": sc, "template": t, "place1": p1, "place2": p2}
        written = write_jsonl(args.out, recs(), dedupe=dedupe, limit=args.limit)
    else:
        def rows():
            for kw, sc, t, p in single:
                yield (kw, sc, t, p)
            if pairs is not None:
                for kw, sc, t, p1, p2 in pairs:
                    yield (kw, sc, t, p1, p2)

        header = ["keyword", "score", "template", "place1"]
        if pairs is not None:
            header.append("place2")

        written = write_csv(args.out, rows(), header=header, dedupe=dedupe, limit=args.limit)

    print(f"Done. Wrote {written:,} keywords to: {args.out}")
    print(f"Templates loaded: {len(templates):,} | Places loaded: {len(places):,}")


if __name__ == "__main__":
    main()
