## Super-Admin Analytics Dashboard

A new admin-only page at `/admin/analytics` (linked from the existing admin panel) that surfaces platform-wide activity metrics. Read-only — no schema changes required; pulls from existing tables (`profiles`, `subscriptions`, `coaching_sessions`, `usage_events`, `daily_recommendations`, `elite_applications`, `elite_requests`, `templates`, `user_roles`).

### Sections

1. **Overview KPIs** (top cards)
   - Total users, new users (7d / 30d)
   - Active users (DAU / WAU / MAU based on `usage_events`)
   - Total coaching sessions, daily recommendations generated, elite applications
   - Average sessions per active user

2. **Active tiers**
   - Stacked bar / donut: user count by `subscriptions.tier` (essentials / pro / elite)
   - Tier mix over time (new signups per tier per week)
   - Conversion funnel: essentials → pro → elite (counts + %)

3. **Usage over time**
   - Line chart of daily active users (last 30 / 90 days, toggle)
   - Line chart of coaching sessions per day, split by `mode`
   - "Usage time" proxy: sessions per user per day + busiest hours heatmap (hour × weekday from `coaching_sessions.created_at`, in admin's timezone)

4. **Most actively used features**
   - Bar chart of `usage_events.event_type` counts (last 30d)
   - Coaching `mode` breakdown (which coaching modes get used most)
   - Template engagement: top templates by view/download events (from `usage_events.metadata`)
   - Elite request topics frequency

5. **Common questions asked**
   - Top coaching prompts (last 30 / 90d) — grouped by normalized prompt (lowercased + trimmed, top 25)
   - Quick keyword cloud derived from prompts (client-side tokenization, stop-word filter)
   - Searchable, paginated table of recent prompts with user (full_name), tier, mode, timestamp; click row to view full response JSON in a drawer

6. **Filters (top of page)**
   - Date range (7d / 30d / 90d / custom)
   - Tier filter
   - Mode filter (where applicable)

### Technical Implementation

- **Route**: `src/routes/_authenticated/_admin/admin.analytics.tsx` (sibling of `admin.tsx`, under existing admin guard). Add nav link in `admin.tsx` header.
- **Server functions** in `src/lib/admin-analytics.functions.ts`, each `.middleware([requireSupabaseAuth])` and gated by `has_role(userId, 'admin')` — return 403 if not admin. Functions:
  - `getAnalyticsOverview({ from, to })` — KPI counts via parallel `supabase` count queries.
  - `getTierBreakdown({ from, to })` — group `subscriptions` by tier; weekly new-signup series.
  - `getActivityTimeseries({ from, to })` — DAU + sessions/day (group in JS after fetching `usage_events` and `coaching_sessions` rows in range).
  - `getFeatureUsage({ from, to })` — `usage_events.event_type` counts + coaching `mode` counts + top templates from metadata.
  - `getTopPrompts({ from, to, limit })` — fetch prompts in range, normalize + group in JS, return top N with counts and last-asked timestamp.
  - `listRecentPrompts({ from, to, page, search })` — paginated joined view (prompt, mode, created_at, user full_name, tier).
- **Client**: TanStack Query for each function; charts via `recharts` (already a common shadcn pairing — install if missing). Heatmap rendered as a CSS grid. Drawer uses existing shadcn `Sheet` for full-response inspection.
- **Performance**: cap fetches at 5k rows per function; add date-range guard. Aggregations done server-side where possible (count queries) and in JS for grouping prompts/modes.
- **Security**: every analytics server function checks `has_role(userId, 'admin')` server-side; no service-role client needed since RLS already grants admins SELECT on these tables.

### Out of scope (call out, don't build)

- True "session duration" — not currently tracked; "usage time" is approximated by event frequency and busiest-hours heatmap. If you want real duration, we'd add a `session_duration_ms` column or page-view ping events later.
- CSV export — can add in a follow-up.

### Files to add / edit

```text
src/lib/admin-analytics.functions.ts        (new)
src/routes/_authenticated/_admin/admin.analytics.tsx   (new)
src/routes/_authenticated/_admin/admin.tsx  (add nav link to /admin/analytics)
```
