ALTER TABLE public.cards
  ADD COLUMN collect_contacts boolean NOT NULL DEFAULT false,
  ADD COLUMN collect_fields jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.card_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX card_leads_owner_idx ON public.card_leads (owner_id, created_at DESC);
CREATE INDEX card_leads_card_idx ON public.card_leads (card_id);

GRANT INSERT ON public.card_leads TO anon;
GRANT SELECT, DELETE ON public.card_leads TO authenticated;
GRANT ALL ON public.card_leads TO service_role;

ALTER TABLE public.card_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors share details on collecting cards"
  ON public.card_leads FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_id AND c.collect_contacts
    )
    AND owner_id = (SELECT c2.user_id FROM public.cards c2 WHERE c2.id = card_id)
  );

CREATE POLICY "Owners view received contacts"
  ON public.card_leads FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners delete received contacts"
  ON public.card_leads FOR DELETE TO authenticated
  USING (owner_id = auth.uid());