REVOKE SELECT ON public.signups FROM anon, authenticated;

CREATE POLICY "No public read access to signups"
ON public.signups
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (false);