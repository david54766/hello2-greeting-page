
## Goal
Lock in end-to-end functionality across auth, AI coaching, billing, vault, and admin so a brand-new signup can: sign up → set business profile → run a real AI coaching session → upgrade tier via Stripe → access gated content. No more placeholders in the core flow.

## Current state (verified)
- ✅ Auth (email/password), `_authenticated` + `_admin` route guards, profile auto-provisioned on signup.
- ✅ AI coach server function `runCoaching` (5 modes, tool-calling for structured output) + `getDailyRecommendation`. `LOVABLE_API_KEY` is set.
- ✅ Dashboard snapshot, Settings (business profile), Templates vault (signed downloads), Admin (RAG upload + counts), Elite gating.
- ❌ No way to promote the first admin user.
- ❌ No coaching session history (sessions are saved but never shown back).
- ❌ Stripe billing not wired — tiers are static, "Upgrade" buttons go nowhere.
- ❌ Elite "Request a session" and Circle Vault are placeholders.
- ❌ `_authenticated` `beforeLoad` calls `getSession()` once on SSR; on hard refresh of an authed page, the session may not be hydrated and could redirect to /login.

## Plan

### 1. Bootstrap admin access
- Add a one-time server function `claimFirstAdmin()` that grants `admin` role to the calling user **only if** `user_roles` has zero admins. Surface a "Claim admin" button on `/settings` when no admin exists yet.
- Migration: index on `user_roles(role)` for the lookup.

### 2. AI coach — verify + complete
- Smoke-test `runCoaching` end-to-end via `invoke-server-function` against the preview URL after sign-in (token-bearing call).
- Fix the auth race in `src/routes/_authenticated.tsx`: replace `getSession()` with `supabase.auth.getUser()` so the loader awaits session restore (per `tanstack-supabase-integration` guidance).
- Add **Session History** to `/coach`: left rail listing the user's last 20 `coaching_sessions` (mode + first line of insight + timestamp), click to re-render the structured response. Pulls from `coaching_sessions` via RLS.
- Add a "Copy action plan" button on each response.

### 3. Stripe billing (3 tiers)
- Use Lovable's built-in Stripe payments. Run `payments--recommend_payment_provider` then `payments--enable_stripe_payments`.
- Server functions:
  - `createCheckoutSession({ tier })` → returns Stripe Checkout URL for Essentials $97 / Pro $197 / Elite $497 monthly.
  - `createCustomerPortalSession()` → manage/cancel.
- Stripe webhook at `src/routes/api/public/stripe-webhook.ts`: verify signature, on `checkout.session.completed` / `customer.subscription.updated` / `deleted` upsert `subscriptions` row (tier, status, stripe_customer_id, stripe_subscription_id, current_period_end) using `supabaseAdmin`. Add `STRIPE_WEBHOOK_SECRET` secret.
- `/settings` membership block: show current tier + 3 plan cards with "Upgrade" → checkout, and "Manage billing" if already subscribed.
- `/elite` gate uses live `tier` (already does); upgrade CTA now actually checks out.

### 4. Vault polish
- Seed a small set of starter templates per tier (admin can add more later) so the page isn't empty for new users.
- Replace "Upgrade" link on locked vault banner to call the Pro checkout directly.

### 5. Elite Circle — minimal real functionality
- Replace "Request a session" placeholder with a form that inserts into a new `elite_requests` table (fields: user_id, topic, preferred_times, status). Admin sees pending requests in `/admin`.
- Migration: `elite_requests` table + RLS (user inserts/views own; admin all).

### 6. Admin enhancements
- New tab/section listing recent users (id, email via `auth.users` joined through profile, tier, created_at) — uses `supabaseAdmin` in a server function.
- New section: pending Elite requests with "Mark handled" action.
- Show RAG document count + ability to delete a doc (removes storage object + row).

### 7. SEO + meta
- Add per-route `<title>` + meta description on `/`, `/login`, `/signup` (others already have titles). Single H1 per page (verify dashboard/coach/etc.). Add `public/llms.txt`.

### 8. Verification
After each chunk:
- Build runs clean.
- Manually invoke server functions to confirm:
  - `runCoaching` returns structured JSON.
  - `getDailyRecommendation` returns text.
  - `createCheckoutSession` returns a URL.
- Walk the flow in the preview: signup → profile → coach session → checkout (test mode) → tier reflects in header.

## Technical notes
- Stripe price IDs created via the enable tool; store IDs in env (`STRIPE_PRICE_ESSENTIALS`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`).
- All server-side Stripe calls go through `createServerFn` — no edge functions.
- Webhook lives at `/api/public/stripe-webhook` (bypasses auth, signature-verified).
- `subscriptions.user_id` is unique → use upsert on `user_id` from webhook.
- Coaching session history query: `select id, mode, response, created_at from coaching_sessions where user_id = auth.uid() order by created_at desc limit 20`.

## Out of scope (call out, don't build now)
- RAG retrieval (embeddings + vector search) — uploads work, retrieval ships in a follow-up.
- Live calendar booking (Calendly/Cal.com integration).
- React Native rebuild.
