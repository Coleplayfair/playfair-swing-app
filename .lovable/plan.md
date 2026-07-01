# Round Tracking ("Play") — Build Plan

Adds a new **Play** section to the app, patterned after Hole19: search a course → start a round → per-hole GPS distances to front/center/back of green → hole-by-hole scorecard with putts / fairway / GIR / penalties → live map view → save round → history & stats dashboard. All data synced to Lovable Cloud.

---

## 1. Prerequisites (you do this)

- Sign up at **golfcourseapi.com**, grab your API key.
- I'll request it via the secure secret form as `GOLF_COURSE_API_KEY`. Nothing else needed from you.

---

## 2. Navigation change

Bottom nav becomes 4 tabs:

```text
[ Play ]  [ Book ]  [ My Bag ]  [ Profile ]
```

New "Play" icon = golf flag SVG (Playfair green, same style as existing bag/golfer icons).

---

## 3. Database (Lovable Cloud)

Four new tables, all RLS-scoped to `auth.uid()`:

- **courses_cache** — mirrored subset of GolfCourseAPI responses (id, name, club_name, location, tee_boxes JSONB, holes JSONB with par/yardage/handicap and green coordinates). Populated on first search of a course.
- **rounds** — id, user_id, course_id, tee_box, started_at, ended_at, status (`active`/`completed`), weather, notes, totals (score, putts, fairways_hit, GIR, penalties).
- **round_holes** — round_id, hole_number, par, yardage, score, putts, fairway_hit (nullable, par-3 excluded), gir (bool), penalties, drive_distance (optional), notes.
- **shots** *(optional, Hole19-style shot tracking)* — round_id, hole_number, shot_number, club (FK to bag), lat, lng, distance_yards.

Grants + RLS policies (owner-only) included in the migration.

---

## 4. Server functions (`createServerFn`, all auth-gated)

- `searchCourses({ query })` → proxies GolfCourseAPI, caches result summaries.
- `getCourse({ courseId })` → fetches + caches full course incl. hole coordinates.
- `startRound({ courseId, teeBox })` → creates round + 18 round_holes rows.
- `updateHole({ roundId, hole, patch })` → upserts score/putts/etc, recomputes round totals via trigger.
- `finishRound({ roundId })` → marks completed, finalizes stats.
- `listRounds()` / `getRound({ id })` / `deleteRound({ id })`.
- `getUserStats()` → aggregated: handicap trend, avg score, avg putts, FIR %, GIR %, scoring average by par.

API key read via `process.env.GOLF_COURSE_API_KEY` inside handler only.

---

## 5. UI screens

All mobile-first, Playfair branded (green #094811, cream #EDE9DF, Libre Baskerville headings, 2px corners).

1. **Play home** — big "Start a Round" CTA, list of in-progress round (resume), recent completed rounds, quick stats strip.
2. **Course search** — search bar → results list (name, club, city). Tap → tee selection sheet → confirm → start round.
3. **Active round — GPS view** (default per hole):
   - Big number: distance to center of green (yards, geolocation-based).
   - Front / Back distances underneath.
   - Par, hole #, handicap, yardage in header.
   - Hole navigator (◀ 7 / 18 ▶).
   - Tabs: **GPS** · **Map** · **Score**.
4. **Map tab** — Leaflet + OpenStreetMap tiles (free, no key). Player marker (blue dot), green markers (front/center/back). Tap anywhere → shows distance from player and distance to green.
5. **Score tab** — score stepper (− par +), putts stepper, fairway hit toggle (skipped on par-3), GIR auto-calculated, penalty counter.
6. **Round summary** — final scorecard grid (front 9 / back 9 / total vs par), stats bar, "Save & Finish" button.
7. **History** — list of past rounds (date, course, score vs par).
8. **Stats dashboard** — rounds played, avg score, avg putts, FIR%, GIR%, best round, last-10 trend line.

Uses browser `navigator.geolocation.watchPosition` for live GPS. Haversine formula for yardage.

---

## 6. Libraries added

- `leaflet` + `react-leaflet` — free map (OSM tiles).
- No paid mapping key needed.

---

## 7. What I will NOT do

- No paid map provider (Mapbox/Google) — OSM is free and looks clean.
- No shot-by-shot AI recommendations — out of scope for v1.
- No social feed / friends — you didn't ask for it.
- Won't touch existing Book / My Bag / Profile / auth flows.

---

## 8. Order of operations

1. Request `GOLF_COURSE_API_KEY` secret.
2. Run DB migration.
3. Install leaflet + react-leaflet.
4. Add server functions.
5. Build UI screens + new Play tab.
6. Wire geolocation + map.
7. Verify build.

Approve and I'll start with the secret request, then execute steps 2–7 in one pass.