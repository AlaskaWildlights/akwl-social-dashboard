---
name: social-weekly-update
description: Update the AKWL Social Media Tracker dashboard (this repo's index.html) with a new week of Instagram/Facebook/TikTok/GA data. Use this whenever the user uploads a zip of weekly CSV exports for the social dashboard, mentions adding/updating a week (e.g. "añade la W31", "sube esta semana", "actualiza el dashboard con esta data"), or gives follower "closing" numbers alongside a zip of CSVs. This is the standing operating procedure for that weekly ritual — always follow it instead of re-deriving the workflow from scratch, and always apply its source-of-truth rules for follower counts (Instagram manual, TikTok CSV, Facebook manual) even if the user's phrasing suggests otherwise.
---

# AKWL Social Weekly Update

Every week the user uploads a zip of CSV exports (Meta Business Suite for
Instagram/Facebook, TikTok Analytics, Google Analytics) and wants that
week's numbers appended to `index.html`'s dashboard. They also usually
paste 1-3 "closing follower count" numbers in the chat message alongside
the zip. This skill is the exact procedure to follow — it exists so the
user can just hand over the zip and numbers without re-explaining the
rules every time.

## Why the rules below matter

The three rules that most often go wrong if you skip this skill and improvise:

1. **Never trust a filename or folder name for the week.** Exports get
   mislabeled, re-uploaded, or renamed by hand — this has already happened
   once in this project (a zip named for W31 actually contained W30's
   dates). The date is only real once you've read it out of the CSV
   content itself.
2. **Different platforms have different sources of truth for follower
   totals**, and mixing them up silently produces a dashboard that looks
   right but drifts from reality over time:
   - **Instagram total followers** — always the number the user types in
     chat (Caitlin checks it manually each Saturday; there is no CSV
     export of the true total). Never compute or second-guess it.
   - **TikTok total followers** — always `prior_week_total + SUM(net
     growth)` computed from that week's `TT_Overview` CSV. If the user
     also gives you a "closing" TikTok number in chat, that number is
     *not* authoritative — the CSV is. This was explicitly corrected once
     already in this project, so don't let a manual TikTok number
     override the computed one.
   - **Facebook total followers** — always manual, because Meta's export
     has no cumulative-followers metric for Facebook Pages at all. There's
     no CSV alternative to prefer it over, so just take the number given.
3. **A missing file or a missing day inside a file is a signal, not
   noise.** Report it to the user rather than quietly summing whatever
   partial data exists — a week silently missing Tuesday's Instagram reach
   looks identical to a slow Tuesday unless someone flags it.

## Step 1 — Unzip and verify the week

Unzip the upload to a scratch directory. Expect a single folder inside
containing CSVs named roughly `IG_Reach_W##.csv`, `FB_Views.csv` (the W##
suffix is sometimes missing on one or two files — that's fine, it's never
what you key off of anyway).

Read the *actual dates* out of three anchor files to determine the real
week:
- `GA_Traffic*.csv` has comment lines `# Start date: YYYYMMDD` and
  `# End date: YYYYMMDD` near the top.
- Any `IG_*` or `FB_*` file has daily rows like
  `"2026-07-12T00:00:00","149"` — the date is column 1.
- `TT_Overview*.csv` has daily rows like `2026/07/19,409,...` — date is
  column 1.

These three should all agree on the same Sunday–Saturday range. If they
don't, or if that range doesn't match what the filename/folder implied,
**stop and ask the user** which is correct before writing anything —
exactly like catching a mislabeled re-upload before it corrupts the
dashboard.

Once you have the real start/end dates, look them up against
`WEEK_CALENDAR` in this repo's `Code.gs` to get the ISO week (`W17` =
Apr 19–25 2026, sequential Sun–Sat weeks from there through `W53`) and
build the human label the same way existing weeks are labeled, e.g.
`"Jul 26–Aug 1"` for cross-month weeks or `"Jul 19–25"` within a month.

Confirm the previous week in `index.html`'s data is exactly one ISO week
before this one. If it's not contiguous (a week got skipped, or this one
was already added), ask before proceeding.

## Step 2 — Check the 10 expected data categories are all there, all 7 days

Per platform, weekly numbers come from these files (ignore
`IG_Audience`/`FB_Audience`/`TT_Audience` — those are demographic
breakdowns, not part of the weekly rollup):

| Platform | Files |
|---|---|
| Instagram | `IG_Reach`, `IG_Views`, `IG_Follows`, `IG_Visits`, `IG_Interactions`, `IG_Link clicks` |
| Facebook | `FB_Views`, `FB_Visits`, `FB_Viewers`, `FB_Follows`, `FB_Interactions`, `FB_Link clicks` |
| TikTok | `TT_Overview`, `TT_Video` |
| Analytics | `GA_Traffic` |

Run the bundled parser, which handles the encoding quirks (Meta exports
are UTF-16 LE with a `sep=,` line and quoted values; TikTok/GA are UTF-8
with a BOM; GA has a multi-line comment header before the real CSV header)
and reports exactly what it found and what it didn't:

```bash
python3 .claude/skills/social-weekly-update/scripts/parse_week.py "<unzipped_folder>" \
  --prior-tt-followers <previous week's tt_followers from index.html>
```

Read its stderr output for `MISSING FILES` and `WARNING` lines, and check
`_all_days_seen` in the JSON output against the 7 expected dates. If
anything is missing, tell the user plainly what's missing (which file,
or which day within a file) — don't silently proceed with a partial sum.

A couple of fields the script deliberately doesn't fill in:
- `ig_followers` and `fb_followers` are always left for you to fill from
  the user's chat message (see Step 3).
- `tt_followers` is computed *if* you passed `--prior-tt-followers`; if
  you didn't have it handy, pull it from the previous week's entry in
  `index.html` and re-run, or fill it in by hand as
  `prior_total + tt_net_growth`.

## Step 3 — Reconcile follower numbers with the user's chat message

The user's message usually looks like "IG - 761 / TT - 423 / FB - 194" or
similar, in any order and often without saying which is which explicitly
(the order and rough size — IG usually biggest, growing slowly; TikTok
newer and smaller — makes it identifiable, but if genuinely ambiguous,
ask).

Apply the source-of-truth rule from above:
- Take the **Instagram** number as-is → `ig_followers`.
- Take the **Facebook** number as-is → `fb_followers` (no CSV alternative
  exists, so there's nothing to reconcile it against).
- For **TikTok**, ignore the user's number and use the CSV-computed
  `prior_total + tt_net_growth` instead. Mention this substitution in your
  final summary so it's never a silent override.

If the user didn't give you a follower number for a platform where one is
needed (Instagram, always; Facebook, if they want it tracked), ask for it
rather than guessing or leaving it blank.

## Step 4 — Assemble the week entry and splice it in

Build the week JSON object with these exact keys (matching every existing
week in `index.html`):

```
iso, label,
ig_reach, ig_views, ig_follows, ig_visits, ig_inter, ig_clicks, ig_eng, ig_followers,
fb_views, fb_visits, fb_viewers, fb_follows, fb_inter, fb_clicks, fb_followers,
tt_views, tt_reach, tt_profile_views, tt_new_flw, tt_lost_flw, tt_net_growth,
tt_likes, tt_comments, tt_shares, tt_website_clicks, tt_followers, tt_top_videos,
ga_sessions, ga_eng_sessions, ga_eng_rate, ga_avg_eng_time, ga_key_events,
ga_revenue, ga_sources, ga_missing
```

`ig_eng` is `ig_inter / ig_reach` rounded to 4 decimals (the parser fills
this in). `tt_top_videos` is up to 5 entries
`{title, date, views, likes, link}` sorted by views descending, taken
straight from `TT_Video` (the parser fills this too).

Save this object as a standalone JSON file, then splice it into
`index.html` with the bundled script rather than hand-editing the HTML —
the `EMBEDDED_DATA` blob is one giant JSON value and naive string
replacement risks corrupting it wherever `ga_sources` or `tt_top_videos`
happen to contain a brace-adjacent character:

```bash
python3 .claude/skills/social-weekly-update/scripts/splice_week.py \
  index.html new_week.json --generated "<current ISO timestamp>"
```

The script re-parses the result after writing and reports the previous
and new last-week `iso` to stderr — check that output to confirm the
append landed where you expected before moving on.

**This repo's `index.html` is exclusively the Social Media Tracker
dashboard.** If the user separately maintains a Reviews Dashboard or any
other HTML, it lives elsewhere — never write review data into this file
(this was mixed up once already in this project and had to be corrected).

## Step 5 — Commit, push, deliver

1. `git add index.html` and commit with a message summarizing the week's
   key numbers per platform, explicitly noting the TikTok CSV-vs-manual
   resolution when the user gave a different manual number.
2. Push to whatever branch the repo is currently on.
3. Send the user both the updated `index.html` and a standalone
   pretty-printed JSON of the full `weeks` history (useful for their own
   records or for pasting elsewhere).
4. Reply with a short summary table of the new week's key metrics per
   platform (reach/views/engagement plus the follower count and which
   source — manual or CSV — it came from). Match the user's language
   (Spanish is fine).
