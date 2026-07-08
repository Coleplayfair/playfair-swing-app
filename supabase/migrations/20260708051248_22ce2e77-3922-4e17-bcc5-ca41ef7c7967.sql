-- Clear cached course names/photos so they re-resolve with the new logic
-- (prefer club_name, better Places query).
UPDATE public.courses_cache
SET photo_name = NULL, photo_checked_at = NULL
WHERE photo_name IS NULL;

-- Rows whose stored name is a generic placeholder should be recomputed
-- on next getCourse call by clearing tee_boxes (forces refresh via stale-check).
UPDATE public.courses_cache
SET name = COALESCE(NULLIF(club_name, ''), name)
WHERE name ~* '^[0-9]+[- ]?hole course$' OR lower(name) = 'course';
