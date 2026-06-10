import type { Thread } from "@/lib/schema";
import { Avatar, timeLabel } from "./shared";

export function RedditThread({
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
    <div className="bg-[#dae0e6] pb-6 font-sans">
      <div className="mx-auto max-w-[760px] px-2 pt-3">
        <div className="rounded border border-[#ccc] bg-white">
          <div className="flex">
            <div className="flex w-10 flex-col items-center gap-1 rounded-l bg-[#f8f9fa] py-3 text-[#878a8c]">
              <span className="text-[16px] leading-none">⬆</span>
              <span className="text-[12px] font-bold text-[#ff4500]">
                {formatK(Math.max(1, Math.round(thread.totalScore * scoreScale)))}
              </span>
              <span className="text-[16px] leading-none">⬇</span>
            </div>
            <div className="min-w-0 flex-1 px-3 py-2.5">
              <div className="text-[11px] text-[#787c7e]">
                <span className="font-bold text-black">{thread.postMeta}</span>
                {" · Posted by "}
                <span>u/{stripU(threadAuthor(thread))}</span>
              </div>
              <h2 className="mt-1 text-[17px] font-medium leading-snug text-[#222]">
                {thread.postTitle}
              </h2>
              <div className="mt-2 text-[11.5px] font-bold text-[#878a8c]">
                💬 {visible.length} Comments&nbsp;&nbsp;↗ Share&nbsp;&nbsp;💾 Save
              </div>
            </div>
          </div>
          <div className="space-y-3.5 border-t border-[#edeff1] px-4 py-3">
            {visible.map((c, i) => (
              <div
                key={i}
                className="comment-enter flex gap-2"
                style={{ marginLeft: c.depth * 24 }}
              >
                <div className="flex flex-col items-center">
                  <Avatar name={c.author} size={24} />
                  {c.depth < 2 && (
                    <div className="mt-1 w-px flex-1 bg-[#edeff1]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                    <span className="font-bold text-[#1a1a1b]">
                      {ensureU(c.author)}
                    </span>
                    {c.isMaker && (
                      <span className="font-bold text-[#0079d3]">OP</span>
                    )}
                    {c.authorFlair && !c.isMaker && (
                      <span className="rounded bg-[#f6f7f8] px-1 text-[10px] text-[#7c7c7c]">
                        {c.authorFlair}
                      </span>
                    )}
                    <span className="text-[#787c7e]">
                      · {timeLabel(c.minutesAfter)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] leading-[1.45] text-[#1a1a1b] whitespace-pre-line">
                    {c.text}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11.5px] font-bold text-[#878a8c]">
                    <span className="flex items-center gap-1">
                      ⬆{" "}
                      <span
                        className={
                          c.score < 0 ? "text-[#7193ff]" : "text-[#1a1a1b]"
                        }
                      >
                        {c.score}
                      </span>{" "}
                      ⬇
                    </span>
                    <span>Reply</span>
                    <span>Share</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function stripU(name: string): string {
  return name.replace(/^u\//, "");
}
function ensureU(name: string): string {
  return name.startsWith("u/") ? name : `u/${name}`;
}
function threadAuthor(thread: Thread): string {
  return thread.comments.find((c) => c.isMaker)?.author ?? "maker";
}
