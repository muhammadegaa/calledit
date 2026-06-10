"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_LABELS, POINTS, SOURCE_META, getAnonId, loadState, saveState,
  scoreReveal, streakDays, overallAccuracy, type Call, type Crowd,
  type GameState, type OpenLaunch, type ResolvedLaunch, type Round,
} from "@/lib/game";

function useCrowd(date: string | undefined): Crowd {
  const [crowd, setCrowd] = useState<Crowd>({});
  useEffect(() => {
    if (!date) return;
    fetch(`/api/crowd?date=${date}`).then((r) => r.json()).then(setCrowd).catch(() => {});
  }, [date]);
  return crowd;
}

function crowdShipPct(crowd: Crowd, id: string): number | null {
  const c = crowd[id];
  if (!c || c.total < 3) return null;
  return Math.round((100 * c.ships) / c.total);
}

type Phase = "open" | "judging" | "locked";

export function Game({
  today,
  yesterday,
}: {
  today: Round<OpenLaunch>;
  yesterday: Round<ResolvedLaunch> | null;
}) {
  const [state, setState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("open");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const s = loadState();
    setState(s);
    const played = s.days[today.date] && Object.keys(s.days[today.date].calls).length >= today.launches.length;
    if (played) setPhase("locked");
  }, [today.date, today.launches.length]);

  if (!state) return null;

  function recordCall(launch: OpenLaunch, call: Call) {
    const s = { ...state! };
    const day = (s.days[today.date] ??= { calls: {}, revealed: false });
    day.calls[launch.id] = call;
    saveState(s);
    setState(s);
    if (idx + 1 >= today.launches.length) {
      setPhase("locked");
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
      {phase !== "judging" && yesterday && (
        <RevealStrip round={yesterday} state={state} />
      )}
      {phase === "open" && (
        <section className="mt-8 text-center card-enter">
          <p className="label">Today&apos;s round · {today.date}</p>
          <h1 className="mt-3 text-[26px] font-black leading-tight tracking-tight">
            {today.launches.length} launches are live right now.<br />Can you read them?
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-dim">
            Fresh Show HN posts + today&apos;s Product Hunt board, votes hidden. Call each one — reality scores you tomorrow 09:00.
          </p>
          <button
            onClick={() => setPhase("judging")}
            className="mt-6 rounded-xl bg-ship px-8 py-3.5 text-[16px] font-black text-black"
          >
            Make your calls →
          </button>
        </section>
      )}
      {phase === "judging" && (
        <JudgeCard
          key={today.launches[idx].id}
          launch={today.launches[idx]}
          index={idx}
          total={today.launches.length}
          onCall={recordCall}
        />
      )}
      {phase === "locked" && <LockedPanel state={state} today={today} />}
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
        {streak > 0 && <span className="text-gold">🔥 {streak}d</span>}
        {acc.total > 0 && (
          <span className="text-ink-dim">
            <span className="text-ink">{acc.pct}%</span> · {acc.total} calls
          </span>
        )}
      </div>
    </header>
  );
}

function RevealStrip({ round, state }: { round: Round<ResolvedLaunch>; state: GameState }) {
  const result = useMemo(() => scoreReveal(state, round), [state, round]);
  const crowd = useCrowd(round.date);
  const ships = round.launches.filter((l) => l.outcome === "ship");
  return (
    <section className="mt-6 rounded-xl border border-edge bg-surface p-4 card-enter">
      <div className="flex items-baseline justify-between">
        <p className="label" style={{ color: "#f59e0b" }}>
          Yesterday · what reality said
        </p>
        {result && (
          <span className="font-mono text-[13px] text-ink">
            you: {result.correct}/{result.rows.length} · +{result.score} pts
          </span>
        )}
      </div>
      <div className="mt-3 space-y-2.5">
        {round.launches.map((l) => {
          const call = result?.rows.find((r) => r.launch.id === l.id);
          return (
            <div key={l.id} className="flex items-start justify-between gap-3 text-[13px]">
              <div className="min-w-0">
                <p className="truncate text-ink">{l.title}</p>
                <p className="text-[11.5px] italic text-ink-faint">
                  {l.editorial}
                  {crowdShipPct(crowd, l.id) !== null && (
                    <span className="not-italic"> · {crowdShipPct(crowd, l.id)}% of players called ship</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {call && (
                  <span className={`font-mono text-[11px] ${call.correct ? "text-ship" : "text-miss"}`}>
                    {call.correct ? "✓" : "✗"} {call.call}
                  </span>
                )}
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    l.outcome === "ship" ? "bg-ship text-black" : "bg-surface-2 text-ink-dim"
                  }`}
                >
                  {l.source === "ph"
                    ? l.outcome === "ship" ? `top 5 · #${l.peak_rank}` : `#${l.peak_rank}`
                    : l.outcome === "ship" ? `shipped · ${l.final_points}pt` : `${l.final_points}pt`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {!result && (
        <p className="mt-3 text-[12px] text-ink-faint">
          {ships.length === 0
            ? "Nobody made the front page yesterday. Would you have called it?"
            : `${ships.length} of ${round.launches.length} shipped. Would you have called ${ships.length === 1 ? "it" : "them"}?`}
        </p>
      )}
    </section>
  );
}

function JudgeCard({
  launch, index, total, onCall,
}: {
  launch: OpenLaunch;
  index: number;
  total: number;
  onCall: (l: OpenLaunch, c: Call) => void;
}) {
  const [secs, setSecs] = useState(30);
  const [shotOk, setShotOk] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timer.current = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const shot = `https://s0.wp.com/mshots/v1/${encodeURIComponent(launch.url)}?w=640&h=760`;

  return (
    <section className="mt-6 card-enter">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i < index ? "bg-ship" : i === index ? "bg-ink" : "bg-surface-2"}`} />
          ))}
        </div>
        <span className={`font-mono text-[13px] ${secs <= 5 ? "pop text-miss" : "text-ink-faint"}`}>0:{String(secs).padStart(2, "0")}</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white text-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: SOURCE_META[launch.source].color }}>
            {SOURCE_META[launch.source].badge}
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            {launch.source === "hn" ? `${launch.age_h_at_pick}h old at pick` : "on today's board"} · {CATEGORY_LABELS[launch.category]}
          </span>
        </div>
        {shotOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="" className="max-h-[300px] w-full object-cover object-top" onError={() => setShotOk(false)} />
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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={() => onCall(launch, "ship")} className="rounded-xl bg-ship py-4 text-[19px] font-black tracking-tight text-black">
          SHIP ▲<div className="mt-0.5 text-[11px] font-medium opacity-70">{SOURCE_META[launch.source].shipLabel} · +{POINTS.ship} if right</div>
        </button>
        <button onClick={() => onCall(launch, "skip")} className="rounded-xl bg-surface-2 py-4 text-[19px] font-black tracking-tight text-ink-dim">
          SKIP ▼<div className="mt-0.5 text-[11px] font-medium opacity-60">{SOURCE_META[launch.source].skipLabel} · +{POINTS.skip} if right</div>
        </button>
      </div>
    </section>
  );
}

function BotLine({ today, calls }: { today: Round<OpenLaunch>; calls: Record<string, Call> }) {
  const bot = today.bot_calls!;
  const disagree = today.launches.filter((l) => bot[l.id] && calls[l.id] && bot[l.id] !== calls[l.id]);
  return (
    <p className="mt-3 text-[13px]" style={{ color: "#818cf8" }}>
      {disagree.length === 0
        ? "The bot made the exact same calls. Tomorrow tells you nothing about each other."
        : `The bot disagrees with you on ${disagree.length} ${disagree.length === 1 ? "call" : "calls"}${disagree.length <= 2 ? ` (${disagree.map((l) => l.title.split(/[–—-]/)[0].trim()).join(", ")})` : ""} — tomorrow shows who read it right.`}
    </p>
  );
}

function LockedPanel({ state, today }: { state: GameState; today: Round<OpenLaunch> }) {
  const acc = overallAccuracy(state);
  const calls = state.days[today.date]?.calls ?? {};
  const shipCount = Object.values(calls).filter((c) => c === "ship").length;
  const crowd = useCrowd(today.date);
  const [copied, setCopied] = useState(false);

  function share() {
    const grid = today.launches.map((l) => (calls[l.id] === "ship" ? "s" : "k")).join("");
    const streak = streakDays(state, today.date);
    const q = new URLSearchParams({ d: today.date, g: grid });
    if (acc.total > 0) q.set("pct", String(acc.pct));
    if (streak > 1) q.set("streak", String(streak));
    const url = `${location.origin}/share?${q}`;
    const text = "Called It — my blind calls on today's real launches. Reality scores me tomorrow 09:00.";
    if (navigator.share) navigator.share({ text, url }).catch(() => {});
    else { navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  }

  return (
    <section className="mt-8 text-center card-enter">
      <p className="label">Calls locked · {today.date}</p>
      <h2 className="mt-3 text-[24px] font-black tracking-tight">
        {shipCount === 0 ? "You skipped the whole field." : `You shipped ${shipCount} of ${today.launches.length}.`}
      </h2>
      <p className="mt-2 text-[14px] text-ink-dim">Reality scores you tomorrow at 09:00. Come back for the reveal.</p>
      {today.bot_calls && <BotLine today={today} calls={calls} />}
      {Object.keys(crowd).length > 0 && (
        <div className="mx-auto mt-5 max-w-sm rounded-xl border border-edge bg-surface p-4 text-left">
          <p className="label">You vs the crowd</p>
          <div className="mt-2 space-y-1.5">
            {today.launches.map((l) => {
              const pct = crowdShipPct(crowd, l.id);
              if (pct === null) return null;
              return (
                <div key={l.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="truncate text-ink-dim">{l.title.split(/[–—-]/)[0].trim()}</span>
                  <span className="shrink-0 font-mono text-[11px]">
                    <span className={calls[l.id] === "ship" ? "text-ship" : "text-ink-faint"}>{calls[l.id]}</span>
                    <span className="text-ink-faint"> · {pct}% shipped</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-edge bg-surface p-5 text-left">
        <p className="label">Your calibration</p>
        {acc.total === 0 ? (
          <p className="mt-2 text-[13px] text-ink-dim">First round on record — your profile starts with tomorrow&apos;s reveal.</p>
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
                    <span className="text-ink-dim">{CATEGORY_LABELS[cat] ?? cat}</span>
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
