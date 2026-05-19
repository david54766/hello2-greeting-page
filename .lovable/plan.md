
## 1. Add founder portrait to /signup

- Copy the uploaded photo to `src/assets/prima-donna-signup.jpeg`.
- Update `src/routes/signup.tsx` left panel (currently just a quote on a gradient) to mirror the `/login` layout: brand link at top, portrait in a `rounded-[2rem]` frame in the middle, italic centered quote at the bottom.

## 2. Clarify and enforce the signup rules

**Current state**: anyone who signs up lands on the Essentials tier automatically (DB trigger). Elite has a separate in-app application flow (`elite_applications`) that only runs *after* a user is already signed in.

**New rule from you**:
- **Essentials** — open self-serve signup.
- **Pro** — open self-serve signup (upgrade path; payment will be wired when Paddle/Stripe is enabled).
- **Elite Circle** — NOT a self-serve signup. Requires an application + admin approval before an account can be created at that tier.

### Changes

**Signup page (`/signup`)**
- Add a tier selector (Essentials / Pro) at the top of the form.
- Remove any path to "Sign up as Elite". Instead show a third card: *"Elite Circle — Invitation only. Apply for access →"* linking to a new public `/apply-elite` route.
- On submit, store the chosen tier in `auth.signUp` user metadata (`intended_tier: 'essentials' | 'pro'`).

**Database / trigger**
- Update the `handle_new_user` trigger so the new `subscriptions` row reads `intended_tier` from `raw_user_meta_data` and defaults to `essentials`. Hard cap: trigger will refuse to set `elite` from metadata — Elite can only be granted by an admin action.

**Public Elite application route (`/apply-elite`)**
- New public route (no auth required) with the same fields as the existing in-app `elite_applications` form, plus email.
- Submits via a new public server route `src/routes/api/public/elite-apply.ts` that inserts into a lightweight `elite_signup_requests` table (separate from the existing `elite_applications` which is for already-signed-in users).
- Shows confirmation: "We'll review and email you a signup link once approved."

**Admin approval flow**
- Admin panel gets a new "Elite Signup Requests" card alongside existing Elite Applications.
- On approve: admin clicks "Send invite" → server fn uses `supabaseAdmin.auth.admin.inviteUserByEmail` and pre-seeds `intended_tier: 'elite'` in user metadata so the trigger provisions them at Elite tier on first sign-in.
- On decline: status update + decision email (reuses existing `sendDecisionEmail` helper).

**Pro tier note**
- Since Paddle/Stripe isn't wired yet, Pro signup will create the account at Pro tier immediately. Once payments are enabled, we'll gate the Pro tier behind successful checkout. Flag this as a known follow-up.

## Files touched

- `src/assets/prima-donna-signup.jpeg` (new)
- `src/routes/signup.tsx` (layout + tier selector)
- `src/routes/apply-elite.tsx` (new public route)
- `src/routes/api/public/elite-apply.ts` (new)
- `src/routes/_authenticated/_admin/admin.tsx` (new request review card)
- `src/lib/elite-signup.functions.ts` (new — list/approve/decline + invite)
- One Supabase migration: `elite_signup_requests` table + RLS + updated `handle_new_user` trigger.

## Open question

Should the **Pro** tier on the signup page be available right now (no payment), or hidden until Paddle/Stripe is enabled so users don't get Pro features without paying? I'd recommend hiding it until checkout exists — confirm before I build.
