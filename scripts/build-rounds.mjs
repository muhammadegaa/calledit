// Builds data/rounds/{date}.json — today's open round (5 Show HN + 3 PH,
// curated blind) + resolved rounds for the past 3 days, + the bot's calls.
// Run with: node --env-file=.env.local scripts/build-rounds.mjs
// Day boundary 09:00 WIB (02:00 UTC). HN ship = front page (seed rule: >=40pt
// final). PH ship = top 5 of its PT day by votes. The PH day is ~19h old at
// our pick — votes are hidden, it's a blind read resolving same afternoon.
import { writeFileSync, mkdirSync } from "node:fs";

const HOUR = 3600;
const DAY = 24 * HOUR;
const HN_SHIP_POINTS = 40;
const now = Math.floor(Date.now() / 1000);

const roundDate = (t) => new Date((t - 2 * HOUR) * 1000).toISOString().slice(0, 10);
const phDate = (t) => new Date((t - 7 * HOUR) * 1000).toISOString().slice(0, 10); // PDT

function categorize(text) {
  const t = text.toLowerCase();
  if (/\b(ai|llm|agent|gpt|claude|model|rag|mcp|copilot)\b/.test(t)) return "ai";
  if (/\b(cli|sdk|api|framework|rust|debugger|compiler|kubernetes|database|devtool|library|open[- ]?source|self[- ]?host|code)\b/.test(t)) return "devtools";
  if (/\b(team|sales|crm|invoice|hiring|b2b|workflow|enterprise|analytics|marketing|store)\b/.test(t)) return "b2b";
  if (/\b(game|music|photo|video|travel|fitness|recipe|kids|journal|email)\b/.test(t)) return "consumer";
  return "other";
}

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

// ---------- HN ----------
async function hnLaunches(numericFilters) {
  const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&numericFilters=${numericFilters}&hitsPerPage=200`);
  if (!res.ok) throw new Error(`algolia ${res.status}`);
  return (await res.json()).hits
    .filter((h) => h.url && /^Show HN/i.test(h.title ?? ""))
    .map((h) => ({
      id: String(h.objectID), source: "hn",
      title: h.title.replace(/^Show HN:\s*/i, "").trim(),
      url: h.url, host: new URL(h.url).hostname.replace(/^www\./, ""),
      category: categorize(h.title), points: h.points ?? 0,
      created_at_i: h.created_at_i, launched_at: h.created_at,
    }));
}

// ---------- PH ----------
async function phPosts(dateStr) {
  const after = `${dateStr}T07:00:00Z`;
  const before = new Date(Date.parse(after) + DAY * 1000).toISOString();
  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PH_DEV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($after: DateTime!, $before: DateTime!) {
        posts(postedAfter: $after, postedBefore: $before, order: VOTES, first: 40) {
          edges { node { id name tagline votesCount website createdAt } }
        }
      }`,
      variables: { after, before },
    }),
  });
  const j = await res.json();
  if (!res.ok || j.errors) throw new Error(`PH API: ${JSON.stringify(j.errors ?? res.status).slice(0, 120)}`);
  return j.data.posts.edges.map((e, i) => {
    const n = e.node;
    let host = "producthunt.com";
    try { host = new URL(n.website).hostname.replace(/^www\./, ""); } catch {}
    return {
      id: `ph-${n.id}`, source: "ph", title: n.name, tagline: n.tagline,
      url: n.website, host, category: categorize(`${n.name} ${n.tagline}`),
      votes: n.votesCount, rank: i + 1, launched_at: n.createdAt,
    };
  });
}

// PH `website` is a producthunt.com/r/ redirect — resolve to the real product
// URL so the host reads right and mshots screenshots the product, not a bot-check.
async function resolvePhUrl(url) {
  // Read Location headers only — never fetch the destination site.
  let current = url;
  try {
    for (let hop = 0; hop < 3; hop++) {
      if (!new URL(current).hostname.includes("producthunt.com")) break;
      const r = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36" } });
      let loc = r.headers.get("location");
      if (!loc) {
        await new Promise((res) => setTimeout(res, 700));
        const r2 = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36" } });
        loc = r2.headers.get("location");
      }
      if (!loc) break;
      current = new URL(loc, current).href;
    }
  } catch {}
  return current.replace(/\?ref=producthunt.*$/, "");
}

async function phPickResolved(posts, seedStr) {
  const picks = phPick(posts, seedStr);
  for (const p of picks) {
    p.url = await resolvePhUrl(p.url);
    try { p.host = new URL(p.url).hostname.replace(/^www\./, ""); } catch {}
  }
  return picks;
}

function phPick(posts, seedStr) {
  // PH GraphQL caps a page at 20 posts regardless of `first` — tier within it.
  const top = posts.filter((p) => p.rank <= 8);
  const mid = posts.filter((p) => p.rank > 8 && p.rank <= 14);
  const low = posts.filter((p) => p.rank > 14);
  return [...seededPick(top, 1, seedStr + "t"), ...seededPick(mid, 1, seedStr + "m"), ...seededPick(low, 1, seedStr + "l")];
}

function editorial(l) {
  if (l.source === "ph") {
    return l.outcome === "ship"
      ? `#${l.peak_rank} on Product Hunt that day — ${l.final_points} votes.`
      : `Finished #${l.peak_rank} with ${l.final_points} votes. The podium was never close.`;
  }
  if (l.outcome === "ship")
    return l.final_points >= 300
      ? `Front page wasn't the question — ${l.final_points} points and it stayed all day.`
      : `Made the front page. ${l.final_points} points by the next morning.`;
  if (l.final_points <= 4) return `Sank without a ripple — ${l.final_points} points.`;
  return `A respectable ${l.final_points} points, but the front page never came.`;
}

// ---------- The bot ----------
async function botCalls(launches) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const list = launches.map((l) =>
    `id:${l.id} [${l.source === "hn" ? "Show HN, front page in 24h?" : "Product Hunt, top 5 of the day?"}] ${l.title}${l.tagline ? ` — ${l.tagline}` : ""} (${l.host}, ${l.category})`
  ).join("\n");
  let res, j;
  // Fallback chain: low credit balances reject pricier models first.
  for (const model of ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]) {
    res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      ...(model === "claude-haiku-4-5" ? {} : { thinking: { type: "adaptive" } }),
      system: "You are the house bot of Called It, a daily game predicting launch outcomes. You see only what players see: title, tagline, domain, category — no vote counts. Call ship or skip for each launch. Be calibrated, not optimistic: only ~10-20% of Show HN launches reach the front page; only top-tier PH launches make the podium. Judge product appeal to each crowd, name recognizability, and category heat.",
      messages: [{ role: "user", content: `Today's launches:\n${list}` }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              calls: {
                type: "array",
                items: {
                  type: "object",
                  properties: { id: { type: "string" }, call: { type: "string", enum: ["ship", "skip"] } },
                  required: ["id", "call"], additionalProperties: false,
                },
              },
            },
            required: ["calls"], additionalProperties: false,
          },
        },
      },
    }),
  });
    j = await res.json();
    if (res.ok) { console.log(`bot model: ${model}`); break; }
    if (!/credit balance/.test(j.error?.message ?? "")) break;
  }
  if (!res.ok) { console.error("bot failed:", JSON.stringify(j.error ?? j).slice(0, 150)); return null; }
  const text = j.content.find((b) => b.type === "text")?.text ?? "{}";
  const calls = {};
  for (const c of JSON.parse(text).calls ?? []) calls[c.id] = c.call;
  return calls;
}

// ================= MAIN =================
mkdirSync("data/rounds", { recursive: true });
const today = roundDate(now);
const todayBoundary = Math.floor(Date.parse(`${today}T02:00:00Z`) / 1000);

// ---- Today's open round ----
const fresh = await hnLaunches(`created_at_i>${now - 9 * HOUR},created_at_i<${now - 2 * HOUR}`);
const hot = fresh.filter((l) => l.points >= 10);
const warm = fresh.filter((l) => l.points >= 4 && l.points < 10);
const cold = fresh.filter((l) => l.points < 4);
let hnPicks = [
  ...seededPick(hot, Math.min(2, hot.length), today + "h"),
  ...seededPick(warm, 2, today + "w"),
  ...seededPick(cold, 1, today + "c"),
];
for (const pool of [warm, cold, hot])
  for (const l of pool) {
    if (hnPicks.length >= 5) break;
    if (!hnPicks.find((p) => p.id === l.id)) hnPicks.push(l);
  }
hnPicks = hnPicks.slice(0, 5).map((l) => ({
  id: l.id, source: l.source, title: l.title, url: l.url, host: l.host,
  category: l.category, launched_at: l.launched_at,
  age_h_at_pick: Math.round((now - l.created_at_i) / HOUR),
  points_at_pick: l.points,
}));

let phPicks = [];
try {
  const posts = await phPosts(phDate(now));
  phPicks = (await phPickResolved(posts, today + "ph")).map((p) => ({
    id: p.id, source: "ph", title: p.title, tagline: p.tagline, url: p.url,
    host: p.host, category: p.category, launched_at: p.launched_at,
    age_h_at_pick: Math.round((now - Date.parse(p.launched_at) / 1000) / HOUR),
    rank_at_pick: p.rank, votes_at_pick: p.votes,
  }));
} catch (e) {
  console.error("PH skipped:", e.message); // stop condition: HN-only round
}

const launches = [...hnPicks, ...phPicks];
const bots = await botCalls(launches);
const todayRound = {
  date: today, status: "open", resolves_at: `${today}T02:00:00Z`,
  launches, ...(bots ? { bot_calls: bots } : {}),
};
writeFileSync(`data/rounds/${today}.json`, JSON.stringify(todayRound, null, 2));

// ---- Past 3 days resolved (HN window + PH final boards) ----
for (let d = 1; d <= 3; d++) {
  const pickTime = todayBoundary - d * DAY;
  const date = roundDate(pickTime + HOUR);
  const hits = await hnLaunches(`created_at_i>${pickTime - 9 * HOUR},created_at_i<${pickTime - 2 * HOUR}`);
  const all = hits.map((l) => ({ ...l, outcome: l.points >= HN_SHIP_POINTS ? "ship" : "skip", final_points: l.points }));
  const ships = all.filter((l) => l.outcome === "ship");
  const skips = all.filter((l) => l.outcome === "skip" && l.points >= 2);
  let picks = [
    ...seededPick(ships, Math.min(2, ships.length), date + "s"),
    ...seededPick(skips, 5 - Math.min(2, ships.length), date + "k"),
  ].slice(0, 5);

  try {
    const posts = await phPosts(phDate(pickTime));
    const phResolved = (await phPickResolved(posts, date + "ph")).map((p) => ({
      id: p.id, source: "ph", title: p.title, tagline: p.tagline, url: p.url,
      host: p.host, category: p.category, launched_at: p.launched_at,
      outcome: p.rank <= 5 ? "ship" : "skip", final_points: p.votes, peak_rank: p.rank,
    }));
    picks = [...picks, ...phResolved];
  } catch (e) {
    console.error(`PH resolved ${date} skipped:`, e.message);
  }

  const round = {
    date, status: "resolved",
    launches: picks.map((l) => ({
      id: l.id, source: l.source, title: l.title, tagline: l.tagline, url: l.url,
      host: l.host, category: l.category, launched_at: l.launched_at,
      outcome: l.outcome, final_points: l.final_points, peak_rank: l.peak_rank,
      editorial: editorial(l),
    })),
  };
  writeFileSync(`data/rounds/${date}.json`, JSON.stringify(round, null, 2));
  console.log(`${date} resolved: ${round.launches.length} launches (${round.launches.filter((p) => p.outcome === "ship").length} ships)`);
}

// Pre-warm screenshots
for (const l of todayRound.launches) {
  await fetch(`https://s0.wp.com/mshots/v1/${encodeURIComponent(l.url)}?w=640&h=760`).catch(() => {});
}

console.log(`${today} open: ${launches.length} launches (${hnPicks.length} HN + ${phPicks.length} PH), bot: ${bots ? "in" : "OUT"}`);
for (const l of launches) console.log(`  [${l.source}] ${l.title.slice(0, 55)}${bots ? ` → bot: ${bots[l.id]}` : ""}`);
