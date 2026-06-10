import type { Thread } from "@/lib/schema";
import { Avatar, timeLabel } from "./shared";

export function PHThread({
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
    <div className="bg-white font-sans text-[#21293c]">
      <div className="border-b border-[#e8e8e8] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6154] to-[#ff8b80] text-2xl font-bold text-white">
              {thread.postTitle.charAt(0)}
            </div>
            <div>
              <h2 className="text-[17px] font-semibold">{thread.postTitle}</h2>
              {thread.postTagline && (
                <p className="text-[14px] text-[#4b587c]">{thread.postTagline}</p>
              )}
              <p className="mt-1 text-[12px] text-[#9b9b9b]">{thread.postMeta}</p>
            </div>
          </div>
          <div className="flex flex-col items-center rounded-lg border-2 border-[#ff6154] px-4 py-2 text-[#ff6154]">
            <span className="text-[11px] font-bold">▲</span>
            <span className="text-[15px] font-bold">
              {Math.max(1, Math.round(thread.totalScore * scoreScale))}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-5 px-5 py-4 pb-8">
        {visible.map((c, i) => (
          <div
            key={i}
            className="comment-enter flex gap-3"
            style={{ marginLeft: c.depth * 36 }}
          >
            <Avatar name={c.author} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold">{c.author}</span>
                {(c.isMaker || c.authorFlair) && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      c.isMaker || c.authorFlair === "Maker"
                        ? "bg-[#ff6154] text-white"
                        : "bg-[#f0f0f0] text-[#4b587c]"
                    }`}
                  >
                    {c.isMaker ? "Maker" : c.authorFlair}
                  </span>
                )}
                <span className="text-[12px] text-[#9b9b9b]">
                  {timeLabel(c.minutesAfter)}
                </span>
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-[#21293c] whitespace-pre-line">
                {c.text}
              </p>
              <div className="mt-1.5 flex items-center gap-4 text-[12px] font-medium text-[#9b9b9b]">
                <span>Upvote ({c.score})</span>
                <span>Reply</span>
                <span>Share</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
