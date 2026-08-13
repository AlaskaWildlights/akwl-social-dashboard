#!/usr/bin/env python3
"""
Append one week entry into index.html's `var EMBEDDED_DATA = {...}` block,
safely (brace-counting, not naive string replace, since the JSON contains
nested braces in ga_sources / tt_top_videos).

Usage:
    python splice_week.py <path-to-index.html> <path-to-new-week.json> [--generated ISO_TIMESTAMP]

Prints the previous last week's iso and the new last week's iso to stderr
so the caller can sanity-check chronological order before trusting the
write. Writes the updated HTML back to the same path in place.
"""
import json
import sys
import argparse


def extract_embedded_data(content):
    start = content.find("var EMBEDDED_DATA = ")
    if start == -1:
        raise SystemExit("Could not find 'var EMBEDDED_DATA = ' in the HTML")
    json_start = start + len("var EMBEDDED_DATA = ")
    depth = 0
    i = json_start
    in_string = False
    escape = False
    while i < len(content):
        c = content[i]
        if escape:
            escape = False
        elif c == "\\" and in_string:
            escape = True
        elif c == '"' and not escape:
            in_string = not in_string
        elif not in_string:
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return json_start, i + 1
        i += 1
    raise SystemExit("Unbalanced braces while scanning EMBEDDED_DATA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html_path")
    ap.add_argument("week_json_path")
    ap.add_argument("--generated", default=None, help="ISO timestamp to stamp as 'generated'; if omitted, left unchanged")
    args = ap.parse_args()

    with open(args.html_path, encoding="utf-8") as f:
        content = f.read()

    json_start, json_end = extract_embedded_data(content)
    data = json.loads(content[json_start:json_end])

    with open(args.week_json_path, encoding="utf-8") as f:
        new_week = json.load(f)

    prev_last = data["weeks"][-1]["iso"] if data["weeks"] else None
    print(f"Previous last week: {prev_last}", file=sys.stderr)

    data["weeks"].append(new_week)
    if args.generated:
        data["generated"] = args.generated

    print(f"New last week: {new_week['iso']}", file=sys.stderr)
    print(f"Total weeks now: {len(data['weeks'])}", file=sys.stderr)

    updated_json = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    new_content = content[:json_start] + updated_json + content[json_end:]

    with open(args.html_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    # Sanity check: re-parse to make sure we didn't corrupt anything
    js2, je2 = extract_embedded_data(new_content)
    json.loads(new_content[js2:je2])
    print("OK: re-parsed successfully after write.", file=sys.stderr)


if __name__ == "__main__":
    main()
