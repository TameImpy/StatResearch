CREATE TABLE public.slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  theme text NOT NULL DEFAULT 'General',
  week_of date NOT NULL DEFAULT current_date,
  summary text NOT NULL DEFAULT '',
  key_points text[] NOT NULL DEFAULT '{}',
  content_text text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  uploaded_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.slides TO anon, authenticated;
GRANT ALL ON public.slides TO service_role;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view slides" ON public.slides FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX slides_week_idx ON public.slides (week_of DESC);

CREATE TABLE public.uploaders (
  user_id text PRIMARY KEY,
  email text,
  display_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('owner','approved','pending')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.uploaders TO service_role;
ALTER TABLE public.uploaders ENABLE ROW LEVEL SECURITY;