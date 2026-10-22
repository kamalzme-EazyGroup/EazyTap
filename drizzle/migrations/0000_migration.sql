CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'My card',
  full_name text NOT NULL DEFAULT '',
  job_title text,
  company text,
  bio text,
  phone text,
  email text,
  website text,
  address text,
  avatar_url text,
  cover_url text,
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme text NOT NULL DEFAULT 'obsidian',
  qr_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cards_user_idx ON public.cards(user_id);
GRANT SELECT ON public.cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cards are publicly viewable" ON public.cards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners insert cards" ON public.cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update cards" ON public.cards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete cards" ON public.cards FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER cards_touch BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Public read card media" ON storage.objects FOR SELECT USING (bucket_id = 'card-media');
CREATE POLICY "Users upload own card media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'card-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own card media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'card-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own card media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'card-media' AND (storage.foldername(name))[1] = auth.uid()::text);