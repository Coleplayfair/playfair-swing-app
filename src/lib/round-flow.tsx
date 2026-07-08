import { useEffect, useState } from "react";
import {
  getCourse, startRound, getRound, updateHole, finishRound,
  updateRoundSettings, listRoundPlayers, addRoundPlayer, removeRoundPlayer,
} from "@/lib/rounds.functions";
import { searchBuddyProfiles, listBuddies } from "@/lib/buddies.functions";
import { getPlayerId } from "@/lib/gps";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════ ROUND SETTINGS (image 4) ═══════════════════════════════ */
export function RoundSettings({ course, onBack, onCreated }: {
  course: any; onBack: () => void; onCreated: (roundId: string) => void;
}) {
  const [full, setFull] = useState<any | null>(null);
  const [tee, setTee] = useState("");
  const [combination, setCombination] = useState("18");
  const [startsAt, setStartsAt] = useState<"now" | "later">("now");
  const [mode, setMode] = useState<"general_play" | "tournament">("general_play");
  const [scoring, setScoring] = useState<"stroke" | "stableford">("stableford");
  const [hcpAllowance, setHcpAllowance] = useState(93);
  const [handicapRound, setHandicapRound] = useState(false);
  const [goLive, setGoLive] = useState(false);
  const [gpsOnly, setGpsOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const pid = getPlayerId();

  useEffect(() => {
    getCourse({ data: { courseId: course.id } }).then((f) => {
      setFull(f);
      setTee(((f.tee_boxes as any[]) ?? [])[0]?.tee_name || "");
    });
  }, [course.id]);

  const totalPar = full ? ((full.tee_boxes as any[])?.find((t: any) => t.tee_name === tee)?.par_total ?? "—") : "—";
  const create = async () => {
    if (!full) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await startRound({
        data: {
          playerId: pid, courseId: full.id, teeBox: tee,
          ownerUserId: sess.session?.user.id ?? null,
          settings: {
            mode, scoring_format: scoring, hcp_allowance: hcpAllowance,
            handicap_round: handicapRound, go_live: goLive, gps_only: gpsOnly,
            holes_combination: combination,
            starts_at: startsAt === "later" ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : new Date().toISOString(),
          },
        },
      });
      onCreated(r.round_id);
    } catch (e: any) { alert(e.message); setBusy(false); }
  };

  return (
    <>
      <div className="rs-topbar">
        <button className="rs-x" onClick={onBack} aria-label="Close">✕</button>
        <div className="rs-title">Round Setup</div>
        <button className="rs-info" aria-label="Info">i</button>
      </div>
      <div className="rs-body">
        <div className="rs-card rs-course-card">
          <div className="rs-course-thumb" style={{ backgroundImage: `url(/api/public/course-photo/${course.id}?name=${encodeURIComponent(course.name)})` }} />
          <div>
            <div className="rs-course-name">{course.name}</div>
            <div className="rs-course-meta">{full ? `${combination} Holes · Par: ${totalPar}` : "Loading…"}</div>
          </div>
        </div>

        <div className="rs-card">
          <button className="rs-row" onClick={() => setCombination(combination === "18" ? "9" : "18")}>
            <span className="rs-row-lbl">Combination</span>
            <span className="rs-row-val">{combination}<span className="rs-row-sub">{combination === "18" ? "18 Holes" : "9 Holes"}</span> ›</span>
          </button>
          <div className="rs-divider" />
          <button className="rs-row" onClick={() => setStartsAt(startsAt === "now" ? "later" : "now")}>
            <span className="rs-row-lbl">Starts</span>
            <span className="rs-row-val">{startsAt === "now" ? "Now" : "Later"} ›</span>
          </button>
        </div>

        <div className="rs-section-label">Format</div>
        <div className="rs-card">
          <button className="rs-row" onClick={() => setMode(mode === "general_play" ? "tournament" : "general_play")}>
            <span className="rs-row-lbl">Mode</span>
            <span className="rs-row-val">{mode === "general_play" ? "General Play" : "Tournament"} ›</span>
          </button>
          <div className="rs-divider" />
          <button className="rs-row" onClick={() => setScoring(scoring === "stroke" ? "stableford" : "stroke")}>
            <span className="rs-row-lbl">Scoring</span>
            <span className="rs-row-val">{scoring === "stroke" ? "Stroke" : "Stableford"} ›</span>
          </button>
          <div className="rs-divider" />
          <div className="rs-row">
            <span className="rs-row-lbl">HCP Allowance</span>
            <div className="rs-hcp-adj">
              <button onClick={() => setHcpAllowance(Math.max(0, hcpAllowance - 1))}>−</button>
              <span>{hcpAllowance}%</span>
              <button onClick={() => setHcpAllowance(Math.min(100, hcpAllowance + 1))}>+</button>
            </div>
          </div>
        </div>

        <div className="rs-section-label">Options</div>
        <div className="rs-card">
          <Toggle
            title="Count for Handicap"
            sub="Include this round in your handicap index"
            value={handicapRound}
            onChange={setHandicapRound}
            icon="◎"
          />
          <div className="rs-divider" />
          <Toggle
            title="Share Live"
            sub="Let your buddies follow along in real time"
            value={goLive}
            onChange={setGoLive}
            icon="◉"
          />
          <div className="rs-divider" />
          <Toggle
            title="GPS Only"
            sub="Skip scoring — just yardages"
            value={gpsOnly}
            icon="◈"
            onChange={setGpsOnly}
          />
        </div>

        {full && (full.tee_boxes as any[]).length > 1 && (
          <>
            <div className="rs-section-label">TEE</div>
            <div className="rs-card">
              <div className="rs-row" style={{ paddingBottom: 4 }}>
                <span className="rs-row-lbl">Tee box</span>
              </div>
              <select className="rs-select" value={tee} onChange={(e) => setTee(e.target.value)}>
                {(full.tee_boxes as any[]).map((t: any) => (
                  <option key={t.tee_name} value={t.tee_name}>
                    {t.tee_name}{t.par_total ? ` · Par ${t.par_total}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
      <div className="rs-footer">
        <button className="rs-cta" onClick={create} disabled={busy || !full}>
          {busy ? "Preparing…" : "Tee it up"}
        </button>
      </div>
    </>
  );
}

function Toggle({ title, sub, value, onChange, icon }: {
  title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; icon?: string;
}) {
  return (
    <div className="rs-toggle-row">
      <div className="rs-toggle-body">
        <div className="rs-toggle-title">{icon && <span className="rs-toggle-icon">{icon}</span>}{title}</div>
        {sub && <div className="rs-toggle-sub">{sub}</div>}
      </div>
      <button className={"rs-switch" + (value ? " on" : "")} onClick={() => onChange(!value)} aria-label={title}>
        <span />
      </button>
    </div>
  );
}

/* ═══════════════════════════════ ROUND DETAILS lobby (image 1) ═══════════════════════════════ */
export function RoundDetails({ roundId, onClose, onStart }: {
  roundId: string; onClose: () => void; onStart: () => void;
}) {
  const pid = getPlayerId();
  const [data, setData] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const refresh = async () => {
    const [r, pl] = await Promise.all([
      getRound({ data: { playerId: pid, roundId } }),
      listRoundPlayers({ data: { roundId } }),
    ]);
    setData(r);
    setPlayers(pl.players);
    // If empty, auto-add current user as player 1
    if (pl.players.length === 0) {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        await addRoundPlayer({ data: { playerId: pid, roundId, buddyUserId: uid } });
        const pl2 = await listRoundPlayers({ data: { roundId } });
        setPlayers(pl2.players);
      }
    }
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [roundId]);

  if (!data) return <div className="rs-body">Loading round…</div>;
  const round = data.round;
  const shareLink = `${window.location.origin}/?join=${round.join_token}`;

  return (
    <>
      <div className="rs-topbar rs-topbar-dark">
        <button className="rs-x" onClick={onClose}>✕</button>
        <div className="rs-title">Your Round</div>
        <button className="rs-info">⋯</button>
      </div>

      <div className="rs-body">
        <div className="rd-course-card">
          <div className="rd-course-head">
            <span className="rd-chip">ON THE TEE <span className="rd-chip-dot">•</span></span>
            <span className="rd-time">Today · {new Date(round.starts_at || round.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <div className="rd-course-row">
            <div className="rd-course-thumb" style={{ backgroundImage: `url(/api/public/course-photo/${round.course_id}?name=${encodeURIComponent(round.course_name)})` }} />
            <div>
              <div className="rd-course-name">{round.course_name} <span className="rd-edit">✎</span></div>
              <div className="rd-course-meta">{round.holes_combination || 18} Holes</div>
            </div>
          </div>
          <div className="rd-course-stats">
            <div><div className="rd-stat-l">Scoring</div><div className="rd-stat-v">{round.scoring_format === "stableford" ? "Stableford" : "Stroke"}</div></div>
            <div><div className="rd-stat-l">HCP Allowance</div><div className="rd-stat-v">{round.hcp_allowance}%</div></div>
          </div>
          <div className="rd-course-actions">
            <button className="rd-icon-btn" onClick={() => { navigator.clipboard?.writeText(shareLink); alert("Share link copied"); }} aria-label="Share">↑</button>
            <button className="rd-icon-btn" aria-label="Leaderboard">🏆</button>
            <button className="rd-icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">⚙</button>
          </div>
        </div>

        <div className="rd-side-game">
          <span className="rd-side-icon">◆</span>
          <span className="rd-side-lbl">Wager / Side Bet</span>
          <span className="rd-side-add">Add ›</span>
        </div>

        <div className="rd-groups-hdr">
          <span>Playing Group</span>
          <span className="rd-draw">⇄ Draw order</span>
        </div>

        <div className="rd-group-card">
          <div className="rd-group-lbl">Group 1</div>
          <div className="rd-group-players">
            {players.map((p) => (
              <div key={p.id} className="rd-player">
                <PlayerAvatar player={p} />
                <div className="rd-player-name">{p.profile ? `${p.profile.first_name} ${p.profile.last_name}` : p.guest_name}</div>
                <div className="rd-player-hcp">P.HCP {Math.round(p.playing_hcp ?? p.profile?.handicap ?? p.guest_hcp ?? 0)}</div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <button key={`add-${i}`} className="rd-add-player" onClick={() => setShowAdd(true)}>
                <div className="rd-add-plus">+</div>
                <div className="rd-add-lbl">Invite</div>
              </button>
            ))}
          </div>
        </div>

        <button className="rd-add-group">
          <span className="rd-add-group-plus">+</span> Split into another group
        </button>
      </div>

      <div className="rs-footer">
        <button className="rs-cta" onClick={onStart}>Play the first hole</button>
      </div>

      {showAdd && (
        <AddPlayerSheet
          roundId={roundId}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); refresh(); }}
          shareLink={shareLink}
        />
      )}
      {showSettings && (
        <SettingsSheet round={round} onClose={() => setShowSettings(false)} onSaved={refresh} />
      )}
    </>
  );
}

function PlayerAvatar({ player }: { player: any }) {
  const name = player.profile ? `${player.profile.first_name} ${player.profile.last_name}` : player.guest_name || "?";
  const url = player.profile?.avatar_url;
  const initials = name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="rd-avatar">
      {url ? <img src={url} alt={name} /> : <span>{initials}</span>}
    </div>
  );
}

function SettingsSheet({ round, onClose, onSaved }: { round: any; onClose: () => void; onSaved: () => void }) {
  const pid = getPlayerId();
  const [scoring, setScoring] = useState(round.scoring_format);
  const [hcpAllowance, setHcpAllowance] = useState(round.hcp_allowance);
  const save = async () => {
    await updateRoundSettings({ data: { playerId: pid, roundId: round.id, patch: { scoring_format: scoring, hcp_allowance: hcpAllowance } } });
    onSaved();
    onClose();
  };
  return (
    <div className="rs-sheet">
      <div className="rs-sheet-hdr">
        <button className="rs-sheet-btn" onClick={onClose}>Cancel</button>
        <div className="rs-sheet-title">Round Settings</div>
        <button className="rs-sheet-btn rs-sheet-btn-primary" onClick={save}>Save</button>
      </div>
      <div className="rs-body">
        <div className="rs-card">
          <button className="rs-row" onClick={() => setScoring(scoring === "stroke" ? "stableford" : "stroke")}>
            <span className="rs-row-lbl">Scoring</span>
            <span className="rs-row-val">{scoring === "stableford" ? "Stableford" : "Stroke"} ›</span>
          </button>
          <div className="rs-divider" />
          <div className="rs-row">
            <span className="rs-row-lbl">HCP Allowance</span>
            <div className="rs-hcp-adj">
              <button onClick={() => setHcpAllowance(Math.max(0, hcpAllowance - 1))}>−</button>
              <span>{hcpAllowance}%</span>
              <button onClick={() => setHcpAllowance(Math.min(100, hcpAllowance + 1))}>+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ ADD PLAYER (image 2) ═══════════════════════════════ */
function AddPlayerSheet({ roundId, onClose, onAdded, shareLink }: {
  roundId: string; onClose: () => void; onAdded: () => void; shareLink: string;
}) {
  const pid = getPlayerId();
  const [tab, setTab] = useState<"buddies" | "guests">("buddies");
  const [q, setQ] = useState("");
  const [buddies, setBuddies] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestHcp, setGuestHcp] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBuddies().then((r) => setBuddies(r.accepted.map((a: any) => a.profile).filter(Boolean))).catch(() => {});
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setSearchResults(null); return; }
    const t = setTimeout(() => {
      searchBuddyProfiles({ data: { q: q.trim() } }).then((r) => setSearchResults(r.profiles)).catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const addBuddy = async (userId: string) => {
    setBusy(true);
    try { await addRoundPlayer({ data: { playerId: pid, roundId, buddyUserId: userId } }); onAdded(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const addGuest = async () => {
    if (!guestName.trim()) return;
    setBusy(true);
    try {
      await addRoundPlayer({ data: { playerId: pid, roundId, guestName: guestName.trim(), guestHcp: guestHcp ? Number(guestHcp) : null } });
      onAdded();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  const list = searchResults ?? buddies;

  return (
    <div className="rs-sheet">
      <div className="rs-sheet-hdr">
        <button className="rs-sheet-btn" onClick={onClose}>Cancel</button>
        <div className="rs-sheet-title">Invite Players</div>
        <button className="rs-sheet-btn rs-sheet-btn-primary" onClick={onClose}>Done</button>
      </div>
      <div className="rs-body">
        <div className="ap-search">
          <input placeholder="Find a Playfair member" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="ap-share">
          <button onClick={() => { navigator.clipboard?.writeText(shareLink); alert("Share link copied"); }}>▦ QR code</button>
          <button onClick={() => { navigator.clipboard?.writeText(shareLink); alert("Share link copied"); }}>↗ Copy link</button>
        </div>
        <div className="ap-tabs">
          <button className={"ap-tab" + (tab === "buddies" ? " on" : "")} onClick={() => setTab("buddies")}>MY GROUP</button>
          <button className={"ap-tab" + (tab === "guests" ? " on" : "")} onClick={() => setTab("guests")}>WALK-ON</button>
        </div>

        {tab === "buddies" && (
          <>
            <div className="ap-section">{searchResults ? "MATCHES" : "PLAYFAIR MEMBERS"}</div>
            <div className="ap-list">
              {list.length === 0 && <div className="pf-note">{searchResults ? "No matches" : "No buddies yet. Search for someone to add them."}</div>}
              {list.map((p: any) => (
                <div key={p.id} className="ap-item">
                  <div className="ap-avatar">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" /> : <span>{(p.first_name?.[0] ?? "") + (p.last_name?.[0] ?? "")}</span>}
                  </div>
                  <div className="ap-item-body">
                    <div className="ap-item-name">{p.first_name} {p.last_name}</div>
                    <div className="ap-item-sub">{p.suburb || "—"} | HCP: {p.handicap ?? "—"}</div>
                  </div>
                  <button className="ap-add-btn" disabled={busy} onClick={() => addBuddy(p.id)}>ADD</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "guests" && (
          <div className="ap-guest-form">
            <label>Their name</label>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. Jane D." />
            <label>Handicap (optional)</label>
            <input value={guestHcp} onChange={(e) => setGuestHcp(e.target.value)} placeholder="e.g. 18" inputMode="decimal" />
            <button className="rs-cta" onClick={addGuest} disabled={busy || !guestName.trim()}>Add to group</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ HOLE INPUT (image 3) ═══════════════════════════════ */
export function HoleInput({ hole, onSave }: { hole: any; onSave: (patch: any) => void }) {
  const [strokes, setStrokes] = useState<number>(hole.score ?? 0);
  const [putts, setPutts] = useState<number>(hole.putts ?? 0);
  const [sand, setSand] = useState<number>(hole.sand_shots ?? 0);
  const [pen, setPen] = useState<number>(hole.penalties ?? 0);
  const [fw, setFw] = useState<string | null>(hole.fairway_direction ?? null);
  const [gir, setGir] = useState<boolean | null>(hole.gir ?? null);
  const [sandSave, setSandSave] = useState<boolean | null>(hole.sand_save ?? null);
  const [upDown, setUpDown] = useState<boolean | null>(hole.up_down ?? null);

  useEffect(() => {
    setStrokes(hole.score ?? 0);
    setPutts(hole.putts ?? 0);
    setSand(hole.sand_shots ?? 0);
    setPen(hole.penalties ?? 0);
    setFw(hole.fairway_direction ?? null);
    setGir(hole.gir ?? null);
    setSandSave(hole.sand_save ?? null);
    setUpDown(hole.up_down ?? null);
  }, [hole.hole_number]);

  const set = (k: string, v: any, local: (v: any) => void) => { local(v); onSave({ [k]: v }); };

  const StepperRow = ({ label, value, onChange, min = 0, max = 15 }: any) => (
    <div className="hi-row">
      <div className="hi-row-lbl">{label}</div>
      <div className="hi-stepper">
        <button className="hi-step-minus" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <div className="hi-step-val">{value || (value === 0 ? "0" : "+")}</div>
        <button className="hi-step-plus" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );

  const FwBtn = ({ dir, sym }: { dir: string; sym: string }) => (
    <button className={"hi-fw-btn" + (fw === dir ? " on" : "")} onClick={() => set("fairway_direction", fw === dir ? null : dir, setFw)}>{sym}</button>
  );

  const Pill = ({ label, value, onToggle }: { label: string; value: boolean | null; onToggle: () => void }) => (
    <button className={"hi-pill" + (value ? " on" : "")} onClick={onToggle}>{label}</button>
  );

  return (
    <div className="hi-body">
      <div className="hi-header">Card the hole</div>
      <StepperRow label="Strokes on hole" value={strokes} onChange={(v: number) => set("score", v, setStrokes)} />
      <div className="hi-hint">Break it down —</div>
      <StepperRow label="Putts on green" value={putts} onChange={(v: number) => set("putts", v, setPutts)} />
      <StepperRow label="Bunker shots" value={sand} onChange={(v: number) => set("sand_shots", v, setSand)} />
      <StepperRow label="Penalty strokes" value={pen} onChange={(v: number) => set("penalties", v, setPen)} />
      {hole.par >= 4 && (
        <div className="hi-row">
          <div className="hi-row-lbl">Off the tee</div>
          <div className="hi-fw-btns">
            <FwBtn dir="left" sym="↖" />
            <FwBtn dir="straight" sym="●" />
            <FwBtn dir="right" sym="↗" />
            <FwBtn dir="short" sym="↓" />
          </div>
        </div>
      )}
      <div className="hi-pills">
        <Pill label="Green in Reg" value={gir} onToggle={() => set("gir", !gir, setGir)} />
        <Pill label="Sand Save" value={sandSave} onToggle={() => set("sand_save", !sandSave, setSandSave)} />
        <Pill label="Up & Down" value={upDown} onToggle={() => set("up_down", !upDown, setUpDown)} />
      </div>
    </div>
  );
}

/* helper — no direct use, re-export for consumers if needed */
export { getRound, updateHole, finishRound, removeRoundPlayer };
