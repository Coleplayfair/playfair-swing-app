
-- Courses cache
CREATE TABLE public.courses_cache (
  id text PRIMARY KEY,
  name text NOT NULL,
  club_name text,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  tee_boxes jsonb NOT NULL DEFAULT '[]'::jsonb,
  holes jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.courses_cache TO service_role;
ALTER TABLE public.courses_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access courses_cache" ON public.courses_cache FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Rounds
CREATE TABLE public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL,
  course_id text NOT NULL,
  course_name text NOT NULL,
  tee_box text,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_score integer NOT NULL DEFAULT 0,
  total_par integer NOT NULL DEFAULT 0,
  total_putts integer NOT NULL DEFAULT 0,
  fairways_hit integer NOT NULL DEFAULT 0,
  fairways_possible integer NOT NULL DEFAULT 0,
  greens_in_reg integer NOT NULL DEFAULT 0,
  penalties integer NOT NULL DEFAULT 0,
  notes text,
  weather text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rounds_player_started_idx ON public.rounds (player_id, started_at DESC);
GRANT ALL ON public.rounds TO service_role;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access rounds" ON public.rounds FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Round holes
CREATE TABLE public.round_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  par integer NOT NULL DEFAULT 4,
  yardage integer,
  handicap integer,
  score integer,
  putts integer,
  fairway_hit boolean,
  gir boolean,
  penalties integer NOT NULL DEFAULT 0,
  drive_distance integer,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, hole_number)
);
CREATE INDEX round_holes_round_idx ON public.round_holes (round_id, hole_number);
GRANT ALL ON public.round_holes TO service_role;
ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access round_holes" ON public.round_holes FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Shots (optional shot tracking)
CREATE TABLE public.shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  shot_number integer NOT NULL,
  club text,
  latitude double precision,
  longitude double precision,
  distance_yards integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shots_round_hole_idx ON public.shots (round_id, hole_number, shot_number);
GRANT ALL ON public.shots TO service_role;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access shots" ON public.shots FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_rounds_updated BEFORE UPDATE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_round_holes_updated BEFORE UPDATE ON public.round_holes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_courses_cache_updated BEFORE UPDATE ON public.courses_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
