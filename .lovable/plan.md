# Revenue Mode Setup Wizard

Add a guided onboarding wizard that fires the first time a user enters **Revenue** mode in the Coaching Engine. It pulls in the user's business profile + registered centers, fills any missing revenue-relevant gaps, captures goals, and saves a **Revenue Profile** that primes every future Revenue coaching response. Users can re-scope (all centers vs. one) at any time and reset the whole thing.

## User Flow

1. User clicks **Revenue** mode in `/coach`.
2. If no `revenue_profile` row exists → wizard dialog opens automatically (cannot be dismissed without "Skip for now").
3. After completion, Revenue mode shows a compact **scope bar** above the prompt box:
   - Scope: `All Centers (3)` ▼  ·  Goal: `Grow tuition revenue 20%`  ·  `Edit` `Reset`
4. Subsequent Revenue questions inject the saved profile + active scope into the system prompt.

## Wizard Steps (single dialog, stepper)

1. **Scope** — Analyze *all centers as a portfolio* or *one specific center*? (radio + center picker if applicable; if user has 0 centers, prompt them to add one in Settings first.)
2. **Current snapshot** (per scope) — pre-filled from `centers` / `profiles`, editable:
   - Capacity, current enrollment, waitlist size
   - Tuition range / average weekly tuition
   - Collection rate (%), past-due AR
3. **Revenue model** — tuition structure (weekly/monthly), sibling discounts, registration fees, subsidy/voucher mix (%), ancillary revenue (camps, late fees, etc.).
4. **Goals & constraints** — 6-month revenue goal ($ or %), willingness to raise tuition, hiring/staffing constraints, target margin.
5. **Review** — summary + save.

Each step validates before "Next". "Back" preserves entries. "Skip for now" stores a stub `{ skipped: true }` so wizard doesn't re-open every visit but a yellow banner reminds the user to complete it.

## Scope Switching & Reset

- **Scope dropdown** on the Revenue tab lets user flip between *Portfolio* and any individual center on the fly. Selected scope is persisted per user.
- **Edit** reopens the wizard pre-filled.
- **Reset** (with confirm dialog) deletes the `revenue_profile` row + scope preference; next Revenue click re-runs the wizard from scratch.

## Coaching Prompt Integration

In `src/lib/coaching.functions.ts`, when `mode === "revenue"`:
- Load `revenue_profile` for the user.
- Resolve active scope → either aggregated portfolio metrics or single-center metrics.
- Append a `REVENUE CONTEXT` block to the system prompt: snapshot numbers, revenue model, goals, constraints, and explicit instruction "Tailor diagnosis, impact, and action steps to these numbers."
- If no profile exists, return a structured nudge response asking the user to complete the wizard (with no LLM call).

## Technical Details

**New table** `revenue_profiles`:
- `user_id` (unique), `scope_mode` ('portfolio' | 'center'), `active_center_id` (nullable FK-ish uuid), `snapshot` jsonb, `model` jsonb, `goals` jsonb, `skipped` boolean, `created_at`, `updated_at`
- RLS: users CRUD own row; admins read-all.

**New files**
- `src/lib/revenue-profile.functions.ts` — `getRevenueProfile`, `upsertRevenueProfile`, `resetRevenueProfile`, `setRevenueScope` server functions.
- `src/components/coach/RevenueWizard.tsx` — multi-step dialog (uses existing `Dialog`, `Input`, `Select`, `RadioGroup`).
- `src/components/coach/RevenueScopeBar.tsx` — compact scope/edit/reset bar shown only when Revenue mode is active.

**Edits**
- `src/routes/_authenticated/coach.tsx` — on mode change to `revenue`, query profile; auto-open wizard if missing; render `RevenueScopeBar` above prompt.
- `src/lib/coaching.functions.ts` — inject Revenue context block into system prompt when applicable.

No changes to other coaching modes, no UI changes outside the Revenue tab.
