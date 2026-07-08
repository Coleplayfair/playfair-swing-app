import { useEffect, useState, lazy, Suspense } from "react";
import {
  searchCourses, getCourse, startRound, getRound, updateHole,
  finishRound, listRounds, getUserStats, deleteRound, listMyCourses, nearbyCourses,
} from "@/lib/rounds.functions";
import { distanceYards, getPlayerId } from "@/lib/gps";
import { useUnits, toDisplay, unitLabel } from "@/lib/units";
import markWhite from "@/assets/pf-mark-white.png.asset.json";
import coursePlaceholder from "@/assets/course-placeholder.jpg";

import { RoundSettings, RoundDetails, HoleInput } from "@/lib/round-flow";

const HoleMap = lazy(() => import("@/lib/hole-map"));

type PlayView = "home" | "search" | "round" | "history" | "summary" | "settings" | "details";
type LatLng = { lat: number; lng: number };

function requestCurrentLocation(onSuccess: (gps: LatLng) => void, onError?: (message: string) => void) {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    onError?.("GPS is not available on this device.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => onSuccess({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => onError?.(err.code === err.PERMISSION_DENIED ? "Location permission is turned off." : "GPS could not get your position."),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="venue-tip-overlay" onClick={onClose}>
      <div className="venue-tip-card" onClick={(e) => e.stopPropagation()}>
        <button className="venue-tip-close" onClick={onClose}>✕</button>
        <div className="venue-tip-title">Coming Soon</div>
        <div className="venue-tip-body">Coming soon to the Playfair app.</div>
        <button className="venue-tip-btn" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════ PLAY ═════════════════════════════════════════════ */
export function PlayScreen({ bottomNav, onBookBay }: { bottomNav: React.ReactNode; onBookBay?: () => void }) {
  const [view, setView] = useState<PlayView>("home");
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [pickCourse, setPickCourse] = useState<any | null>(null);
  const [roundGps, setRoundGps] = useState<LatLng | null>(null);
  const [roundGpsError, setRoundGpsError] = useState<string | null>(null);

  const openRound = (id: string) => {
    setRoundGpsError(null);
    requestCurrentLocation(setRoundGps, setRoundGpsError);
    setActiveRoundId(id);
    setView("round");
  };
  const showSummary = (id: string) => { setActiveRoundId(id); setView("summary"); };
  const startFromCourse = (c: any) => { setPickCourse(c); setView("settings"); };

  return (
    <div className="screen">
      {view === "home" && (
        <PlayHome
          onSearch={() => setView("search")}
          onHistory={() => setView("history")}
          onResume={openRound}
          onPickCourse={startFromCourse}
          onBookBay={onBookBay}
        />
      )}
      {view === "search" && (
        <CourseSearch onBack={() => setView("home")} onPick={startFromCourse} />
      )}
      {view === "settings" && pickCourse && (
        <RoundSettings
          course={pickCourse}
          onBack={() => setView("home")}
          onCreated={(id) => { setActiveRoundId(id); setView("details"); }}
        />
      )}
      {view === "details" && activeRoundId && (
        <RoundDetails
          roundId={activeRoundId}
          onClose={() => setView("home")}
          onStart={() => openRound(activeRoundId)}
        />
      )}
      {view === "round" && activeRoundId && (
        <ActiveRound
          roundId={activeRoundId}
          initialGps={roundGps}
          initialGpsError={roundGpsError}
          onExit={() => setView("home")}
          onFinish={() => showSummary(activeRoundId)}
        />
      )}
      {view === "summary" && activeRoundId && (
        <RoundSummary roundId={activeRoundId} onDone={() => setView("home")} />
      )}
      {view === "history" && (
        <History onBack={() => setView("home")} onOpen={showSummary} />
      )}
      {(view === "home" || view === "history") && bottomNav}
    </div>
  );
}

/* ─────── HOME ─────── */
function PlayHome({ onSearch, onHistory, onResume, onPickCourse, onBookBay }: {
  onSearch: () => void; onHistory: () => void; onResume: (id: string) => void; onPickCourse: (c: any) => void; onBookBay?: () => void;
}) {
  const [rounds, setRounds] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const pid = getPlayerId();

  useEffect(() => {
    listRounds({ data: { playerId: pid } }).then((r) => setRounds(r.rounds)).catch(() => {});
    listMyCourses({ data: { playerId: pid } }).then((r) => setMyCourses(r.courses)).catch(() => {});
  }, [pid]);
  useEffect(() => {
    if (!("geolocation" in navigator)) { setGpsDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGpsDenied(true),
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);
  useEffect(() => {
    if (!gps) return;
    setNearbyLoading(true);
    nearbyCourses({ data: { lat: gps.lat, lng: gps.lng } })
      .then((r) => setNearby(r.courses))
      .catch(() => {})
      .finally(() => setNearbyLoading(false));
  }, [gps?.lat, gps?.lng]);

  const active = rounds.find((r) => r.status === "active");
  const myIds = new Set(myCourses.map((c) => c.id));
  const nearbyFiltered = nearby.filter((c) => !myIds.has(c.id));

  return (
    <>
      <div className="pf-play-header">
        <img src={markWhite.url} alt="Playfair" className="pf-play-header-mark" />
        <span className="pf-play-header-title">Play</span>
        <button className="pf-play-header-btn" onClick={onHistory} aria-label="History">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </div>

      <div className="pf-play-body">
        <button className="pf-search-pill" onClick={onSearch}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <span>Search all courses</span>
        </button>

        {active && (
          <div className="pf-active-banner" onClick={() => onResume(active.id)}>
            <div className="pf-active-lbl">Round in progress</div>
            <div className="pf-active-title">{active.course_name}</div>
            <div className="pf-active-cta">Resume round →</div>
          </div>
        )}

        {myCourses.length > 0 && (
          <>
            <div className="pf-section-label">Recently played</div>
            <div className="pf-course-stack">
              {myCourses.map((c) => (
                <CourseCard key={c.id} course={c} gps={gps} onPlay={() => onPickCourse(c)} onPreview={() => onPickCourse(c)} synced />
              ))}
            </div>
          </>
        )}

        {(nearbyFiltered.length > 0 || nearbyLoading || gpsDenied) && (
          <>
            <div className="pf-section-label">Nearby courses</div>
            {nearbyLoading && nearbyFiltered.length === 0 && (
              <div className="pf-note">Finding courses near you…</div>
            )}
            {gpsDenied && (
              <div className="pf-note">Enable location to see courses near you.</div>
            )}
            <div className="pf-course-stack">
              {nearbyFiltered.map((c) => (
                <CourseCard key={c.id} course={c} gps={gps} onPlay={() => onPickCourse(c)} onPreview={() => onPickCourse(c)} />
              ))}
            </div>
          </>
        )}

        {myCourses.length === 0 && nearbyFiltered.length === 0 && !nearbyLoading && !gpsDenied && (
          <div className="pf-empty-state">
            <div className="pf-empty-title">No rounds yet</div>
            <div className="pf-empty-sub">Search for a course above to play your first round.</div>
          </div>
        )}

        {onBookBay && (
          <>
            <div className="pf-section-label" style={{ marginTop: 24 }}>Playfair Venue</div>
            <button className="pf-btn-play pf-btn-play-full" onClick={onBookBay}>
              Book Indoor Bay →
            </button>
            <div className="pf-note" style={{ padding: "24px 8px", fontSize: 12, color: "#999" }}>
              On-course GPS scoring is coming soon.
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* Big Playfair course card */
function CourseCard({ course, gps, onPlay, onPreview, synced }: {
  course: any; gps: { lat: number; lng: number } | null; onPlay: () => void; onPreview: () => void; synced?: boolean;
}) {
  const distKm = gps && course.latitude && course.longitude
    ? Math.round(haversineKm(gps.lat, gps.lng, course.latitude, course.longitude))
    : null;
  const location = [course.city, course.region || course.country].filter(Boolean).join(", ");
  const photoSrc = `/api/public/course-photo/${course.id}?name=${encodeURIComponent(course.club_name || course.name || "")}`;
  return (
    <div className="pf-course-card">
      <img
        className="pf-course-img"
        src={photoSrc}
        alt=""
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = coursePlaceholder; }}
      />
      <div className="pf-course-scrim" />
      {synced && <span className="pf-course-badge">✓ SYNCED</span>}
      <div className="pf-course-content">
        <div className="pf-course-name">{course.name}</div>
        {location && <div className="pf-course-loc">{location}</div>}
        {distKm != null && <div className="pf-course-dist">{distKm} km</div>}
        <div className="pf-course-actions">
          <button className="pf-btn-preview" onClick={onPreview}>PREVIEW</button>
          <button className="pf-btn-play" onClick={onPlay}>PLAY GOLF</button>
        </div>
      </div>
    </div>
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─────── SEARCH ─────── */
function CourseSearch({ onBack, onPick }: { onBack: () => void; onPick: (c: any) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {});
  }, []);

  const run = async () => {
    if (q.trim().length < 2) return;
    setLoading(true); setErr(null);
    try {
      const r = await searchCourses({ data: { query: q.trim() } });
      setResults(r.courses);
    } catch (e: any) { setErr(e.message || "Search failed"); setResults([]); }
    setLoading(false);
  };


  return (
    <>
      <div className="pf-play-header">
        <button className="pf-play-header-btn" onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span className="pf-play-header-title">Find a course</span>
        <span style={{ width: 34 }} />
      </div>

      <div className="pf-play-body">
        <div className="pf-search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input
            autoFocus
            placeholder="Search all courses"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          {q && <button className="pf-search-clear" onClick={() => { setQ(""); setResults([]); }}>✕</button>}
        </div>

        {loading && <div className="pf-note">Searching…</div>}
        {err && !loading && <div className="pf-note">{err}</div>}


        <div className="pf-course-stack">
          {results.map((c) => (
            <CourseCard key={c.id} course={c} gps={gps} onPlay={() => onPick(c)} onPreview={() => onPick(c)} />
          ))}
        </div>
        {!loading && q.length >= 2 && results.length === 0 && (
          <div className="pf-note">No courses found.</div>
        )}
      </div>
    </>
  );
}

/* ─────── TEE PICKER (sheet) ─────── */
function TeePicker({ course, onBack, onStarted }: { course: any; onBack: () => void; onStarted: (id: string) => void }) {
  const [full, setFull] = useState<any | null>(null);
  const [tee, setTee] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const pid = getPlayerId();

  useEffect(() => {
    getCourse({ data: { courseId: course.id } })
      .then((f) => { setFull(f); setTee(((f.tee_boxes as any[]) ?? [])[0]?.tee_name || ""); })
      .catch((e) => alert(e.message));
  }, [course.id]);

  const start = async () => {
    if (!full) return;
    setStarting(true);
    try {
      const r = await startRound({ data: { playerId: pid, courseId: full.id, teeBox: tee } });
      onStarted(r.round_id);
    } catch (e: any) { alert(e.message); setStarting(false); }
  };

  return (
    <>
      <div className="pf-play-header">
        <button className="pf-play-header-btn" onClick={onBack} aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span className="pf-play-header-title">Start round</span>
        <span style={{ width: 34 }} />
      </div>
      <div className="pf-play-body">
        <div className="pf-tee-hero">
          <div className="pf-tee-name">{course.name}</div>
          <div className="pf-tee-loc">{[course.club_name, course.city, course.country].filter(Boolean).join(" · ")}</div>
        </div>
        {!full ? (
          <div className="pf-note">Loading course…</div>
        ) : (
          <>
            <label className="pf-tee-label">Tee box</label>
            <select className="pf-tee-select" value={tee} onChange={(e) => setTee(e.target.value)}>
              {(full.tee_boxes as any[]).map((t: any) => (
                <option key={t.tee_name} value={t.tee_name}>
                  {t.tee_name}{t.par_total ? ` · Par ${t.par_total}` : ""}{t.total_yards ? ` · ${t.total_yards}y` : ""}
                </option>
              ))}
            </select>
            <button className="pf-btn-play pf-btn-play-full" onClick={start} disabled={starting}>
              {starting ? "STARTING…" : "PLAY GOLF"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════ ACTIVE ROUND ═════════════════════════════════════════════ */
function ActiveRound({ roundId, initialGps, initialGpsError, onExit, onFinish }: {
  roundId: string; initialGps: LatLng | null; initialGpsError: string | null; onExit: () => void; onFinish: () => void;
}) {
  const pid = getPlayerId();
  const [data, setData] = useState<any>(null);
  const [holeIdx, setHoleIdx] = useState(0);
  const [tab, setTab] = useState<"gps" | "map" | "score">("gps");
  const [gps, setGps] = useState<LatLng | null>(initialGps);
  const [gpsError, setGpsError] = useState<string | null>(initialGpsError);

  const [units, setU] = useUnits();

  useEffect(() => {
    getRound({ data: { playerId: pid, roundId } }).then(setData);
  }, [pid, roundId]);

  useEffect(() => {
    if (initialGps) {
      setGps(initialGps);
      setGpsError(null);
    }
  }, [initialGps?.lat, initialGps?.lng]);

  useEffect(() => {
    if (initialGpsError) setGpsError(initialGpsError);
  }, [initialGpsError]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGpsError("GPS is not available on this device.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsError(null);
      },
      (err) => setGpsError(err.code === err.PERMISSION_DENIED ? "Location permission is turned off." : "GPS could not get your position."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (!data) return <div style={{ padding: 24, fontSize: 13 }}>Loading round…</div>;
  const holes = data.holes;
  const hole = holes[holeIdx];
  const teeData = (data.course?.tee_boxes as any[])?.find((t) => t.tee_name === data.round.tee_box) || (data.course?.tee_boxes as any[])?.[0];
  const holeCoords = teeData?.holes?.[holeIdx] || {};
  const green = holeCoords.green_center || holeCoords.green_front || holeCoords.green_back
    ? { front: holeCoords.green_front, center: holeCoords.green_center, back: holeCoords.green_back }
    : null;


  const saveHole = async (patch: any) => {
    await updateHole({ data: { playerId: pid, roundId, holeNumber: hole.hole_number, patch } });
    const r = await getRound({ data: { playerId: pid, roundId } });
    setData(r);
  };

  const finish = async () => {
    await finishRound({ data: { playerId: pid, roundId } });
    onFinish();
  };

  const dist = (target: any) => {
    if (!gps || !target?.lat || !target?.lng) return null;
    return toDisplay(distanceYards(gps, { lat: target.lat, lng: target.lng }), units);
  };
  const dF = dist(green?.front), dC = dist(green?.center), dB = dist(green?.back);
  const holeYd = typeof hole.yardage === "number" ? toDisplay(hole.yardage, units) : null;

  return (
    <>
      <div className="top-bar" style={{ padding: "44px 16px 12px" }}>
        <button className="back-btn" onClick={onExit}>← Exit</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "rgba(237,233,223,0.55)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{data.round.course_name}</div>
          <div style={{ fontSize: 15, color: "#EDE9DF", fontWeight: 500, marginTop: 2 }}>Hole {hole.hole_number} · Par {hole.par}</div>
        </div>
        <button className="back-btn" onClick={finish}>Finish</button>
      </div>

      <div className="hole-nav">
        <button className="hole-nav-btn" disabled={holeIdx === 0} onClick={() => setHoleIdx(holeIdx - 1)}>◀</button>
        <div className="hole-nav-info">
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {holeYd != null ? `${holeYd} ${unitLabel(units)}` : "Yardage —"}{hole.handicap ? ` · HCP ${hole.handicap}` : ""}
          </div>
          <button
            className="units-toggle"
            onClick={() => setU(units === "yards" ? "meters" : "yards")}
            style={{ marginLeft: 8, fontSize: 10, letterSpacing: "0.08em", padding: "2px 8px", border: "1px solid #ccc", borderRadius: 999, background: "transparent", cursor: "pointer", textTransform: "uppercase" }}
            aria-label="Toggle units"
          >
            {units === "yards" ? "yds" : "m"}
          </button>
        </div>
        <button className="hole-nav-btn" disabled={holeIdx === holes.length - 1} onClick={() => setHoleIdx(holeIdx + 1)}>▶</button>
      </div>


      <div className="round-tabs">
        {(["gps", "map", "score"] as const).map((t) => (
          <button key={t} className={"round-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
        ))}
      </div>

      <div className="round-body">
        {tab === "gps" && (
          <div className="gps-view">
            {!gps && !gpsError && <div className="gps-note">Waiting for GPS…</div>}
            {!gps && gpsError && (
              <div className="gps-note">
                {gpsError}<br />
                <button className="gps-retry" onClick={() => { setGpsError(null); requestCurrentLocation(setGps, setGpsError); }}>Try GPS again</button>
              </div>
            )}
            {gps && !green && <div className="gps-note">GPS distances haven't been mapped for this hole yet.</div>}
            {green && (
              <>
                <div className="gps-mid">
                  <div className="gps-mid-n">{dC ?? "—"}</div>
                  <div className="gps-mid-l">{unitLabel(units, true)} to centre</div>
                </div>
                <div className="gps-side">
                  <div><div className="gps-side-n">{dF ?? "—"}</div><div className="gps-side-l">Front</div></div>
                  <div><div className="gps-side-n">{dB ?? "—"}</div><div className="gps-side-l">Back</div></div>
                </div>
              </>
            )}
          </div>
        )}
        {tab === "map" && (
          <Suspense fallback={<div className="gps-note" style={{ padding: 24 }}>Loading map…</div>}>
            <HoleMap gps={gps} green={green} />
          </Suspense>
        )}
        {tab === "score" && <HoleInput hole={hole} onSave={saveHole} />}
      </div>

      <div className="scorecard-strip">
        {holes.map((h: any, i: number) => (
          <button key={h.hole_number} className={"sc-cell" + (i === holeIdx ? " on" : "")} onClick={() => setHoleIdx(i)}>
            <div className="sc-n">{h.hole_number}</div>
            <div className="sc-s">{h.score ?? "-"}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function ScoreEntry({ hole, onSave }: { hole: any; onSave: (patch: any) => void }) {
  const [score, setScore] = useState<number>(hole.score ?? hole.par);
  const [putts, setPutts] = useState<number>(hole.putts ?? 2);
  const [fw, setFw] = useState<boolean | null>(hole.fairway_hit ?? null);
  const [pen, setPen] = useState<number>(hole.penalties ?? 0);
  useEffect(() => {
    setScore(hole.score ?? hole.par);
    setPutts(hole.putts ?? 2);
    setFw(hole.fairway_hit ?? null);
    setPen(hole.penalties ?? 0);
  }, [hole.hole_number]);
  const commit = (patch: any) => onSave(patch);
  return (
    <div className="score-view">
      <Stepper label="Score" value={score} par={hole.par} onChange={(v) => { setScore(v); commit({ score: v }); }} />
      <Stepper label="Putts" value={putts} onChange={(v) => { setPutts(v); commit({ putts: v }); }} min={0} max={10} />
      {hole.par >= 4 && (
        <div className="stepper">
          <div className="stepper-lbl">Fairway hit</div>
          <div className="fw-btns">
            {[["Y", true], ["N", false], ["–", null]].map(([l, v]) => (
              <button key={l as string} className={"fw-btn" + (fw === v ? " on" : "")} onClick={() => { setFw(v as any); commit({ fairway_hit: v }); }}>{l as string}</button>
            ))}
          </div>
        </div>
      )}
      <Stepper label="Penalties" value={pen} onChange={(v) => { setPen(v); commit({ penalties: v }); }} min={0} max={10} />
    </div>
  );
}

function Stepper({ label, value, onChange, min = 1, max = 15, par }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; par?: number }) {
  return (
    <div className="stepper">
      <div className="stepper-lbl">{label}{par ? <span style={{ color: "#aaa", fontSize: 11, marginLeft: 6 }}>(par {par})</span> : null}</div>
      <div className="stepper-ctrls">
        <button className="hcp-btn" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <div className="hcp-val">{value}</div>
        <button className="hcp-btn" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}

/* HoleMap moved to hole-map.client.tsx (client-only, leaflet needs window) */

/* ─────── SUMMARY ─────── */
function RoundSummary({ roundId, onDone }: { roundId: string; onDone: () => void }) {
  const pid = getPlayerId();
  const [data, setData] = useState<any>(null);
  useEffect(() => { getRound({ data: { playerId: pid, roundId } }).then(setData); }, [pid, roundId]);
  if (!data) return <div style={{ padding: 24 }}>Loading…</div>;
  const diff = data.round.total_score - data.round.total_par;
  return (
    <>
      <div className="pf-play-header">
        <span style={{ width: 34 }} />
        <span className="pf-play-header-title">Round summary</span>
        <span style={{ width: 34 }} />
      </div>
      <div className="pf-play-body">
        <div className="summary-hero">
          <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase" }}>{data.round.course_name}</div>
          <div className="summary-score">{data.round.total_score}</div>
          <div className="summary-diff">{diff >= 0 ? `+${diff}` : diff} vs par {data.round.total_par}</div>
        </div>
        <div className="summary-stats">
          <div><div className="stat-n">{data.round.total_putts}</div><div className="stat-l">Putts</div></div>
          <div><div className="stat-n">{data.round.fairways_possible ? Math.round((data.round.fairways_hit / data.round.fairways_possible) * 100) : "—"}%</div><div className="stat-l">FIR</div></div>
          <div><div className="stat-n">{Math.round((data.round.greens_in_reg / 18) * 100)}%</div><div className="stat-l">GIR</div></div>
        </div>
        <ScorecardGrid holes={data.holes} />
        <button className="pf-btn-play pf-btn-play-full" onClick={onDone} style={{ marginTop: 20 }}>DONE</button>
      </div>
    </>
  );
}

function ScorecardGrid({ holes }: { holes: any[] }) {
  return (
    <div className="scg-wrap">
      {[holes.slice(0, 9), holes.slice(9, 18)].map((set, si) => (
        <div key={si} className="scg-block">
          <div className="scg-hdr">
            <div className="scg-lbl">Hole</div>
            {set.map((h) => <div key={h.hole_number} className="scg-cell scg-num">{h.hole_number}</div>)}
            <div className="scg-cell scg-num" style={{ background: "#094811", color: "#EDE9DF" }}>{si === 0 ? "OUT" : "IN"}</div>
          </div>
          <div className="scg-row">
            <div className="scg-lbl">Par</div>
            {set.map((h) => <div key={h.hole_number} className="scg-cell">{h.par}</div>)}
            <div className="scg-cell"><b>{set.reduce((s, h) => s + (h.par || 0), 0)}</b></div>
          </div>
          <div className="scg-row">
            <div className="scg-lbl">Score</div>
            {set.map((h) => {
              const d = h.score != null ? h.score - h.par : null;
              const cls = d === null ? "" : d < 0 ? "birdie" : d === 0 ? "par" : d === 1 ? "bogey" : "double";
              return <div key={h.hole_number} className={"scg-cell scg-score " + cls}>{h.score ?? "-"}</div>;
            })}
            <div className="scg-cell"><b>{set.reduce((s, h) => s + (h.score || 0), 0)}</b></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────── HISTORY ─────── */
function History({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const pid = getPlayerId();
  const [rounds, setRounds] = useState<any[]>([]);
  const load = () => listRounds({ data: { playerId: pid } }).then((r) => setRounds(r.rounds));
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { if (confirm("Delete this round?")) { await deleteRound({ data: { playerId: pid, roundId: id } }); load(); } };
  return (
    <>
      <div className="pf-play-header">
        <button className="pf-play-header-btn" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <span className="pf-play-header-title">History</span>
        <span style={{ width: 34 }} />
      </div>
      <div className="pf-play-body">
        {rounds.length === 0 && <div className="pf-note">No rounds yet.</div>}
        <div className="round-list">
          {rounds.map((r) => {
            const d = r.total_score - r.total_par;
            return (
              <div className="round-row" key={r.id}>
                <div style={{ flex: 1, cursor: r.status === "completed" ? "pointer" : "default" }} onClick={() => r.status === "completed" && onOpen(r.id)}>
                  <div className="round-row-name">{r.course_name}</div>
                  <div className="round-row-date">{new Date(r.started_at).toLocaleDateString()} · {r.status === "active" ? "In progress" : r.tee_box}</div>
                </div>
                <div className="round-score">
                  <b>{r.total_score || "—"}</b>
                  {r.status === "completed" && <span>{d >= 0 ? `+${d}` : d}</span>}
                </div>
                <button className="pf-edit" style={{ marginLeft: 8 }} onClick={() => del(r.id)}>✕</button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════ PERFORMANCE ═════════════════════════════════════════════ */
export function PerformanceScreen({ bottomNav, onBookBay }: { bottomNav: React.ReactNode; onBookBay?: () => void }) {
  const pid = getPlayerId();
  const [rounds, setRounds] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    listRounds({ data: { playerId: pid } }).then((r) => setRounds(r.rounds));
    getUserStats({ data: { playerId: pid } }).then(setStats);
  }, [pid]);

  const completed = rounds.filter((r) => r.status === "completed");
  const latest = completed[0];
  // Handicap approx = average (score - par) of last 8
  const last8 = completed.slice(0, 8);
  const hcp = last8.length ? (last8.reduce((s, r) => s + (r.total_score - r.total_par), 0) / last8.length) : null;
  const trendPts = completed.slice(0, 10).reverse().map((r) => r.total_score - r.total_par);

  return (
    <div className="screen">
      <div className="pf-play-header">
        <img src={markWhite.url} alt="Playfair" className="pf-play-header-mark" />
        <span className="pf-play-header-title">Performance</span>
        <span style={{ width: 34 }} />
      </div>
      <div className="pf-play-body pf-perf-body">
        {/* Rounds card */}
        <div className="pf-perf-card">
          <div className="pf-perf-card-hdr">
            <span className="pf-perf-hdr-lbl">Rounds</span>
            <span className="pf-perf-hdr-r">{completed.length} <span className="pf-perf-chev">›</span></span>
          </div>
          {latest ? (
            <div className="pf-perf-latest">
              <div className="pf-perf-date">{new Date(latest.ended_at || latest.started_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}</div>
              <div className="pf-perf-row">
                <div>
                  <div className="pf-perf-course">{latest.course_name}</div>
                  <div className="pf-perf-sub">18 HOLES  PAR: {latest.total_par}</div>
                  {latest.tee_box && <div className="pf-perf-tee">{latest.tee_box.toUpperCase()}</div>}
                </div>
                <div className="pf-perf-score">
                  <b>{latest.total_score}</b>
                  <sup>{latest.total_score - latest.total_par >= 0 ? `+${latest.total_score - latest.total_par}` : latest.total_score - latest.total_par}</sup>
                </div>
              </div>
            </div>
          ) : (
            <div className="pf-perf-empty">No completed rounds yet.</div>
          )}
        </div>

        {/* Handicap + Scoring twin cards */}
        <div className="pf-perf-pair">
          <div className="pf-perf-card pf-perf-mini">
            <div className="pf-perf-mini-hdr">Handicap <span className="pf-perf-chev">›</span></div>
            <div className="pf-perf-mini-n">{hcp != null ? (hcp >= 0 ? `+${hcp.toFixed(1)}` : hcp.toFixed(1)) : "—"}</div>
            <Sparkline pts={trendPts} />
          </div>
          <div className="pf-perf-card pf-perf-mini">
            <div className="pf-perf-mini-hdr">Scoring <span className="pf-perf-chev">›</span></div>
            <div className="pf-perf-mini-n">{stats?.avg_score != null ? stats.avg_score : "—"}</div>
            <Sparkline pts={completed.slice(0, 10).reverse().map((r) => r.total_score)} />
          </div>
        </div>

        {/* Broken-down block */}
        <div className="pf-perf-card">
          <div className="pf-perf-card-hdr">
            <span className="pf-perf-hdr-lbl">Your game, broken down</span>
            <span className="pf-perf-chev">›</span>
          </div>
          <div className="pf-perf-sub" style={{ marginTop: 2 }}>Averaged across your last {Math.min(completed.length, 9)} rounds</div>
          <div className="pf-perf-metrics">
            <PerfMetric label="Avg putts" value={stats?.avg_putts ?? "—"} />
            <PerfMetric label="Fairways" value={stats?.fir_pct != null ? `${stats.fir_pct}%` : "—"} />
            <PerfMetric label="GIR" value={stats?.gir_pct != null ? `${stats.gir_pct}%` : "—"} />
            <PerfMetric label="Best" value={stats?.best ? (stats.best.total_score - stats.best.total_par >= 0 ? `+${stats.best.total_score - stats.best.total_par}` : `${stats.best.total_score - stats.best.total_par}`) : "—"} />
          </div>
        </div>

        {onBookBay && (
          <>
            <button className="pf-btn-play pf-btn-play-full" onClick={onBookBay}>
              Book Indoor Bay →
            </button>
            <div className="pf-note" style={{ padding: "24px 8px", fontSize: 12, color: "#999" }}>
              Advanced stats and insights are coming soon.
            </div>
          </>
        )}
      </div>
      {bottomNav}
    </div>
  );
}

function PerfMetric({ label, value }: { label: string; value: any }) {
  return (
    <div className="pf-perf-metric">
      <div className="pf-perf-metric-n">{value}</div>
      <div className="pf-perf-metric-l">{label}</div>
    </div>
  );
}

function Sparkline({ pts }: { pts: number[] }) {
  if (!pts || pts.length < 2) return <div className="pf-spark pf-spark-empty" />;
  const w = 200, h = 40, pad = 4;
  const min = Math.min(...pts), max = Math.max(...pts);
  const range = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className="pf-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="#094811" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}
