# The Comment Section — Hackathon Plan

**Hackathon:** Mind the Product "Everyone Ships Now" (Devpost) · Deadline **June 20, 2026, 5:00 PM GMT**
**Product:** Paste your URL → watch your launch day happen before it happens. Simulated PH + HN + Reddit + X threads in pixel-faithful chrome, comments arriving on a launch clock, then a "what they'll tear apart" fix panel.
**Tagline:** *See your launch before you launch.* Demo line: "Novus gives you feedback from day one. This gives you feedback from day minus-one."

## Decision record (Round 1 + 2, June 9)
- Won over "Stakeholder Room" (input friction is structural: a stranger has a URL, not a roadmap), "Premortem" (earlywarningindex.com ships the skeleton, Orig 7), "Product Sense Daily" (sixth-sense.app ~70% overlap), "Mom Test interviewer" (YC sims own the mechanic).
- Verified gap (June 2026): multi-platform launch simulation unoccupied. Adjacent: ysimulator.run (HN-only), Rally/askrally.com (HN personas, waitlist, research tool), PH Chaos Generator (PH-only).
- Honest scores: PT 9 / Craft 9 (target) / Orig 8 / Ship 9.
- **Novus facts (verified):** Novus = Pendo's "product agent" (Pendo owns MTP). Install = connect GitHub repo + JS snippet at novus.pendo.io. Tracks clicks/routes/funnels/session replays, surfaces "Signals". Free open beta. Dashboard screenshot must show real captured behavior → build click-heavy, multi-route, with a funnel; drive real users before screenshotting.
- **Manual checks pending:** Devpost prize structure (agent read "product bundle up to $2,000", brief said $10k/$5k cash) + judge names (JS-rendered section).

## Architecture
- Next.js App Router + TS + Tailwind, Vercel. Anthropic SDK, `claude-opus-4-8`, structured outputs (`messages.parse` + `zodOutputFormat`), `cache_control` on voice-corpus system prompts.
- Routes: `POST /api/extract` (URL → title+content), `POST /api/simulate` (platform + content → thread JSON; client fans out 4 parallel calls), `POST /api/fix` (4 threads → objections + fixes + readiness score).
- Client: launch clock animates comment arrival (minutesAfter ≤ clock). Tabs per platform + Fix List tab.
- Voice quality is the make-or-break: platform archetypes live in `lib/prompts.ts`. Comments MUST reference concrete specifics from the pasted page.

## Schedule (11 days)
- **Day 1 (Jun 9):** decision locked, scaffold, e2e v1 (extract → 4 threads → fix panel → animated UI). ← this session
- **Day 2-3:** voice-quality iteration on real products (his own: klipit.video, codehere.uk), platform chrome polish, edge cases (any URL, no-URL description mode).
- **Day 4:** Supabase permalinks (`/s/[id]`), share cards / OG images, re-simulate loop ("edit pitch → run again → diff").
- **Day 5:** deploy to Vercel, custom domain?, Novus install (GitHub repo + snippet), seed real traffic.
- **Day 6-7:** /design-review + /qa passes, whimsy details, mobile.
- **Day 8:** demo video (2-3 min), written description, Novus dashboard screenshot.
- **Day 9-10:** share to MTP community / X for voting window, buffer.
- **Day 11 (Jun 19):** submit a day early.

## Quality bar notes
- HN comments must pass the smell test of someone with 10k karma. No emoji on HN. Negative scores possible on Reddit. Power-law vote distributions. Maker replies slightly defensive.
- Fix panel must be actionable, not theater: each objection = severity + representative quote + concrete fix.
- No login anywhere. Sample products one click away for strangers with nothing to paste.
