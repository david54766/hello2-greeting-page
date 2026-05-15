## Goal

Turn "Apply to Elite Circle" into a real gated application + approval workflow:

1. Non-Elite user submits a structured application form
2. Admin sees it in the admin panel and approves or declines
3. On approval, applicant gets an email with confirmation + final steps to upgrade to Elite
4. On decline, applicant optionally gets a polite decline email

The existing `elite_requests` table is for *current Elite members requesting 1-1 sessions* — we keep that untouched and add a separate `elite_applications` table for the new approval flow.

## Steps

### 1. Database (`elite_applications` table)
New table with columns:
- `user_id` (uuid, FK to auth.users via RLS, the applicant)
- `full_name`, `email`, `business_name`, `state`, `role` (text)
- `centers_count` (int), `annual_revenue` (text bracket: <250k / 250k–1M / 1M+ / 5M+)
- `goals` (text, why Elite — required)
- `referral` (text, how they heard, optional)
- `status` (text, default `pending`: `pending` | `approved` | `declined`)
- `admin_notes` (text, internal)
- `decided_by` (uuid, admin user), `decided_at` (timestamptz)
- standard `created_at`, `updated_at`

RLS:
- Users can `INSERT` and `SELECT` their own application
- Admins can `SELECT` all and `UPDATE` (to set status / notes)
- Unique partial index: one *pending* or *approved* application per user (allow re-apply after decline)

### 2. Application form (`src/routes/_authenticated/elite.tsx`)
Replace the current "Request a Session" CTA for non-Elite users with a multi-field application form (Zod-validated). Show one of three states:
- No application → form
- `pending` → "Application under review" status card with submitted date
- `declined` → decline reason + "Apply again" button
- `approved` → success card with "Confirm & Upgrade" button (links to `/settings` upgrade flow)

Existing Elite members keep their session-request UI as-is.

### 3. Server functions (`src/lib/elite-application.functions.ts`)
- `submitEliteApplication` — auth-protected, inserts row, blocks if pending/approved exists
- `getMyEliteApplication` — auth-protected, returns user's latest
- `listEliteApplications` (admin only) — returns all with applicant profile
- `decideEliteApplication` (admin only) — updates status + admin_notes, sets `decided_by/at`, **triggers email**

### 4. Admin UI (`src/routes/_authenticated/_admin/admin.tsx`)
Add an "Elite Applications" card alongside the existing Elite Requests card:
- Pending applications list with full details
- Approve / Decline buttons (decline opens a small modal for reason)
- Filter tabs: Pending / Approved / Declined / All

### 5. Email delivery
The project does not yet have email infrastructure. Recommended path: **Lovable Emails** (built-in, branded auth + transactional, no third-party signup).

To send the approval/decline notification we need:
- A verified sender domain (workspace-level setup)
- Email infra scaffolded once, then a transactional template `elite-approved` and `elite-declined`

If Lovable Emails is acceptable, the flow becomes: admin clicks Approve → server fn updates row → enqueues a transactional email via the scaffolded `process-email-queue` → applicant gets a branded "You're in" email with a CTA back to `/settings` to complete upgrade.

If you prefer a third-party (Resend / Brevo / Mailgun), I can wire that instead — Resend is the simplest.

### 6. Out of scope (this turn)
- No automatic Stripe upgrade — the email links to `/settings` where existing upgrade flow lives
- No public (logged-out) application form — applicant must have a free Essentials account first; the email-on-approval acts as the "final steps to register/upgrade" message
- If you want a fully public application (no signup required), say so and I'll add a public route + magic-link flow instead

## Files

- `supabase/migrations/...` — `elite_applications` table + RLS
- `src/lib/elite-application.functions.ts` — new
- `src/routes/_authenticated/elite.tsx` — application form for non-Elite users
- `src/routes/_authenticated/_admin/admin.tsx` — admin review card
- `src/lib/admin.functions.ts` — add `listEliteApplications` + `decideEliteApplication`
- Email scaffolding files (only after you confirm provider choice)

## Question before I implement

**Email provider**: Lovable Emails (built-in, recommended) or Resend / Brevo / Mailgun?

**Applicant scope**: Must the applicant already be a logged-in Essentials user (current plan), or do you want a fully public application form where anyone can apply without an account?