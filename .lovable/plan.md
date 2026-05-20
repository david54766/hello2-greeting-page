## Goal
Add a "Get daily insights from Raven" button on the Command Center (top-right of the header). Clicking it opens a video library modal where users can browse and play premade video tips. Admins can upload, title, and delete videos.

## Database
New table `raven_videos`:
- title (text), description (text, nullable)
- storage_path (text) — points to file in storage
- duration_seconds (int, nullable), thumbnail_path (text, nullable)
- published (boolean, default true), sort_order (int, default 0)
- created_by (uuid), created_at / updated_at

RLS:
- SELECT: any authenticated user (only where `published = true`); admins see all
- INSERT/UPDATE/DELETE: admins only (via `has_role(auth.uid(), 'admin')`)

New storage bucket `raven-videos` (private):
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: admins only
- Playback uses signed URLs generated client-side

## Frontend

### Dashboard (`/dashboard`)
- Add a prominent button in the top-right of the header: "Get daily insights from Raven" (play icon, primary styling).
- Clicking opens a `RavenInsightsDialog` (shadcn Dialog, large).

### `RavenInsightsDialog` component
- Left: scrollable list of available videos (title + duration).
- Right: video player (HTML5 `<video>` with controls), title, description.
- Loads videos via `supabase.from('raven_videos').select(...).eq('published', true).order('sort_order')`.
- On selection, generates a signed URL for `storage_path` and plays it.
- Empty state when no videos exist yet.

### Admin (`/admin`)
- New "Raven Insight Videos" management card:
  - Upload form: file input (mp4/webm), title, description, optional thumbnail, published toggle, sort order.
  - Uploads to `raven-videos` bucket, then inserts row.
  - Table of existing videos with edit (title/desc/published/order) and delete (removes row + storage file).

## Out of scope
- Auto-rotating "daily" video — this turn ships the library viewer. We can add a "video of the day" rotation later if desired.
- Transcoding, captions, analytics.

## Technical notes
- Video files served via short-lived signed URLs (e.g. 1-hour) since the bucket is private.
- Use shadcn `Dialog`, `Button`, `Input`, `Textarea`, `Switch`.
- Reuse existing admin guard (route already under `_admin`).