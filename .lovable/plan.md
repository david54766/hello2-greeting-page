## Goal

Enforce role/tier gating server-side so only **Elite Circle subscribers** (`subscriptions.tier='elite'` AND `status='active'`) and **admins** (`user_roles.role='admin'`) can reach `/elite-circle` and `/elite-schedule`. `/elite` stays accessible to all signed-in users because it doubles as the application flow for non-Elite owners — but its private Elite hub view must be gated the same way.

The current implementation only does client-side `tier === "elite" || isAdmin` checks inside the component body, which means: (a) protected UI flashes briefly before the gate, (b) any data fetched in a loader runs before the gate, (c) RLS is the only real backstop.

## Changes

### 1. New shared gate — `src/lib/elite-access.functions.ts`

A `createServerFn` (`checkEliteAccess`) protected by `requireSupabaseAuth` that returns:

```ts
{ allowed: boolean; reason: "elite" | "admin" | "denied" }
```

It calls Postgres helpers already in the DB:
- `is_elite(auth.uid())` → active Elite subscription
- `has_role(auth.uid(), 'admin')` → admin

`allowed = is_elite OR is_admin`. No client-side trust; the answer comes from the DB through the authenticated supabase client.

### 2. Pathless layout — `src/routes/_authenticated/_elite-gate.tsx`

A new pathless layout route that:
- Calls `checkEliteAccess` in `beforeLoad`.
- If `!allowed`, throws `redirect({ to: "/elite" })` (so non-Elite users land on the application flow, admins/Elite proceed).
- Renders `<Outlet />`.

This is the standard TanStack pattern: gate runs before any child loader or render, no flash of protected content.

### 3. Move gated routes under the new layout

Rename to put them under the gate (TanStack flat naming):
- `src/routes/_authenticated/elite-circle.tsx` → `src/routes/_authenticated/_elite-gate.elite-circle.tsx` (URL stays `/elite-circle`)
- `src/routes/_authenticated/elite-schedule.tsx` → `src/routes/_authenticated/_elite-gate.elite-schedule.tsx` (URL stays `/elite-schedule`)

Update the `createFileRoute(...)` path strings to match the new file names. Strip the now-redundant in-component `if (!allowed) return <Locked/>` guards (keep the components clean; gate is upstream).

### 4. `/elite` page stays public-to-authenticated, but split its rendering

`src/routes/_authenticated/elite.tsx` keeps current behavior:
- Non-Elite (and non-admin): show `ApplicationFlow` (apply / status).
- Elite or admin: show the Elite hub (links to Conversations + Schedule).

Replace the local `tier === "elite"` boolean with a call to `checkEliteAccess` via `useServerFn` + `useQuery` so the same source of truth drives the decision. While the query is loading, render a skeleton (no protected content).

### 5. Defense in depth — RLS already correct

Verified: `elite_threads`, `elite_thread_replies`, `raven_bookings` all use `is_elite(auth.uid()) OR has_role(auth.uid(), 'admin')`. No DB changes needed.

### 6. Out of scope

- No changes to admin-only routes (already covered by `_admin` layout).
- No changes to subscription provisioning, billing, or invitations.
- No new tables, no auth changes.

## Acceptance

- Non-Elite, non-admin user visiting `/elite-circle` or `/elite-schedule` is redirected to `/elite` (application flow) before any protected component renders or data loads.
- Elite users and admins reach both pages normally.
- `/elite` still shows the application flow to non-Elite users and the hub to Elite/admins, with no flash.
- Removing Elite tier from a signed-in user (or revoking admin) blocks access on next navigation, since the gate re-queries via the server fn.
