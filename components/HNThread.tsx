import type { Thread } from "@/lib/schema";
import { hnTimeLabel } from "./shared";

const FONT = "Verdana, Geneva, sans-serif";

export function HNThread({
  thread,
  visibleCount,
  scoreScale,
}: {
  thread: Thread;
  visibleCount: number;
  scoreScale: number;
}) {
  const visible = thread.comments.slice(0, visibleCount);
  return (
    <div className="bg-[#f6f6ef] text-black" style={{ fontFamily: FONT }}>
      <div className="flex items-center gap-2 bg-[#ff6600] px-2 py-1">
        <div className="border border-white px-[3px] text-[12px] font-bold text-white leading-[14px]">
          Y
        </div>
        <span className="text-[13px] font-bold text-black">Hacker News</span>
        <span className="text-[12px] text-black/80">
          new | past | comments | ask | show | jobs
        </span>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[#828282] text-[12px]">▲</span>
          <span className="text-[13.5px] leading-snug">{thread.postTitle}</span>
        </div>
        <div className="ml-4 text-[10.5px] text-[#828282]">
          {Math.max(1, Math.round(thread.totalScore * scoreScale))} points by{" "}
          {thread.postMeta} | hide | {visible.length} comments
        </div>
      </div>
      <div className="space-y-3 px-3 pb-6 pt-2">
        {visible.map((c, i) => (
          <div
            key={i}
            className="comment-enter flex gap-1.5"
            style={{ marginLeft: c.depth * 28 }}
          >
            <span className="mt-[3px] text-[10px] text-[#828282]">▲</span>
            <div className="min-w-0">
              <div className="text-[10.5px] text-[#828282]">
                <span className={c.isMaker ? "text-[#3c963c]" : ""}>
                  {c.author}
                </span>{" "}
                {hnTimeLabel(c.minutesAfter)} | prev | next [–]
              </div>
              <p className="mt-0.5 text-[13px] leading-[1.4] text-black whitespace-pre-line">
                {c.text}
              </p>
              <div className="mt-1 text-[9.5px] text-[#828282] underline">
                reply
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
