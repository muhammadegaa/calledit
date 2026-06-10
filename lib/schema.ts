import { z } from "zod";

export const CommentSchema = z.object({
  author: z.string(),
  authorFlair: z.string().nullable(),
  text: z.string(),
  score: z.number(),
  minutesAfter: z.number(),
  depth: z.number(),
  isMaker: z.boolean(),
});

export const ThreadSchema = z.object({
  postTitle: z.string(),
  postTagline: z.string().nullable(),
  postMeta: z.string(),
  totalScore: z.number(),
  sentiment: z.enum(["brutal", "mixed", "warm"]),
  comments: z.array(CommentSchema),
});

export const FixSchema = z.object({
  verdict: z.string(),
  readinessScore: z.number(),
  objections: z.array(
    z.object({
      title: z.string(),
      severity: z.enum(["critical", "major", "minor"]),
      platforms: z.array(z.string()),
      quote: z.string(),
      fix: z.string(),
    })
  ),
});

export type Comment = z.infer<typeof CommentSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
export type FixReport = z.infer<typeof FixSchema>;

export const PLATFORMS = ["hn", "ph", "reddit", "x"] as const;
export type Platform = (typeof PLATFORMS)[number];
