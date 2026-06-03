
DROP POLICY "Anyone can insert signups" ON public.signups;

CREATE POLICY "Anyone can insert signups"
  ON public.signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(first_name) BETWEEN 1 AND 100
    AND length(last_name) BETWEEN 1 AND 100
    AND length(email) BETWEEN 3 AND 255
    AND length(mobile) BETWEEN 3 AND 50
    AND length(suburb) BETWEEN 1 AND 120
  );
