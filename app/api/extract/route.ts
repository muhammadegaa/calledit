import { NextResponse } from "next/server";
import { extractFromUrl } from "@/lib/extract";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    const result = await extractFromUrl(url);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Couldn't reach that URL";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
