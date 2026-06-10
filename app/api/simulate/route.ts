import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ThreadSchema, PLATFORMS, type Platform } from "@/lib/schema";
import { simulateSystemPrompt, productUserMessage } from "@/lib/prompts";

export const maxDuration = 120;

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { platform, name, url, content } = await req.json();
    if (!PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    if (process.env.MOCK_SIM === "1") {
      const { MOCK_THREADS } = await import("@/lib/mock");
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2500));
      return NextResponse.json(MOCK_THREADS[platform as Platform]);
    }

    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: simulateSystemPrompt(platform as Platform),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: productUserMessage({ name, url, content }),
        },
      ],
      output_config: { format: zodOutputFormat(ThreadSchema) },
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Generation failed, try again" },
        { status: 502 }
      );
    }
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    console.error("simulate error", err);
    const status =
      err instanceof Anthropic.RateLimitError
        ? 429
        : err instanceof Anthropic.APIError
          ? 502
          : 500;
    return NextResponse.json(
      { error: "Simulation failed, try again" },
      { status }
    );
  }
}
