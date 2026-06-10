// D0 spike: prove we can (a) pull today's judgeable Show HN launches and
// (b) resolve past days' outcomes from public APIs. Seed-resolution rule for
// historical days uses final points (live rank tracking takes over via cron).
import { writeFileSync, mkdirSync } from "node:fs";

const HOUR = 3600;
const now = Math.floor(Date.now() / 1000);

const SEED_SHIP_POINTS = 40; // seed approximation; live cron tracks real top-30 rank

async function algolia(params) {
  const url = `https://hn.algolia.com/api/v1/search_by_date?${params}&hitsPerPage=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`algolia ${res.status}`);
  return (await res.json()).hits;
}

function clean(hit) {
  return {
    id: String(hit.objectID),
    source: "hn",
    title: hit.title.replace(/^Show HN:\s*/i, ""),
    url: hit.url ?? null,
    points: hit.points,
    comments: hit.num_comments,
    launched_at: hit.created_at,
    age_h: Math.round((now - hit.created_at_i) / HOUR),
  };
}

// --- Today's round candidates: Show HN with a real URL, 2-9h old ---
const todayHits = await algolia(
  `tags=show_hn&numericFilters=created_at_i>${now - 9 * HOUR},created_at_i<${now - 2 * HOUR}`
);
const candidates = todayHits
  .filter((h) => h.url && h.title?.match(/^Show HN/i))
  .map(clean)
  .sort((a, b) => b.age_h - a.age_h);

// --- Seed resolution: Show HN from 1-4 days ago, outcome by final points ---
const pastHits = await algolia(
  `tags=show_hn&numericFilters=created_at_i>${now - 96 * HOUR},created_at_i<${now - 24 * HOUR},points>2`
);
const resolved = pastHits
  .filter((h) => h.url && h.title?.match(/^Show HN/i))
  .map(clean)
  .map((l) => ({ ...l, outcome: l.points >= SEED_SHIP_POINTS ? "ship" : "skip" }));

mkdirSync("data/spike", { recursive: true });
writeFileSync("data/spike/today-candidates.json", JSON.stringify(candidates, null, 2));
writeFileSync("data/spike/resolved-seed.json", JSON.stringify(resolved, null, 2));

// --- Spot-check output ---
console.log(`TODAY'S CANDIDATES (${candidates.length} judgeable, want >=5):`);
for (const c of candidates.slice(0, 8))
  console.log(`  [${String(c.points).padStart(3)}pt ${String(c.age_h).padStart(2)}h] ${c.title.slice(0, 64)} — ${new URL(c.url).hostname}`);

const ships = resolved.filter((r) => r.outcome === "ship");
console.log(`\nSEED RESOLUTION (last 1-4 days): ${resolved.length} launches, ${ships.length} ships (${Math.round((100 * ships.length) / resolved.length)}% base rate)`);
console.log("  Top ships:");
for (const s of ships.sort((a, b) => b.points - a.points).slice(0, 4))
  console.log(`    [${s.points}pt] ${s.title.slice(0, 60)}`);
console.log("  Sample skips:");
for (const s of resolved.filter((r) => r.outcome === "skip").slice(0, 3))
  console.log(`    [${String(s.points).padStart(3)}pt] ${s.title.slice(0, 60)}`);
