
-- Rounds: new settings columns
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS scoring_format text NOT NULL DEFAULT 'stroke',
  ADD COLUMN IF NOT EXISTS hcp_allowance int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'general_play',
  ADD COLUMN IF NOT EXISTS handicap_round boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS go_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gps_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS holes_combination text NOT NULL DEFAULT '18',
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS join_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS rounds_join_token_key ON public.rounds(join_token);

-- Round holes: per-player + richer stats
ALTER TABLE public.round_holes
  ADD COLUMN IF NOT EXISTS round_player_id uuid,
  ADD COLUMN IF NOT EXISTS sand_shots int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS up_down boolean,
  ADD COLUMN IF NOT EXISTS sand_save boolean,
  ADD COLUMN IF NOT EXISTS fairway_direction text CHECK (fairway_direction IN ('left','straight','right','short'));

-- Round players (buddies + guests)
CREATE TABLE IF NOT EXISTS public.round_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name text,
  guest_hcp numeric,
  playing_hcp numeric,
  group_number int NOT NULL DEFAULT 1,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((user_id IS NOT NULL) OR (guest_name IS NOT NULL))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_players TO authenticated;
GRANT ALL ON public.round_players TO service_role;
GRANT SELECT ON public.round_players TO anon;

ALTER TABLE public.round_players ENABLE ROW LEVEL SECURITY;

-- Round owner (by uuid) or the player themselves can manage/see
CREATE POLICY "round_players_select"
  ON public.round_players FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND r.owner_user_id = auth.uid())
    OR true -- allow anon read for share-link joins; PII is limited
  );

CREATE POLICY "round_players_insert"
  ON public.round_players FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND (r.owner_user_id = auth.uid() OR r.owner_user_id IS NULL))
    OR user_id = auth.uid()
  );

CREATE POLICY "round_players_update"
  ON public.round_players FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND r.owner_user_id = auth.uid())
  );

CREATE POLICY "round_players_delete"
  ON public.round_players FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_id AND r.owner_user_id = auth.uid())
  );

-- Buddies (social graph)
DO $$ BEGIN
  CREATE TYPE public.buddy_status AS ENUM ('pending','accepted','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.buddies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.buddy_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buddies TO authenticated;
GRANT ALL ON public.buddies TO service_role;

ALTER TABLE public.buddies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buddies_select_own"
  ON public.buddies FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "buddies_insert_as_requester"
  ON public.buddies FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "buddies_update_addressee"
  ON public.buddies FOR UPDATE
  USING (addressee_id = auth.uid() OR requester_id = auth.uid());

CREATE POLICY "buddies_delete_own"
  ON public.buddies FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Profiles: allow public read of basic fields so buddies list / round groups can display names
DROP POLICY IF EXISTS "profiles_public_read_basic" ON public.profiles;
CREATE POLICY "profiles_public_read_basic"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Storage policies for avatars bucket (private, per-user folder)
CREATE POLICY "avatars_select_own_or_authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
