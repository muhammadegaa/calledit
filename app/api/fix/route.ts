import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { FixSchema, type Thread, type Platform } from "@/lib/schema";
import { FIX_SYSTEM, productUserMessage } from "@/lib/prompts";

export const maxDuration = 120;

const client = new Anthropic();

const PLATFORM_LABELS: Record<Platform, string> = {
  hn: "HACKER NEWS",
  ph: "PRODUCT HUNT",
  reddit: "REDDIT",
  x: "X (TWITTER)",
};

function compactThreads(threads: Partial<Record<Platform, Thread>>): string {
  return (Object.entries(threads) as [Platform, Thread][])
    .map(([platform, t]) => {
      const comments = t.comments
        .map(
          (c) =>
            `${"  ".repeat(c.depth)}[${c.score}] ${c.author}${c.isMaker ? " (MAKER)" : ""}: ${c.text}`
        )
        .join("\n");
      return `=== ${PLATFORM_LABELS[platform]} — "${t.postTitle}" (${t.totalScore} points, ${t.sentiment}) ===\n${comments}`;
    })
    .join("\n\n");
}

export async function POST(req: Request) {
  try {
    const { name, url, content, threads } = await req.json();
    if (!content || !threads) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    if (process.env.MOCK_SIM === "1") {
      const { MOCK_FIX } = await import("@/lib/mock");
      await new Promise((r) => setTimeout(r, 2000));
      return NextResponse.json(MOCK_FIX);
    }

    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      system: [
        { type: "text", text: FIX_SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: `${productUserMessage({ name, url, content })}\n\nSIMULATED THREADS:\n${compactThreads(threads)}`,
        },
      ],
      output_config: { format: zodOutputFormat(FixSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Analysis failed, try again" },
        { status: 502 }
      );
    }
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    console.error("fix error", err);
    return NextResponse.json(
      { error: "Analysis failed, try again" },
      { status: 500 }
    );
  }
}
