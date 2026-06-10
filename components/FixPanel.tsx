import type { FixReport, Platform } from "@/lib/schema";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-600 text-white",
  major: "bg-amber-500 text-black",
  minor: "bg-zinc-300 text-zinc-800",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  hn: "HN",
  ph: "Product Hunt",
  reddit: "Reddit",
  x: "X",
};

export function FixPanel({ report }: { report: FixReport }) {
  return (
    <div className="bg-[#faf8f4] px-5 py-8 font-sans text-zinc-900">
      <div className="mx-auto max-w-[680px]">
        <div className="flex items-end justify-between gap-6 border-b-2 border-zinc-900 pb-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Fix before you launch
            </p>
            <p className="mt-2 text-[19px] font-medium leading-snug">
              {report.verdict}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[42px] font-bold leading-none tabular-nums">
              {report.readinessScore}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              readiness / 100
            </div>
          </div>
        </div>

        <ol className="mt-6 space-y-5">
          {report.objections.map((o, i) => (
            <li key={i} className="rounded-lg border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLES[o.severity]}`}
                >
                  {o.severity}
                </span>
                <h3 className="text-[15.5px] font-semibold">{o.title}</h3>
                <span className="ml-auto text-[11px] text-zinc-400">
                  {o.platforms
                    .map((p) => PLATFORM_LABELS[p as Platform] ?? p)
                    .join(" · ")}
                </span>
              </div>
              <blockquote className="mt-3 border-l-2 border-zinc-300 pl-3 text-[13.5px] italic text-zinc-600">
                “{o.quote}”
              </blockquote>
              <p className="mt-3 text-[14px] leading-relaxed">
                <span className="font-bold">Do this: </span>
                {o.fix}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
