export type Call = "ship" | "skip";

export type OpenLaunch = {
  id: string;
  source: "hn" | "ph";
  title: string;
  tagline?: string;
  url: string;
  host: string;
  category: string;
  launched_at: string;
  age_h_at_pick: number;
};

export type ResolvedLaunch = OpenLaunch & {
  outcome: Call;
  final_points: number;
  peak_rank?: number;
  editorial: string;
};

export type Round<L> = {
  date: string;
  status: "open" | "resolved";
  resolves_at?: string;
  launches: L[];
  bot_calls?: Record<string, Call>;
};

export const SOURCE_META = {
  hn: { badge: "Show HN", color: "#ff6600", shipLabel: "front page in 24h", skipLabel: "sinks quietly" },
  ph: { badge: "Product Hunt", color: "#ff6154", shipLabel: "top 5 by day's end", skipLabel: "stays off the podium" },
} as const;

// Asymmetric scoring: ships are rare (~6-20% of a round), so calling one
// correctly is worth triple a safe skip. Wrong calls score zero, not negative —
// punishing play discourages it.
export const POINTS = { ship: 3, skip: 1 } as const;

export const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI / agents",
  devtools: "devtools",
  b2b: "B2B",
  consumer: "consumer",
  other: "everything else",
};

export type DayRecord = {
  calls: Record<string, Call>;
  revealed: boolean;
  score?: number;
  correct?: number;
};

export type GameState = {
  days: Record<string, DayRecord>;
  cat: Record<string, { correct: number; total: number }>;
};

const KEY = "calledit:v1";

export function loadState(): GameState {
  if (typeof window === "undefined") return { days: {}, cat: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { days: {}, cat: {} };
}

export function saveState(s: GameState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function scoreReveal(
  state: GameState,
  round: Round<ResolvedLaunch>
): { score: number; correct: number; rows: { launch: ResolvedLaunch; call: Call; correct: boolean; points: number }[] } | null {
  const day = state.days[round.date];
  if (!day || Object.keys(day.calls).length === 0) return null;
  const rows = round.launches
    .filter((l) => day.calls[l.id])
    .map((l) => {
      const call = day.calls[l.id];
      const ok = call === l.outcome;
      return { launch: l, call, correct: ok, points: ok ? POINTS[l.outcome] : 0 };
    });
  const score = rows.reduce((a, r) => a + r.points, 0);
  const correct = rows.filter((r) => r.correct).length;
  if (!day.revealed) {
    day.revealed = true;
    day.score = score;
    day.correct = correct;
    for (const r of rows) {
      const c = (state.cat[r.launch.category] ??= { correct: 0, total: 0 });
      c.total++;
      if (r.correct) c.correct++;
    }
    saveState(state);
  }
  return { score, correct, rows };
}

export function streakDays(state: GameState, todayDate: string): number {
  let streak = 0;
  const d = new Date(`${todayDate}T00:00:00Z`);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (state.days[key] && Object.keys(state.days[key].calls).length > 0) {
      streak++;
      d.setUTCDate(d.getUTCDate() - 1);
    } else break;
  }
  return streak;
}

export function overallAccuracy(state: GameState): { pct: number; total: number } {
  let correct = 0, total = 0;
  for (const c of Object.values(state.cat)) {
    correct += c.correct;
    total += c.total;
  }
  return { pct: total ? Math.round((100 * correct) / total) : 0, total };
}
