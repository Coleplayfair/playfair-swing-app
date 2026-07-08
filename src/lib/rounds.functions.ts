import { createServerFn } from "@tanstack/react-start";

const API_BASE = "https://golfapi.io/api/v2.3";

async function gcaFetch(path: string, retries = 1): Promise<any> {
  const key = process.env.GOLF_COURSE_API_KEY;
  if (!key) throw new Error("GOLF_COURSE_API_KEY not set");
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return res.json();
    if (res.status === 429 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      continue;
    }
    if (res.status === 429) {
      throw new Error("Course directory is busy right now — please try again in a moment.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Course directory rejected the API key. Please check GOLF_COURSE_API_KEY.");
    }
    const body = await res.text().catch(() => "");
    throw new Error(`GolfAPI ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error("Course directory unavailable");
}

function normalizeCourse(course: any, coords?: any) {
  const id = String(course?.courseID ?? "");
  const name = course?.courseName || "Unknown course";
  const club_name = course?.clubName ?? null;
  const numHoles = parseInt(String(course?.numHoles ?? 18), 10) || 18;
  const parsMen: number[] = Array.isArray(course?.parsMen) ? course.parsMen : [];
  const indexesMen: number[] = Array.isArray(course?.indexesMen) ? course.indexesMen : [];

  // Build greens per hole from /coordinates response. poi=1 marks the green;
  // location: 3=front, 2=center, 1=back.
  const greensByHole: Record<number, any> = {};
  const coordList: any[] = coords?.coordinates ?? [];
  for (const c of coordList) {
    if (String(c.poi) !== "1") continue;
    const h = Number(c.hole);
    if (!Number.isFinite(h)) continue;
    if (!greensByHole[h]) greensByHole[h] = {};
    const loc = String(c.location);
    const point = { lat: Number(c.latitude), lng: Number(c.longitude) };
    if (loc === "3") greensByHole[h].green_front = point;
    else if (loc === "2") greensByHole[h].green_center = point;
    else if (loc === "1") greensByHole[h].green_back = point;
  }

  const teesRaw: any[] = Array.isArray(course?.tees) ? course.tees : [];
  const tee_boxes = teesRaw.map((t: any) => {
    const holes = Array.from({ length: numHoles }, (_, i) => {
      const holeNum = i + 1;
      const g = greensByHole[holeNum] || {};
      const yardage = t[`length${holeNum}`];
      return {
        hole_number: holeNum,
        par: parsMen[i] ?? 4,
        yardage: typeof yardage === "number" ? yardage : (yardage ? Number(yardage) : null),
        handicap: indexesMen[i] ?? null,
        green_front: g.green_front ?? null,
        green_center: g.green_center ?? null,
        green_back: g.green_back ?? null,
      };
    });
    const total_yards = holes.reduce((s, h) => s + (typeof h.yardage === "number" ? h.yardage : 0), 0);
    const par_total = holes.reduce((s, h) => s + (h.par || 0), 0);
    const rating = typeof t.courseRatingMen === "number" ? t.courseRatingMen : null;
    const slope = typeof t.slopeMen === "number" ? t.slopeMen : null;
    return {
      tee_name: t.teeName || "Default",
      tee_color: t.teeColor ?? null,
      course_rating: rating,
      slope_rating: slope,
      total_yards,
      par_total,
      number_of_holes: numHoles,
      holes,
    };
  });

  return {
    id,
    name,
    club_name,
    city: course?.city ?? null,
    region: course?.state ?? null,
    country: course?.country ?? null,
    latitude: course?.latitude ? Number(course.latitude) : null,
    longitude: course?.longitude ? Number(course.longitude) : null,
    tee_boxes,
    holes: tee_boxes[0]?.holes ?? [],
    raw: { course, coords },
  };
}

export const searchCourses = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const q = (data.query || "").trim();
    if (q.length < 2) return { courses: [] as any[] };
    const raw = await gcaFetch(`/courses?name=${encodeURIComponent(q)}`);
    const list: any[] = raw?.courses ?? [];
    const courses = list.slice(0, 25).map((c: any) => ({
      id: String(c.courseID),
      name: c.courseName || "Course",
      club_name: c.clubName ?? null,
      city: c.city ?? null,
      country: c.country ?? null,
    }));
    return { courses };
  });


function hasGreenCoords(tee_boxes: any): boolean {
  const teeArr = Array.isArray(tee_boxes) ? tee_boxes : [];
  for (const t of teeArr) {
    for (const h of t.holes || []) {
      if (h.green_center || h.green_front || h.green_back || h.green) return true;
    }
  }
  return false;
}

export const getCourse = createServerFn({ method: "POST" })
  .inputValidator((d: { courseId: string; refresh?: boolean }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cached = await supabaseAdmin.from("courses_cache").select("*").eq("id", data.courseId).maybeSingle();
    // Refresh cached rows that lack green coordinates (stored before the provider swap).
    const stale = cached.data && !hasGreenCoords(cached.data.tee_boxes);
    if (cached.data && !data.refresh && !stale) {
      const c = cached.data;
      return {
        id: c.id, name: c.name, club_name: c.club_name, city: c.city, region: c.region,
        country: c.country, latitude: c.latitude, longitude: c.longitude,
        tee_boxes: c.tee_boxes, holes: c.holes,
      };
    }
    const course = await gcaFetch(`/courses/${encodeURIComponent(data.courseId)}`);
    let coords: any = null;
    if (String(course?.hasGPS ?? "0") === "1") {
      try {
        coords = await gcaFetch(`/coordinates/${encodeURIComponent(data.courseId)}`);
      } catch { /* GPS optional; continue without */ }
    }
    const n = normalizeCourse(course, coords);
    await supabaseAdmin.from("courses_cache").upsert({
      id: n.id, name: n.name, club_name: n.club_name, city: n.city, region: n.region,
      country: n.country, latitude: n.latitude, longitude: n.longitude,
      tee_boxes: n.tee_boxes, holes: n.holes, raw: n.raw,
    });
    const { raw: _r, ...rest } = n;
    return rest;
  });


export const startRound = createServerFn({ method: "POST" })
  .inputValidator((d: {
    playerId: string; courseId: string; teeBox: string;
    ownerUserId?: string | null;
    settings?: {
      mode?: string; scoring_format?: string; hcp_allowance?: number;
      handicap_round?: boolean; go_live?: boolean; gps_only?: boolean;
      holes_combination?: string; starts_at?: string | null;
    };
  }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cc = await supabaseAdmin.from("courses_cache").select("*").eq("id", data.courseId).maybeSingle();
    if (!cc.data) throw new Error("Course not cached — call getCourse first");
    const tees = (cc.data.tee_boxes as any[]) || [];
    const tee = tees.find((t) => t.tee_name === data.teeBox) || tees[0];
    const holes = (tee?.holes as any[]) || (cc.data.holes as any[]) || [];
    const total_par = holes.reduce((s, h) => s + (h.par || 0), 0);
    const s = data.settings || {};

    const round = await supabaseAdmin.from("rounds").insert({
      player_id: data.playerId,
      course_id: data.courseId,
      course_name: cc.data.name,
      tee_box: tee?.tee_name ?? null,
      status: "active",
      total_par,
      owner_user_id: data.ownerUserId ?? null,
      mode: s.mode ?? "general_play",
      scoring_format: s.scoring_format ?? "stroke",
      hcp_allowance: s.hcp_allowance ?? 100,
      handicap_round: s.handicap_round ?? false,
      go_live: s.go_live ?? false,
      gps_only: s.gps_only ?? false,
      holes_combination: s.holes_combination ?? "18",
      starts_at: s.starts_at ?? null,
    }).select().single();
    if (round.error) throw round.error;

    const holesRows = holes.map((h) => ({
      round_id: round.data.id,
      hole_number: h.hole_number,
      par: h.par || 4,
      yardage: h.yardage,
      handicap: h.handicap,
    }));
    if (holesRows.length) {
      const ins = await supabaseAdmin.from("round_holes").insert(holesRows);
      if (ins.error) throw ins.error;
    }
    return { round_id: round.data.id };
  });

export const getRound = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; roundId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("rounds").select("*").eq("id", data.roundId).eq("player_id", data.playerId).maybeSingle();
    if (!r.data) throw new Error("Round not found");
    const h = await supabaseAdmin.from("round_holes").select("*").eq("round_id", data.roundId).order("hole_number");
    const c = await supabaseAdmin.from("courses_cache").select("*").eq("id", r.data.course_id).maybeSingle();
    return { round: r.data, holes: h.data || [], course: c.data };
  });

export const updateHole = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; roundId: string; holeNumber: number; patch: Record<string, any> }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owns = await supabaseAdmin.from("rounds").select("id").eq("id", data.roundId).eq("player_id", data.playerId).maybeSingle();
    if (!owns.data) throw new Error("Not authorized");
    const allowed = ["score", "putts", "fairway_hit", "gir", "penalties", "drive_distance", "notes", "sand_shots", "up_down", "sand_save", "fairway_direction"];
    const patch: any = {};
    for (const k of allowed) if (k in data.patch) patch[k] = data.patch[k];
    // auto GIR if score present and putts present, and not manually overridden
    const holeRow = await supabaseAdmin.from("round_holes").select("*").eq("round_id", data.roundId).eq("hole_number", data.holeNumber).maybeSingle();
    if (!holeRow.data) throw new Error("Hole not found");
    const merged = { ...holeRow.data, ...patch };
    if (!("gir" in data.patch) && typeof merged.score === "number" && typeof merged.putts === "number" && typeof merged.par === "number") {
      patch.gir = merged.score - merged.putts <= merged.par - 2;
    }
    await supabaseAdmin.from("round_holes").update(patch).eq("round_id", data.roundId).eq("hole_number", data.holeNumber);
    // recompute totals
    const all = await supabaseAdmin.from("round_holes").select("*").eq("round_id", data.roundId);
    const rows = all.data || [];
    const totals = {
      total_score: rows.reduce((s, r) => s + (r.score || 0), 0),
      total_putts: rows.reduce((s, r) => s + (r.putts || 0), 0),
      fairways_hit: rows.reduce((s, r) => s + (r.fairway_hit === true ? 1 : 0), 0),
      fairways_possible: rows.reduce((s, r) => s + (r.par >= 4 ? 1 : 0), 0),
      greens_in_reg: rows.reduce((s, r) => s + (r.gir === true ? 1 : 0), 0),
      penalties: rows.reduce((s, r) => s + (r.penalties || 0), 0),
    };
    await supabaseAdmin.from("rounds").update(totals).eq("id", data.roundId);
    return { ok: true };
  });

export const finishRound = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; roundId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("rounds").update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", data.roundId).eq("player_id", data.playerId);
    return { ok: true };
  });

export const listRounds = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("rounds").select("*").eq("player_id", data.playerId).order("started_at", { ascending: false }).limit(50);
    return { rounds: r.data || [] };
  });

function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const nearbyCourses = createServerFn({ method: "POST" })
  .inputValidator((d: { lat: number; lng: number; radiusMeters?: number }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) return { courses: [] as any[] };
    const radius = Math.min(Math.max(data.radiusMeters ?? 50000, 1000), 50000);
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.addressComponents",
      },
      body: JSON.stringify({
        includedTypes: ["golf_course"],
        maxResultCount: 20,
        locationRestriction: { circle: { center: { latitude: data.lat, longitude: data.lng }, radius } },
        rankPreference: "DISTANCE",
      }),
    });
    if (!res.ok) return { courses: [] as any[] };
    const json: any = await res.json();
    const places: any[] = json?.places ?? [];
    if (!places.length) return { courses: [] as any[] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: any[] = [];
    const MAX_MATCH_KM = 25;

    for (const p of places) {
      const displayName = p?.displayName?.text || "";
      const pLat = p?.location?.latitude;
      const pLng = p?.location?.longitude;
      if (!displayName || pLat == null || pLng == null) continue;

      // Parse address components for city/region/country from Places (authoritative for location)
      const comps: any[] = p?.addressComponents ?? [];
      const findComp = (type: string) =>
        comps.find((c) => (c.types || []).includes(type))?.shortText
        ?? comps.find((c) => (c.types || []).includes(type))?.longText
        ?? null;
      const city = findComp("locality") || findComp("postal_town") || findComp("administrative_area_level_2");
      const region = findComp("administrative_area_level_1");
      const country = findComp("country");

      // Try to match to GolfCourseAPI, but ONLY accept a match within MAX_MATCH_KM of the Places location
      let matched: any = null;
      try {
        const raw = await gcaFetch(`/search?search_query=${encodeURIComponent(displayName)}`);
        const list: any[] = raw?.courses ?? raw?.results ?? [];
        // Pick the closest candidate within MAX_MATCH_KM
        let best: { c: any; km: number } | null = null;
        for (const c of list) {
          const loc = c.location ?? c.club?.location ?? {};
          if (loc.latitude == null || loc.longitude == null) continue;
          const km = kmBetween(pLat, pLng, loc.latitude, loc.longitude);
          if (km <= MAX_MATCH_KM && (!best || km < best.km)) best = { c, km };
        }
        matched = best?.c ?? null;
      } catch { /* ignore */ }
      if (!matched?.id) continue; // require a verified GCA match so the course is playable

      const course = {
        id: String(matched.id),
        name: matched.course_name || matched.name || displayName,
        club_name: matched.club_name ?? matched.club?.club_name ?? null,
        city, region, country,
        latitude: pLat,
        longitude: pLng,
        photo_name: p.photos?.[0]?.name ?? null,
      };

      // Always refresh photo_name/location for nearby (Places is the authoritative source here)
      const existing = await supabaseAdmin.from("courses_cache").select("id,photo_name").eq("id", course.id).maybeSingle();
      if (!existing.data) {
        await supabaseAdmin.from("courses_cache").insert({
          id: course.id, name: course.name, club_name: course.club_name,
          city: course.city, region: course.region, country: course.country,
          latitude: course.latitude, longitude: course.longitude,
          photo_name: course.photo_name,
          photo_checked_at: course.photo_name ? new Date().toISOString() : null,
        });
      } else if (course.photo_name && !existing.data.photo_name) {
        await supabaseAdmin.from("courses_cache").update({
          photo_name: course.photo_name,
          photo_checked_at: new Date().toISOString(),
          latitude: course.latitude, longitude: course.longitude,
        }).eq("id", course.id);
      }

      out.push(course);
      if (out.length >= 10) break;
    }
    return { courses: out };
  });

export const listMyCourses = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("rounds").select("course_id,course_name,started_at").eq("player_id", data.playerId).order("started_at", { ascending: false }).limit(50);
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of r.data || []) {
      if (row.course_id && !seen.has(row.course_id)) { seen.add(row.course_id); ids.push(row.course_id); }
    }
    if (!ids.length) return { courses: [] as any[] };
    const cc = await supabaseAdmin.from("courses_cache").select("id,name,club_name,city,region,country,latitude,longitude,photo_name").in("id", ids);
    const byId: Record<string, any> = {};
    for (const c of cc.data || []) byId[c.id] = c;
    return { courses: ids.map((id) => byId[id]).filter(Boolean) };
  });

export const deleteRound = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; roundId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("rounds").delete().eq("id", data.roundId).eq("player_id", data.playerId);
    return { ok: true };
  });

export const getUserStats = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("rounds").select("*").eq("player_id", data.playerId).eq("status", "completed").order("ended_at", { ascending: false });
    const rows = r.data || [];
    if (!rows.length) return { count: 0, avg_score: null, avg_putts: null, fir_pct: null, gir_pct: null, best: null, last10: [] as any[] };
    const avg_score = rows.reduce((s, x) => s + x.total_score, 0) / rows.length;
    const avg_putts = rows.reduce((s, x) => s + x.total_putts, 0) / rows.length;
    const firP = rows.reduce((s, x) => s + x.fairways_possible, 0);
    const firH = rows.reduce((s, x) => s + x.fairways_hit, 0);
    const holesPlayed = rows.length * 18;
    const gir = rows.reduce((s, x) => s + x.greens_in_reg, 0);
    const best = rows.reduce((m, x) => (m == null || x.total_score - x.total_par < m.total_score - m.total_par ? x : m), null as any);
    return {
      count: rows.length,
      avg_score: Math.round(avg_score * 10) / 10,
      avg_putts: Math.round(avg_putts * 10) / 10,
      fir_pct: firP ? Math.round((firH / firP) * 100) : null,
      gir_pct: Math.round((gir / holesPlayed) * 100),
      best: { total_score: best.total_score, total_par: best.total_par, course_name: best.course_name, ended_at: best.ended_at },
      last10: rows.slice(0, 10).reverse().map((x) => ({ score: x.total_score, par: x.total_par, date: x.ended_at })),
    };
  });

/* ═════════════ ROUND SETTINGS & PLAYERS ═════════════ */

export const updateRoundSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; roundId: string; patch: Record<string, any> }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owns = await supabaseAdmin.from("rounds").select("id").eq("id", data.roundId).eq("player_id", data.playerId).maybeSingle();
    if (!owns.data) throw new Error("Not authorized");
    const allowed = ["mode", "scoring_format", "hcp_allowance", "handicap_round", "go_live", "gps_only", "holes_combination", "starts_at", "tee_box"];
    const patch: any = {};
    for (const k of allowed) if (k in data.patch) patch[k] = data.patch[k];
    await supabaseAdmin.from("rounds").update(patch).eq("id", data.roundId);
    return { ok: true };
  });

export const listRoundPlayers = createServerFn({ method: "POST" })
  .inputValidator((d: { roundId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const p = await supabaseAdmin.from("round_players").select("*").eq("round_id", data.roundId).order("position");
    const rows = p.data || [];
    const uids = rows.map((r: any) => r.user_id).filter(Boolean);
    let profByUid: Record<string, any> = {};
    if (uids.length) {
      const pr = await supabaseAdmin.from("profiles").select("id,first_name,last_name,avatar_url,handicap,suburb").in("id", uids);
      for (const p of pr.data || []) profByUid[p.id] = p;
    }
    return {
      players: rows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        guest_name: r.guest_name,
        guest_hcp: r.guest_hcp,
        playing_hcp: r.playing_hcp,
        group_number: r.group_number,
        position: r.position,
        profile: r.user_id ? profByUid[r.user_id] : null,
      })),
    };
  });

export const addRoundPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; roundId: string; buddyUserId?: string; guestName?: string; guestHcp?: number | null; groupNumber?: number }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owns = await supabaseAdmin.from("rounds").select("id,player_id").eq("id", data.roundId).eq("player_id", data.playerId).maybeSingle();
    if (!owns.data) throw new Error("Not authorized");
    const existing = await supabaseAdmin.from("round_players").select("position").eq("round_id", data.roundId).order("position", { ascending: false }).limit(1);
    const nextPos = (existing.data?.[0]?.position ?? -1) + 1;
    const ins = await supabaseAdmin.from("round_players").insert({
      round_id: data.roundId,
      user_id: data.buddyUserId ?? null,
      guest_name: data.guestName ?? null,
      guest_hcp: data.guestHcp ?? null,
      group_number: data.groupNumber ?? 1,
      position: nextPos,
    }).select().single();
    if (ins.error) throw ins.error;
    return { id: ins.data.id };
  });

export const removeRoundPlayer = createServerFn({ method: "POST" })
  .inputValidator((d: { playerId: string; roundId: string; roundPlayerId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owns = await supabaseAdmin.from("rounds").select("id").eq("id", data.roundId).eq("player_id", data.playerId).maybeSingle();
    if (!owns.data) throw new Error("Not authorized");
    await supabaseAdmin.from("round_players").delete().eq("id", data.roundPlayerId).eq("round_id", data.roundId);
    return { ok: true };
  });

export const getRoundByJoinToken = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("rounds").select("id,course_name,status,started_at,starts_at,scoring_format,hcp_allowance").eq("join_token", data.token).maybeSingle();
    if (!r.data) throw new Error("Invalid join link");
    return { round: r.data };
  });

