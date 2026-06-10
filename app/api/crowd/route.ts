import { NextResponse } from "next/server";
import { getCrowd } from "@/lib/db";

export const maxDuration = 15;

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "bad date" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getCrowd(date));
  } catch (err) {
    console.error("crowd error", err);
    return NextResponse.json({ __diag: String(err) });
  }
}
