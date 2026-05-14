
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.subscription_tier AS ENUM ('essentials', 'pro', 'elite');
CREATE TYPE public.coaching_mode AS ENUM ('ceo', 'revenue', 'marketing', 'compliance', 'systems');
CREATE TYPE public.template_category AS ENUM ('hiring', 'enrollment', 'operations');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  business_name TEXT,
  state TEXT,
  enrollment_size INTEGER,
  tuition_range TEXT,
  staff_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'essentials',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Coaching sessions
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode coaching_mode NOT NULL,
  prompt TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_coaching_user_created ON public.coaching_sessions(user_id, created_at DESC);

-- Templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category template_category NOT NULL,
  tier_required subscription_tier NOT NULL DEFAULT 'pro',
  storage_path TEXT NOT NULL,
  is_elite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- RAG documents
CREATE TABLE public.rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

-- Usage events
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_usage_created ON public.usage_events(created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subs_updated BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-provision profile + subscription + default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.subscriptions (user_id, tier) VALUES (NEW.id, 'essentials');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- subscriptions
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- coaching_sessions
CREATE POLICY "Users view own sessions" ON public.coaching_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own sessions" ON public.coaching_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions" ON public.coaching_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- templates (all authenticated can view list; tier check at storage layer)
CREATE POLICY "Authenticated view templates" ON public.templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage templates" ON public.templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- rag_documents (admin only)
CREATE POLICY "Admins view rag" ON public.rag_documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage rag" ON public.rag_documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- usage_events
CREATE POLICY "Users view own usage" ON public.usage_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage" ON public.usage_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all usage" ON public.usage_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('templates', 'templates', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('rag-docs', 'rag-docs', false);

-- Templates bucket: authenticated users can read; admins can write
CREATE POLICY "Auth read templates" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'templates');
CREATE POLICY "Admins write templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update templates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete templates" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'templates' AND public.has_role(auth.uid(), 'admin'));

-- RAG bucket: admin only
CREATE POLICY "Admins read rag" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'rag-docs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write rag" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'rag-docs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete rag" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'rag-docs' AND public.has_role(auth.uid(), 'admin'));
