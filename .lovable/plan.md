## Elite Circle Conversations Board + Raven Meeting Scheduler

### 1. Database (one migration)

**`elite_threads`** — id, user_id (author), title, body, pinned (bool), created_at, updated_at
**`elite_thread_replies`** — id, thread_id, user_id, body, created_at
**`raven_availability`** — id, weekday (0–6), start_time (time), end_time (time), slot_minutes (int), active (bool) — admin-managed
**`raven_meeting_settings`** — single-row table: room_url, timezone, buffer_minutes, advance_days (how far out users can book)
**`raven_bookings`** — id, user_id, starts_at (timestamptz), ends_at, status ('booked'|'cancelled'), topic, created_at; unique index on (starts_at) where status='booked' to prevent double-booking

**RLS**
- Threads/replies: SELECT + INSERT for Elite tier OR admin; UPDATE/DELETE own or admin. Helper `is_elite(uid)` checking `subscriptions.tier='elite'`.
- `raven_availability` + `raven_meeting_settings`: SELECT authenticated, ALL admin only.
- `raven_bookings`: user SELECT/INSERT/UPDATE own (cancel), admin SELECT all.

### 2. Routes

- `/elite-circle` (under `_authenticated`, gated to Elite tier or admin) — Conversations board: thread list (pinned first), new-thread composer, thread detail with replies.
- `/elite-circle/schedule` — Calendar view of next N days, generated client-side from `raven_availability` − existing bookings. Click slot → confirm dialog with topic field → insert booking → show standing Raven room URL + "Add to calendar" (.ics download generated client-side).
- Admin panel additions (`/admin`):
  - **Raven Availability Manager** — weekday rows with start/end/slot-duration, toggle active.
  - **Raven Meeting Settings** — single form: room URL, timezone, buffer, advance-days window.
  - **Bookings list** — view/cancel upcoming bookings.

### 3. Server functions (`src/lib/elite.functions.ts`, `src/lib/raven-schedule.functions.ts`)

All `requireSupabaseAuth`. Key ones:
- `listThreads`, `createThread`, `getThread`, `replyToThread`
- `getAvailabilityWindows`, `getUpcomingBookings(userId)`, `bookSlot({starts_at, topic})` — server-side double-book check + Elite gate
- `cancelBooking(id)`
- Admin-only: `upsertAvailability`, `updateMeetingSettings`, `listAllBookings`, `adminCancelBooking`

Slot generation lives server-side in `getAvailabilityWindows` so timezone/exclusion logic is authoritative; client just renders.

### 4. UI

- Reuse existing rose/crimson tokens, Instrument Serif headings, shadcn Card/Dialog/Button.
- Elite gate component shared with existing Elite vault — if non-Elite hits route, show "Apply to Elite Circle" CTA linking to `/elite`.
- Add sidebar/dashboard links for "Elite Circle" and "Schedule with Raven" (visible to Elite + admin only).

### 5. Out of scope
- Email reminders, Google Calendar sync, video chat embed, reactions/likes, threaded sub-replies, file attachments. Can be added later.

Ready to implement on approval.