## Goal

Give admins a full file manager for the Template Vault inside the Admin dashboard, with per-template tier gating (Essentials / Pro / Elite Circle).

## What gets built

A new `TemplateVaultManager` component mounted as a section in `/admin` (alongside existing Users, Elite, RAG, Raven Videos sections).

### Features

1. **List view** — table of all templates grouped by category (Hiring, Enrollment, Operations), showing title, tier badge, description preview, upload date, file size.
2. **Upload** — file picker + form fields:
   - Title (required)
   - Description (optional)
   - Category: Hiring / Enrollment / Operations
   - **Tier required**: Essentials / Pro / Elite Circle (radio)
   - File upload → `templates` storage bucket at path `{category}/{uuid}-{filename}`
3. **Edit inline** — change title, description, category, and tier without re-uploading; optionally replace file.
4. **Delete** — removes DB row + storage object (with confirmation).
5. **Preview/download** — signed URL action per row.

### Tier logic

- `tier_required` is the single source of truth (`essentials` | `pro` | `elite`).
- `is_elite` boolean is kept in sync (`true` when tier=`elite`) so the existing client `/templates` page (which splits Pro vs Elite via `is_elite`) keeps working.
- Optional: add `essentials` rendering on `/templates` if you want Essentials-tier docs visible to all tiers — flagged for a follow-up, not in this scope.

### Access control

- Already covered: `templates` table has `Admins manage templates` (ALL) policy; `templates` bucket is private with admin-managed access. No migration needed.

## Technical notes

- New file: `src/components/admin/TemplateVaultManager.tsx`.
- Mount inside `src/routes/_authenticated/_admin/admin.tsx` as a new card section "Template Vault".
- Uses `supabase.storage.from('templates').upload(...)` and `createSignedUrl` for preview.
- All CRUD via the browser supabase client (RLS enforces admin-only).

## Out of scope

- Bulk upload / drag-and-drop (can add later).
- Versioning / file history.
- Surfacing Essentials-tier templates on the client `/templates` page (existing UI only renders Pro and Elite buckets).
