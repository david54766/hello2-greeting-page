## Goal
Let admins edit the **title** and **description** of existing Raven Insight Videos directly from the Admin → Raven Insight Videos panel.

## Changes
**File:** `src/components/admin/RavenVideosAdmin.tsx`

1. Add an "Edit" pencil button to each row alongside the existing Published toggle and Delete button.
2. Clicking Edit swaps that row into an inline edit state with:
   - `Input` for title
   - `Textarea` for description
   - Save / Cancel buttons
3. **Save** calls `supabase.from("raven_videos").update({ title, description }).eq("id", row.id)`, then refreshes the list and toasts success.
4. **Cancel** reverts local state, no network call.
5. Validation: title required, trimmed; description optional (empty → `null`).

## Out of scope
- No changes to storage file, sort order, published toggle, or upload flow.
- No DB migration needed — existing RLS policy `Admins manage videos` already permits UPDATE.
