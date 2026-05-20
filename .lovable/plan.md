## Goal
Declutter the top nav. Remove the standalone "Conversations" and "Schedule" links from `AppHeader` and surface them as sub-navigation inside the Elite Circle area only.

## Changes

**1. `src/components/AppHeader.tsx`**
- Remove the `Conversations` link (→ `/elite-circle`) and `Schedule` link (→ `/elite-schedule`) from the authenticated top bar.
- Keep the single `Elite Circle` link (→ `/elite`) for Elite members / admins.

**2. `src/routes/_authenticated/elite.tsx` (Elite Circle hub)**
- Add a sub-nav / two prominent cards at the top of the page for **Conversations** (→ `/elite-circle`) and **Schedule with Raven** (→ `/elite-schedule`), gated to Elite tier + admins (same gate the pages already enforce).

**3. `src/routes/_authenticated/elite-circle.tsx` and `elite-schedule.tsx`**
- Add a small inline sub-nav at the top of each (Elite Circle • Conversations • Schedule) so users can move between the three Elite views without the top bar.
- Routes themselves remain unchanged — only navigation entry points move.

## Out of scope
- No route deletion, no permission changes, no backend changes.
