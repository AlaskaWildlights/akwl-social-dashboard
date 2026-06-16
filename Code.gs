// ══════════════════════════════════════════════════════════════════════════════
// AKWL Social Media Tracker — v7
// Pre-structured Google Sheets. One row per week. Week detected from CSV content.
// ══════════════════════════════════════════════════════════════════════════════

var SPREADSHEET_ID = "15QgxsImalEM_At3fOkZDag1G1C_6ueEy2OsL8Cw7GZQ";
var FOLDER_ID      = "1G861p7ZUSpLhoFZjLDRPmUykN5QKXFEz";
var PROCESSED_NAME = "Processed";
var AKWL_EMAIL     = "info@alaskawildlights.com";

// ─── Week calendar W17–W53 (Sunday–Saturday) ──────────────────────────────────
var WEEK_CALENDAR = [
  {iso:"W17",start:"2026-04-19",end:"2026-04-25"},
  {iso:"W18",start:"2026-04-26",end:"2026-05-02"},
  {iso:"W19",start:"2026-05-03",end:"2026-05-09"},
  {iso:"W20",start:"2026-05-10",end:"2026-05-16"},
  {iso:"W21",start:"2026-05-17",end:"2026-05-23"},
  {iso:"W22",start:"2026-05-24",end:"2026-05-30"},
  {iso:"W23",start:"2026-05-31",end:"2026-06-06"},
  {iso:"W24",start:"2026-06-07",end:"2026-06-13"},
  {iso:"W25",start:"2026-06-14",end:"2026-06-20"},
  {iso:"W26",start:"2026-06-21",end:"2026-06-27"},
  {iso:"W27",start:"2026-06-28",end:"2026-07-04"},
  {iso:"W28",start:"2026-07-05",end:"2026-07-11"},
  {iso:"W29",start:"2026-07-12",end:"2026-07-18"},
  {iso:"W30",start:"2026-07-19",end:"2026-07-25"},
  {iso:"W31",start:"2026-07-26",end:"2026-08-01"},
  {iso:"W32",start:"2026-08-02",end:"2026-08-08"},
  {iso:"W33",start:"2026-08-09",end:"2026-08-15"},
  {iso:"W34",start:"2026-08-16",end:"2026-08-22"},
  {iso:"W35",start:"2026-08-23",end:"2026-08-29"},
  {iso:"W36",start:"2026-08-30",end:"2026-09-05"},
  {iso:"W37",start:"2026-09-06",end:"2026-09-12"},
  {iso:"W38",start:"2026-09-13",end:"2026-09-19"},
  {iso:"W39",start:"2026-09-20",end:"2026-09-26"},
  {iso:"W40",start:"2026-09-27",end:"2026-10-03"},
  {iso:"W41",start:"2026-10-04",end:"2026-10-10"},
  {iso:"W42",start:"2026-10-11",end:"2026-10-17"},
  {iso:"W43",start:"2026-10-18",end:"2026-10-24"},
  {iso:"W44",start:"2026-10-25",end:"2026-10-31"},
  {iso:"W45",start:"2026-11-01",end:"2026-11-07"},
  {iso:"W46",start:"2026-11-08",end:"2026-11-14"},
  {iso:"W47",start:"2026-11-15",end:"2026-11-21"},
  {iso:"W48",start:"2026-11-22",end:"2026-11-28"},
  {iso:"W49",start:"2026-11-29",end:"2026-12-05"},
  {iso:"W50",start:"2026-12-06",end:"2026-12-12"},
  {iso:"W51",start:"2026-12-13",end:"2026-12-19"},
  {iso:"W52",start:"2026-12-20",end:"2026-12-26"},
  {iso:"W53",start:"2026-12-27",end:"2027-01-02"}
];

// All 18 file types expected per week (Rule 2 — missing file detection)
// IG: 6 metrics + 1 audience = 7
// FB: 6 metrics + 1 audience = 7
// TT: overview + video + audience = 3
// GA: traffic = 1   →   total = 18
var EXPECTED_KEYS = [
  "ig_reach","ig_views","ig_follows","ig_visits","ig_interactions","ig_link_clicks","ig_audience",
  "fb_views","fb_visits","fb_viewers","fb_follows","fb_interactions","fb_link_clicks","fb_audience",
  "tt_overview","tt_video","tt_audience",
  "ga"
];

// ─── Week calendar helpers ─────────────────────────────────────────────────────

function dateStrToWeekISO(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  for (var i = 0; i < WEEK_CALENDAR.length; i++) {
    if (dateStr >= WEEK_CALENDAR[i].start && dateStr <= WEEK_CALENDAR[i].end) {
      return WEEK_CALENDAR[i].iso;
    }
  }
  return null;
}

function weekISOtoDates(weekISO) {
  for (var i = 0; i < WEEK_CALENDAR.length; i++) {
    if (WEEK_CALENDAR[i].iso === weekISO) return WEEK_CALENDAR[i];
  }
  return null;
}

function weekISOtoLabel(weekISO) {
  var wk = weekISOtoDates(weekISO);
  if (!wk) return weekISO;
  var s = new Date(wk.start + "T12:00:00Z");
  var e = new Date(wk.end   + "T12:00:00Z");
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var sm = months[s.getUTCMonth()], em = months[e.getUTCMonth()];
  if (sm === em) return sm + " " + s.getUTCDate() + "-" + e.getUTCDate();
  return sm + " " + s.getUTCDate() + "-" + em + " " + e.getUTCDate();
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function log(msg) { Logger.log(msg); }
function hasAny(str, arr) { return arr.some(function(s){ return str.indexOf(s) > -1; }); }

function isInsideFolder(file, folder) {
  var parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folder.getId()) return true;
  }
  return false;
}

function getOrCreateSubfolder(parent, name) {
  var ex = parent.getFoldersByName(name);
  return ex.hasNext() ? ex.next() : parent.createFolder(name);
}

function lastClosedSaturday() {
  var now = new Date();
  var akOffsetMs = -8 * 60 * 60 * 1000;
  var akNowMs = now.getTime() + akOffsetMs;
  var akNow = new Date(akNowMs);
  var dow  = akNow.getUTCDay();
  var hour = akNow.getUTCHours();
  var daysBack = 0;
  if      (dow === 6) { if (hour < 23) daysBack = 7; }
  else if (dow === 0) { daysBack = 1; }
  else                { daysBack = dow + 1; }
  var satEndMs = akNowMs - (daysBack * 86400000) + (24*60*60*1000) - 1;
  return new Date(satEndMs);
}

// ─── File I/O ──────────────────────────────────────────────────────────────────

function readFile(file) {
  var blob  = file.getBlob();
  var bytes = blob.getBytes();
  var b0 = bytes[0]&0xFF, b1 = bytes[1]&0xFF, b2 = bytes.length>2?(bytes[2]&0xFF):0;
  if (b0===0xFF && b1===0xFE) return blob.getDataAsString("UTF-16LE");
  if (b0===0xFE && b1===0xFF) return blob.getDataAsString("UTF-16BE");
  if (b0===0xEF && b1===0xBB && b2===0xBF) return blob.getDataAsString("UTF-8");
  return blob.getDataAsString("UTF-8");
}

function parseCSVLine(line) {
  var result = [], current = "", inQ = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"')            { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(current.trim()); current = ""; }
    else                      { current += c; }
  }
  result.push(current.trim());
  return result;
}

// Shared helper: parse a two-row "names / values" CSV block (used by audience parsers)
function parseTwoRowSection(namesLine, valuesLine) {
  var names = parseCSVLine(namesLine || "");
  var vals  = parseCSVLine(valuesLine || "");
  var result = [];
  for (var j = 0; j < names.length; j++) {
    var name = names[j].replace(/"/g,"").trim();
    var pct  = Math.round((parseFloat((vals[j]||"").replace(/"/g,"")) || 0) * 100) / 10000;
    if (name) result.push({ name: name, pct: pct });
  }
  return result;
}

// ─── File classification ───────────────────────────────────────────────────────
// Two-pass: name-based first, content-based fallback for unknowns.

function classifyFile(fl) {
  // ── Google Analytics ─────────────────────────────────────────────────────
  // GA4 exports arrive with many different report names
  if (hasAny(fl, [
    "traffic acquisition","session source","acquisition session",
    "ga traffic","ga_traffic","acquisition overview","sessions by",
    "google analytics","analytics","ga4","session default"
  ])) return "ga";

  // ── TikTok ───────────────────────────────────────────────────────────────
  if (hasAny(fl, ["tiktok","tik tok","tt overview","tt video","tt audience"])) {
    if (hasAny(fl, ["audience"])) return "tt_audience";
    if (hasAny(fl, ["video"]))    return "tt_videos";
    return "tt_overview";
  }

  // ── Audience / Demographics ───────────────────────────────────────────────
  if (hasAny(fl, ["audience","demographics","demographic"])) {
    if (hasAny(fl, ["facebook","fb","page"])) return "fb_audience";
    return "ig_audience";
  }

  // ── Facebook ─────────────────────────────────────────────────────────────
  // "page" is a strong FB signal (Facebook Page exports)
  if (hasAny(fl, ["facebook","fb page","page view","page reach","page like","page follower"]) ||
      /^facebook/.test(fl) || /\bfb\b/.test(fl)) return "fb_metric";

  // ── Instagram ─────────────────────────────────────────────────────────────
  // "story","reel","profile" are IG-only export names
  if (hasAny(fl, ["instagram","story","stories","reel","reels","profile visit","ig_"]) ||
      /^instagram/.test(fl) || /\big\b/.test(fl)) return "ig_metric";

  return "unknown";
}

// Content-based fallback — called only when classifyFile returns "unknown"
function classifyFileByContent(file) {
  var raw;
  try { raw = readFile(file); } catch(e) { return "unknown"; }

  // GA: has "# Start Date: YYYYMMDD" comment (very reliable signal)
  if (/start\s*date[:\s]+\d{8}/i.test(raw)) {
    log("  ↳ classified as GA by content (# Start Date comment found)");
    return "ga";
  }

  // TikTok overview: first line contains unique TT column names
  var firstLine = raw.replace(/\r/g,"").replace(/﻿/g,"").split("\n")[0].toLowerCase();
  if (hasAny(firstLine, ["net growth","reached audience","lost followers"])) {
    log("  ↳ classified as TT_OVERVIEW by content (TikTok column names)");
    return "tt_overview";
  }
  if (firstLine.indexOf("post time") > -1) {
    log("  ↳ classified as TT_VIDEOS by content (Post time column)");
    return "tt_videos";
  }

  // Meta CSV: UTF-16 LE encoding + "Date,Primary" structure → IG or FB metric
  var bytes = file.getBlob().getBytes();
  var isUTF16LE = (bytes[0]&0xFF)===0xFF && (bytes[1]&0xFF)===0xFE;
  if (isUTF16LE) {
    var lines = raw.replace(/\r/g,"").split("\n").map(function(l){
      return l.replace(/^sep=.*$/i,"").replace(/﻿/g,"").replace(/"/g,"").trim();
    }).filter(function(l){ return l; });

    var title = "";
    for (var i = 0; i < lines.length; i++) {
      var ll = lines[i].toLowerCase();
      if (ll.indexOf("date") > -1 && ll.indexOf("primary") > -1) break;
      title = ll;
    }

    // FB-only metric names
    if (hasAny(title, ["viewer","page view","page reach","page like"])) {
      log("  ↳ classified as FB_METRIC by content (title: '" + title + "')");
      return "fb_metric";
    }
    // IG-only metric names
    if (hasAny(title, ["profile visit","story","reel"])) {
      log("  ↳ classified as IG_METRIC by content (title: '" + title + "')");
      return "ig_metric";
    }
    // Shared metric (reach, views, follows, interactions, link clicks):
    // can't tell IG vs FB from content alone → log warning, stay unknown
    log("⚠️ Meta CSV (UTF-16 LE) with shared metric '" + title + "' — cannot determine IG vs FB. Rename file to include 'instagram' or 'facebook'.");
    return "unknown";
  }

  return "unknown";
}

function fileSortPriority(f) {
  var fl = f.getName().toLowerCase().replace(/[^a-z0-9]/g," ").replace(/\s+/g," ").trim();
  var order = {ig_metric:0,fb_metric:1,tt_overview:2,tt_videos:3,tt_audience:4,ga:5};
  var r = classifyFile(fl);
  return order[r] !== undefined ? order[r] : 9;
}

// ─── Week detection from CSV content (Rule 1) ──────────────────────────────────

function detectWeekFromContent(file, route) {
  var raw;
  try { raw = readFile(file); } catch(e) { return null; }

  var dateStr = null;

  if (route === "ig_metric" || route === "fb_metric") {
    var lines = raw.replace(/\r/g,"").split("\n").map(function(l){
      return l.replace(/^sep=.*$/i,"").replace(/﻿/g,"").replace(/"/g,"").trim();
    }).filter(function(l){ return l; });
    var headerFound = false;
    for (var i = 0; i < lines.length; i++) {
      var ll = lines[i].toLowerCase();
      if (!headerFound && ll.indexOf("date") > -1 && ll.indexOf("primary") > -1) {
        headerFound = true; continue;
      }
      if (headerFound) {
        var parts = lines[i].split(",");
        if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}/.test(parts[0])) {
          dateStr = parts[0].substring(0, 10); break;
        }
      }
    }

  } else if (route === "tt_overview" || route === "tt_audience") {
    var lines = raw.replace(/\r/g,"").replace(/﻿/g,"").split("\n")
                   .filter(function(l){ return l.trim(); });
    if (lines.length >= 2) {
      var headers = lines[0].split(",").map(function(h){ return h.trim().toLowerCase(); });
      var dateIdx = headers.indexOf("date");
      if (dateIdx > -1) {
        for (var i = 1; i < lines.length; i++) {
          var parts = lines[i].split(",").map(function(p){ return p.trim(); });
          if (!parts[dateIdx]) continue;
          var d = parts[dateIdx].replace(/\//g,"-");
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { dateStr = d; break; }
        }
      }
    }

  } else if (route === "tt_videos") {
    var lines = raw.replace(/\r/g,"").replace(/﻿/g,"").split("\n")
                   .filter(function(l){ return l.trim(); });
    if (lines.length >= 2) {
      var headers = lines[0].split(",").map(function(h){ return h.trim().toLowerCase(); });
      var ptIdx = headers.indexOf("post time");
      if (ptIdx > -1) {
        for (var i = 1; i < lines.length; i++) {
          var parts = parseCSVLine(lines[i]);
          if (!parts[ptIdx]) continue;
          var m = parts[ptIdx].trim().match(/^(\d{4})\/(\d{2})\/(\d{2})/);
          if (m) { dateStr = m[1]+"-"+m[2]+"-"+m[3]; break; }
        }
      }
    }

  } else if (route === "ga") {
    // GA exports cover wide date ranges (e.g. Apr 13–May 10 for a W19 weekly export).
    // The end date can fall in the WRONG week, so filename W## is the reliable identifier.
    // Check filename FIRST; fall back to content dates only when filename has no W##.
    var fnMatch = file.getName().match(/(?:^|[^A-Za-z0-9])(W\d{2})(?:[^A-Za-z0-9]|$)/i);
    if (fnMatch) {
      var wkISO = fnMatch[1].toUpperCase();
      if (weekISOtoDates(wkISO)) {
        log("  ↳ GA: filename identifies week " + wkISO);
        return wkISO;
      }
    }
    // Fallback: try start date then end date from header comments
    var lines = raw.replace(/\r/g,"").split("\n");
    for (var i = 0; i < lines.length; i++) {
      var ms = lines[i].match(/start\s*date[:\s]+(\d{4})(\d{2})(\d{2})/i);
      if (ms) { var d = ms[1]+"-"+ms[2]+"-"+ms[3]; if (dateStrToWeekISO(d)) { dateStr = d; break; } }
      var me = lines[i].match(/end\s*date[:\s]+(\d{4})(\d{2})(\d{2})/i);
      if (me) { var d = me[1]+"-"+me[2]+"-"+me[3]; if (dateStrToWeekISO(d)) { dateStr = d; break; } }
    }

  } else if (route === "ig_audience" || route === "fb_audience") {
    // IG/FB audience files are lifetime snapshots — no date in content by design.
    // Scan content first just in case, then fall back to W## in the filename.
    var allLines = raw.replace(/\r/g,"").split("\n");
    for (var i = 0; i < allLines.length; i++) {
      var m = allLines[i].match(/(\d{4}-\d{2}-\d{2})/);
      if (m && dateStrToWeekISO(m[1])) { dateStr = m[1]; break; }
    }
    if (!dateStr) {
      // Underscore is a JS word-char so \b fails on _W17 — use non-alphanumeric boundary
      var fnMatch = file.getName().match(/(?:^|[^A-Za-z0-9])(W\d{2})(?:[^A-Za-z0-9]|$)/i);
      if (fnMatch) {
        var wkISO = fnMatch[1].toUpperCase();
        if (weekISOtoDates(wkISO)) {
          log("  ↳ Audience file (lifetime data) — archiving under submission week " + wkISO);
          return wkISO;
        }
      }
    }
  }

  return dateStr ? dateStrToWeekISO(dateStr) : null;
}

// ─── Metric resolution from CSV title ─────────────────────────────────────────

function resolveIGMetric(title) {
  var t = title.toLowerCase().replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim();
  if (t.indexOf("link click") > -1 || t.indexOf("website click") > -1) return "link_clicks";
  if (t.indexOf("profile visit") > -1) return "visits";
  if (t.indexOf("interaction") > -1)   return "interactions";
  if (t.indexOf("follow") > -1)        return "follows";
  if (t.indexOf("reach") > -1)         return "reach";
  if (t === "views" || t === "view" || t.indexOf("impression") > -1) return "views";
  if (t.indexOf("visit") > -1)         return "visits";
  return null;
}

function resolveFBMetric(title) {
  var t = title.toLowerCase().replace(/[^a-z ]/g," ").replace(/\s+/g," ").trim();
  if (t.indexOf("link click") > -1)    return "link_clicks";
  if (t.indexOf("viewer") > -1)        return "viewers";
  if (t.indexOf("interaction") > -1)   return "interactions";
  if (t.indexOf("follow") > -1 || t.indexOf("like") > -1) return "follows";
  if (t.indexOf("visit") > -1)         return "visits";
  if (t.indexOf("reach") > -1)         return "viewers";
  if (t === "views" || t === "view" || t.indexOf("impression") > -1) return "views";
  return null;
}

// ─── CSV parsers ───────────────────────────────────────────────────────────────

// Meta (IG/FB) — returns { metricKey, sum } or null
function parseMetaCSV(file, platform, weekISO) {
  var raw = readFile(file);
  var lines = raw.replace(/\r/g,"").split("\n").map(function(l){
    return l.replace(/^sep=.*$/i,"").replace(/﻿/g,"").replace(/"/g,"").trim();
  }).filter(function(l){ return l; });

  var wk = weekISOtoDates(weekISO);
  var title = "", headerFound = false, total = 0;

  for (var i = 0; i < lines.length; i++) {
    var ll = lines[i].toLowerCase();
    if (!headerFound && ll.indexOf("date") > -1 && ll.indexOf("primary") > -1) {
      headerFound = true; continue;
    }
    if (!headerFound) {
      title = lines[i].trim();
    } else {
      var parts = lines[i].split(",");
      if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}/.test(parts[0])) {
        var d = parts[0].substring(0, 10);
        if (wk && d >= wk.start && d <= wk.end) {
          total += parseFloat(parts[1]) || 0;
        }
      }
    }
  }

  if (!title) return null;
  var metricKey = platform === "Instagram" ? resolveIGMetric(title) : resolveFBMetric(title);
  if (!metricKey) { log("⚠️ Unresolved title: '" + title + "' for " + platform); return null; }
  return { metricKey: metricKey, sum: total };
}

// TikTok Overview — returns sums object or null
function parseTikTokOverview(file, weekISO) {
  var raw = readFile(file);
  var lines = raw.replace(/\r/g,"").replace(/﻿/g,"").split("\n")
                 .filter(function(l){ return l.trim(); });
  if (lines.length < 2) return null;

  var headers = lines[0].split(",").map(function(h){ return h.trim().toLowerCase(); });
  var dateIdx = headers.indexOf("date");
  if (dateIdx === -1) return null;

  var wk = weekISOtoDates(weekISO);
  var colMap = {
    "video views":"videoViews","reached audience":"reached","profile views":"profileViews",
    "likes":"likes","shares":"shares","comments":"comments","website clicks":"websiteClicks",
    "net growth":"netGrowth","new followers":"newFollowers","lost followers":"lostFollowers"
  };
  var sums = {videoViews:0,reached:0,profileViews:0,likes:0,shares:0,comments:0,
              websiteClicks:0,netGrowth:0,newFollowers:0,lostFollowers:0};

  for (var i = 1; i < lines.length; i++) {
    var parts = lines[i].split(",").map(function(p){ return p.trim(); });
    if (!parts[dateIdx]) continue;
    var d = parts[dateIdx].replace(/\//g,"-");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (wk && (d < wk.start || d > wk.end)) continue;
    headers.forEach(function(h, idx) {
      var key = colMap[h];
      if (key !== undefined) sums[key] += parseFloat(parts[idx]) || 0;
    });
  }
  return sums;
}

// TikTok Videos — returns top_videos array sorted by views DESC
function parseTikTokVideos(file, weekISO) {
  var raw = readFile(file);
  var lines = raw.replace(/\r/g,"").replace(/﻿/g,"").split("\n")
                 .filter(function(l){ return l.trim(); });
  if (lines.length < 2) return [];

  var headers = lines[0].split(",").map(function(h){ return h.trim().toLowerCase(); });
  function hi(terms) {
    for (var t = 0; t < terms.length; t++) {
      for (var h = 0; h < headers.length; h++) {
        if (headers[h].indexOf(terms[t]) > -1) return h;
      }
    }
    return -1;
  }
  var titleIdx  = hi(["video title","title"]);
  var urlIdx    = hi(["video link","link url","url"]);
  var timeIdx   = hi(["post time","posted"]);
  var viewsIdx  = hi(["video views","views"]);
  var likesIdx  = hi(["likes"]);
  var comIdx    = hi(["comments"]);
  var sharesIdx = hi(["shares"]);
  var favIdx    = hi(["favorites","saved"]);

  var wk = weekISOtoDates(weekISO);
  var videos = [];

  for (var i = 1; i < lines.length; i++) {
    var parts = parseCSVLine(lines[i]);
    if (!parts.length) continue;
    var posted = "";
    if (timeIdx > -1 && parts[timeIdx]) {
      var m = parts[timeIdx].trim().match(/^(\d{4})\/(\d{2})\/(\d{2})/);
      if (m) posted = m[1]+"-"+m[2]+"-"+m[3];
    }
    // Only include videos within this week's date range
    if (wk && posted && (posted < wk.start || posted > wk.end)) continue;
    var views = viewsIdx > -1 ? (parseInt(parts[viewsIdx])||0) : 0;
    if (!views) continue;
    videos.push({
      title:     titleIdx  > -1 ? (parts[titleIdx]||"").trim()    : "",
      url:       urlIdx    > -1 ? (parts[urlIdx]||"").trim()      : "",
      posted:    posted,
      views:     views,
      likes:     likesIdx  > -1 ? (parseInt(parts[likesIdx])||0)  : 0,
      comments:  comIdx    > -1 ? (parseInt(parts[comIdx])||0)    : 0,
      shares:    sharesIdx > -1 ? (parseInt(parts[sharesIdx])||0) : 0,
      favorites: favIdx    > -1 ? (parseInt(parts[favIdx])||0)    : 0
    });
  }
  return videos.sort(function(a,b){ return b.views - a.views; });
}

// Google Analytics — returns { sessions, engaged_sessions, eng_rate, avg_eng_time, key_events, revenue, sources[] } or null
function parseGoogleAnalyticsCSV(file) {
  var raw = readFile(file);
  var lines = raw.replace(/\r/g,"").split("\n").map(function(l){ return l.trim(); });
  var headerLine = -1;
  for (var i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("#") && lines[i].toLowerCase().indexOf("session") > -1) {
      headerLine = i; break;
    }
  }
  if (headerLine === -1) return null;

  var headers = parseCSVLine(lines[headerLine]);
  function hi(p) {
    return headers.findIndex(function(h){
      return (h+"").toLowerCase().replace(/[^a-z]/g," ").trim().indexOf(p) > -1;
    });
  }
  var sessIdx = hi("sessions"),       engIdx  = hi("engaged session"),
      revIdx  = hi("revenue"),        srcIdx  = hi("session source"),
      erIdx   = hi("engagement rate"), atIdx  = hi("average engagement time"),
      keIdx   = hi("key event");

  var totalSessions=0, totalEngaged=0, totalRevenue=0;
  var wEngRate=0, wAvgTime=0, totalKeyEvents=0;
  var sources = [];

  for (var i = headerLine+1; i < lines.length; i++) {
    if (!lines[i] || lines[i].startsWith("#")) continue;
    var parts = parseCSVLine(lines[i]);
    if (!parts[0]) continue;
    function numStr(v){ return (v||"").toString().replace(/,/g,""); }
    var sess = sessIdx > -1 ? (Math.round(parseFloat(numStr(parts[sessIdx]))||0)) : 0;
    var eng  = engIdx  > -1 ? (Math.round(parseFloat(numStr(parts[engIdx] ))||0)) : 0;
    var rev  = revIdx  > -1 ? (parseFloat(numStr(parts[revIdx]))||0)              : 0;
    var src  = srcIdx  > -1 ? (parts[srcIdx]||"").trim()                          : "";
    var er   = erIdx   > -1 ? (parseFloat(numStr(parts[erIdx] ))||0)              : 0;
    var at   = atIdx   > -1 ? (parseFloat(numStr(parts[atIdx] ))||0)              : 0;
    var ke   = keIdx   > -1 ? (Math.round(parseFloat(numStr(parts[keIdx] ))||0))  : 0;
    totalSessions  += sess;
    totalEngaged   += eng;
    totalRevenue   += rev;
    wEngRate       += er * sess;
    wAvgTime       += at * sess;
    totalKeyEvents += ke;
    if (src) sources.push({ src: src, sessions: sess, revenue: Math.round(rev*100)/100 });
  }
  if (!totalSessions && !totalEngaged) return null;
  return {
    sessions:        totalSessions,
    engaged_sessions: totalEngaged,
    eng_rate:        totalSessions > 0 ? Math.round(wEngRate/totalSessions*10000)/10000 : 0,
    avg_eng_time:    totalSessions > 0 ? Math.round(wAvgTime/totalSessions*10)/10 : 0,
    key_events:      totalKeyEvents,
    revenue:         Math.round(totalRevenue*100)/100,
    sources:         sources.filter(function(s){ return s.src; })
                            .sort(function(a,b){ return b.sessions-a.sessions; })
  };
}

// IG Audience CSV (UTF-16 LE): Age & gender, Top cities, Top countries.
// CSV percentages are whole numbers (9.5 = 9.5%) — stored as decimals (0.095).
function parseIGAudienceCSV(file) {
  var raw = readFile(file);
  var lines = raw.replace(/\r/g,"").split("\n").map(function(l){
    return l.replace(/^sep=.*$/i,"").trim();
  }).filter(function(l){ return l.length > 0; });

  var result = { age_gender: [], top_countries: [], top_cities: [] };
  var section = "";
  var i = 0;
  while (i < lines.length) {
    var line    = lines[i];
    var stripped = line.replace(/^"(.*)"$/, "$1").trim();

    if (stripped === "Age & gender") { section = "age"; i++; continue; }

    if (stripped === "Top cities") {
      if (i + 2 < lines.length) {
        result.top_cities = parseTwoRowSection(lines[i+1], lines[i+2]);
        i += 3;
      } else i++;
      section = "";
      continue;
    }

    if (stripped === "Top countries") {
      if (i + 2 < lines.length) {
        result.top_countries = parseTwoRowSection(lines[i+1], lines[i+2]);
        i += 3;
      } else i++;
      section = "";
      continue;
    }

    if (section === "age") {
      var parts = parseCSVLine(line);
      var band = (parts[0]||"").replace(/"/g,"").trim();
      if (band && /^\d/.test(band)) {
        // IG col order: Women(1), Men(2)
        result.age_gender.push({
          band:      band,
          women_pct: Math.round((parseFloat((parts[1]||"").replace(/"/g,"")) || 0) * 100) / 10000,
          men_pct:   Math.round((parseFloat((parts[2]||"").replace(/"/g,"")) || 0) * 100) / 10000
        });
      }
    }
    i++;
  }
  return result;
}

// FB Audience CSV (UTF-16 LE): same format as IG but col order is Men(1), Women(2).
function parseFBAudienceCSV(file) {
  var raw = readFile(file);
  var lines = raw.replace(/\r/g,"").split("\n").map(function(l){
    return l.replace(/^sep=.*$/i,"").trim();
  }).filter(function(l){ return l.length > 0; });

  var result = { age_gender: [], top_countries: [], top_cities: [] };
  var section = "";
  var i = 0;
  while (i < lines.length) {
    var line    = lines[i];
    var stripped = line.replace(/^"(.*)"$/, "$1").trim();

    if (stripped === "Age & gender") { section = "age"; i++; continue; }

    if (stripped === "Top cities") {
      if (i + 2 < lines.length) {
        result.top_cities = parseTwoRowSection(lines[i+1], lines[i+2]);
        i += 3;
      } else i++;
      section = "";
      continue;
    }

    if (stripped === "Top countries") {
      if (i + 2 < lines.length) {
        result.top_countries = parseTwoRowSection(lines[i+1], lines[i+2]);
        i += 3;
      } else i++;
      section = "";
      continue;
    }

    if (section === "age") {
      var parts = parseCSVLine(line);
      var band = (parts[0]||"").replace(/"/g,"").trim();
      if (band && /^\d/.test(band)) {
        // FB col order: Men(1), Women(2) — opposite of IG
        result.age_gender.push({
          band:      band,
          men_pct:   Math.round((parseFloat((parts[1]||"").replace(/"/g,"")) || 0) * 100) / 10000,
          women_pct: Math.round((parseFloat((parts[2]||"").replace(/"/g,"")) || 0) * 100) / 10000
        });
      }
    }
    i++;
  }
  return result;
}

// TikTok Audience CSV (UTF-8 BOM): Date, New followers, Total followers, Reached, Engaged.
function parseTTAudienceCSV(file) {
  var raw = readFile(file);
  var lines = raw.replace(/\r/g,"").replace(/﻿/g,"").split("\n")
                 .filter(function(l){ return l.trim(); });
  if (lines.length < 2) return null;

  var headers    = lines[0].split(",").map(function(h){ return h.trim().toLowerCase(); });
  var dateIdx    = headers.indexOf("date");
  var newFlwIdx  = headers.indexOf("new followers");
  var totFlwIdx  = headers.indexOf("total followers");
  var reachedIdx = headers.indexOf("reached audience");
  var engIdx     = headers.indexOf("engaged audience");
  if (dateIdx === -1) return null;

  var daily = [];
  for (var i = 1; i < lines.length; i++) {
    var parts = lines[i].split(",").map(function(p){ return p.trim(); });
    if (!parts[dateIdx]) continue;
    daily.push({
      date:            parts[dateIdx].replace(/\//g,"-"),
      new_followers:   parseInt(parts[newFlwIdx])  || 0,
      total_followers: parseInt(parts[totFlwIdx])  || 0,
      reached:         parseInt(parts[reachedIdx]) || 0,
      engaged:         parseInt(parts[engIdx])     || 0
    });
  }
  if (!daily.length) return null;

  var last = daily[daily.length - 1];
  return {
    snapshot: {
      date:            last.date,
      total_followers: last.total_followers,
      new_followers:   last.new_followers,
      reached:         last.reached,
      engaged:         last.engaged
    },
    daily: daily
  };
}

// ─── Sheet row helpers ─────────────────────────────────────────────────────────

// Returns the row number for weekISO in col A (starting at firstDataRow), or next append row
function findOrAppendWeekRow(ws, weekISO, firstDataRow) {
  var lastRow = ws.getLastRow();
  if (lastRow >= firstDataRow) {
    var colA = ws.getRange(firstDataRow, 1, lastRow - firstDataRow + 1, 1).getValues();
    for (var i = 0; i < colA.length; i++) {
      if (colA[i][0] === weekISO) return i + firstDataRow;
    }
    return lastRow + 1;
  }
  return firstDataRow;
}

// Read IG Total Followers from Manual Data tab for a weekISO
function readManualFollowers(ss, weekISO) {
  var ws = ss.getSheetByName("Manual Data");
  if (!ws) return 0;
  var data = ws.getRange("A2:C38").getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === weekISO) return parseInt(data[i][2]) || 0;
  }
  return 0;
}

// Read TikTok Total Followers for a weekISO from the TikTok tab (col C)
function readTikTokTotalFromSheet(ss, weekISO) {
  var ws = ss.getSheetByName("TikTok");
  if (!ws || ws.getLastRow() < 3) return 0;
  var rows = ws.getRange(3, 1, ws.getLastRow()-2, 3).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] === weekISO) return rows[i][2] || 0;
  }
  return 0;
}

// ─── Write to platform tabs ────────────────────────────────────────────────────

function writeInstagram(ss, weekISO, data) {
  var ws = ss.getSheetByName("Instagram");
  if (!ws) { log("❌ Instagram sheet not found"); return; }

  var ig = data.ig;
  var igFollowers = readManualFollowers(ss, weekISO);
  var engRate = ig.reach > 0 ? ig.interactions / ig.reach : 0;
  var targetRow = findOrAppendWeekRow(ws, weekISO, 3);

  ws.getRange(targetRow, 1, 1, 10).setValues([[
    weekISO, weekISOtoLabel(weekISO), igFollowers,
    ig.reach, ig.views, ig.follows, ig.visits,
    ig.interactions, ig.link_clicks, engRate
  ]]);
  ws.getRange(targetRow, 10).setNumberFormat("0.00%"); // col J = Eng Rate
  log("✅ Instagram " + weekISO + " row " + targetRow);
}

function writeFacebook(ss, weekISO, data) {
  var ws = ss.getSheetByName("Facebook");
  if (!ws) { log("❌ Facebook sheet not found"); return; }

  var fb = data.fb;
  var targetRow = findOrAppendWeekRow(ws, weekISO, 3);

  ws.getRange(targetRow, 1, 1, 8).setValues([[
    weekISO, weekISOtoLabel(weekISO),
    fb.views, fb.visits, fb.viewers, fb.follows, fb.interactions, fb.link_clicks
  ]]);
  log("✅ Facebook " + weekISO + " row " + targetRow);
}

function writeTikTok(ss, weekISO, data) {
  var ws = ss.getSheetByName("TikTok");
  if (!ws) { log("❌ TikTok sheet not found"); return; }

  var tt = data.tt;
  var targetRow = findOrAppendWeekRow(ws, weekISO, 3);

  ws.getRange(targetRow, 1, 1, 9).setValues([[
    weekISO, weekISOtoLabel(weekISO),
    tt.totalFollowers,
    tt.videoViews, tt.reached, tt.newFollowers,
    tt.likes, tt.comments, tt.shares
  ]]);
  log("✅ TikTok " + weekISO + " row " + targetRow + " totalFollowers=" + tt.totalFollowers);
}

function writeAnalytics(ss, weekISO, data) {
  var ws = ss.getSheetByName("Analytics");
  if (!ws) { log("❌ Analytics sheet not found"); return; }

  var ga = data.ga;
  var targetRow = findOrAppendWeekRow(ws, weekISO, 3);

  ws.getRange(targetRow, 1, 1, 2).setValues([[weekISO, weekISOtoLabel(weekISO)]]);
  if (!ga) {
    ws.getRange(targetRow, 3).setValue("—");
    ws.getRange(targetRow, 4).setValue("—");
    ws.getRange(targetRow, 5).setValue("—"); // col E = Eng Rate
    ws.getRange(targetRow, 6).setValue("—");
    log("⚠️ Analytics " + weekISO + " — GA missing");
  } else {
    ws.getRange(targetRow, 3).setValue(ga.sessions);
    ws.getRange(targetRow, 4).setValue(ga.engaged_sessions);
    ws.getRange(targetRow, 5).setValue(ga.eng_rate); // col E = Eng Rate
    ws.getRange(targetRow, 5).setNumberFormat("0.00%");
    ws.getRange(targetRow, 6).setValue(ga.revenue);
    log("✅ Analytics " + weekISO + " row " + targetRow);
  }
}

// Audience tab — overwrites data zones completely each run (no history, no append).
// igAud / fbAud: { age_gender[], top_countries[], top_cities[] }
// ttAud: { snapshot: {date,total_followers,new_followers,reached,engaged}, daily[] }
function writeAudienceTab(ss, igAud, fbAud, ttAud) {
  var ws = ss.getSheetByName("Audience");
  if (!ws) { log("❌ Audience sheet not found — skipping audience write"); return; }

  // Clear all data zones (headers in the sheet stay untouched)
  ws.getRange(7, 1, 10, 3).clearContent();  // IG age rows 7-16, cols A-C
  ws.getRange(7, 5, 10, 3).clearContent();  // FB age rows 7-16, cols E-G
  ws.getRange(20, 1, 15, 2).clearContent(); // IG countries rows 20-34, cols A-B
  ws.getRange(20, 5, 15, 2).clearContent(); // FB countries rows 20-34, cols E-F
  ws.getRange(38, 1, 15, 2).clearContent(); // IG cities rows 38-52, cols A-B
  ws.getRange(38, 5, 15, 2).clearContent(); // FB cities rows 38-52, cols E-F
  ws.getRange(59, 2, 5, 1).clearContent();  // TT snapshot rows 59-63, col B
  ws.getRange(66, 1, 10, 5).clearContent(); // TT daily rows 66-75, cols A-E

  // IG Age & Gender: col A=age band, B=Women%, C=Men%
  if (igAud && igAud.age_gender.length) {
    var d = igAud.age_gender.map(function(r){ return [r.band, r.women_pct, r.men_pct]; });
    ws.getRange(7, 1, d.length, 3).setValues(d);
    ws.getRange(7, 2, d.length, 2).setNumberFormat("0.0%"); // B-C = pct cols
  }

  // FB Age & Gender: col E=age band, F=Men%, G=Women% (Men first — spec requirement)
  if (fbAud && fbAud.age_gender.length) {
    var d = fbAud.age_gender.map(function(r){ return [r.band, r.men_pct, r.women_pct]; });
    ws.getRange(7, 5, d.length, 3).setValues(d);
    ws.getRange(7, 6, d.length, 2).setNumberFormat("0.0%"); // F-G = pct cols
  }

  // IG Top Countries: col A=name, B=%
  if (igAud && igAud.top_countries.length) {
    var d = igAud.top_countries.map(function(r){ return [r.name, r.pct]; });
    ws.getRange(20, 1, d.length, 2).setValues(d);
    ws.getRange(20, 2, d.length, 1).setNumberFormat("0.0%");
  }

  // FB Top Countries: col E=name, F=%
  if (fbAud && fbAud.top_countries.length) {
    var d = fbAud.top_countries.map(function(r){ return [r.name, r.pct]; });
    ws.getRange(20, 5, d.length, 2).setValues(d);
    ws.getRange(20, 6, d.length, 1).setNumberFormat("0.0%");
  }

  // IG Top Cities: col A=name, B=%
  if (igAud && igAud.top_cities.length) {
    var d = igAud.top_cities.map(function(r){ return [r.name, r.pct]; });
    ws.getRange(38, 1, d.length, 2).setValues(d);
    ws.getRange(38, 2, d.length, 1).setNumberFormat("0.0%");
  }

  // FB Top Cities: col E=name, F=%
  if (fbAud && fbAud.top_cities.length) {
    var d = fbAud.top_cities.map(function(r){ return [r.name, r.pct]; });
    ws.getRange(38, 5, d.length, 2).setValues(d);
    ws.getRange(38, 6, d.length, 1).setNumberFormat("0.0%");
  }

  // TikTok Snapshot (rows 59-63, col B)
  if (ttAud && ttAud.snapshot) {
    var s = ttAud.snapshot;
    ws.getRange(59, 2).setValue(s.date);
    ws.getRange(60, 2).setValue(s.total_followers);
    ws.getRange(61, 2).setValue(s.new_followers);
    ws.getRange(62, 2).setValue(s.reached);
    ws.getRange(63, 2).setValue(s.engaged);
  }

  // TikTok Daily Table (rows 66-75, cols A-E): Date|NewFlw|TotalFlw|Reached|Engaged
  if (ttAud && ttAud.daily && ttAud.daily.length) {
    var rows = ttAud.daily.slice(-10).map(function(r){
      return [r.date, r.new_followers, r.total_followers, r.reached, r.engaged];
    });
    ws.getRange(66, 1, rows.length, 5).setValues(rows);
  }

  log("✅ Audience tab updated (IG:" + (igAud ? igAud.age_gender.length + " bands" : "none") +
      " FB:" + (fbAud ? fbAud.age_gender.length + " bands" : "none") +
      " TT:" + (ttAud ? ttAud.daily.length + " daily rows" : "none") + ")");
}

// ─── Write to Weekly Log ───────────────────────────────────────────────────────

function writeWeeklyLog(ss, weekISO, data) {
  var ws = ss.getSheetByName("Weekly Log");
  if (!ws) { log("❌ Weekly Log sheet not found"); return; }

  // Find pre-populated row
  var colA = ws.getRange("A2:A38").getValues();
  var targetRow = -1;
  for (var i = 0; i < colA.length; i++) {
    if (colA[i][0] === weekISO) { targetRow = i + 2; break; }
  }
  if (targetRow === -1) { log("⚠️ " + weekISO + " not found in Weekly Log"); return; }

  var ig = data.ig, fb = data.fb, tt = data.tt, ga = data.ga;
  var igFollowers = data.ig.followers || readManualFollowers(ss, weekISO);
  var ttTotalFlw  = data.tt.totalFollowers || 0;
  var engRate        = ig.reach > 0 ? ig.interactions / ig.reach : 0;
  var gaS = ga ? ga.sessions          : "—";
  var gaE = ga ? ga.engaged_sessions  : "—";
  var gaR = ga ? ga.revenue           : "—";

  // Cols C–Y = columns 3–25 (23 values)
  // C  D       E       F       G               H              I        J
  // igReach igViews igFollows igVisits igInteractions igLinkClicks igEng% igFollowers
  // K       L       M        N        O               P
  // fbViews fbVisits fbViewers fbFollows fbInteractions fbLinkClicks
  // Q       R        S          T          U       V         W
  // ttViews ttReached ttNewFlw ttTotalFlw ttLikes ttComments ttShares
  // X   Y
  // gaS gaE
  ws.getRange(targetRow, 3, 1, 23).setValues([[
    ig.reach, ig.views, ig.follows, ig.visits, ig.interactions, ig.link_clicks,
    engRate, igFollowers,
    fb.views, fb.visits, fb.viewers, fb.follows, fb.interactions, fb.link_clicks,
    tt.videoViews, tt.reached, tt.newFollowers, ttTotalFlw,
    tt.likes, tt.comments, tt.shares,
    gaS, gaE
  ]]);
  ws.getRange(targetRow, 26).setValue(ga ? ga.eng_rate : "—"); // col Z = GA Eng%
  ws.getRange(targetRow, 27).setValue(gaR); // col AA = GA Revenue
  log("✅ Weekly Log " + weekISO + " row " + targetRow);
}

// ─── Missing file check (Rule 2) ───────────────────────────────────────────────

function checkMissingFiles(foundFiles) {
  var report = {};
  Object.keys(foundFiles).forEach(function(weekISO) {
    var missing = [];
    EXPECTED_KEYS.forEach(function(key) {
      if (!foundFiles[weekISO][key]) missing.push(key);
    });
    if (missing.length) {
      missing.forEach(function(k){
        log("⚠️ Missing: " + k + " (" + weekISO + ") — document not available");
      });
      report[weekISO] = missing;
    }
  });
  return report;
}

// ─── Process all CSV files ─────────────────────────────────────────────────────

function processAllFiles(cutoff) {
  var folder     = DriveApp.getFolderById(FOLDER_ID);
  var procFolder = getOrCreateSubfolder(folder, PROCESSED_NAME);
  var unidentFolder = getOrCreateSubfolder(procFolder, "unidentifiable");

  var weekData     = {}; // weekISO → { ig, fb, tt, ga }
  var foundFiles   = {}; // weekISO → { key: true }
  var audienceData = {}; // weekISO → { ig, fb, tt } parsed audience objects
  var unidentifiable = [];

  // Collect unprocessed CSVs
  var files = [];
  var iter = folder.getFilesByType(MimeType.CSV);
  while (iter.hasNext()) {
    var f = iter.next();
    if (!isInsideFolder(f, procFolder)) files.push(f);
  }
  log("Found " + files.length + " unprocessed CSV(s)");
  files.sort(function(a,b){ return fileSortPriority(a)-fileSortPriority(b); });

  files.forEach(function(file) {
    var fname = file.getName();
    var fl    = fname.toLowerCase().replace(/[^a-z0-9]/g," ").replace(/\s+/g," ").trim();
    var route = classifyFile(fl);
    if (route === "unknown") route = classifyFileByContent(file); // content fallback
    log("→ " + fname + " [" + route + "]");

    try {
      if (route === "unknown") {
        log("⚠️ UNKNOWN file type — cannot classify by name or content: " + fname);
        file.moveTo(procFolder);
        return;
      }

      var weekISO = detectWeekFromContent(file, route);
      if (!weekISO) {
        log("❌ UNIDENTIFIABLE — cannot determine week from content: " + fname);
        unidentifiable.push(fname);
        file.moveTo(unidentFolder);
        return;
      }

      // Skip weeks not yet closed
      var wk = weekISOtoDates(weekISO);
      if (wk && new Date(wk.end + "T23:59:59Z") > cutoff) {
        log("⏭ " + fname + " belongs to " + weekISO + " (not yet closed) — leaving in inbox");
        return;
      }

      // Init accumulators
      if (!weekData[weekISO]) {
        weekData[weekISO] = {
          ig: {reach:0,views:0,follows:0,visits:0,interactions:0,link_clicks:0,followers:0},
          fb: {views:0,visits:0,viewers:0,follows:0,interactions:0,link_clicks:0},
          tt: {videoViews:0,reached:0,profileViews:0,newFollowers:0,lostFollowers:0,
               netGrowth:0,likes:0,comments:0,shares:0,websiteClicks:0,
               totalFollowers:0,topVideos:[]},
          ga: null
        };
        foundFiles[weekISO] = {};
      }

      // Parse & accumulate
      if (route === "ig_metric") {
        var r = parseMetaCSV(file, "Instagram", weekISO);
        if (r) {
          weekData[weekISO].ig[r.metricKey] = (weekData[weekISO].ig[r.metricKey]||0) + r.sum;
          foundFiles[weekISO]["ig_" + r.metricKey] = true;
        }

      } else if (route === "fb_metric") {
        var r = parseMetaCSV(file, "Facebook", weekISO);
        if (r) {
          weekData[weekISO].fb[r.metricKey] = (weekData[weekISO].fb[r.metricKey]||0) + r.sum;
          foundFiles[weekISO]["fb_" + r.metricKey] = true;
        }

      } else if (route === "tt_overview") {
        var r = parseTikTokOverview(file, weekISO);
        if (r) {
          var tt = weekData[weekISO].tt;
          tt.videoViews    += r.videoViews;
          tt.reached       += r.reached;
          tt.profileViews  += r.profileViews  || 0;
          tt.newFollowers  += r.newFollowers;
          tt.lostFollowers += r.lostFollowers  || 0;
          tt.netGrowth     += r.netGrowth;
          tt.likes         += r.likes;
          tt.comments      += r.comments;
          tt.shares        += r.shares;
          tt.websiteClicks += r.websiteClicks  || 0;
          foundFiles[weekISO]["tt_overview"] = true;
        }

      } else if (route === "tt_videos") {
        var vids = parseTikTokVideos(file, weekISO);
        if (vids.length) {
          weekData[weekISO].tt.topVideos = weekData[weekISO].tt.topVideos.concat(vids);
        }
        foundFiles[weekISO]["tt_video"] = true;

      } else if (route === "tt_audience") {
        var ttAud = parseTTAudienceCSV(file);
        if (ttAud) {
          if (!audienceData[weekISO]) audienceData[weekISO] = {};
          audienceData[weekISO].tt = ttAud;
        }
        foundFiles[weekISO]["tt_audience"] = true;

      } else if (route === "ga") {
        var r = parseGoogleAnalyticsCSV(file);
        if (r) {
          weekData[weekISO].ga = r;
          foundFiles[weekISO]["ga"] = true;
        }

      } else if (route === "ig_audience") {
        var igAud = parseIGAudienceCSV(file);
        if (igAud) {
          if (!audienceData[weekISO]) audienceData[weekISO] = {};
          audienceData[weekISO].ig = igAud;
        }
        foundFiles[weekISO]["ig_audience"] = true;

      } else if (route === "fb_audience") {
        var fbAud = parseFBAudienceCSV(file);
        if (fbAud) {
          if (!audienceData[weekISO]) audienceData[weekISO] = {};
          audienceData[weekISO].fb = fbAud;
        }
        foundFiles[weekISO]["fb_audience"] = true;
      }

      // Move to /Processed/W##/
      getOrCreateSubfolder(procFolder, weekISO);
      file.moveTo(getOrCreateSubfolder(procFolder, weekISO));

    } catch(e) {
      log("❌ Error processing " + fname + ": " + e.message + "\n" + (e.stack||""));
    }
  });

  return { weekData: weekData, foundFiles: foundFiles, audienceData: audienceData, unidentifiable: unidentifiable };
}

// ─── Main entry point ──────────────────────────────────────────────────────────

function processAllCSVs() {
  var t0 = new Date();
  try {
    var cutoff = lastClosedSaturday();
    log("Cutoff (last closed Saturday): " + Utilities.formatDate(cutoff,"UTC","yyyy-MM-dd"));

    var result = processAllFiles(cutoff);
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // ── Pre-compute ig_followers and tt_totalFollowers ────────────────────────
    // ig_followers comes from Manual Data sheet; tt_totalFollowers from TT Audience
    // snapshot (actual count) or cumulative netGrowth fallback.
    var weekISOsSorted = Object.keys(result.weekData).sort();

    // Find last TT total BEFORE the earliest week we're processing (for cumulative fallback)
    var ttRunning = 0;
    if (weekISOsSorted.length) {
      var firstISO = weekISOsSorted[0];
      var ttSheet = ss.getSheetByName("TikTok");
      if (ttSheet && ttSheet.getLastRow() >= 3) {
        var ttData = ttSheet.getRange(3, 1, ttSheet.getLastRow()-2, 3).getValues();
        for (var ri = ttData.length-1; ri >= 0; ri--) {
          var rowISO = ttData[ri][0];
          if (rowISO && String(rowISO) < firstISO && typeof ttData[ri][2]==="number" && ttData[ri][2]>0) {
            ttRunning = ttData[ri][2]; break;
          }
        }
      }
    }

    weekISOsSorted.forEach(function(weekISO) {
      result.weekData[weekISO].ig.followers = readManualFollowers(ss, weekISO);
      // Use TT Audience snapshot (actual total) if available, else cumulative
      var ttAud = result.audienceData[weekISO] && result.audienceData[weekISO].tt;
      if (ttAud && ttAud.snapshot && ttAud.snapshot.total_followers > 0) {
        ttRunning = ttAud.snapshot.total_followers;
      } else {
        ttRunning += result.weekData[weekISO].tt.netGrowth || 0;
      }
      result.weekData[weekISO].tt.totalFollowers = ttRunning;
    });

    // ── Write to Google Sheets ────────────────────────────────────────────────
    Object.keys(result.weekData).sort().forEach(function(weekISO) {
      var data = result.weekData[weekISO];
      writeInstagram(ss, weekISO, data);
      writeFacebook(ss, weekISO, data);
      writeTikTok(ss, weekISO, data);
      writeAnalytics(ss, weekISO, data);
      writeWeeklyLog(ss, weekISO, data);
    });

    // Audience tab: use most-recent submitted data for each platform
    var igLatest = null, fbLatest = null, ttLatest = null;
    Object.keys(result.audienceData).sort().reverse().forEach(function(weekISO) {
      var aud = result.audienceData[weekISO];
      if (!igLatest && aud.ig) igLatest = aud.ig;
      if (!fbLatest && aud.fb) fbLatest = aud.fb;
      if (!ttLatest && aud.tt) ttLatest = aud.tt;
    });
    if (igLatest || fbLatest || ttLatest) {
      writeAudienceTab(ss, igLatest, fbLatest, ttLatest);
    }

    var missingReport = checkMissingFiles(result.foundFiles);
    var jsonStr       = buildAndSaveJSON(result.weekData, result.audienceData);
    sendWeeklyEmail(jsonStr, missingReport, result.unidentifiable);

    var secs = Math.round((new Date()-t0)/1000);
    ss.toast("Done in " + secs + "s", "AKWL v7", 8);
    log("✅ processAllCSVs complete in " + secs + "s");
  } catch(err) {
    log("❌ FATAL: " + err.message + "\n" + (err.stack||""));
    try { GmailApp.sendEmail(AKWL_EMAIL, "⚠️ AKWL Tracker v7 error", err.message+"\n\n"+(err.stack||"")); } catch(e){}
    throw err;
  }
}

// ─── testFiles (preview only, no writes) ──────────────────────────────────────

function testFiles() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var procFolder = getOrCreateSubfolder(folder, PROCESSED_NAME);
  var files = [];
  var iter = folder.getFilesByType(MimeType.CSV);
  while (iter.hasNext()) {
    var f = iter.next();
    if (!isInsideFolder(f, procFolder)) files.push(f);
  }
  if (!files.length) { log("✅ No unprocessed files in inbox."); return; }
  files.forEach(function(file, idx) {
    var fname = file.getName();
    var fl    = fname.toLowerCase().replace(/[^a-z0-9]/g," ").replace(/\s+/g," ").trim();
    var route = classifyFile(fl);
    if (route === "unknown") route = classifyFileByContent(file);
    var week  = (route !== "unknown") ? (detectWeekFromContent(file, route) || "? (no date in content)") : "—";
    log((idx+1) + ". [" + route.toUpperCase() + "] [" + week + "] " + fname);
  });
  SpreadsheetApp.openById(SPREADSHEET_ID).toast(files.length + " file(s) found — see Apps Script Logs.", "Test Files", 10);
}

// ─── clearSheetData (wipe data rows, preserve col A week ISOs) ────────────────

function clearSheetData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ui = SpreadsheetApp.getUi();
  var ans = ui.alert(
    "Clear all sheet data?",
    "Clears data rows from Instagram, Facebook, TikTok, Analytics, Weekly Log, and Audience tabs.\n\n" +
    "Week ISOs in col A are preserved. This cannot be undone.\n\nContinue?",
    ui.ButtonSet.YES_NO
  );
  if (ans !== ui.Button.YES) { log("clearSheetData cancelled"); return; }

  // Platform tabs: col A NOT pre-populated — script appends rows, so wipe everything.
  // Weekly Log: col A = weekISO, col B = label — both pre-populated W17-W53. Wipe from C.
  var tabs = [
    ["Instagram",  3, 1, 10],  // A–J (script writes all 10 cols)
    ["Facebook",   3, 1,  8],  // A–H
    ["TikTok",     3, 1,  9],  // A–I
    ["Analytics",  3, 1,  6],  // A–F
    ["Weekly Log", 2, 3, 25]   // C–AA (cols A+B pre-populated with W17-W53 + labels — keep)
  ];

  tabs.forEach(function(t) {
    var ws = ss.getSheetByName(t[0]);
    if (!ws) { log("⚠️ " + t[0] + " not found — skipped"); return; }
    // Wipe from firstDataRow through at least row 39 (covers W17-W53 = 37 rows)
    var lastRow = Math.max(ws.getLastRow(), t[1] + 36);
    ws.getRange(t[1], t[2], lastRow - t[1] + 1, t[3]).clearContent();
    log("✅ Cleared " + t[0]);
  });

  // Audience tab: wipe all data zones (same ranges as writeAudienceTab clears)
  var aud = ss.getSheetByName("Audience");
  if (aud) {
    [[7,1,10,3],[7,5,10,3],[20,1,15,2],[20,5,15,2],[38,1,15,2],[38,5,15,2],
     [59,2,5,1],[66,1,10,5]].forEach(function(r){
      aud.getRange(r[0],r[1],r[2],r[3]).clearContent();
    });
    log("✅ Cleared Audience");
  }

  ss.toast("✅ Sheet data cleared — ready for fresh run", "AKWL v7", 6);
  log("✅ clearSheetData complete");
}

// ─── clearAll (archive inbox only — NEVER touches sheet data rows) ─────────────

function clearAll() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var archiveName = "Archive_" + Utilities.formatDate(new Date(),"America/Anchorage","yyyyMMdd_HHmm");
  var archiveFolder = getOrCreateSubfolder(folder, archiveName);
  var procFolder    = getOrCreateSubfolder(folder, PROCESSED_NAME);
  var count = 0;
  var iter = folder.getFilesByType(MimeType.CSV);
  while (iter.hasNext()) {
    var f = iter.next();
    if (!isInsideFolder(f, procFolder)) { f.moveTo(archiveFolder); count++; }
  }
  log("Archived " + count + " inbox file(s) to " + archiveName);
  SpreadsheetApp.openById(SPREADSHEET_ID).toast("Archived " + count + " file(s).", "AKWL v7", 8);
}

// Read audience data from the Audience tab for JSON output
function readAudienceTab(ss) {
  var ws = ss.getSheetByName("Audience");
  if (!ws) return { ig: {}, fb: {}, tt: {} };

  function rangeVals(r1, c1, rows, cols) {
    return ws.getRange(r1, c1, rows, cols).getValues();
  }

  function readAgeGender(startRow, colOffset) {
    // colOffset 0=IG(A-C), 4=FB(E-G)
    // IG: colA=band B=Women C=Men; FB: colE=band F=Men G=Women
    var rows = rangeVals(startRow, 1 + colOffset, 10, 3);
    var result = {};
    rows.forEach(function(r) {
      var band = r[0];
      if (!band || band === "") return;
      if (colOffset === 0) { // IG: col B=Women, C=Men
        result[band] = { women: r[1] || 0, men: r[2] || 0 };
      } else {               // FB: col F=Men, G=Women
        result[band] = { men: r[1] || 0, women: r[2] || 0 };
      }
    });
    return result;
  }

  function readNamePct(startRow, col, rows) {
    var vals = rangeVals(startRow, col, rows, 2);
    return vals.filter(function(r){ return r[0]; })
               .map(function(r){ return { name: r[0], pct: r[1] || 0 }; });
  }

  function target2544pct(ageGender) {
    var total = 0;
    ["25-34","35-44"].forEach(function(b) {
      if (ageGender[b]) total += (ageGender[b].women||0) + (ageGender[b].men||0);
    });
    return Math.round(total * 10000) / 10000;
  }

  var igAge = readAgeGender(7, 0);
  var fbAge = readAgeGender(7, 4);

  // TikTok snapshot (rows 59-63, col B)
  var ttSnap = rangeVals(59, 2, 5, 1);
  var ttSnapshot = {
    date:            ttSnap[0][0] || "",
    total_followers: ttSnap[1][0] || 0,
    new_followers:   ttSnap[2][0] || 0,
    reached:         ttSnap[3][0] || 0,
    engaged:         ttSnap[4][0] || 0
  };

  // TikTok daily (rows 66-75, cols A-E)
  var ttDailyVals = rangeVals(66, 1, 10, 5);
  var ttDaily = ttDailyVals.filter(function(r){ return r[0]; })
    .map(function(r){ return {
      date: r[0], new_followers: r[1]||0,
      total_followers: r[2]||0, reached: r[3]||0, engaged: r[4]||0
    }; });

  return {
    ig: {
      age_gender:      igAge,
      target_25_44_pct: target2544pct(igAge),
      top_countries:   readNamePct(20, 1, 15),
      top_cities:      readNamePct(38, 1, 15)
    },
    fb: {
      age_gender:      fbAge,
      target_25_44_pct: target2544pct(fbAge),
      top_countries:   readNamePct(20, 5, 15),
      top_cities:      readNamePct(38, 5, 15)
    },
    tt: {
      snapshot: ttSnapshot,
      daily:    ttDaily
    }
  };
}

// ─── Drive JSON storage (cumulative history) ──────────────────────────────────
var JSON_FILENAME = "AKWL_data.json";

function readJSONFromDrive() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFilesByName(JSON_FILENAME);
  if (!files.hasNext()) { log("ℹ️ No existing " + JSON_FILENAME + " in Drive — starting fresh"); return null; }
  try {
    var obj = JSON.parse(files.next().getBlob().getDataAsString("UTF-8"));
    log("✅ Loaded existing JSON from Drive (" + (obj.weeks||[]).length + " weeks)");
    return obj;
  } catch(e) { log("⚠️ Could not parse existing JSON: " + e.message); return null; }
}

function writeJSONToDrive(jsonStr) {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFilesByName(JSON_FILENAME);
  if (files.hasNext()) {
    files.next().setContent(jsonStr);
  } else {
    folder.createFile(JSON_FILENAME, jsonStr, MimeType.PLAIN_TEXT);
  }
  log("✅ " + JSON_FILENAME + " saved to Drive");
}

// ─── buildAndSaveJSON ─────────────────────────────────────────────────────────
// Produces flat JSON matching akwl-dashboard-v6.html spec.
// weekData  = { weekISO: { ig, fb, tt, ga } } from processAllFiles (this run)
// audienceData = { weekISO: { ig, fb, tt } }  from processAllFiles (this run)

function buildAndSaveJSON(weekData, audienceData) {
  var cutoff = lastClosedSaturday();

  // Load existing flat JSON from Drive
  var existing = readJSONFromDrive();
  var existingWeeks = {};
  if (existing && existing.weeks) {
    existing.weeks.forEach(function(w) {
      var key = w.iso || w.week_iso; // support old nested format keys too
      if (key) existingWeeks[key] = w;
    });
  }

  var weeks = [];
  var newCount = 0, updatedCount = 0;

  WEEK_CALENDAR.forEach(function(wk) {
    if (new Date(wk.end + "T23:59:59Z") > cutoff) return;
    var weekISO = wk.iso;
    var wd = weekData && weekData[weekISO];

    if (wd) {
      // Build flat week object directly from weekData (no sheet re-reading)
      var wObj = buildWeekObjFlat(weekISO, wk, wd);
      if (existingWeeks[weekISO]) {
        weeks.push(wObj); updatedCount++;
      } else {
        weeks.push(wObj); newCount++;
      }
    } else if (existingWeeks[weekISO] && existingWeeks[weekISO].iso) {
      // Flat format entry — keep as-is
      weeks.push(existingWeeks[weekISO]);
    }
    // Old nested format or genuinely absent → skip until re-processed
  });

  weeks.sort(function(a,b){ return (a.iso||"").localeCompare(b.iso||""); });

  // Audience: use parsed CSV data if available, else keep from Drive JSON
  var audienceOut = buildAudienceForJSON(audienceData);
  if (!audienceOut && existing && existing.audience && existing.audience.ig) {
    audienceOut = existing.audience;
  }

  var lastWeek = weeks.length ? weeks[weeks.length-1].iso : "—";
  var output = {
    generated: new Date().toISOString(),
    goals:     { ig_followers:1500, ig_eng_rate:6, tt_followers:100 },
    weeks:     weeks,
    audience:  audienceOut || { ig:{}, fb:{}, tt:{} }
  };

  var jsonStr = JSON.stringify(output, null, 2);
  writeJSONToDrive(jsonStr);
  log("✅ JSON saved: " + weeks.length + " week(s) (" + newCount + " new, " + updatedCount + " updated), through " + lastWeek);
  return jsonStr;
}

// Build a single flat WeekObject matching the HTML dashboard spec
function buildWeekObjFlat(weekISO, wk, wd) {
  var ig = wd.ig || {}, fb = wd.fb || {}, tt = wd.tt || {}, ga = wd.ga;
  var igEng = (ig.reach||0) > 0 ? ig.interactions / ig.reach : 0;
  return {
    iso:   weekISO,
    label: weekISOtoLabel(weekISO),
    start: wk.start,
    end:   wk.end,

    ig_reach:     ig.reach        || 0,
    ig_views:     ig.views        || 0,
    ig_follows:   ig.follows      || 0,
    ig_visits:    ig.visits       || 0,
    ig_inter:     ig.interactions || 0,
    ig_clicks:    ig.link_clicks  || 0,
    ig_eng:       Math.round(igEng * 1000000) / 1000000,
    ig_followers: ig.followers    || 0,

    fb_views:   fb.views        || 0,
    fb_visits:  fb.visits       || 0,
    fb_viewers: fb.viewers      || 0,
    fb_follows: fb.follows      || 0,
    fb_inter:   fb.interactions || 0,
    fb_clicks:  fb.link_clicks  || 0,

    tt_views:          tt.videoViews    || 0,
    tt_reach:          tt.reached       || 0,
    tt_profile_views:  tt.profileViews  || 0,
    tt_new_flw:        tt.newFollowers  || 0,
    tt_lost_flw:       tt.lostFollowers || 0,
    tt_net_growth:     tt.netGrowth     || 0,
    tt_likes:          tt.likes         || 0,
    tt_comments:       tt.comments      || 0,
    tt_shares:         tt.shares        || 0,
    tt_website_clicks: tt.websiteClicks || 0,
    tt_followers:      tt.totalFollowers || 0,
    tt_top_videos:     (tt.topVideos || []).sort(function(a,b){ return b.views-a.views; }),

    ga_sessions:     ga ? (ga.sessions||0)          : null,
    ga_eng_sessions: ga ? (ga.engaged_sessions||0)  : null,
    ga_eng_rate:     ga ? (ga.eng_rate||0)           : null,
    ga_avg_eng_time: ga ? (ga.avg_eng_time||0)       : null,
    ga_key_events:   ga ? (ga.key_events||0)         : null,
    ga_revenue:      ga ? (ga.revenue||0)            : null,
    ga_missing:      !ga,
    ga_sources:      ga ? (ga.sources||[])           : []
  };
}

// Build audience object for JSON from parsed CSV audienceData
function buildAudienceForJSON(audienceData) {
  if (!audienceData || !Object.keys(audienceData).length) return null;
  var igAud = null, fbAud = null, ttAud = null;
  Object.keys(audienceData).sort().reverse().forEach(function(weekISO) {
    var a = audienceData[weekISO];
    if (!igAud && a.ig) igAud = a.ig;
    if (!fbAud && a.fb) fbAud = a.fb;
    if (!ttAud && a.tt) ttAud = a.tt;
  });
  if (!igAud && !fbAud && !ttAud) return null;

  function toAgeArray(rows, v1field, v2field) {
    return rows.map(function(r){ return { band:r.band, v1:r[v1field]||0, v2:r[v2field]||0 }; });
  }

  return {
    ig: igAud ? {
      gender_order:  ["Women","Men"],
      age_gender:    toAgeArray(igAud.age_gender, "women_pct", "men_pct"),
      top_countries: igAud.top_countries || [],
      top_cities:    igAud.top_cities    || []
    } : {},
    fb: fbAud ? {
      gender_order:  ["Men","Women"],
      age_gender:    toAgeArray(fbAud.age_gender, "men_pct", "women_pct"),
      top_countries: fbAud.top_countries || [],
      top_cities:    fbAud.top_cities    || []
    } : {},
    tt: ttAud ? {
      daily: (ttAud.daily||[]).map(function(d){ return {
        date:      d.date,
        new_flw:   d.new_followers   || 0,
        total_flw: d.total_followers || 0,
        reached:   d.reached         || 0,
        engaged:   d.engaged         || 0
      }; })
    } : {}
  };
}

// ─── Weekly email (Rule 3 — to info@alaskawildlights.com ONLY) ────────────────

function sendWeeklyEmail(jsonStr, missingReport, unidentifiable) {
  if (!jsonStr) { log("⚠️ sendWeeklyEmail: no JSON to send"); return; }
  var parsed;
  try { parsed = JSON.parse(jsonStr); } catch(e) { log("⚠️ Email parse error: "+e.message); return; }
  if (!parsed.weeks || !parsed.weeks.length) { log("⚠️ Email: no weeks in JSON"); return; }

  var wk = parsed.weeks[parsed.weeks.length-1];

  function n(v){ return (Math.round(v)||0).toLocaleString(); }
  function engPct(v) {
    var f = parseFloat(v)||0;
    // stored as decimal (0.053); convert to display %
    return (f < 1 ? (f*100) : f).toFixed(2) + "%";
  }

  var C = {
    bg:    "#f5f5f5",
    card:  "#ffffff",
    ig:    "#e1306c",
    fb:    "#1877f2",
    tt:    "#010101",
    ga:    "#4285f4",
    warn:  "#e8590c",
    muted: "#888888",
    text:  "#222222"
  };

  function card(color, emoji, title, rows) {
    var inner = rows.map(function(r){
      return '<tr>'
        + '<td style="padding:4px 12px 4px 0;color:'+C.muted+';font-size:13px;">'+r[0]+'</td>'
        + '<td style="padding:4px 0;font-size:13px;font-weight:600;color:'+C.text+';">'+r[1]+'</td>'
        + '</tr>';
    }).join("");
    return '<div style="background:'+C.card+';border-radius:10px;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">'
      + '<div style="background:'+color+';padding:10px 16px;">'
      + '<span style="color:#fff;font-size:15px;font-weight:700;">'+emoji+' '+title+'</span>'
      + '</div>'
      + '<div style="padding:12px 16px;">'
      + '<table style="border-collapse:collapse;width:100%;">'+inner+'</table>'
      + '</div></div>';
  }

  function missingCard(color, emoji, title) {
    return '<div style="background:'+C.card+';border-radius:10px;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">'
      + '<div style="background:'+color+';padding:10px 16px;">'
      + '<span style="color:#fff;font-size:15px;font-weight:700;">'+emoji+' '+title+'</span>'
      + '</div>'
      + '<div style="padding:12px 16px;color:'+C.warn+';font-size:13px;">⚠️ No file submitted this week</div>'
      + '</div>';
  }

  var igCard = (!wk.ig_reach && !wk.ig_followers)
    ? missingCard(C.ig, "📸", "Instagram")
    : card(C.ig, "📸", "Instagram", [
        ["Reach",           n(wk.ig_reach)],
        ["Views",           n(wk.ig_views)],
        ["New Follows",     n(wk.ig_follows)],
        ["Total Followers", n(wk.ig_followers)],
        ["Engagement Rate", engPct(wk.ig_eng)]
      ]);

  var fbCard = (!wk.fb_views && !wk.fb_viewers)
    ? missingCard(C.fb, "📘", "Facebook")
    : card(C.fb, "📘", "Facebook", [
        ["Views",   n(wk.fb_views)],
        ["Viewers", n(wk.fb_viewers)],
        ["Visits",  n(wk.fb_visits)],
        ["Follows", n(wk.fb_follows)]
      ]);

  var ttCard = (!wk.tt_views && !wk.tt_followers)
    ? missingCard(C.tt, "🎵", "TikTok")
    : card(C.tt, "🎵", "TikTok", [
        ["Video Views",     n(wk.tt_views)],
        ["Reached",         n(wk.tt_reach)],
        ["New Followers",   n(wk.tt_new_flw)],
        ["Total Followers", n(wk.tt_followers)]
      ]);

  var gaCard = wk.ga_missing
    ? missingCard(C.ga, "📊", "Google Analytics")
    : card(C.ga, "📊", "Google Analytics", [
        ["Sessions",         n(wk.ga_sessions)],
        ["Engaged Sessions", n(wk.ga_eng_sessions)],
        ["Revenue",          "$"+(wk.ga_revenue||0).toFixed(2)]
      ]);

  // Warnings block
  var hasMissing = Object.keys(missingReport||{}).length > 0 || (unidentifiable||[]).length > 0;
  var warnBlock = "";
  if (hasMissing) {
    var warnRows = [];
    Object.keys(missingReport||{}).forEach(function(w) {
      (missingReport[w]||[]).forEach(function(k) {
        warnRows.push('<li style="margin:4px 0;"><b>'+w+'</b> — missing: <code>'+k+'</code></li>');
      });
    });
    (unidentifiable||[]).forEach(function(fname) {
      warnRows.push('<li style="margin:4px 0;">❌ Unidentifiable file: <code>'+fname+'</code></li>');
    });
    warnBlock = '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px 18px;margin-bottom:20px;">'
      + '<p style="margin:0 0 8px;font-weight:700;color:#856404;">⚠️ Missing / Unidentifiable Files</p>'
      + '<ul style="margin:0;padding-left:20px;color:#333;font-size:13px;">'+warnRows.join("")+'</ul>'
      + '</div>';
  }

  // All-weeks summary table
  var tableRows = parsed.weeks.map(function(w) {
    var er    = w.ig_reach ? engPct(w.ig_eng) : "—";
    var reach = w.ig_reach ? n(w.ig_reach) : "—";
    var ttFol = w.tt_followers ? n(w.tt_followers) : "—";
    var rev   = (!w.ga_missing && w.ga_revenue) ? "$"+(w.ga_revenue||0).toFixed(0) : "—";
    var isLast = w.iso === wk.iso;
    var rowBg = isLast ? "#fff9e6" : "transparent";
    return '<tr style="background:'+rowBg+';">'
      + '<td style="padding:5px 10px;font-weight:'+(isLast?"700":"400")+';">'+w.label+'</td>'
      + '<td style="padding:5px 10px;text-align:right;">'+reach+'</td>'
      + '<td style="padding:5px 10px;text-align:right;">'+er+'</td>'
      + '<td style="padding:5px 10px;text-align:right;">'+ttFol+'</td>'
      + '<td style="padding:5px 10px;text-align:right;">'+rev+'</td>'
      + '</tr>';
  }).join("");

  var summaryTable = '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">'
    + '<thead><tr style="background:#eee;">'
    + '<th style="padding:6px 10px;text-align:left;">Week</th>'
    + '<th style="padding:6px 10px;text-align:right;">IG Reach</th>'
    + '<th style="padding:6px 10px;text-align:right;">IG Eng%</th>'
    + '<th style="padding:6px 10px;text-align:right;">TT Fol</th>'
    + '<th style="padding:6px 10px;text-align:right;">Revenue</th>'
    + '</tr></thead><tbody>'+tableRows+'</tbody></table>';

  var html = '<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:'+C.bg+';">'
    + '<div style="max-width:600px;margin:0 auto;padding:24px 16px;">'
    + '<div style="text-align:center;margin-bottom:24px;">'
    + '<h1 style="margin:0;font-size:22px;color:#333;">Alaska Wild Lights</h1>'
    + '<p style="margin:4px 0 0;color:'+C.muted+';font-size:14px;">Weekly Social Report · '+wk.label+' ('+wk.iso+')</p>'
    + '</div>'
    + warnBlock
    + igCard + fbCard + ttCard + gaCard
    + '<details style="margin-bottom:20px;">'
    + '<summary style="cursor:pointer;font-size:13px;color:'+C.muted+';padding:8px 0;">All weeks summary</summary>'
    + '<div style="margin-top:10px;overflow-x:auto;">'+summaryTable+'</div>'
    + '</details>'
    + '<p style="text-align:center;font-size:11px;color:'+C.muted+';margin-top:8px;">'
    + 'AKWL_data.json attached · <a href="https://alaskawildlights.com" style="color:'+C.muted+';">alaskawildlights.com</a>'
    + '</p></div></body></html>';

  var plainFallback = "AKWL Weekly Report — " + wk.label + "\n\n"
    + "Instagram — Reach: " + n(wk.ig_reach) + " | Eng: " + engPct(wk.ig_eng) + " | Followers: " + n(wk.ig_followers) + "\n"
    + "Facebook  — Views: " + n(wk.fb_views) + " | Follows: " + n(wk.fb_follows) + "\n"
    + "TikTok    — Views: " + n(wk.tt_views) + " | Followers: " + n(wk.tt_followers) + "\n"
    + "Analytics — Sessions: " + n(wk.ga_sessions) + " | Revenue: $" + (wk.ga_revenue||0).toFixed(2) + "\n\n"
    + "Full data in attached AKWL_data.json";

  var subject = "AKWL Weekly Report — " + wk.label;
  try {
    GmailApp.sendEmail(AKWL_EMAIL, subject, plainFallback, {
      htmlBody:    html,
      attachments: [Utilities.newBlob(jsonStr, "application/json", "AKWL_data.json")]
    });
    log("✅ Email sent to " + AKWL_EMAIL);
  } catch(e) {
    log("⚠️ Email send failed: " + e.message);
  }
}

// ─── Set Monthly MoM Formulas ─────────────────────────────────────────────────
// Fills every W## row in "Monthly MoM" with INDEX/MATCH formulas that pull
// from the platform tabs. Monthly Total rows get SUM / weighted-avg formulas.
// Safe to re-run any time — just overwrites the formula cells.

function setMonthlyMoMFormulas() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ws = ss.getSheetByName("Monthly MoM");
  if (!ws) { log("❌ Monthly MoM sheet not found"); return; }

  var lastRow = Math.max(ws.getLastRow(), 80);
  var colA = ws.getRange(3, 1, lastRow - 2, 1).getValues();

  // Column mapping (Monthly MoM → platform tabs):
  // C=IG Followers(IG-C)  D=IG Reach(IG-D)   E=IG Interactions(IG-H)  F=IG Eng%(IG-J)
  // G=TT Followers(TT-C)  H=TT Views(TT-D)   I=TT New Flw(TT-F)
  // J=FB Views(FB-C)      K=FB Interactions(FB-G)
  // L=GA Sessions(AN-C)   M=GA Revenue(AN-F)  N=WoW GA Rev (calculated)

  function wkFormula(w, tab, col) {
    return '=IFERROR(INDEX('+tab+'!'+col+':'+col+',MATCH("'+w+'",'+tab+'!A:A,0)),"")';
  }

  var prevWeekISO = null;
  var monthWeekRows = [];
  var count = 0;

  for (var i = 0; i < colA.length; i++) {
    var val = String(colA[i][0] || "").trim();
    var r = i + 3;

    if (/^W\d{2}$/i.test(val)) {
      var w = val.toUpperCase();
      monthWeekRows.push(r);

      ws.getRange(r,  3).setFormula(wkFormula(w, "Instagram", "C")); // IG Followers
      ws.getRange(r,  4).setFormula(wkFormula(w, "Instagram", "D")); // IG Reach
      ws.getRange(r,  5).setFormula(wkFormula(w, "Instagram", "H")); // IG Interactions
      ws.getRange(r,  6).setFormula(wkFormula(w, "Instagram", "J")); // IG Eng%
      ws.getRange(r,  7).setFormula(wkFormula(w, "TikTok",    "C")); // TT Followers
      ws.getRange(r,  8).setFormula(wkFormula(w, "TikTok",    "D")); // TT Video Views
      ws.getRange(r,  9).setFormula(wkFormula(w, "TikTok",    "F")); // TT New Flw
      ws.getRange(r, 10).setFormula(wkFormula(w, "Facebook",  "C")); // FB Views
      ws.getRange(r, 11).setFormula(wkFormula(w, "Facebook",  "G")); // FB Interactions
      ws.getRange(r, 12).setFormula(wkFormula(w, "Analytics", "C")); // GA Sessions
      ws.getRange(r, 13).setFormula(wkFormula(w, "Analytics", "F")); // GA Revenue

      // WoW GA Rev = (this week revenue / prev week revenue) - 1
      // Written to both col N (14) and col O (15) — template may have either
      var wowFormula = prevWeekISO
        ? '=IFERROR(IF(OR(M'+r+'="",M'+r+'="—",' +
          'IFERROR(INDEX(Analytics!F:F,MATCH("'+prevWeekISO+'",Analytics!A:A,0)),"")=""),"",'+
          '(INDEX(Analytics!F:F,MATCH("'+w+'",Analytics!A:A,0))/' +
          'INDEX(Analytics!F:F,MATCH("'+prevWeekISO+'",Analytics!A:A,0)))-1),"")'
        : null;
      ws.getRange(r, 14).setFormula(wowFormula || "");
      ws.getRange(r, 15).setFormula(wowFormula || "");

      prevWeekISO = w;
      count++;

    } else if (/total/i.test(val) && monthWeekRows.length > 0) {
      var f = monthWeekRows[0], l = monthWeekRows[monthWeekRows.length - 1];

      // Followers = latest non-empty (snapshot, not sum)
      ws.getRange(r,  3).setFormula('=IFERROR(LOOKUP(2,1/(C'+f+':C'+l+'<>""),C'+f+':C'+l+'),"")');
      ws.getRange(r,  4).setFormula('=IFERROR(SUM(D'+f+':D'+l+'),"")');
      ws.getRange(r,  5).setFormula('=IFERROR(SUM(E'+f+':E'+l+'),"")');
      // IG Eng% total = total interactions / total reach
      ws.getRange(r,  6).setFormula('=IFERROR(IF(SUM(D'+f+':D'+l+')=0,"",SUM(E'+f+':E'+l+')/SUM(D'+f+':D'+l+')),"")');
      ws.getRange(r,  7).setFormula('=IFERROR(LOOKUP(2,1/(G'+f+':G'+l+'<>""),G'+f+':G'+l+'),"")');
      ws.getRange(r,  8).setFormula('=IFERROR(SUM(H'+f+':H'+l+'),"")');
      ws.getRange(r,  9).setFormula('=IFERROR(SUM(I'+f+':I'+l+'),"")');
      ws.getRange(r, 10).setFormula('=IFERROR(SUM(J'+f+':J'+l+'),"")');
      ws.getRange(r, 11).setFormula('=IFERROR(SUM(K'+f+':K'+l+'),"")');
      ws.getRange(r, 12).setFormula('=IFERROR(SUMIF(L'+f+':L'+l+',"<>—"),"")');
      ws.getRange(r, 13).setFormula('=IFERROR(SUMIF(M'+f+':M'+l+',"<>—"),"")');
      ws.getRange(r, 14).setValue("");
      ws.getRange(r, 15).setValue("");

      monthWeekRows = [];

    } else if (/\d{4}/.test(val)) {
      // Month header row (e.g. "April 2026") — reset week tracking
      monthWeekRows = [];
    }
  }

  log("✅ Monthly MoM formulas set (" + count + " week rows)");
  ss.toast("✅ Monthly MoM formulas updated", "AKWL v7", 6);
}

// ─── Menu ──────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.openById(SPREADSHEET_ID).addMenu("AKWL Tracker", [
    {name:"▶ Run Now (process CSVs)",    functionName:"processAllCSVs"},
    {name:"🔄 Re-process all (fix data)",functionName:"reprocessAllProcessed"},
    {name:"📋 Build & save JSON",        functionName:"buildJSONOnly"},
    {name:"📊 Fix Dashboard formulas",   functionName:"setDashboardFormulas"},
    {name:"📅 Fix Monthly MoM formulas", functionName:"setMonthlyMoMFormulas"},
    {name:"🧹 Clear sheet data rows",    functionName:"clearSheetData"},
    {name:"🔍 Test file scan",           functionName:"testFiles"},
    {name:"🗃 Archive inbox files",      functionName:"clearAll"}
  ]);
}

function buildJSONOnly() {
  var jsonStr = buildAndSaveJSON({}, {});
  SpreadsheetApp.openById(SPREADSHEET_ID).toast(
    "JSON saved to Drive (" + jsonStr.length + " chars)", "AKWL v7", 8);
}

// Move all files from /Processed/W##/ back to inbox, then re-process everything.
// Use this to correct sheet data after a detection bug is fixed.
function reprocessAllProcessed() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var procFolder = getOrCreateSubfolder(folder, PROCESSED_NAME);
  var moved = 0;
  var wkFolders = procFolder.getFolders();
  while (wkFolders.hasNext()) {
    var wf = wkFolders.next();
    if (/^W\d{2}$/i.test(wf.getName())) {
      var csvIter = wf.getFilesByType(MimeType.CSV);
      while (csvIter.hasNext()) { csvIter.next().moveTo(folder); moved++; }
    }
  }
  log("↩ Restored " + moved + " file(s) to inbox — running processAllCSVs...");
  SpreadsheetApp.openById(SPREADSHEET_ID).toast(
    "Restored " + moved + " file(s) to inbox — processing now...", "AKWL v7", 6);
  processAllCSVs();
}

// ─── Set Dashboard Formulas ────────────────────────────────────────────────────
// Run once (or any time formulas break) to rebuild all Dashboard formula cells.

function setDashboardFormulas() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ws = ss.getSheetByName("Dashboard");
  if (!ws) { log("❌ Dashboard sheet not found"); return; }

  function igLatest(col)  { return '=IFERROR(INDEX(Instagram!'  +col+'3:'+col+'9999,COUNTA(Instagram!C3:C9999)),"")'; }
  function fbLatest(col)  { return '=IFERROR(INDEX(Facebook!'   +col+'3:'+col+'9999,COUNTA(Facebook!C3:C9999)),"")'; }
  function ttLatest(col)  { return '=IFERROR(INDEX(TikTok!'     +col+'3:'+col+'9999,COUNTA(TikTok!C3:C9999)),"")'; }
  function gaLatest(col)  { return '=IFERROR(INDEX(Analytics!'  +col+'3:'+col+'9999,COUNTA(Analytics!C3:C9999)),"")'; }

  function igPrev(col) { return '=IFERROR(IF(COUNTA(Instagram!C3:C9999)<2,"",INDEX(Instagram!'+col+'3:'+col+'9999,COUNTA(Instagram!C3:C9999)-1)),"")'; }
  function fbPrev(col) { return '=IFERROR(IF(COUNTA(Facebook!C3:C9999)<2,"",INDEX(Facebook!'  +col+'3:'+col+'9999,COUNTA(Facebook!C3:C9999)-1)),"")'; }
  function ttPrev(col) { return '=IFERROR(IF(COUNTA(TikTok!C3:C9999)<2,"",INDEX(TikTok!'     +col+'3:'+col+'9999,COUNTA(TikTok!C3:C9999)-1)),"")'; }
  function gaPrev(col) {
    return '=IFERROR(IF(COUNTA(Analytics!C3:C9999)<2,"",INDEX(Analytics!'+col+'3:'+col+'9999,COUNTA(Analytics!C3:C9999)-1)),"")';
  }

  function igSum(col) { return '=IFERROR(SUM(Instagram!'  +col+'3:'+col+'9999),0)'; }
  function fbSum(col) { return '=IFERROR(SUM(Facebook!'   +col+'3:'+col+'9999),0)'; }
  function ttSum(col) { return '=IFERROR(SUM(TikTok!'     +col+'3:'+col+'9999),0)'; }
  function gaSum(col) { return '=IFERROR(SUMIF(Analytics!'+col+'3:'+col+'9999,"<>—"),0)'; }
  function wow(r)     { return '=IFERROR(IF(OR(B'+r+'="",C'+r+'="",B'+r+'=0),"",C'+r+'/B'+r+'-1),"")'; }

  // [row, prevFormula, latestFormula, wowFormula, seasonFormula]
  var rows = [
    // INSTAGRAM (rows 7-13)
    [7,  igPrev("C"), igLatest("C"), wow(7),  igLatest("C")],   // Total Followers (cumulative)
    [8,  igPrev("D"), igLatest("D"), wow(8),  igSum("D")],       // Reach
    [9,  igPrev("E"), igLatest("E"), wow(9),  igSum("E")],       // Views
    [10, igPrev("F"), igLatest("F"), wow(10), igSum("F")],       // Follows
    [11, igPrev("H"), igLatest("H"), wow(11), igSum("H")],       // Interactions (col H, G=Profile Visits)
    [12, igPrev("I"), igLatest("I"), wow(12), igSum("I")],       // Link Clicks
    [13, igPrev("J"), igLatest("J"), wow(13), '=IFERROR(IF(SUM(Instagram!D3:D9999)=0,"",SUM(Instagram!H3:H9999)/SUM(Instagram!D3:D9999)),"")'], // Eng Rate (interactions/reach)

    // FACEBOOK (rows 16-21)
    [16, fbPrev("C"), fbLatest("C"), wow(16), fbSum("C")],  // Views
    [17, fbPrev("D"), fbLatest("D"), wow(17), fbSum("D")],  // Visits
    [18, fbPrev("E"), fbLatest("E"), wow(18), fbSum("E")],  // Viewers
    [19, fbPrev("F"), fbLatest("F"), wow(19), fbSum("F")],  // Follows
    [20, fbPrev("G"), fbLatest("G"), wow(20), fbSum("G")],  // Interactions
    [21, fbPrev("H"), fbLatest("H"), wow(21), fbSum("H")],  // Link Clicks

    // TIKTOK (rows 24-28)
    [24, ttPrev("C"), ttLatest("C"), wow(24), ttLatest("C")],  // Total Followers (cumulative)
    [25, ttPrev("D"), ttLatest("D"), wow(25), ttSum("D")],     // Video Views
    [26, ttPrev("E"), ttLatest("E"), wow(26), ttSum("E")],     // Reached
    [27, ttPrev("F"), ttLatest("F"), wow(27), ttSum("F")],     // New Followers
    [28, ttPrev("G"), ttLatest("G"), wow(28), ttSum("G")],     // Likes

    // ANALYTICS (rows 31-34) — may have "—" for missing weeks
    [31, gaPrev("C"), gaLatest("C"), wow(31), gaSum("C")],   // Sessions
    [32, gaPrev("D"), gaLatest("D"), wow(32), gaSum("D")],   // Engaged Sessions
    [33, gaPrev("E"), gaLatest("E"), wow(33), '=IFERROR(IF(SUMIF(Analytics!C3:C9999,"<>—")=0,"",SUMIF(Analytics!D3:D9999,"<>—")/SUMIF(Analytics!C3:C9999,"<>—")),"")'], // Eng Rate (engaged/sessions)
    [34, gaPrev("F"), gaLatest("F"), wow(34), gaSum("F")]    // Revenue
  ];

  rows.forEach(function(r) {
    ws.getRange(r[0], 2).setFormula(r[1]);
    ws.getRange(r[0], 3).setFormula(r[2]);
    if (r[3]) ws.getRange(r[0], 4).setFormula(r[3]);
    ws.getRange(r[0], 5).setFormula(r[4]);
  });

  // Eng Rate rows show as percentage
  [13, 33].forEach(function(r) {
    ws.getRange(r, 2, 1, 4).setNumberFormat("0.00%"); // cols B-E
  });

  log("✅ Dashboard formulas set (" + rows.length + " rows)");
  ss.toast("✅ Dashboard formulas updated", "AKWL v7", 6);
}
