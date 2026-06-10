import { NextResponse } from "next/server";
import { insertCalls } from "@/lib/db";

export const maxDuration = 15;

export async function POST(req: Request) {
  try {
    const { anon_id, round_date, calls } = await req.json();
    if (
      typeof anon_id !== "string" || anon_id.length < 8 || anon_id.length > 64 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(round_date ?? "") ||
      !Array.isArray(calls) || calls.length === 0 || calls.length > 12 ||
      calls.some((c) => typeof c.launch_id !== "string" || !["ship", "skip"].includes(c.call))
    ) {
      return NextResponse.json({ error: "bad payload" }, { status: 400 });
    }
    await insertCalls(anon_id, round_date, calls);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("calls error", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
