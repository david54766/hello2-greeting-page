-- Seed mock Raven availability schedule (idempotent)
INSERT INTO public.raven_meeting_settings (singleton, room_url, timezone, buffer_minutes, advance_days)
VALUES (true, 'https://meet.google.com/raven-elite-circle', 'America/New_York', 10, 30)
ON CONFLICT (singleton) DO UPDATE
  SET room_url = EXCLUDED.room_url,
      timezone = EXCLUDED.timezone,
      buffer_minutes = EXCLUDED.buffer_minutes,
      advance_days = EXCLUDED.advance_days;

-- Clear and re-seed weekly availability windows
DELETE FROM public.raven_availability;

-- Mon-Fri: morning 9:00-12:00 and afternoon 13:00-17:00 (30-min slots)
INSERT INTO public.raven_availability (weekday, start_time, end_time, slot_minutes, active) VALUES
  (1, '09:00', '12:00', 30, true),
  (1, '13:00', '17:00', 30, true),
  (2, '09:00', '12:00', 30, true),
  (2, '13:00', '17:00', 30, true),
  (3, '09:00', '12:00', 30, true),
  (3, '13:00', '17:00', 30, true),
  (4, '09:00', '12:00', 30, true),
  (4, '13:00', '17:00', 30, true),
  (5, '09:00', '12:00', 30, true),
  (5, '13:00', '16:00', 30, true);
