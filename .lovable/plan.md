## Goal
Replace the native `confirm("Delete this session?")` call in the coaching engine's recent-sessions sidebar with a branded confirmation modal that matches the rest of the UI.

## Changes
- **`src/routes/_authenticated/coach.tsx`**
  - Import the existing shadcn `AlertDialog` primitives from `@/components/ui/alert-dialog`.
  - Add local state to track the session pending deletion: `const [pendingDelete, setPendingDelete] = useState<Session | null>(null)`.
  - The sidebar trash button stops propagation and calls `setPendingDelete(s)` instead of running `confirm` + delete inline.
  - Render one `<AlertDialog>` at the bottom of the sidebar (outside the map), open when `pendingDelete !== null`. Content:
    - Title: "Delete this session?"
    - Description: a short line referencing the session's mode and date so the user knows what they're deleting.
    - Cancel button (closes the modal).
    - Confirm button styled with `bg-destructive text-destructive-foreground`, label "Delete", runs the existing Supabase delete + toast + query invalidation, then clears `pendingDelete`.
  - Disable the confirm button while the delete request is in flight (`deleting` state) to prevent double-submits.

## Out of scope
- Other native `confirm`/`alert` calls elsewhere in the app (can be migrated in a follow-up if desired).
- Changes to the delete server logic or RLS — purely a UI swap.
