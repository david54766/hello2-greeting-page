## 1. Density toggle on the Schedule page

File: `src/routes/_authenticated/_elite-gate.elite-schedule.tsx`

- Add a small segmented control in the header (next to the timezone line): `Comfortable` / `Compact`.
- Persist the choice in `localStorage` under `elite-schedule-density` so it sticks across visits.
- Drive layout from the choice:
  - **Comfortable** (default): current 3‑column day‑card grid, current chip size, current paddings.
  - **Compact**: 4 columns on `lg`, smaller card padding (`p-2`), tighter chip padding (`px-2 py-0.5`), `gap-1` between chips, smaller day heading.
- Upcoming‑session row and dialog are untouched.

## 2. Remove the standalone 1:1 request form

File: `src/routes/_authenticated/elite.tsx`

- Delete the **"Request a 1:1 strategy session"** `<section>` (the `submitEliteRequest` form) and the **"Your requests"** list that pairs with it.
- Remove the now‑unused imports/state: `submitEliteRequest`, `getMyEliteRequests`, the `topic` / `times` / `submitting` state, the `submit` handler, and the `myReqs` query.
- The two link tiles at the top (Conversations + Schedule with Raven) remain — Schedule is the single canonical booking path.

## 3. Curated Vault picks on the Elite landing page

File: `src/routes/_authenticated/elite.tsx` (replaces the current "Circle Vault" stub section)

- Query Supabase directly (same pattern as `templates.tsx`):
  `supabase.from("templates").select("id,title,description,category,storage_path").eq("tier_required","elite").order("created_at", { ascending: false }).limit(6)`.
- Render a 3‑column responsive grid of compact cards, each showing category, title, one‑line description, and a **Download** button that uses `supabase.storage.from("templates").createSignedUrl(path, 60)` — same helper used in the Template Vault page.
- Section heading: "Curated for the Circle" with a "View full vault" link to `/templates`.
- Empty / loading states: skeleton row while loading; if zero rows, show "New Circle‑only drops land here weekly." with the link to the full vault.

## Technical notes

- No DB changes — `templates.tier_required = 'elite'` already exists and is used by the Template Vault.
- Density toggle is purely visual, no schema or server impact.
- Removing the 1:1 form doesn't touch `elite_requests` data or `submitEliteRequest` server fn (admins may still review historical rows); we just stop exposing the entry point.
