import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { OpenLaunch, ResolvedLaunch, Round } from "@/lib/game";
import { Game } from "@/components/Game";

export const dynamic = "force-dynamic";

function loadRounds(): {
  today: Round<OpenLaunch> | null;
  resolved: Round<ResolvedLaunch>[];
} {
  const dir = join(process.cwd(), "data", "rounds");
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().reverse();
  } catch {}
  let today: Round<OpenLaunch> | null = null;
  const resolved: Round<ResolvedLaunch>[] = [];
  for (const f of files) {
    const round = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (round.status === "open" && !today) today = round;
    else if (round.status === "resolved") resolved.push(round);
  }
  return { today, resolved };
}

export default function Home() {
  const { today, resolved } = loadRounds();
  if (!today) {
    return (
      <main className="flex min-h-screen items-center justify-center text-ink-dim">
        Today&apos;s round is being picked — back in a minute.
      </main>
    );
  }
  return <Game today={today} yesterday={resolved[0] ?? null} />;
}
