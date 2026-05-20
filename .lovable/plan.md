## Goal

Make every AI Coach response speak as Prima Donna AI™ per the doctrine you pasted — confident, direct, no fluff — and follow the required 4-part structure: **Diagnosis → Impact → Strategic Move → Elevation**. Keep the 5 mode lenses (CEO, Revenue, Marketing, Compliance, Systems) layered on top.

## Changes

### 1. `src/lib/coaching.functions.ts` — rewrite the prompt + structured tool

- Replace `SYSTEM_BASE` with the full Prima Donna doctrine: identity, tone rules, what she does/does not do, core principles (Systems over chaos, Structure creates scale, Profit must be controlled, Leadership defines outcomes, Excellence is non-negotiable), and the topic doctrines (Enrollment, Pricing, Staffing, Operations, Profitability, Marketing, Growth, Leadership) condensed into a single authoritative system message.
- Embed the explicit rules: never validate low standards, never advise underpricing, never excuse poor performance, never recommend early expansion, no medical/legal advice, no "maybe" language, no emotional reassurance.
- Keep the existing `MODE_PROMPTS` lens for each of the 5 modes but reframe each as Prima Donna's specialty within the doctrine (CEO lens, Revenue lens, etc.) so the doctrine is always primary and mode is the focusing aperture.
- Change the `structured_response` tool schema from `insight / recommendation / action_steps` to:
  - `diagnosis` — what is actually broken (1–3 sharp sentences)
  - `impact` — what this is costing the business if unaddressed
  - `strategic_move` — the decisive move, specific and non-optional
  - `elevation` — the leadership/standard shift required, tied to a core principle; reference Preschool Prima Donna teachings where natural
  - `action_steps` — 3–5 concrete actions for this week (kept so owners still get tactical output)
- Keep portfolio/center context injection as-is.

### 2. `src/routes/_authenticated/coach.tsx` — render the new structure

- Update the `Resp` type and the rendered sections to: Diagnosis, Impact, Strategic Move, Elevation, Action Steps (in that order).
- Update the TTS string and the copy/export string to read the four labeled sections plus action steps.
- Update the history sidebar preview line to fall back to `diagnosis` instead of `insight`.

### 3. History compatibility

- Old `coaching_sessions` rows store `{ insight, recommendation, action_steps }`. In the UI, fall back: if a row has `insight` and not `diagnosis`, render `insight → Diagnosis`, `recommendation → Strategic Move`, blank Impact/Elevation. No DB migration needed.

## Out of scope

- No DB schema changes, no auth changes, no Daily Recommendation prompt changes (separate cron prompt — flag if you want that aligned next).
- No UI restyling beyond the section labels.

## Acceptance

- New coach responses always return Diagnosis / Impact / Strategic Move / Elevation / Action Steps.
- Tone matches the doctrine: no hedging, no "maybe", no reassurance.
- Mode still steers the topical focus (compliance still goes per-state, revenue still quantifies, etc.).
- Older sessions still render without crashing.
