## Goal
Add thumbnail support to Raven Insight Videos — admins can upload/replace a thumbnail image per video, and thumbnails render in the viewer's video list and as a poster on the player.

The `raven_videos` table already has `thumbnail_path text`, and the `raven-videos` storage bucket exists with admin-managed RLS, so **no DB migration is required**.

## Changes

### 1. `src/components/admin/RavenVideosAdmin.tsx`
- Add an optional thumbnail file picker (`accept="image/*"`) next to the upload video input.
- On upload: if a thumbnail file is provided, upload it to `raven-videos/{userId}/{uuid}.{ext}` and store the returned path in `thumbnail_path` on insert. If no file is provided, attempt to auto-capture a frame at ~1s from the video using a `<canvas>` and upload it as the default thumbnail (graceful fallback — failure is silent).
- In each row, render a 48×72 thumbnail (via signed URL) next to the title; show a placeholder icon when missing.
- In edit mode, add a "Replace thumbnail" button that uploads a new image and updates `thumbnail_path` (best-effort delete of the old file).

### 2. `src/components/RavenInsightsDialog.tsx`
- Extend the `RavenVideo` type and select query to include `thumbnail_path`.
- In the list sidebar, render a small 56×80 vertical thumbnail to the left of each title (signed URL, lazy-loaded). Fallback: `Play` icon as today.
- On the main player, pass the signed thumbnail URL as the `<video poster=...>` so it shows before playback starts.

### Technical notes
- Signed URLs use `supabase.storage.from("raven-videos").createSignedUrl(path, 3600)`. Batch-resolve on list load.
- Thumbnail uploads use the same bucket (`raven-videos`); no separate bucket needed since admin RLS already covers it and viewer access is via signed URLs.
- Auto-capture from video: load file into a hidden `<video>` element, seek to 1s, draw to canvas, export as `image/jpeg` blob. Pure best-effort — won't block upload if it fails.

## Out of scope
- No bucket changes, no schema changes, no public-bucket migration.
- No thumbnail editing UI beyond replace (e.g., cropping).
