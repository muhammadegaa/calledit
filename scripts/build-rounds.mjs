// Builds data/rounds/{date}.json — today's open round (curated blind from
// 2-9h-old Show HN) + resolved rounds for the past 3 days. Day boundary is
// 09:00 WIB (02:00 UTC). Seed-resolution rule: final points >= 40 ≈ front page
// (live rank tracking replaces this once the cron is deployed).
import { writeFileSync, mkdirSync } from "node:fs";

const HOUR = 3600;
const DAY = 24 * HOUR;
const SHIP_POINTS = 40;
const now = Math.floor(Date.now() / 1000);

function roundDate(unixSec) {
  return new Date((unixSec - 2 * HOUR) * 1000).toISOString().slice(0, 10);
}

function categorize(title) {
  const t = title.toLowerCase();
  if (/\b(ai|llm|agent|gpt|claude|model|rag|mcp)\b/.test(t)) return "ai";
  if (/\b(cli|sdk|api|framework|rust|debugger|compiler|kubernetes|database|devtool|library|open[- ]?source|self[- ]?host)\b/.test(t)) return "devtools";
  if (/\b(team|sales|crm|invoice|hiring|b2b|workflow|enterprise|analytics)\b/.test(t)) return "b2b";
  if (/\b(game|music|photo|video|travel|fitness|recipe|kids|journal)\b/.test(t)) return "consumer";
  return "other";
}

// Deterministic shuffle seeded by date string, so reruns on the same day agree
function seededPick(arr, n, seedStr) {
  let seed = [...seedStr].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pool = [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return out;
}

async function algolia(numericFilters) {
  const url = `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=${numericFilters}&hitsPerPage=200`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`algolia ${res.status}`);
  return (await res.json()).hits
    .filter((h) => h.url && /^Show HN/i.test(h.title ?? ""))
    .map((h) => ({
      id: String(h.objectID),
      source: "hn",
      title: h.title.replace(/^Show HN:\s*/i, "").trim(),
      url: h.url,
      host: new URL(h.url).hostname.replace(/^www\./, ""),
      category: categorize(h.title),
      points: h.points ?? 0,
      created_at_i: h.created_at_i,
      launched_at: h.created_at,
    }));
}

function editorial(l) {
  if (l.outcome === "ship")
    return l.final_points >= 300
      ? `Front page wasn't the question — it hit ${l.final_points} points and stayed all day.`
      : `Made the front page. ${l.final_points} points by the next morning.`;
  if (l.final_points <= 4) return `Sank without a ripple — ${l.final_points} points.`;
  return `A respectable ${l.final_points} points, but the front page never came.`;
}

mkdirSync("data/rounds", { recursive: true });

// ---- Today's open round: curate blind from 2-9h-old launches ----
const today = roundDate(now);
const fresh = await algolia(`created_at_i>${now - 9 * HOUR},created_at_i<${now - 2 * HOUR}`);
const hot = fresh.filter((l) => l.points >= 10);
const warm = fresh.filter((l) => l.points >= 4 && l.points < 10);
const cold = fresh.filter((l) => l.points < 4);
const todayPicks = [
  ...seededPick(hot, Math.min(2, hot.length), today + "h"),
  ...seededPick(warm, 2, today + "w"),
  ...seededPick(cold, 1, today + "c"),
];
// top up from whatever remains if a tier ran dry
for (const pool of [warm, cold, hot]) {
  for (const l of pool) {
    if (todayPicks.length >= 5) break;
    if (!todayPicks.find((p) => p.id === l.id)) todayPicks.push(l);
  }
}
const todayRound = {
  date: today,
  status: "open",
  resolves_at: `${today}T02:00:00Z`, // +24h: shown as "tomorrow 09:00 WIB"
  launches: todayPicks.slice(0, 5).map((l) => ({
    ...l,
    points_at_pick: l.points,
    age_h_at_pick: Math.round((now - l.created_at_i) / HOUR),
    points: undefined,
    created_at_i: undefined,
  })),
};
writeFileSync(`data/rounds/${today}.json`, JSON.stringify(todayRound, null, 2));

// Pre-warm mshots screenshots so players never see the generating placeholder
for (const l of todayRound.launches) {
  const shot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(l.url)}?w=640&h=760`;
  await fetch(shot).catch(() => {});
}

// ---- Past 3 days: resolved rounds (1-2 ships guaranteed when available) ----
// Mimic the real pick moment: launches that were 2-9h old at that day's
// 09:00 WIB pick time, so every seeded launch is >24h resolved by now.
const todayBoundary = Math.floor(Date.parse(`${today}T02:00:00Z`) / 1000);
for (let d = 1; d <= 3; d++) {
  const pickTime = todayBoundary - d * DAY;
  const date = roundDate(pickTime + HOUR);
  const hits = await algolia(`created_at_i>${pickTime - 9 * HOUR},created_at_i<${pickTime - 2 * HOUR}`);
  const resolvedAll = hits.map((l) => ({
    ...l,
    outcome: l.points >= SHIP_POINTS ? "ship" : "skip",
    final_points: l.points,
  }));
  const ships = resolvedAll.filter((l) => l.outcome === "ship");
  const skips = resolvedAll.filter((l) => l.outcome === "skip" && l.points >= 2);
  const picks = [
    ...seededPick(ships, Math.min(2, ships.length), date + "s"),
    ...seededPick(skips, 5 - Math.min(2, ships.length), date + "k"),
  ].slice(0, 5);
  const round = {
    date,
    status: "resolved",
    launches: picks.map((l) => ({
      id: l.id, source: l.source, title: l.title, url: l.url, host: l.host,
      category: l.category, launched_at: l.launched_at,
      outcome: l.outcome, final_points: l.final_points, editorial: editorial(l),
    })),
  };
  writeFileSync(`data/rounds/${date}.json`, JSON.stringify(round, null, 2));
  console.log(`${date} resolved: ${picks.length} launches, ${picks.filter((p) => p.outcome === "ship").length} ships`);
}

console.log(`${today} open: ${todayRound.launches.length} launches —`);
for (const l of todayRound.launches)
  console.log(`  [${String(l.points_at_pick).padStart(3)}pt @pick, ${l.age_h_at_pick}h, ${l.category}] ${l.title.slice(0, 58)}`);
