## Prima Donna AI™ — Build Plan

A premium AI executive-coaching SaaS for childcare center owners. Full v1 scope as requested.

### Tech foundation
- TanStack Start (existing) + Lovable Cloud (Supabase: DB, auth, storage)
- Lovable AI Gateway (`google/gemini-2.5-pro` for coaching, `gemini-3-flash-preview` fallback)
- Stripe via Lovable's built-in seamless payments (3 subscription products)
- Modular AI layer: server functions per coaching mode, swappable model

### Design system
- Palette: rose/crimson — `#D90429` primary CTA, `#D9719B` accent, `#D98FAE` soft, ivory/charcoal neutrals (oklch tokens in `src/styles.css`)
- Typography: Instrument Serif headings + Work Sans body (per selection; Playfair noted as alternate)
- Aesthetic: editorial, generous whitespace, gold-thin dividers, CEO-grade not chatty

### Routes
```
/                       Landing (marketing + pricing)
/login, /signup, /reset-password
/_authenticated/
  dashboard             Command Center (primary)
  coach                 AI coaching (5 modes)
  templates             Template Vault (Pro+)
  elite                 Elite Circle (live coaching + vault)
  settings              Profile + business memory + billing
/_authenticated/_admin/
  admin                 Users, tiers, usage, document upload (RAG)
/api/public/stripe-webhook
```

### Database (Supabase)
- `profiles` — id, full_name, business_name, state, enrollment_size, tuition_range, staff_count
- `user_roles` — (user_id, role enum: admin|user) with `has_role()` security definer
- `subscriptions` — user_id, stripe_customer_id, tier (essentials|pro|elite), status, current_period_end
- `coaching_sessions` — user_id, mode, prompt, response (jsonb: insight/recommendation/action_steps), created_at
- `templates` — title, category (hiring|enrollment|operations), tier_required, storage_path
- `rag_documents` — admin-uploaded docs metadata, storage_path, embedding status
- `usage_events` — user_id, event_type, tokens, created_at
- Storage buckets: `templates` (private, signed URLs), `rag-docs` (private, admin-only)
- RLS on every table; tier checks via subscription lookup

### Auth
- Email + password (Lovable Cloud), session via Supabase
- `_authenticated` layout guard; `_admin` nested guard checks `has_role`
- Auto-create profile + default subscription row on signup (trigger)

### Stripe (seamless payments)
- 3 products: Essentials $97, Pro $197, Elite $497 (monthly)
- Checkout server functions; webhook updates `subscriptions` table
- `useTier()` hook gates Pro/Elite features client-side; server functions re-validate

### AI coaching engine
- Server function `runCoaching({ mode, prompt })` calls AI Gateway
- 5 mode-specific system prompts (CEO, Revenue, Marketing, Compliance, Systems)
- Injects user's business memory (name, state, enrollment, tuition, staff) into context
- Forces structured JSON output via tool calling: `{ insight, recommendation, action_steps[] }`
- Persists to `coaching_sessions`; Elite users get gold-accent response styling
- RAG: stub interface ready (documents table + storage); retrieval to be wired in follow-up

### Command Center dashboard
- Personalized greeting using profile
- Snapshot cards: enrollment, revenue estimate (tuition × enrollment), staffing — mock-derived from profile
- "Today's Strategic Recommendation" — server function generates one daily insight (cached per user/day)
- Quick actions: Ask AI / Templates / Growth Plan

### Template Vault
- Grid by category, tier badges, signed download URLs
- Locked cards with upgrade CTA for Essentials users

### Elite Circle
- Live coaching placeholder (calendar embed slot + "Book session" CTA)
- Premium vault list (separate templates marked elite)
- Distinct visual treatment (gold border, serif emphasis)

### Admin
- Users table with tier, last active
- Subscription overview (counts per tier)
- Usage metrics (sessions/day, tokens)
- Document upload UI → `rag-docs` bucket + `rag_documents` row

### Build sequence
1. Enable Lovable Cloud + design tokens + landing page
2. Auth (login/signup/reset) + profiles + roles + `_authenticated` guard
3. Command Center dashboard with mock snapshot
4. AI coaching engine (5 modes, structured output, memory injection, history)
5. Stripe seamless payments enable + 3 products + webhook + tier gating
6. Template Vault + Elite Circle
7. Admin dashboard + RAG document upload
8. Polish, SEO meta per route, error boundaries

### Notes
- Stripe enable runs after eligibility check; requires Pro plan on Lovable
- RAG retrieval (embeddings + vector search) wired as follow-up — schema/upload ready in v1
- Mobile rebuild (React Native) preserved by keeping all logic in server functions; UI is pure presentation
