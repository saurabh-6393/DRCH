# Phases

> You can't build every feature in one go. This file breaks the product into shippable
> phases so the AI builds in the right order and doesn't run ahead of itself.
> Rule: **each phase must be usable on its own.** No phase depends on a future phase.

## Phase 1 — Core / MVP
**Goal:** <the smallest thing that delivers the core value>
- [ ] <feature — e.g. auth (signup/login)>
- [ ] <feature — e.g. create + view the main object>
- [ ] <feature — e.g. basic list/dashboard>
**Done when:** <a real user can do the one main thing end-to-end>
**Architecture touched:** <which APIs / tables this phase needs>

## Phase 2 — Monetization / key workflow
**Goal:** <the next most important slice>
- [ ] <feature — e.g. payments / subscription>
- [ ] <feature — e.g. plan limits>
**Done when:** <...>
**Architecture touched:** <...>

## Phase 3 — Depth / dashboard
**Goal:** <make it sticky>
- [ ] <feature — e.g. analytics/dashboard>
- [ ] <feature — e.g. settings, profile>
**Done when:** <...>
**Architecture touched:** <...>

## Phase 4 — Polish / scale
**Goal:** <ready for more users>
- [ ] <performance, caching>
- [ ] <error states, empty states, loading>
- [ ] <tests, monitoring>
**Done when:** <...>

## Backlog (not scheduled yet)
- <ideas you're deliberately NOT building yet — keeps scope honest>

---
**How the AI should use this:** work on the current phase only. When a phase is done,
check its boxes, then move to the next. Never pull work forward from a later phase without
being asked.
