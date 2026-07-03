-- Raven meeting scheduling is retired; keep this seed empty/idempotent.
INSERT INTO public.raven_meeting_settings (singleton, room_url, timezone, buffer_minutes, advance_days)
VALUES (true, '', 'America/New_York', 0, 0)
ON CONFLICT (singleton) DO UPDATE
  SET room_url = EXCLUDED.room_url,
      timezone = EXCLUDED.timezone,
      buffer_minutes = EXCLUDED.buffer_minutes,
      advance_days = EXCLUDED.advance_days;

-- Clear weekly availability windows so no meeting scheduler is available.
DELETE FROM public.raven_availability;
