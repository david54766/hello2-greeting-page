## Goal
Replace the on-load AI fetch with a persisted **Daily Strategic Recommendation** for every user (all tiers), regenerated automatically by a 3 AM cron job.

Note: 3 AM "local" isn't possible in pg_cron (it runs in a single timezone, UTC). I'll run the cron hourly and only generate for users whose local time is 3 AM, using the timezone stored on each user's profile. This gives true 3 AM local per user.

## Steps

### 1. Schema (migration)
- Add `timezone TEXT` to `profiles` (default `'America/New_York'`, editable in Settings).
- New table `daily_recommendations`:
  - `user_id uuid`, `for_date date`, `recommendation text`, `created_at timestamptz`
  - Unique `(user_id, for_date)` so we never double-generate.
  - RLS: users can SELECT their own row only. Service role writes via cron.

### 2. Server function — `getTodayRecommendation`
- Auth-protected serverFn.
- Reads today's row (in user's timezone) from `daily_recommendations`.
- If missing (new user, first login before cron has run, or timezone edge case), generates one on-the-fly using existing AI logic, persists it, returns it.
- This guarantees every user — Essentials, Pro, Elite — always sees something on the dashboard.

### 3. Cron endpoint — `/api/public/hooks/generate-daily-recommendations`
- POST handler, verifies `apikey` header against publishable key.
- Uses `supabaseAdmin` to:
  1. Find every user whose local time (profile.timezone) is currently between 3:00–3:59 AM and who doesn't yet have a row for today.
  2. For each, build the same portfolio-aware prompt as today's `getDailyRecommendation` and call Lovable AI Gateway (`gemini-3-flash-preview`).
  3. Insert into `daily_recommendations`.
- Batched, with rate-limit handling (429/402 → skip + log).

### 4. pg_cron schedule
- Enable `pg_cron` + `pg_net` (already standard).
- Schedule: `0 * * * *` (every hour at :00) calling the route. The route itself filters to "users whose local 3 AM is now."

### 5. Dashboard wiring
- `dashboard.tsx`: swap `getDailyRecommendation` → `getTodayRecommendation`.
- Add tiny "Generated at HH:MM" timestamp below the card.
- Remove the per-page-load AI cost path.

### 6. Settings
- Add a Timezone select in `settings.tsx` so users can pick their local TZ (defaults to America/New_York). Required for the 3 AM cadence to be meaningful.

## Out of scope
- No email delivery (you chose dashboard only).
- No tier-gating — recommendation is universal across Essentials/Pro/Elite.
- No "regenerate" button (one per day; deterministic).

## Files touched
- `supabase/migrations/...` (new table + profiles.timezone)
- `src/lib/coaching.functions.ts` (add `getTodayRecommendation`, keep old fn deprecated or remove)
- `src/routes/api/public/hooks/generate-daily-recommendations.ts` (new)
- `src/routes/_authenticated/dashboard.tsx` (swap fn)
- `src/routes/_authenticated/settings.tsx` (timezone field)
- pg_cron schedule via `supabase--insert`