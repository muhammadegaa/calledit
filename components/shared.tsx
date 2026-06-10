export function avatarColor(name: string): string {
  const colors = [
    "#e07a5f", "#3d8168", "#5f7adb", "#b5838d", "#bc6c25",
    "#6d597a", "#457b9d", "#2a9d8f", "#c1121f", "#7209b7",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export function Avatar({
  name,
  size = 32,
  square = false,
}: {
  name: string;
  size?: number;
  square?: boolean;
}) {
  const letter = name.replace(/^[@u]\/?/, "").charAt(0).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: avatarColor(name),
        borderRadius: square ? 6 : "50%",
      }}
    >
      {letter}
    </div>
  );
}

export function timeLabel(minutesAfter: number): string {
  if (minutesAfter < 1) return "just now";
  if (minutesAfter < 60) return `${Math.round(minutesAfter)}m`;
  return `${Math.floor(minutesAfter / 60)}h${minutesAfter % 60 >= 30 ? " 30m" : ""}`;
}

export function hnTimeLabel(minutesAfter: number): string {
  if (minutesAfter < 1) return "just now";
  if (minutesAfter < 60) return `${Math.round(minutesAfter)} minutes ago`;
  const h = Math.floor(minutesAfter / 60);
  return `${h} hour${h > 1 ? "s" : ""} ago`;
}
