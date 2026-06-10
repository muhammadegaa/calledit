import type { Metadata } from "next";
import Link from "next/link";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const q = new URLSearchParams();
  for (const k of ["d", "g", "pct", "streak"]) if (p[k]) q.set(k, p[k]!);
  const og = `/api/og?${q}`;
  const title = `Called It — my calls for ${p.d ?? "today"}`;
  return {
    title,
    description: "Real launches, judged blind. Reality keeps score.",
    openGraph: { title, images: [og] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default async function SharePage({ searchParams }: Props) {
  const p = await searchParams;
  const grid = (p.g ?? "").slice(0, 12).split("");
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-[15px] font-black tracking-tight">
        CALLED<span className="text-ship">/</span>IT
      </p>
      <div className="mt-8 flex gap-2.5">
        {grid.map((c, i) => (
          <div key={i} className={`flex h-12 w-12 items-center justify-center rounded-lg font-mono text-[18px] ${c === "s" ? "bg-ship text-black" : "bg-surface-2 text-ink-faint"}`}>
            {c === "s" ? "▲" : "▼"}
          </div>
        ))}
      </div>
      <p className="mt-5 font-mono text-[13px] text-ink-dim">
        {p.d} {p.pct && <>· <span className="text-ship">{p.pct}% calibrated</span></>} {p.streak && Number(p.streak) > 1 && <>· <span className="text-gold">🔥 {p.streak}d</span></>}
      </p>
      <p className="mt-6 max-w-sm text-[14.5px] text-ink-dim">
        These are someone&apos;s blind calls on yesterday&apos;s real launches. Reality already scored them. Think you read launches better?
      </p>
      <Link href="/" className="mt-6 rounded-xl bg-ship px-8 py-3.5 text-[15px] font-black text-black">
        Play today&apos;s round →
      </Link>
    </main>
  );
}
