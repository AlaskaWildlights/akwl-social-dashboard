#!/usr/bin/env python3
"""
Parse one week's folder of AKWL social-media CSV exports into the week-entry
JSON shape used by EMBEDDED_DATA in index.html.

Usage:
    python parse_week.py <folder_with_csvs> [--prior-tt-followers N]

Prints the parsed week entry as JSON to stdout, and prints warnings /
missing-file / missing-day reports to stderr. It does NOT guess the ISO
week or write anything — that's the calling skill's job, using the actual
dates this script reports back (never the folder or file name).

Design notes (why this exists as a script instead of ad hoc code each time):
- The encoding quirks (UTF-16 LE for Meta exports, UTF-8 BOM + comment
  header for GA) and the brace-counting needed to safely edit EMBEDDED_DATA
  are easy to get subtly wrong under time pressure. Doing this once,
  correctly, and reusing it removes that risk on every weekly run.
"""
import csv
import glob
import json
import os
import sys
import argparse

IG_FB_FILES = {
    "ig_reach": "IG_Reach",
    "ig_views": "IG_Views",
    "ig_follows": "IG_Follows",
    "ig_visits": "IG_Visits",
    "ig_inter": "IG_Interactions",
    "ig_clicks": "IG_Link clicks",
    "fb_views": "FB_Views",
    "fb_visits": "FB_Visits",
    "fb_viewers": "FB_Viewers",
    "fb_follows": "FB_Follows",
    "fb_inter": "FB_Interactions",
    "fb_clicks": "FB_Link clicks",
}

REQUIRED_PREFIXES = list(IG_FB_FILES.values()) + ["TT_Overview", "TT_Video", "GA_Traffic"]


def find_file(folder, prefix):
    """Match e.g. 'IG_Reach' -> IG_Reach_W29.csv / IG_Reach.csv, case-insensitive,
    ignoring the week-number suffix (the suffix is never trusted for dates)."""
    matches = []
    for f in glob.glob(os.path.join(folder, "*.csv")):
        base = os.path.basename(f)
        name_no_ext = os.path.splitext(base)[0]
        # Strip a trailing _W## if present, compare the rest case-insensitively
        core = name_no_ext
        if "_W" in core:
            head, tail = core.rsplit("_W", 1)
            if tail.isdigit():
                core = head
        if core.lower() == prefix.lower():
            matches.append(f)
    return matches[0] if matches else None


def read_meta_csv(path):
    """Read a Meta (IG/FB) export: UTF-16 LE, 'sep=,' + title + header, then
    quoted 'Date','Primary' rows with ISO datetimes."""
    with open(path, "rb") as f:
        raw = f.read()
    text = raw.decode("utf-16")
    lines = [l for l in text.splitlines() if l.strip()]
    data_lines = lines[3:]  # skip sep=, title, header
    days = {}
    for l in data_lines:
        row = next(csv.reader([l]))
        if len(row) < 2:
            continue
        date = row[0][:10]
        try:
            val = float(row[1])
        except ValueError:
            continue
        days[date] = val
    return days


def read_tt_overview(path):
    with open(path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    days = {}
    for r in rows:
        date = r["Date"].replace("/", "-")
        days[date] = r
    return rows, days


def read_tt_video(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def read_ga(path):
    with open(path, encoding="utf-8-sig") as f:
        lines = f.readlines()
    start_date = end_date = None
    for l in lines:
        if l.strip().startswith("# Start date:"):
            start_date = l.split(":")[1].strip()
        if l.strip().startswith("# End date:"):
            end_date = l.split(":")[1].strip()
    header_idx = next(i for i, l in enumerate(lines) if l.startswith("Session source"))
    reader = csv.DictReader(lines[header_idx:])
    rows = list(reader)
    return rows, start_date, end_date


def fmt_iso_date(yyyymmdd):
    return f"{yyyymmdd[0:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--prior-tt-followers", type=int, default=None,
                     help="Prior week's tt_followers (cumulative). If omitted, tt_followers is left null and must be filled in by hand.")
    args = ap.parse_args()

    warnings = []
    missing_files = []

    # --- locate files ---
    paths = {}
    for prefix in REQUIRED_PREFIXES:
        p = find_file(args.folder, prefix)
        if not p:
            missing_files.append(prefix)
        else:
            paths[prefix] = p

    if missing_files:
        print(f"MISSING FILES: {missing_files}", file=sys.stderr)

    result = {}
    all_days_seen = set()

    # --- IG / FB sums ---
    for key, prefix in IG_FB_FILES.items():
        if prefix not in paths:
            result[key] = None
            continue
        days = read_meta_csv(paths[prefix])
        all_days_seen |= set(days.keys())
        result[key] = int(sum(days.values())) if sum(days.values()) == int(sum(days.values())) else sum(days.values())

    if result.get("ig_reach") and result.get("ig_inter") is not None:
        result["ig_eng"] = round(result["ig_inter"] / result["ig_reach"], 4) if result["ig_reach"] else 0

    # --- TikTok ---
    if "TT_Overview" in paths:
        rows, tt_days = read_tt_overview(paths["TT_Overview"])
        all_days_seen |= set(tt_days.keys())
        result["tt_views"] = sum(int(r["Video views"]) for r in rows)
        result["tt_reach"] = sum(int(r["Reached audience"]) for r in rows)
        result["tt_profile_views"] = sum(int(r["Profile views"]) for r in rows)
        result["tt_likes"] = sum(int(r["Likes"]) for r in rows)
        result["tt_shares"] = sum(int(r["Shares"]) for r in rows)
        result["tt_comments"] = sum(int(r["Comments"]) for r in rows)
        result["tt_website_clicks"] = sum(int(r.get("Website clicks ", r.get("Website clicks", 0))) for r in rows)
        result["tt_net_growth"] = sum(int(r["Net growth"]) for r in rows)
        result["tt_new_flw"] = sum(int(r["New followers"]) for r in rows)
        result["tt_lost_flw"] = sum(int(r["Lost followers"]) for r in rows)
        if args.prior_tt_followers is not None:
            result["tt_followers"] = args.prior_tt_followers + result["tt_net_growth"]
        else:
            result["tt_followers"] = None
            warnings.append("tt_followers left null — pass --prior-tt-followers to compute it (prior_total + net_growth)")
        result["tt_days_found"] = sorted(tt_days.keys())
    else:
        for k in ["tt_views","tt_reach","tt_profile_views","tt_likes","tt_shares","tt_comments",
                   "tt_website_clicks","tt_net_growth","tt_new_flw","tt_lost_flw","tt_followers"]:
            result[k] = None

    if "TT_Video" in paths:
        vrows = read_tt_video(paths["TT_Video"])
        videos = []
        for v in vrows:
            post_time = v.get("Post time", "")
            date_part = post_time.split(" ")[0].replace("/", "/") if post_time else ""
            videos.append({
                "title": v.get("Video title", ""),
                "date": date_part,
                "views": int(v.get("Video views", 0) or 0),
                "likes": int(v.get("Likes", 0) or 0),
                "link": v.get("Video link", ""),
            })
        videos.sort(key=lambda x: x["views"], reverse=True)
        result["tt_top_videos"] = videos[:5]
    else:
        result["tt_top_videos"] = []

    # --- GA ---
    if "GA_Traffic" in paths:
        garows, start_date, end_date = read_ga(paths["GA_Traffic"])
        ga_sessions = sum(int(r["Sessions"]) for r in garows)
        ga_eng_sessions = sum(int(r["Engaged sessions"]) for r in garows)
        result["ga_sessions"] = ga_sessions
        result["ga_eng_sessions"] = ga_eng_sessions
        result["ga_eng_rate"] = round(ga_eng_sessions / ga_sessions, 4) if ga_sessions else 0
        result["ga_key_events"] = sum(int(r["Key events"]) for r in garows)
        result["ga_revenue"] = round(sum(float(r["Total revenue"]) for r in garows), 2)
        weighted_sum = sum(float(r["Average engagement time per session"]) * int(r["Sessions"]) for r in garows)
        result["ga_avg_eng_time"] = round(weighted_sum / ga_sessions, 1) if ga_sessions else 0
        result["ga_sources"] = [
            {"src": r["Session source / medium"], "sessions": int(r["Sessions"]),
             "revenue": round(float(r["Total revenue"]), 2)}
            for r in garows
        ]
        result["ga_missing"] = False
        result["ga_start_date"] = fmt_iso_date(start_date) if start_date else None
        result["ga_end_date"] = fmt_iso_date(end_date) if end_date else None
    else:
        result["ga_sessions"] = None
        result["ga_missing"] = True
        warnings.append("GA_Traffic file missing")

    result["_all_days_seen"] = sorted(all_days_seen)
    result["_warnings"] = warnings
    result["_missing_files"] = missing_files

    print(json.dumps(result, ensure_ascii=False, indent=2))
    if warnings:
        for w in warnings:
            print(f"WARNING: {w}", file=sys.stderr)


if __name__ == "__main__":
    main()
