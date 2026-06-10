# Called It — Hackathon Plan of Record

**Hackathon:** Mind the Product "Everyone Ships Now" (Devpost) · deadline **June 20, 2026, 5 PM GMT**, submit June 19.
**Product:** **Called It** (calledit.io — to buy) — daily prediction game on REAL live launches. Judge today's Show HN + Product Hunt launches in 30s each (SHIP/SKIP), reality scores you within 24h. Streaks, per-category calibration, share card, and a Claude bot to beat.
**Canonical spec:** `plan/ship-or-skip-plan.html` (Thariq P1 interactive plan) + `design_system.html` (P7, all UI obeys it). Work order, verification criteria, and non-goals live in the plan file.

## Decision record
- **Jun 9:** "The Comment Section" locked after Rounds 1-2; Day-1 MVP built (works on mock data, commit d65ed0c — parked, code stays).
- **Jun 10:** Ega restarted brainstorm wider (genre fatigue: everything was paste→personas). Round 1B with fresh adversarial research produced **Ship or Skip → renamed Called It**: the only idea clearing 8+ on all four criteria with a different body plan (real data, real resolution, no AI in the core loop). Verified open: the "resolves against live reality in 24h" mechanic exists nowhere (sixth-sense = past decisions; phgame = dead 2019 historical hack; Manifold = ad-hoc one-offs).
- **Spec locked (P2):** both sources as two leagues (HN organic: front page ≤24h; PH launch-machine: top 5 of day; fallback HN-only if PH token late) · Claude bot competes in v1 · rounds cut 09:00 WIB fixed · name = Called It.

## D0 spike findings (Jun 10, verified)
- HN Algolia: 23 judgeable Show HN candidates in today's 2-9h window; 98 resolved launches over last 1-4 days. Seed resolution rule (≥40 pts) produces sane outcomes; live cron will track real top-30 rank.
- **Ship base rate is ~6%** → scoring MUST be asymmetric (correct SHIP >> correct SKIP, missed winner penalized) and round curation should mix momentum tiers. Design this in D1-2.
- PH leaderboard page is server-rendered + scrapeable as fallback; official GraphQL token is the clean path.
- Script: `scripts/spike.mjs` → `data/spike/*.json`.

## User actions needed
1. **Top up Anthropic API credits** (all local keys dead) — blocks the bot + editorial lines, needed by ~Jun 14.
2. **Create PH developer token** at api.producthunt.com (5 min) — needed by Jun 12 or we ship HN-only.
3. **Buy calledit.io** (runner-up: frontpage.game, also available).

## Novus (required for eligibility)
Connect GitHub repo + JS snippet at novus.pendo.io on deploy day (D4/Jun 14). Game is maximally click-rich (5 calls/day funnel) — drive real players before the dashboard screenshot.
