import type { FixReport, Platform, Thread } from "./schema";

export const MOCK_THREADS: Record<Platform, Thread> = {
  hn: {
    postTitle: "Show HN: Codehere – a trust layer for AI coding agents",
    postTagline: null,
    postMeta: "egasim",
    totalScore: 87,
    sentiment: "mixed",
    comments: [
      { author: "kmod", authorFlair: null, text: "Maybe I'm missing something, but isn't \"a plain-English report with a trust score\" just asking a second LLM to grade the first one? What happens when the grader is wrong?", score: 64, minutesAfter: 22, depth: 0, isMaker: false },
      { author: "egasim", authorFlair: null, text: "Fair question. The report is fact-checked against the recorded actions, not regenerated — every file change is hash-chained, so the report can't claim something that didn't happen. The trust score is deterministic from the diff, not vibes.", score: 18, minutesAfter: 31, depth: 1, isMaker: true },
      { author: "jsneedles", authorFlair: null, text: "Hash-chained per file is doing a lot of work in that sentence. Chained to what root of trust?", score: 22, minutesAfter: 45, depth: 2, isMaker: false },
      { author: "gpd_", authorFlair: null, text: "Congrats on shipping. Took a look — the local-first angle is the right call, I will not pipe my repo through someone's SaaS.", score: 11, minutesAfter: 58, depth: 0, isMaker: false },
      { author: "throwaway2347", authorFlair: null, text: "Built almost exactly this in 2023 for internal use. What killed it: nobody reads the reports after week two. They just merge.", score: 41, minutesAfter: 95, depth: 0, isMaker: false },
    ],
  },
  ph: {
    postTitle: "Codehere",
    postTagline: "A PM for your AI coding agents",
    postMeta: "Developer Tools • Artificial Intelligence",
    totalScore: 312,
    sentiment: "warm",
    comments: [
      { author: "Priya Sharma", authorFlair: "Hunter", text: "Hunting this because every team I know is drowning in unreviewed AI PRs 🙌 Codehere watches your agents work and tells you what to trust. The hash-chain receipts are genuinely clever.", score: 38, minutesAfter: 3, depth: 0, isMaker: false },
      { author: "Muhammad Ega", authorFlair: "Maker", text: "Thanks Priya! 🚀 Solo-built this after one too many \"looks good to me\" merges on agent code. AMA all day.", score: 21, minutesAfter: 9, depth: 1, isMaker: true },
      { author: "Tom Keller", authorFlair: null, text: "Congrats on the launch! 🔥🔥", score: 4, minutesAfter: 25, depth: 0, isMaker: false },
      { author: "Ana Botelho", authorFlair: "Product Lead", text: "Love this! Quick q — what does pricing look like for teams once it's out of invite-only?", score: 12, minutesAfter: 74, depth: 0, isMaker: false },
    ],
  },
  reddit: {
    postTitle: "I built a tool that fact-checks what AI coding agents tell you they did",
    postTagline: null,
    postMeta: "r/SideProject",
    totalScore: 214,
    sentiment: "mixed",
    comments: [
      { author: "spaghetticoder", authorFlair: null, text: "so it's a babysitter for claude code", score: 187, minutesAfter: 41, depth: 0, isMaker: false },
      { author: "dataguy_88", authorFlair: null, text: "tried the landing page. \"invite-only early access\" — why post it here if i can't use it lol", score: 56, minutesAfter: 67, depth: 0, isMaker: false },
      { author: "egasim", authorFlair: null, text: "Invites are going out daily, it's about server capacity not exclusivity. The core is open source if you want to run it now.", score: -8, minutesAfter: 80, depth: 1, isMaker: true },
      { author: "Severe_Tradition2899", authorFlair: null, text: "honestly the report thing is smart. i never read agent diffs anymore, i just vibe-merge. would use if free tier exists", score: 34, minutesAfter: 122, depth: 0, isMaker: false },
    ],
  },
  x: {
    postTitle: "I built a trust layer for AI coding agents.\n\nDelegate to Claude Code, Codex, or Aider — get back a fact-checked report with a trust score on every file.\n\nLocal-first. Open source. 🧵",
    postTagline: null,
    postMeta: "@egasim",
    totalScore: 642,
    sentiment: "mixed",
    comments: [
      { author: "@buildwithmarc", authorFlair: "follows you", text: "lets gooo 🔥 been waiting for this since you teased it", score: 23, minutesAfter: 6, depth: 0, isMaker: false },
      { author: "@0xKira", authorFlair: "verified", text: "QT: \"trust score on every file\" — we built an entire industry on not reading code and now we pay startups to tell us it's fine. incredible timeline", score: 1840, minutesAfter: 88, depth: 0, isMaker: false },
      { author: "@jess_codes", authorFlair: null, text: "does it work with agents running in CI or only local sessions?", score: 9, minutesAfter: 102, depth: 0, isMaker: false },
      { author: "@egasim", authorFlair: null, text: "local-first today, CI runner is next on the roadmap. the hash chain design was built for CI from day one", score: 14, minutesAfter: 110, depth: 1, isMaker: true },
      { author: "@plaintext_dev", authorFlair: null, text: "the actually interesting part nobody is quoting: the report is checked against recorded actions, not self-reported by the agent. that's the whole ballgame", score: 2, minutesAfter: 240, depth: 0, isMaker: false },
    ],
  },
};

export const MOCK_FIX: FixReport = {
  verdict: "The product is credible but the gate is killing you — every crowd hit the invite wall before they hit the value.",
  readinessScore: 58,
  objections: [
    {
      title: "Invite-only wall is the top objection on every platform",
      severity: "critical",
      platforms: ["reddit", "hn", "ph"],
      quote: "why post it here if i can't use it lol",
      fix: "Ship a self-serve path before launch: let anyone run the open-source core in 2 commands, gate only the hosted dashboard.",
    },
    {
      title: "\"Trust score\" reads as vibes until you explain the mechanism",
      severity: "major",
      platforms: ["hn", "x"],
      quote: "isn't this just asking a second LLM to grade the first one?",
      fix: "Put the fact-check mechanism in the hero: 'Reports are verified against recorded actions, not self-reported.' That one sentence converted skeptics in the thread.",
    },
  ],
};
