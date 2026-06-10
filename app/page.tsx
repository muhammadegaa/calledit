"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FixReport, Platform, Thread } from "@/lib/schema";
import { PLATFORMS } from "@/lib/schema";
import { HNThread } from "@/components/HNThread";
import { PHThread } from "@/components/PHThread";
import { RedditThread } from "@/components/RedditThread";
import { XThread } from "@/components/XThread";
import { FixPanel } from "@/components/FixPanel";

type Phase = "idle" | "extracting" | "running";
type Tab = Platform | "fix";

const TAB_LABELS: Record<Tab, string> = {
  hn: "Hacker News",
  ph: "Product Hunt",
  reddit: "Reddit",
  x: "X",
  fix: "Fix list",
};

const LOADING_LINES: Record<Platform, string[]> = {
  hn: ["posting to news.ycombinator.com…", "the second-page lurkers found it…", "someone is typing a very long comment…"],
  ph: ["your hunter is writing the intro…", "scheduling for 12:01 AM PT…", "the congrats brigade is waking up…"],
  reddit: ["automod is sniffing your post…", "crossposting to the wrong subreddit…", "someone downvoted on principle…"],
  x: ["drafting the launch tweet…", "the quote-tweets are loading…", "a growth account just noticed you…"],
};

const SENTIMENT_COLORS = { brutal: "#ef4444", mixed: "#f59e0b", warm: "#22c55e" };

const SAMPLES = [
  { label: "codehere.uk", url: "https://codehere.uk" },
  { label: "linear.app", url: "https://linear.app" },
];

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<"url" | "text">("url");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const [product, setProduct] = useState<{ name: string; url?: string; content: string } | null>(null);
  const [threads, setThreads] = useState<Partial<Record<Platform, Thread>>>({});
  const [threadErrors, setThreadErrors] = useState<Partial<Record<Platform, string>>>({});
  const [fix, setFix] = useState<FixReport | null>(null);
  const [fixLoading, setFixLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("hn");
  const [clock, setClock] = useState(0);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstArrival = useRef(false);
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  const startClock = useCallback(() => {
    if (clockRef.current) return;
    clockRef.current = setInterval(() => {
      setClock((c) => {
        const next = c + 4;
        if (next > 420 && clockRef.current) {
          clearInterval(clockRef.current);
          clockRef.current = null;
        }
        return next;
      });
    }, 130);
  }, []);

  useEffect(() => () => { if (clockRef.current) clearInterval(clockRef.current); }, []);

  const runPlatform = useCallback(
    async (platform: Platform, p: { name: string; url?: string; content: string }) => {
      setThreadErrors((e) => ({ ...e, [platform]: undefined }));
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, ...p }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "failed");
        const thread: Thread = await res.json();
        setThreads((t) => ({ ...t, [platform]: thread }));
        if (!firstArrival.current) {
          firstArrival.current = true;
          setActiveTab(platform);
          startClock();
        }
      } catch (err) {
        setThreadErrors((e) => ({
          ...e,
          [platform]: err instanceof Error ? err.message : "Simulation failed",
        }));
      }
    },
    [startClock]
  );

  const runFix = useCallback(
    async (p: { name: string; url?: string; content: string }, allThreads: Partial<Record<Platform, Thread>>) => {
      setFixLoading(true);
      try {
        const res = await fetch("/api/fix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...p, threads: allThreads }),
        });
        if (res.ok) setFix(await res.json());
      } finally {
        setFixLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!product || fix || fixLoading) return;
    const loaded = PLATFORMS.filter((pl) => threads[pl]);
    const failed = PLATFORMS.filter((pl) => threadErrors[pl]);
    if (loaded.length > 0 && loaded.length + failed.length === PLATFORMS.length) {
      runFix(product, threads);
    }
  }, [threads, threadErrors, product, fix, fixLoading, runFix]);

  async function start() {
    setInputError(null);
    let p: { name: string; url?: string; content: string };

    if (mode === "url") {
      if (!urlInput.trim()) return;
      setPhase("extracting");
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        p = { name: data.title, url: data.url, content: data.content };
      } catch (err) {
        setInputError(err instanceof Error ? err.message : "Couldn't read that URL");
        setPhase("idle");
        return;
      }
    } else {
      if (textInput.trim().length < 40) {
        setInputError("Give the crowd a bit more to react to (40+ characters).");
        return;
      }
      p = { name: textInput.split(/[.\n]/)[0].slice(0, 60), content: textInput };
    }

    setProduct(p);
    setPhase("running");
    PLATFORMS.forEach((pl) => runPlatform(pl, p));
  }

  function reset() {
    if (clockRef.current) clearInterval(clockRef.current);
    clockRef.current = null;
    firstArrival.current = false;
    setPhase("idle");
    setThreads({});
    setThreadErrors({});
    setFix(null);
    setFixLoading(false);
    setClock(0);
    setActiveTab("hn");
  }

  if (phase !== "running") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-2xl">
          <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-red-500">
            ● The Comment Section
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            See your launch
            <br />
            before you launch.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-zinc-400">
            Paste your URL. Watch launch day unfold on Hacker News, Product Hunt,
            Reddit and X — the dunks, the congrats spam, the pricing
            interrogation — then get the fix list before any of it happens for real.
          </p>

          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex gap-2 text-[12px] font-medium">
              <button
                onClick={() => setMode("url")}
                className={`rounded-full px-3 py-1 ${mode === "url" ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                I have a URL
              </button>
              <button
                onClick={() => setMode("text")}
                className={`rounded-full px-3 py-1 ${mode === "text" ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Just an idea
              </button>
            </div>

            {mode === "url" ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && start()}
                  placeholder="yourproduct.com"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-[15px] outline-none placeholder:text-zinc-600 focus:border-zinc-400"
                />
                <button
                  onClick={start}
                  disabled={phase === "extracting"}
                  className="shrink-0 rounded-lg bg-red-600 px-5 py-3 text-[14px] font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                >
                  {phase === "extracting" ? "Reading your page…" : "Run launch day"}
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={4}
                  placeholder="Describe your product like you'd pitch it: what it does, who it's for, what it costs…"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-[15px] outline-none placeholder:text-zinc-600 focus:border-zinc-400"
                />
                <button
                  onClick={start}
                  className="mt-2 rounded-lg bg-red-600 px-5 py-3 text-[14px] font-semibold text-white hover:bg-red-500"
                >
                  Run launch day
                </button>
              </div>
            )}

            {inputError && (
              <p className="mt-3 text-[13px] text-red-400">{inputError}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
              try:
              {SAMPLES.map((s) => (
                <button
                  key={s.url}
                  onClick={() => { setMode("url"); setUrlInput(s.url); }}
                  className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-[12px] text-zinc-600">
            No login. ~60 seconds. Feedback from day minus-one.
          </p>
        </div>
      </main>
    );
  }

  const activeThread = activeTab !== "fix" ? threads[activeTab] : undefined;
  const visibleCount = activeThread ? countVisible(activeThread, clock) : 0;
  const scoreScale = Math.min(1, 0.08 + 0.92 * (clock / 300));
  const allRevealed = PLATFORMS.every((pl) => {
    const t = threads[pl];
    return !t || countVisible(t, clock) >= t.comments.length;
  });

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-[#0e0e0e]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <button onClick={reset} className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-500 hover:text-red-400">
            ● The Comment Section
          </button>
          <span className="hidden truncate text-[13px] text-zinc-500 sm:block">
            {product?.name}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-[12px] tabular-nums text-zinc-300">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-red-500" />
              T+{formatClock(clock)}
            </span>
            {!allRevealed && (
              <button
                onClick={() => setClock(9999)}
                className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
              >
                skip ahead
              </button>
            )}
            <button
              onClick={reset}
              className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              new launch
            </button>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {([...PLATFORMS, "fix"] as Tab[]).map((tab) => {
            const t = tab !== "fix" ? threads[tab as Platform] : undefined;
            const failed = tab !== "fix" && threadErrors[tab as Platform];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex shrink-0 items-center gap-2 rounded-t-lg border-x border-t px-3.5 py-2 text-[13px] ${
                  activeTab === tab
                    ? "border-zinc-700 bg-zinc-900 font-semibold text-zinc-100"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {TAB_LABELS[tab]}
                {tab === "fix" ? (
                  fixLoading ? <Spinner /> : fix ? (
                    <span className="rounded bg-red-600 px-1.5 text-[10px] font-bold text-white tabular-nums">
                      {fix.objections.length}
                    </span>
                  ) : null
                ) : failed ? (
                  <span className="text-[10px] text-red-400">!</span>
                ) : t ? (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: SENTIMENT_COLORS[t.sentiment] }}
                  />
                ) : (
                  <Spinner />
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 border-x border-zinc-800">
        {activeTab === "fix" ? (
          fix ? (
            <FixPanel report={fix} />
          ) : (
            <LoadingBox lines={["reading all four rooms…", "merging duplicate objections…", "writing the fix list…"]} />
          )
        ) : threadErrors[activeTab] ? (
          <div className="flex flex-col items-center gap-3 py-24">
            <p className="text-[14px] text-zinc-400">{threadErrors[activeTab]}</p>
            <button
              onClick={() => product && runPlatform(activeTab, product)}
              className="rounded bg-zinc-100 px-4 py-2 text-[13px] font-semibold text-zinc-900"
            >
              Retry
            </button>
          </div>
        ) : !activeThread ? (
          <LoadingBox lines={LOADING_LINES[activeTab]} />
        ) : activeTab === "hn" ? (
          <HNThread thread={activeThread} visibleCount={visibleCount} scoreScale={scoreScale} />
        ) : activeTab === "ph" ? (
          <PHThread thread={activeThread} visibleCount={visibleCount} scoreScale={scoreScale} />
        ) : activeTab === "reddit" ? (
          <RedditThread thread={activeThread} visibleCount={visibleCount} scoreScale={scoreScale} />
        ) : (
          <XThread thread={activeThread} visibleCount={visibleCount} scoreScale={scoreScale} />
        )}
      </div>
    </main>
  );
}

function countVisible(thread: Thread, clock: number): number {
  const times = thread.comments.map((c) => c.minutesAfter).sort((a, b) => a - b);
  let n = 0;
  for (const t of times) if (t <= clock) n++;
  return n;
}

function formatClock(minutes: number): string {
  const m = Math.min(minutes, 360);
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return `${h}h ${String(mm).padStart(2, "0")}m`;
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-transparent" />
  );
}

function LoadingBox({ lines }: { lines: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => x + 1), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-4 py-28">
      <Spinner />
      <p className="font-mono text-[13px] text-zinc-500">
        {lines[i % lines.length]}
      </p>
    </div>
  );
}
