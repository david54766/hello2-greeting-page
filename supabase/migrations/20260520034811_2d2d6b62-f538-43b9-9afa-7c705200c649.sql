
-- Helper: is user an Elite Circle member?
CREATE OR REPLACE FUNCTION public.is_elite(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND tier = 'elite' AND status = 'active'
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_elite(uuid) TO authenticated, anon;

-- Threads
CREATE TABLE public.elite_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.elite_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elite or admin view threads" ON public.elite_threads
  FOR SELECT TO authenticated USING (public.is_elite(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Elite or admin create threads" ON public.elite_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.is_elite(auth.uid()) OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Author or admin update threads" ON public.elite_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Author or admin delete threads" ON public.elite_threads
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER set_elite_threads_updated_at BEFORE UPDATE ON public.elite_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Replies
CREATE TABLE public.elite_thread_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.elite_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.elite_thread_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Elite or admin view replies" ON public.elite_thread_replies
  FOR SELECT TO authenticated USING (public.is_elite(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Elite or admin create replies" ON public.elite_thread_replies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.is_elite(auth.uid()) OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Author or admin delete replies" ON public.elite_thread_replies
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_elite_thread_replies_thread ON public.elite_thread_replies(thread_id, created_at);

-- Raven availability (weekly recurring)
CREATE TABLE public.raven_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes integer NOT NULL DEFAULT 30 CHECK (slot_minutes > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raven_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view availability" ON public.raven_availability
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage availability" ON public.raven_availability
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_raven_availability_updated_at BEFORE UPDATE ON public.raven_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Raven meeting settings (single-row)
CREATE TABLE public.raven_meeting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  room_url text NOT NULL DEFAULT '',
  timezone text NOT NULL DEFAULT 'America/New_York',
  buffer_minutes integer NOT NULL DEFAULT 0,
  advance_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raven_meeting_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view settings" ON public.raven_meeting_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.raven_meeting_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_raven_meeting_settings_updated_at BEFORE UPDATE ON public.raven_meeting_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.raven_meeting_settings (singleton) VALUES (true);

-- Bookings
CREATE TABLE public.raven_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','cancelled')),
  topic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raven_bookings ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX uniq_booked_slot ON public.raven_bookings(starts_at) WHERE status = 'booked';
CREATE INDEX idx_raven_bookings_user ON public.raven_bookings(user_id, starts_at);

CREATE POLICY "Users view own bookings" ON public.raven_bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all bookings" ON public.raven_bookings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Elite or admin create booking" ON public.raven_bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (public.is_elite(auth.uid()) OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Users cancel own booking" ON public.raven_bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update any booking" ON public.raven_bookings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER set_raven_bookings_updated_at BEFORE UPDATE ON public.raven_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
