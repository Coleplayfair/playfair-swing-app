import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  searchCourses, getCourse, startRound, getRound, updateHole,
  finishRound, listRounds, getUserStats, deleteRound,
} from "@/lib/rounds.functions";
import { distanceYards, getPlayerId } from "@/lib/gps";
import markWhite from "@/assets/pf-mark-white.png.asset.json";

type PlayView = "home" | "search" | "round" | "history" | "stats" | "summary";

export function PlayScreen({ bottomNav }: { bottomNav: React.ReactNode }) {
  const [view, setView] = useState<PlayView>("home");
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);

  const openRound = (id: string) => { setActiveRoundId(id); setView("round"); };
  const showSummary = (id: string) => { setActiveRoundId(id); setView("summary"); };

  return (
    <div className="screen">
      {view === "home" && (
        <PlayHome
          onStart={() => setView("search")}
          onHistory={() => setView("history")}
          onStats={() => setView("stats")}
          onResume={openRound}
        />
      )}
      {view === "search" && (
        <CourseSearch onBack={() => setView("home")} onStarted={openRound} />
      )}
      {view === "round" && activeRoundId && (
        <ActiveRound roundId={activeRoundId} onExit={() => setView("home")} onFinish={() => showSummary(activeRoundId)} />
      )}
      {view === "summary" && activeRoundId && (
        <RoundSummary roundId={activeRoundId} onDone={() => setView("home")} />
      )}
      {view === "history" && (
        <History onBack={() => setView("home")} onOpen={showSummary} />
      )}
      {view === "stats" && (
        <Stats onBack={() => setView("home")} />
      )}
      {(view === "home" || view === "history" || view === "stats") && bottomNav}
    </div>
  );
}

/* ── HOME ── */
function PlayHome({ onStart, onHistory, onStats, onResume }: {
  onStart: () => void; onHistory: () => void; onStats: () => void; onResume: (id: string) => void;
}) {
  const [rounds, setRounds] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const pid = getPlayerId();
  useEffect(() => {
    listRounds({ data: { playerId: pid } }).then((r) => setRounds(r.rounds)).catch(() => {});
    getUserStats({ data: { playerId: pid } }).then(setStats).catch(() => {});
  }, [pid]);
  const active = rounds.find((r) => r.status === "active");
  const recent = rounds.filter((r) => r.status === "completed").slice(0, 3);
  return (
    <>
      <div className="top-bar">
        <img src={markWhite.url} alt="" className="top-bar-mark" />
        <span className="top-bar-title">Play</span>
        <span style={{ width: 22 }} />
      </div>
      <div className="play-body">
        <div className="play-hero">
          <div className="play-hero-title">Track your round</div>
          <div className="play-hero-sub">GPS distances, live scoring, stats.</div>
          <button className="btn-green" onClick={onStart} style={{ marginTop: 16 }}>Start a Round →</button>
        </div>

        {active && (
          <div className="play-card" onClick={() => onResume(active.id)} style={{ cursor: "pointer" }}>
            <div className="play-card-lbl">In progress</div>
            <div className="play-card-title">{active.course_name}</div>
            <div className="play-card-sub">Resume round →</div>
          </div>
        )}

        {stats && stats.count > 0 && (
          <div className="stats-strip">
            <div><div className="stat-n">{stats.count}</div><div className="stat-l">Rounds</div></div>
            <div><div className="stat-n">{stats.avg_score ?? "—"}</div><div className="stat-l">Avg score</div></div>
            <div><div className="stat-n">{stats.gir_pct ?? "—"}%</div><div className="stat-l">GIR</div></div>
          </div>
        )}

        <div className="play-actions">
          <button className="play-action" onClick={onHistory}>History</button>
          <button className="play-action" onClick={onStats}>Stats</button>
        </div>

        {recent.length > 0 && (
          <>
            <div className="section-lbl">Recent rounds</div>
            <div className="round-list">
              {recent.map((r) => (
                <div className="round-row" key={r.id}>
                  <div>
                    <div className="round-row-name">{r.course_name}</div>
                    <div className="round-row-date">{new Date(r.ended_at || r.started_at).toLocaleDateString()}</div>
                  </div>
                  <div className="round-score">
                    <b>{r.total_score}</b>
                    <span>{r.total_score - r.total_par >= 0 ? `+${r.total_score - r.total_par}` : r.total_score - r.total_par}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── COURSE SEARCH ── */
function CourseSearch({ onBack, onStarted }: { onBack: () => void; onStarted: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [course, setCourse] = useState<any | null>(null);
  const [tee, setTee] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const pid = getPlayerId();

  const run = async () => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const r = await searchCourses({ data: { query: q.trim() } });
      setResults(r.courses);
    } catch (e: any) { alert(e.message); }
    setLoading(false);
  };

  const pick = async (c: any) => {
    setSelected(c);
    setCourse(null);
    try {
      const full = await getCourse({ data: { courseId: c.id } });
      setCourse(full);
      setTee(full.tee_boxes?.[0]?.tee_name || "");
    } catch (e: any) { alert(e.message); setSelected(null); }
  };

  const start = async () => {
    if (!course) return;
    setStarting(true);
    try {
      const r = await startRound({ data: { playerId: pid, courseId: course.id, teeBox: tee } });
      onStarted(r.round_id);
    } catch (e: any) { alert(e.message); setStarting(false); }
  };

  return (
    <>
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="top-bar-title">Find a course</span>
        <span style={{ width: 50 }} />
      </div>
      <div className="play-body">
        <div className="search-row">
          <input
            className="search-input"
            placeholder="Search courses…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <button className="search-btn" onClick={run}>Go</button>
        </div>
        {loading && <div style={{ padding: 16, color: "#888", fontSize: 13 }}>Searching…</div>}
        <div className="course-list">
          {results.map((c) => (
            <div className="course-row" key={c.id} onClick={() => pick(c)}>
              <div className="course-row-name">{c.name}</div>
              <div className="course-row-sub">{[c.club_name, c.city, c.country].filter(Boolean).join(" · ")}</div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div className="venue-tip-overlay" onClick={() => !starting && setSelected(null)}>
          <div className="venue-tip-card" onClick={(e) => e.stopPropagation()}>
            <div className="venue-tip-title">{selected.name}</div>
            <div className="venue-tip-body" style={{ marginBottom: 16 }}>
              {[selected.club_name, selected.city, selected.country].filter(Boolean).join(" · ")}
            </div>
            {!course ? (
              <div style={{ fontSize: 13, color: "#888", padding: "10px 0" }}>Loading course…</div>
            ) : (
              <>
                <label style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tee box</label>
                <select className="tee-select" value={tee} onChange={(e) => setTee(e.target.value)}>
                  {(course.tee_boxes as any[]).map((t: any) => (
                    <option key={t.tee_name} value={t.tee_name}>
                      {t.tee_name}{t.par_total ? ` · Par ${t.par_total}` : ""}{t.total_yards ? ` · ${t.total_yards}y` : ""}
                    </option>
                  ))}
                </select>
                <button className="btn-green" onClick={start} disabled={starting} style={{ marginTop: 14 }}>
                  {starting ? "Starting…" : "Start round →"}
                </button>
              </>
            )}
            <button className="venue-tip-close" onClick={() => !starting && setSelected(null)}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── ACTIVE ROUND ── */
function ActiveRound({ roundId, onExit, onFinish }: { roundId: string; onExit: () => void; onFinish: () => void }) {
  const pid = getPlayerId();
  const [data, setData] = useState<any>(null);
  const [holeIdx, setHoleIdx] = useState(0);
  const [tab, setTab] = useState<"gps" | "map" | "score">("gps");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getRound({ data: { playerId: pid, roundId } }).then(setData);
  }, [pid, roundId]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (!data) return <div style={{ padding: 24, fontSize: 13 }}>Loading round…</div>;
  const holes = data.holes;
  const hole = holes[holeIdx];
  const teeData = (data.course?.tee_boxes as any[])?.find((t) => t.tee_name === data.round.tee_box) || (data.course?.tee_boxes as any[])?.[0];
  // Coordinates from raw API if present
  const holeCoords = teeData?.holes?.[holeIdx] || {};
  const green = holeCoords.green || holeCoords.green_center ? { front: holeCoords.green_front, center: holeCoords.green_center, back: holeCoords.green_back } : null;

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
    if (!gps || !target?.latitude || !target?.longitude) return null;
    return Math.round(distanceYards(gps, { lat: target.latitude, lng: target.longitude }));
  };
  const dF = dist(green?.front), dC = dist(green?.center), dB = dist(green?.back);

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
            {hole.yardage ? `${hole.yardage} yds` : "Yardage —"}{hole.handicap ? ` · HCP ${hole.handicap}` : ""}
          </div>
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
            {!gps && <div className="gps-note">Waiting for GPS…</div>}
            {gps && !green && <div className="gps-note">No green coordinates in course data for this hole.</div>}
            {green && (
              <>
                <div className="gps-mid">
                  <div className="gps-mid-n">{dC ?? "—"}</div>
                  <div className="gps-mid-l">yds to centre</div>
                </div>
                <div className="gps-side">
                  <div><div className="gps-side-n">{dF ?? "—"}</div><div className="gps-side-l">Front</div></div>
                  <div><div className="gps-side-n">{dB ?? "—"}</div><div className="gps-side-l">Back</div></div>
                </div>
              </>
            )}
          </div>
        )}
        {tab === "map" && <HoleMap gps={gps} green={green} />}
        {tab === "score" && <ScoreEntry hole={hole} onSave={saveHole} />}
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

/* ── MAP ── */
function HoleMap({ gps, green }: { gps: { lat: number; lng: number } | null; green: any }) {
  const center = green?.center ? [green.center.latitude, green.center.longitude] as [number, number]
    : gps ? [gps.lat, gps.lng] as [number, number]
    : [0, 0] as [number, number];
  if (!gps && !green?.center) {
    return <div className="gps-note" style={{ padding: 24 }}>Enable location to see the map.</div>;
  }
  const greenIcon = L.divIcon({ className: "green-pin", html: "<div></div>", iconSize: [18, 18] });
  const meIcon = L.divIcon({ className: "me-pin", html: "<div></div>", iconSize: [18, 18] });
  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={17} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {gps && <Marker position={[gps.lat, gps.lng]} icon={meIcon} />}
        {green?.front && <Marker position={[green.front.latitude, green.front.longitude]} icon={greenIcon} />}
        {green?.center && <Marker position={[green.center.latitude, green.center.longitude]} icon={greenIcon} />}
        {green?.back && <Marker position={[green.back.latitude, green.back.longitude]} icon={greenIcon} />}
        {gps && <Circle center={[gps.lat, gps.lng]} radius={5} pathOptions={{ color: "#094811" }} />}
        <Recenter center={center} />
      </MapContainer>
    </div>
  );
}
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center[0], center[1]]);
  return null;
}

/* ── SUMMARY ── */
function RoundSummary({ roundId, onDone }: { roundId: string; onDone: () => void }) {
  const pid = getPlayerId();
  const [data, setData] = useState<any>(null);
  useEffect(() => { getRound({ data: { playerId: pid, roundId } }).then(setData); }, [pid, roundId]);
  if (!data) return <div style={{ padding: 24 }}>Loading…</div>;
  const front = data.holes.slice(0, 9), back = data.holes.slice(9, 18);
  const fSum = front.reduce((s: number, h: any) => s + (h.score || 0), 0);
  const bSum = back.reduce((s: number, h: any) => s + (h.score || 0), 0);
  const diff = data.round.total_score - data.round.total_par;
  return (
    <>
      <div className="top-bar">
        <span style={{ width: 50 }} />
        <span className="top-bar-title">Round summary</span>
        <span style={{ width: 50 }} />
      </div>
      <div className="play-body">
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
        <button className="btn-green" onClick={onDone} style={{ marginTop: 20 }}>Done</button>
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

/* ── HISTORY ── */
function History({ onBack, onOpen }: { onBack: () => void; onOpen: (id: string) => void }) {
  const pid = getPlayerId();
  const [rounds, setRounds] = useState<any[]>([]);
  const load = () => listRounds({ data: { playerId: pid } }).then((r) => setRounds(r.rounds));
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { if (confirm("Delete this round?")) { await deleteRound({ data: { playerId: pid, roundId: id } }); load(); } };
  return (
    <>
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="top-bar-title">History</span>
        <span style={{ width: 50 }} />
      </div>
      <div className="play-body">
        {rounds.length === 0 && <div style={{ padding: 20, color: "#888", fontSize: 13 }}>No rounds yet.</div>}
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

/* ── STATS ── */
function Stats({ onBack }: { onBack: () => void }) {
  const pid = getPlayerId();
  const [s, setS] = useState<any>(null);
  useEffect(() => { getUserStats({ data: { playerId: pid } }).then(setS); }, []);
  return (
    <>
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="top-bar-title">Stats</span>
        <span style={{ width: 50 }} />
      </div>
      <div className="play-body">
        {!s || s.count === 0 ? (
          <div style={{ padding: 20, color: "#888", fontSize: 13 }}>Play a round to see stats.</div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stats-cell"><div className="stat-n">{s.count}</div><div className="stat-l">Rounds</div></div>
              <div className="stats-cell"><div className="stat-n">{s.avg_score ?? "—"}</div><div className="stat-l">Avg score</div></div>
              <div className="stats-cell"><div className="stat-n">{s.avg_putts ?? "—"}</div><div className="stat-l">Avg putts</div></div>
              <div className="stats-cell"><div className="stat-n">{s.fir_pct ?? "—"}%</div><div className="stat-l">Fairways</div></div>
              <div className="stats-cell"><div className="stat-n">{s.gir_pct ?? "—"}%</div><div className="stat-l">GIR</div></div>
              <div className="stats-cell">
                <div className="stat-n">{s.best ? `${s.best.total_score - s.best.total_par >= 0 ? "+" : ""}${s.best.total_score - s.best.total_par}` : "—"}</div>
                <div className="stat-l">Best round</div>
              </div>
            </div>
            {s.last10?.length > 1 && <TrendLine data={s.last10} />}
          </>
        )}
      </div>
    </>
  );
}

function TrendLine({ data }: { data: any[] }) {
  const pts = data.map((d) => d.score - d.par);
  const min = Math.min(...pts, 0), max = Math.max(...pts, 5);
  const w = 300, h = 100, pad = 10;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, pts.length - 1);
  const y = (v: number) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div style={{ marginTop: 24 }}>
      <div className="section-lbl">Last {pts.length} rounds vs par</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 110, background: "#f7f5ef" }}>
        <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="#ccc" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke="#094811" strokeWidth="2" />
        {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="#094811" />)}
      </svg>
    </div>
  );
}
