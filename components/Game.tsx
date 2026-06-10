"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_LABELS, POINTS, SOURCE_META, botLine, getAnonId, loadState,
  saveState, scoreReveal, streakDays, overallAccuracy, type Call, type Crowd,
  type GameState, type OpenLaunch, type ResolvedLaunch, type Round,
} from "@/lib/game";

function useCrowd(date: string | undefined): Crowd {
  const [crowd, setCrowd] = useState<Crowd>({});
  useEffect(() => {
    if (!date) return;
    fetch(`/api/crowd?date=${date}`).then((r) => r.json()).then((j) => setCrowd(j ?? {})).catch(() => {});
  }, [date]);
  return crowd;
}

function crowdShipPct(crowd: Crowd, id: string): number | null {
  const c = crowd[id];
  if (!c || c.total < 3) return null;
  return Math.round((100 * c.ships) / c.total);
}

type Phase = "intro" | "backtest" | "graduate" | "live" | "locked";

export function Game({
  today,
  yesterday,
}: {
  today: Round<OpenLaunch>;
  yesterday: Round<ResolvedLaunch> | null;
}) {
  const [state, setState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [backtestScore, setBacktestScore] = useState({ correct: 0, total: 0, points: 0 });
  const backtestEligible = useRef(false);
  const playedYesterdayAtLoad = useRef(false);

  useEffect(() => {
    const s = loadState();
    const playedToday = s.days[today.date] && Object.keys(s.days[today.date].calls).length >= today.launches.length;
    const veteran = Object.keys(s.days).length > 0;
    playedYesterdayAtLoad.current = !!(yesterday && s.days[yesterday.date] && Object.keys(s.days[yesterday.date].calls).length > 0);
    backtestEligible.current = !!yesterday && !veteran;
    setState(s);
    if (playedToday) setPhase("locked");
    else if (veteran) setPhase("live-intro" as Phase);
  }, [today.date, today.launches.length, yesterday]);

  if (!state) return null;

  const backtestRound = backtestEligible.current ? yesterday : null;
  const playedYesterday = playedYesterdayAtLoad.current;

  function recordBacktest(launch: ResolvedLaunch, call: Call) {
    const s = { ...state! };
    const correct = call === launch.outcome;
    const pts = correct ? POINTS[launch.outcome] : 0;
    const day = (s.days[backtestRound!.date] ??= { calls: {}, revealed: true, score: 0, correct: 0 });
    day.calls[launch.id] = call;
    day.score = (day.score ?? 0) + pts;
    day.correct = (day.correct ?? 0) + (correct ? 1 : 0);
    const c = (s.cat[launch.category] ??= { correct: 0, total: 0 });
    c.total++;
    if (correct) c.correct++;
    saveState(s);
    setState(s);
    setBacktestScore((b) => ({ correct: b.correct + (correct ? 1 : 0), total: b.total + 1, points: b.points + pts }));
  }

  function advanceBacktest() {
    const max = Math.min(4, backtestRound!.launches.length);
    if (idx + 1 >= max) { setIdx(0); setPhase("graduate"); }
    else setIdx(idx + 1);
  }

  function recordLive(launch: OpenLaunch, call: Call) {
    const s = { ...state! };
    const day = (s.days[today.date] ??= { calls: {}, revealed: false });
    day.calls[launch.id] = call;
    saveState(s);
    setState(s);
  }

  function advanceLive() {
    if (idx + 1 >= today.launches.length) {
      setPhase("locked");
      const day = state!.days[today.date];
      fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anon_id: getAnonId(),
          round_date: today.date,
          calls: Object.entries(day.calls).map(([launch_id, c]) => ({ launch_id, call: c })),
        }),
      }).catch(() => {});
    } else setIdx(idx + 1);
  }

  return (
    <main className="mx-auto max-w-xl px-5 pb-16">
      <Header state={state} todayDate={today.date} />

      {phase === "intro" && (
        <section className="mt-12 text-center card-enter">
          <p className="label">The daily product-scouting game</p>
          <h1 className="mt-4 text-[30px] font-black leading-[1.1] tracking-tight">
            {today.launches.length} products launched today.
            <br />
            <span className="text-ship">Which ones blow up?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-dim">
            These are real launches, live right now on Hacker News and Product Hunt.
            Back the winners. Pass on the rest. Reality — actual upvotes, actual
            leaderboards — scores you tomorrow morning.
          </p>
          <p className="mx-auto mt-3 max-w-md text-[13px] text-ink-faint">
            First, a warm-up: last week&apos;s launches, answers already in. See if you&apos;d have called them.
          </p>
          <button
            onClick={() => setPhase(backtestRound ? "backtest" : ("live-intro" as Phase))}
            className="mt-7 rounded-xl bg-ship px-9 py-4 text-[17px] font-black text-black"
          >
            Prove it →
          </button>
        </section>
      )}

      {phase === "backtest" && backtestRound && (
        <JudgeCard
          key={backtestRound.launches[idx].id}
          launch={backtestRound.launches[idx]}
          index={idx}
          total={Math.min(4, backtestRound.launches.length)}
          mode="backtest"
          tally={backtestScore}
          onCall={(l, c) => recordBacktest(l as ResolvedLaunch, c)}
          onContinue={advanceBacktest}
        />
      )}

      {phase === "graduate" && (
        <section className="mt-12 text-center card-enter">
          <p className="label" style={{ color: "#f59e0b" }}>Warm-up over</p>
          <h2 className="mt-3 text-[30px] font-black tracking-tight">
            {backtestScore.correct}/{backtestScore.total} on history.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-dim">
            That field was already settled. Today&apos;s {today.launches.length} launched
            <span className="text-ink"> hours ago</span> — nobody on earth knows these answers yet.
            Not the makers. Not the bot. Reality answers tomorrow, 09:00.
          </p>
          <button
            onClick={() => { setIdx(0); setPhase("live"); }}
            className="mt-7 rounded-xl bg-ship px-9 py-4 text-[17px] font-black text-black"
          >
            Scout today&apos;s field →
          </button>
        </section>
      )}

      {(phase as string) === "live-intro" && (
        <>
          {yesterday && <RevealStrip round={yesterday} state={state} />}
          <section className="mt-8 text-center card-enter">
            <p className="label">Today&apos;s field · {today.date}</p>
            <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight">
              {today.launches.length} fresh launches.<br />Back the winners.
            </h1>
            <button
              onClick={() => { setIdx(0); setPhase("live"); }}
              className="mt-6 rounded-xl bg-ship px-8 py-3.5 text-[16px] font-black text-black"
            >
              Make your calls →
            </button>
          </section>
        </>
      )}

      {phase === "live" && (
        <JudgeCard
          key={today.launches[idx].id}
          launch={today.launches[idx]}
          index={idx}
          total={today.launches.length}
          mode="live"
          botCall={today.bot_calls?.[today.launches[idx].id]}
          onCall={(l, c) => recordLive(l as OpenLaunch, c)}
          onContinue={advanceLive}
        />
      )}

      {phase === "locked" && (
        <>
          {yesterday && playedYesterday && <RevealStrip round={yesterday} state={state} />}
          <LockedPanel state={state} today={today} />
        </>
      )}
    </main>
  );
}

function Header({ state, todayDate }: { state: GameState; todayDate: string }) {
  const streak = streakDays(state, todayDate);
  const acc = overallAccuracy(state);
  return (
    <header className="flex items-center justify-between border-b border-edge py-4">
      <span className="text-[15px] font-black tracking-tight">
        CALLED<span className="text-ship">/</span>IT
      </span>
      <div className="flex items-center gap-4 font-mono text-[12px]">
        {streak > 1 && <span className="text-gold">🔥 {streak}d</span>}
        {acc.total > 0 && (
          <span className="text-ink-dim">
            eye: <span className="text-ink">{acc.pct}%</span> · {acc.total} calls
          </span>
        )}
      </div>
    </header>
  );
}

function RevealStrip({ round, state }: { round: Round<ResolvedLaunch>; state: GameState }) {
  const result = useMemo(() => scoreReveal(state, round), [state, round]);
  const crowd = useCrowd(round.date);
  if (!result) return null;
  return (
    <section className="mt-6 rounded-xl border border-edge bg-surface p-4 card-enter">
      <div className="flex items-baseline justify-between">
        <p className="label" style={{ color: "#f59e0b" }}>Yesterday · reality&apos;s verdict</p>
        <span className="font-mono text-[13px] text-ink">
          you: {result.correct}/{result.rows.length} · +{result.score} pts
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {round.launches.map((l) => {
          const call = result.rows.find((r) => r.launch.id === l.id);
          const pct = crowdShipPct(crowd, l.id);
          return (
            <div key={l.id} className="flex items-start justify-between gap-3 text-[13px]">
              <div className="min-w-0">
                <p className="truncate text-ink">{l.title}</p>
                <p className="text-[11.5px] italic text-ink-faint">
                  {l.editorial}
                  {pct !== null && <span className="not-italic"> · {pct}% of scouts backed it</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {call && (
                  <span className={`font-mono text-[11px] ${call.correct ? "text-ship" : "text-miss"}`}>
                    {call.correct ? "✓" : "✗"} {call.call === "ship" ? "backed" : "passed"}
                  </span>
                )}
                <OutcomeBadge l={l} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OutcomeBadge({ l }: { l: ResolvedLaunch }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
        l.outcome === "ship" ? "bg-ship text-black" : "bg-surface-2 text-ink-dim"
      }`}
    >
      {l.source === "ph"
        ? l.outcome === "ship" ? `top 5 · #${l.peak_rank}` : `#${l.peak_rank}`
        : l.outcome === "ship" ? `blew up · ${l.final_points}pt` : `${l.final_points}pt`}
    </span>
  );
}

function JudgeCard({
  launch, index, total, mode, botCall, tally, onCall, onContinue,
}: {
  launch: OpenLaunch | ResolvedLaunch;
  index: number;
  total: number;
  mode: "live" | "backtest";
  botCall?: Call;
  tally?: { correct: number; total: number; points: number };
  onCall: (l: OpenLaunch | ResolvedLaunch, c: Call) => void;
  onContinue: () => void;
}) {
  const [secs, setSecs] = useState(30);
  const [shotOk, setShotOk] = useState(true);
  const [made, setMade] = useState<Call | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timer.current = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const shot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(launch.url)}?w=640&h=760`;
  const resolved = launch as ResolvedLaunch;

  function call(c: Call) {
    if (made) return;
    setMade(c);
    if (timer.current) clearInterval(timer.current);
    onCall(launch, c);
  }

  return (
    <section className="mt-6 card-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mode === "backtest" && (
            <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">warm-up</span>
          )}
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${i < index ? "bg-ship" : i === index ? "bg-ink" : "bg-surface-2"}`} />
            ))}
          </div>
        </div>
        {mode === "backtest" && tally ? (
          <span className="font-mono text-[12px] text-ink-dim">{tally.correct}/{tally.total} · +{tally.points}pt</span>
        ) : (
          <span className={`font-mono text-[13px] ${secs <= 5 ? "pop text-miss" : "text-ink-faint"}`}>0:{String(secs).padStart(2, "0")}</span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white text-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: SOURCE_META[launch.source].color }}>
            {SOURCE_META[launch.source].badge}
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            {mode === "backtest" ? "last week" : "launched today"} · {CATEGORY_LABELS[launch.category]}
          </span>
        </div>
        {shotOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="" className="max-h-[280px] w-full object-cover object-top" onError={() => setShotOk(false)} />
        )}
        <div className="px-5 py-4">
          <h2 className="text-[18px] font-bold leading-snug">{launch.title}</h2>
          {launch.tagline && <p className="mt-0.5 text-[13.5px] text-zinc-600">{launch.tagline}</p>}
          <p className="mt-1 text-[13px] text-zinc-500">
            {launch.host} ·{" "}
            <a href={launch.url} target="_blank" rel="noreferrer" className="underline">open the real site ↗</a>
          </p>
        </div>
      </div>

      {!made ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => call("ship")} className="rounded-xl bg-ship py-4 text-[19px] font-black tracking-tight text-black">
            BACK ▲<div className="mt-0.5 text-[11px] font-medium opacity-70">{SOURCE_META[launch.source].shipLabel} · +{POINTS.ship}</div>
          </button>
          <button onClick={() => call("skip")} className="rounded-xl bg-surface-2 py-4 text-[19px] font-black tracking-tight text-ink-dim">
            PASS ▼<div className="mt-0.5 text-[11px] font-medium opacity-60">{SOURCE_META[launch.source].skipLabel} · +{POINTS.skip}</div>
          </button>
        </div>
      ) : mode === "backtest" ? (
        <div className={`card-enter mt-4 rounded-xl border p-4 ${made === resolved.outcome ? "border-ship/60 bg-ship/10" : "border-miss/60 bg-miss/10"}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[17px] font-black ${made === resolved.outcome ? "text-ship" : "text-miss"}`}>
              {made === resolved.outcome ? `CALLED IT · +${POINTS[resolved.outcome]}pt` : "MISSED IT"}
            </span>
            <OutcomeBadge l={resolved} />
          </div>
          <p className="mt-1.5 text-[13px] text-ink-dim">{resolved.editorial}</p>
          <button onClick={onContinue} className="mt-3 w-full rounded-lg bg-ink py-2.5 text-[14px] font-bold text-black">
            Next →
          </button>
        </div>
      ) : (
        <div className="card-enter mt-4 rounded-xl border border-edge bg-surface p-4">
          <p className="text-[13.5px]" style={{ color: "#818cf8" }}>
            {botLine(made, botCall) ?? "Call locked."}
          </p>
          <p className="mt-1 text-[12px] text-ink-faint">Reality answers tomorrow 09:00.</p>
          <button onClick={onContinue} className="mt-3 w-full rounded-lg bg-ink py-2.5 text-[14px] font-bold text-black">
            {index + 1 >= total ? "Finish →" : "Next launch →"}
          </button>
        </div>
      )}
    </section>
  );
}

function LockedPanel({ state, today }: { state: GameState; today: Round<OpenLaunch> }) {
  const acc = overallAccuracy(state);
  const calls = state.days[today.date]?.calls ?? {};
  const backed = Object.values(calls).filter((c) => c === "ship").length;
  const crowd = useCrowd(today.date);
  const [copied, setCopied] = useState(false);

  function share() {
    const grid = today.launches.map((l) => (calls[l.id] === "ship" ? "s" : "k")).join("");
    const streak = streakDays(state, today.date);
    const q = new URLSearchParams({ d: today.date, g: grid });
    if (acc.total > 0) q.set("pct", String(acc.pct));
    if (streak > 1) q.set("streak", String(streak));
    const url = `${location.origin}/share?${q}`;
    const text = "My blind calls on today's real launches — reality scores me tomorrow 09:00.";
    if (navigator.share) navigator.share({ text, url }).catch(() => {});
    else { navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  }

  return (
    <section className="mt-8 text-center card-enter">
      <p className="label">Calls locked · {today.date}</p>
      <h2 className="mt-3 text-[24px] font-black tracking-tight">
        {backed === 0 ? "You passed on the whole field." : `You backed ${backed} of ${today.launches.length}.`}
      </h2>
      <p className="mt-2 text-[14px] text-ink-dim">Reality scores you tomorrow at 09:00. Come back for the verdict.</p>
      {Object.keys(crowd).length > 0 && (
        <div className="mx-auto mt-5 max-w-sm rounded-xl border border-edge bg-surface p-4 text-left">
          <p className="label">You vs the other scouts</p>
          <div className="mt-2 space-y-1.5">
            {today.launches.map((l) => {
              const pct = crowdShipPct(crowd, l.id);
              if (pct === null) return null;
              return (
                <div key={l.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="truncate text-ink-dim">{l.title.split(/[–—-]/)[0].trim()}</span>
                  <span className="shrink-0 font-mono text-[11px]">
                    <span className={calls[l.id] === "ship" ? "text-ship" : "text-ink-faint"}>{calls[l.id] === "ship" ? "backed" : "passed"}</span>
                    <span className="text-ink-faint"> · {pct}% backed</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mx-auto mt-5 max-w-sm rounded-xl border border-edge bg-surface p-5 text-left">
        <p className="label">Your scouting record</p>
        {acc.total === 0 ? (
          <p className="mt-2 text-[13px] text-ink-dim">First field on record — your eye gets rated at tomorrow&apos;s reveal.</p>
        ) : (
          <>
            <div className="mt-2 font-mono text-[36px] font-bold leading-none">
              {acc.pct}<span className="text-[16px] text-ink-faint">%</span>
            </div>
            <p className="mt-1 text-[11.5px] text-ink-faint">{acc.total} resolved calls</p>
            <div className="mt-3 space-y-2">
              {Object.entries(state.cat).map(([cat, c]) => (
                <div key={cat}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-ink-dim">eye for {CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="font-mono text-ink">{Math.round((100 * c.correct) / c.total)}%</span>
                  </div>
                  <div className="h-1.5 rounded bg-surface-2">
                    <div className="h-1.5 rounded bg-ship" style={{ width: `${(100 * c.correct) / c.total}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <button onClick={share} className="mt-5 rounded-lg border border-edge-strong px-5 py-2.5 text-[13px] text-ink-dim">
        {copied ? "copied ✓" : "share your calls ↗"}
      </button>
    </section>
  );
}
