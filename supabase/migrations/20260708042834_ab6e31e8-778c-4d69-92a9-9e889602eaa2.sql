
-- Remove overly permissive profile read policy
DROP POLICY IF EXISTS profiles_public_read_basic ON public.profiles;

-- Restrict round_players SELECT to owner or self
DROP POLICY IF EXISTS round_players_select ON public.round_players;
CREATE POLICY round_players_select ON public.round_players
FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.rounds r WHERE r.id = round_players.round_id AND r.owner_user_id = auth.uid())
);

-- Restrict avatar reads to owning folder
DROP POLICY IF EXISTS avatars_select_own_or_authenticated ON storage.objects;
CREATE POLICY avatars_select_own ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
