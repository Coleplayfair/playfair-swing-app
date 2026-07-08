
## What's changing

Bring the round flow up to Hole19 quality, add a real buddies system, ad-hoc guests, profile pictures, and rename the bottom nav.

## Bottom nav (final)

`Play On Course` · `Performance` · `Playfair Venue` · `My Bag` · `Me`

Rationale: "Play On Course" = outdoor rounds, "Playfair Venue" = indoor venue booking (member/customer facing). "Me" replaces "Profile" for warmth.

## New / redesigned screens

1. **Round Settings** (image 4) — pre-create sheet
   - Course header (image + name + holes + par)
   - Combination (9/18/front9/back9), Starts (Now / Later)
   - Format: Mode (General Play / Tournament), Scoring (Stroke / Stableford), HCP Allowance %
   - Toggles: Handicap Round, Go Live, GPS Only
   - CTA: **Create Round** → goes to Round Details

2. **Round Details** (image 1) — pre-start lobby
   - "Starting soon" chip, course card, scoring + HCP allowance
   - Share / Trophy / Settings icon row
   - Side Game row (stub — "Add")
   - Groups → Group 1 with player avatars + Add Player slots
   - CTA: **Start Round** → hole input

3. **Add Player sheet** (image 2)
   - Search by name, Share QR + Share Link buttons
   - Tabs: BUDDIES / GUESTS
   - Buddies list with avatar, name, country | HCP, ADD button
   - Guests tab: add ad-hoc name + optional HCP (no account)

4. **Hole Input screen** (image 3)
   - Per player card: avatar, name, current score, PICK UP
   - Total Strokes (+/- stepper), then "How many were:" Putts, Sand Shots, Penalties
   - Fairways: 4 direction buttons (left / straight / right / short) — highlights the hit direction
   - GIR / Sand Saves / Up & Down pill toggles
   - Bottom hole nav: prev / hole # + par + SI / next, trophy FAB (scorecard)

## Profile pictures

- New storage bucket `avatars` (public read, per-user write via RLS on `storage.objects`)
- `profiles.avatar_url` (text) — already fine if present; otherwise add
- Upload UI in Me tab: pick file → upload to `avatars/{user_id}/avatar.{ext}` → save public URL
- Show avatar everywhere: nav, round details groups, add-player sheet, hole input

## Buddies + guests

Tables:

- `buddies` — `id, requester_id, addressee_id, status ('pending'|'accepted'|'blocked'), created_at, accepted_at, unique(requester_id, addressee_id)`
  - RLS: user sees rows where they are requester or addressee; insert as requester; update only if addressee (accept/block)
- `round_players` — replaces the informal group. `id, round_id, user_id (nullable), guest_name (nullable), guest_hcp (nullable), group_number int default 1, playing_hcp numeric, position int, created_at`
  - Exactly one of `user_id` / `guest_name` set (CHECK)
  - RLS: readable/writable if `auth.uid()` owns the round OR is the row's `user_id`
- Per-player scoring: extend `round_holes` with `round_player_id` FK; keep existing `round_id` for backwards compat but scope inputs by player.

Share link: `/join/:token` (public) — token stored on `rounds.join_token` (uuid). Landing page lets a signed-in buddy join, or lets an anonymous person add themselves as a guest (name + optional HCP).

## File map

Frontend
- `src/lib/play-screen.tsx` → split into:
  - `src/lib/screens/play-on-course.tsx` (existing PlayHome, renamed)
  - `src/lib/screens/round-settings.tsx` (new)
  - `src/lib/screens/round-details.tsx` (new)
  - `src/lib/screens/hole-input.tsx` (new — replaces current scorecard entry)
  - `src/lib/screens/venue.tsx` (Playfair Venue placeholder — booking coming next)
  - `src/lib/screens/me.tsx` (Profile + avatar upload + buddies list)
- `src/lib/components/add-player-sheet.tsx` (BUDDIES/GUESTS tabs)
- `src/lib/components/avatar-uploader.tsx`
- `src/routes/index.tsx` — nav labels, route state machine wired to new screens
- `src/routes/join.$token.tsx` — public join page
- `src/styles.css` — Hole19-flavored tokens in Playfair palette (card, stepper, pill toggles, fairway direction buttons)

Backend / server fns
- `src/lib/rounds.functions.ts` — add:
  - `createRoundV2` (takes settings + returns join_token)
  - `getRoundDetails` (round + players + settings)
  - `updateRoundSettings`
  - `addRoundPlayer` ({ roundId, buddyUserId | guest: { name, hcp } })
  - `removeRoundPlayer`
  - `updateHolePerPlayer` (round_player_id, hole_number, patch — sand_shots, up_down, sand_save, fairway_direction)
- `src/lib/buddies.functions.ts` (new): `searchBuddies`, `sendBuddyRequest`, `acceptBuddyRequest`, `listBuddies`, `listPendingRequests`
- `src/lib/profile.functions.ts` (new): `updateAvatar`, `updateProfile`

Migrations
1. Add columns: `rounds.scoring_format`, `rounds.hcp_allowance`, `rounds.mode`, `rounds.handicap_round bool`, `rounds.go_live bool`, `rounds.gps_only bool`, `rounds.join_token uuid unique default gen_random_uuid()`, `rounds.starts_at timestamptz`
2. `round_holes` add columns: `round_player_id uuid`, `sand_shots int`, `up_down bool`, `sand_save bool`, `fairway_direction text check in (left,straight,right,short,null)`
3. Create `buddies` and `round_players` (with GRANTs, RLS, policies)
4. Storage: create `avatars` bucket (public), RLS on `storage.objects` for per-user write path `{auth.uid()}/…`
5. `profiles.avatar_url text` (if not present)

## Order of implementation

1. Migrations (schema + storage bucket + RLS)
2. Server fns (rounds v2, buddies, profile)
3. Nav rename + route wiring
4. Round Settings → Round Details → Add Player sheet → Hole Input
5. Me tab with avatar upload + buddies list
6. Playfair Venue placeholder ("Book indoor bays" — full booking flow next milestone)
7. Verify with tsgo + visual check via preview

## Out of scope for this pass

- Full indoor venue booking (bays, time slots, payments) — placeholder tab only, next milestone
- Side games (Skins, Nassau) — "Add" row is a stub
- Live tracking realtime — `go_live` toggle stored but no realtime yet
- Push notifications for buddy requests
