## Goal
Align the app's brand color palette with the uploaded "The Preschool Prima Donna" logo (hot pink script + red apple) and replace the text wordmarks across the app with the actual logo image.

## 1. Add the logo asset
- Copy `user-uploads://1.png` to `src/assets/prima-donna-logo.png`.
- Import it as an ES6 module wherever the wordmark currently renders.

## 2. Replace text wordmarks with the logo image
Swap the `<span>/<Link>Prima Donna AI™</…>` brand marks in these files for an `<img>` of the new logo (height-constrained, `w-auto`, with descriptive `alt`):
- `src/components/AppHeader.tsx` (top nav — ~36px tall)
- `src/routes/index.tsx` (landing header — ~40px tall; the existing hero portrait of Raven stays as-is)
- `src/routes/login.tsx`, `src/routes/signup.tsx`, `src/routes/admin-login.tsx`, `src/routes/reset-password.tsx` (auth screens — ~56px tall, centered)

The "AI™" suffix will be kept as small sans-serif text next to the logo on auth screens so the product name still reads. (Tell me if you'd rather drop it.)

## 3. Recolor the design system to match the logo
Edit tokens in `src/styles.css` (light + dark) so every component using `--primary` / `--accent` shifts automatically — no component code touched:
- `--primary` → hot magenta-pink (matches the "Prima" script, ~#EC008C)
- `--accent` → crimson red (matches the apple / "donna" lettering, ~#E60023)
- `--ring`, `--sidebar-primary`, `--destructive` realigned to the same pink/red family
- `--rose-soft` softened to a blush tint of the new pink
- `--elite` gold preserved (Elite Circle tier identity)
- Dark mode variants tuned for contrast on the ivory→deep-rose surfaces

## 4. QA
- Visit `/`, `/login`, `/signup`, `/admin-login`, `/dashboard`, `/coach` to confirm the logo renders crisply and the new pink/red reads correctly on buttons, links, badges, and the Elite gold still pops against it.

## Out of scope
- PDF export branding, favicon, and email templates (let me know if you want those updated in the same pass).
- The Raven portrait images remain unchanged.
