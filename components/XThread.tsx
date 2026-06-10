import type { Thread, Comment } from "@/lib/schema";
import { Avatar, timeLabel } from "./shared";

export function XThread({
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
    <div className="bg-black pb-8 font-sans text-[#e7e9ea]">
      <div className="mx-auto max-w-[600px]">
        <div className="border-b border-[#2f3336] px-4 py-3">
          <div className="flex gap-3">
            <Avatar name={thread.postMeta} size={44} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold">
                  {handleToName(thread.postMeta)}
                </span>
                <VerifiedBadge />
                <span className="text-[14px] text-[#71767b]">
                  {thread.postMeta}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-[16px] leading-normal">
                {thread.postTitle}
              </p>
              <div className="mt-3 flex gap-6 text-[13px] text-[#71767b]">
                <span>💬 {visible.length}</span>
                <span>
                  🔁 {Math.round((thread.totalScore * scoreScale) / 4)}
                </span>
                <span className="text-[#f91880]">
                  ♥ {Math.max(1, Math.round(thread.totalScore * scoreScale))}
                </span>
                <span>📊</span>
              </div>
            </div>
          </div>
        </div>
        {visible.map((c, i) => (
          <XComment key={i} c={c} />
        ))}
      </div>
    </div>
  );
}

function XComment({ c }: { c: Comment }) {
  const isQT = c.text.startsWith("QT: ");
  const text = isQT ? c.text.slice(4) : c.text;
  return (
    <div
      className="comment-enter border-b border-[#2f3336] px-4 py-3"
      style={{ marginLeft: c.depth * 20 }}
    >
      <div className="flex gap-3">
        <Avatar name={c.author} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[14px]">
            <span className="font-bold">{handleToName(c.author)}</span>
            {c.authorFlair === "verified" && <VerifiedBadge />}
            <span className="text-[#71767b]">{ensureAt(c.author)}</span>
            <span className="text-[#71767b]">· {timeLabel(c.minutesAfter)}</span>
            {isQT && (
              <span className="rounded-full border border-[#2f3336] px-2 py-px text-[11px] text-[#71767b]">
                Quote
              </span>
            )}
            {c.authorFlair === "follows you" && (
              <span className="rounded bg-[#2f3336] px-1.5 py-px text-[11px] text-[#71767b]">
                Follows you
              </span>
            )}
            {c.isMaker && (
              <span className="rounded bg-[#16181c] px-1.5 py-px text-[11px] text-[#1d9bf0]">
                Author
              </span>
            )}
          </div>
          <p className="mt-0.5 whitespace-pre-line text-[15px] leading-normal">
            {text}
          </p>
          <div className="mt-2 flex gap-8 text-[12.5px] text-[#71767b]">
            <span>💬</span>
            <span>🔁 {c.score > 100 ? Math.round(c.score / 5) : ""}</span>
            <span className={c.score > 400 ? "text-[#f91880]" : ""}>
              ♥ {c.score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" className="h-[16px] w-[16px] fill-[#1d9bf0]">
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

function handleToName(handle: string): string {
  const base = handle.replace(/^@/, "").replace(/[_0-9]+/g, " ").trim();
  return base
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 20) || handle.replace(/^@/, "");
}
function ensureAt(name: string): string {
  return name.startsWith("@") ? name : `@${name}`;
}
