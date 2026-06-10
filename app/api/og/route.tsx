import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const date = p.get("d") ?? "";
  const grid = (p.get("g") ?? "").slice(0, 12).split("");
  const pct = p.get("pct");
  const streak = p.get("streak");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0b", color: "#fafafa", fontFamily: "monospace" }}>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 900, letterSpacing: -1 }}>
          CALLED<span style={{ color: "#22c55e" }}>/</span>IT
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {grid.map((c, i) => (
            <div key={i} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: c === "s" ? "#22c55e" : "#27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, color: c === "s" ? "#000" : "#71717a" }}>
              {c === "s" ? "▲" : "▼"}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 26, color: "#a1a1aa", gap: 28 }}>
          <span>{date}</span>
          {pct && <span style={{ color: "#22c55e" }}>{pct}% calibrated</span>}
          {streak && Number(streak) > 1 && <span style={{ color: "#f59e0b" }}>🔥 {streak} days</span>}
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 24, color: "#71717a" }}>
          can you read a launch? · calledit.io
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
