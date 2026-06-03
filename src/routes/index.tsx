import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CLUBS, CLUB_SVGS, DEFAULT_SELECTED, type Club } from "@/lib/clubs";
import { supabase } from "@/integrations/supabase/client";
import logoBeige from "@/assets/pf-primary-beige.png.asset.json";
import logoGreen from "@/assets/pf-primary-green.png.asset.json";
import logoWhite from "@/assets/pf-primary-white.png.asset.json";
import markGreen from "@/assets/pf-mark-green.png.asset.json";
import markWhite from "@/assets/pf-mark-white.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "playfair Golf Club" },
      { name: "description", content: "Membership, booking, and your bag at playfair Golf Club." },
    ],
  }),
  component: PlayfairApp,
});

type Screen = "splash" | "signup" | "login" | "setup" | "book" | "bag" | "profile";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  suburb: string;
};

const DEFAULT_PROFILE: Profile = {
  firstName: "Cole",
  lastName: "Rudlin",
  email: "cole@playfairgolfclub.com",
  mobile: "+61 400 000 000",
  suburb: "Randwick",
};

function PlayfairApp() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [signupForm, setSignupForm] = useState({ fn: "", ln: "", em: "", mb: "", sb: "" });
  const [submitting, setSubmitting] = useState(false);
  const [hcp, setHcp] = useState(18);
  const [selected, setSelected] = useState<Set<number>>(new Set(DEFAULT_SELECTED));
  const [clubs, setClubs] = useState<Club[]>(CLUBS.map((c) => ({ ...c })));
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const go = (s: Screen) => setScreen(s);

  const doSignup = async () => {
    const fn = signupForm.fn.trim() || "Cole";
    const ln = signupForm.ln.trim() || "Rudlin";
    const em = signupForm.em.trim() || "cole@playfairgolfclub.com";
    const mb = signupForm.mb.trim() || "+61 400 000 000";
    const sb = signupForm.sb.trim() || "Randwick";
    setSubmitting(true);
    try {
      await supabase.from("signups").insert({
        first_name: fn,
        last_name: ln,
        email: em,
        mobile: mb,
        suburb: sb,
      });
    } catch (e) {
      console.error("signup save failed", e);
    } finally {
      setSubmitting(false);
    }
    setProfile({ firstName: fn, lastName: ln, email: em, mobile: mb, suburb: sb });
    go("setup");
  };

  const initials =
    (profile.firstName[0] || "").toUpperCase() + (profile.lastName[0] || "").toUpperCase();

  return (
    <div className="app">
      {screen === "splash" && <SplashScreen onCreate={() => go("signup")} onLogin={() => go("login")} />}

      {screen === "signup" && (
        <SignupScreen
          form={signupForm}
          onChange={setSignupForm}
          onBack={() => go("splash")}
          onLogin={() => go("login")}
          onContinue={doSignup}
          submitting={submitting}
        />
      )}

      {screen === "login" && (
        <LoginScreen
          onBack={() => go("splash")}
          onLogin={() => go("setup")}
          onSignup={() => go("signup")}
        />
      )}

      {screen === "setup" && (
        <SetupScreen
          hcp={hcp}
          setHcp={setHcp}
          selected={selected}
          setSelected={setSelected}
          onContinue={() => go("book")}
        />
      )}

      {/* Persistent webview — mounted once after first visit and kept alive
          so the YGB session is not lost when switching tabs. */}
      {(screen === "book" || screen === "bag" || screen === "profile") && (
        <div style={{ display: screen === "book" ? "block" : "none", height: "100%" }}>
          <BookScreen active="book" onTab={go} />
        </div>
      )}

      {screen === "bag" && (
        <BagScreen
          hcp={hcp}
          selected={selected}
          clubs={clubs}
          setClubs={setClubs}
          onEdit={() => go("setup")}
          active="bag"
          onTab={go}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen
          profile={profile}
          setProfile={setProfile}
          hcp={hcp}
          initials={initials}
          avatar={avatar}
          onAvatarClick={() => fileRef.current?.click()}
          onEditHcp={() => go("setup")}
          onViewBag={() => go("bag")}
          onLogout={() => go("splash")}
          active="profile"
          onTab={go}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => setAvatar(reader.result as string);
          reader.readAsDataURL(f);
        }}
      />
    </div>
  );
}

/* ───── SPLASH ───── */
function SplashScreen({ onCreate, onLogin }: { onCreate: () => void; onLogin: () => void }) {
  return (
    <div className="screen splash">
      <div className="splash-logo-wrap">
        <img src={markWhite.url} alt="" className="splash-mark" />
        <img src={logoBeige.url} alt="playfair" className="splash-logo-img" />
        <div className="splash-tag">Golf Club</div>
      </div>
      <button className="btn-solid" onClick={onCreate}>Create account</button>
      <button className="btn-solid btn-outline" onClick={onLogin}>Log in</button>
      <div style={{ fontSize: 12, color: "rgba(237,233,223,0.3)", marginTop: 24, textAlign: "center", lineHeight: 1.65 }}>
        By continuing you agree to the<br />playfair Terms of Use and Privacy Policy
      </div>
    </div>
  );
}

/* ───── SIGNUP ───── */
function SignupScreen(props: {
  form: { fn: string; ln: string; em: string; mb: string; sb: string };
  onChange: (f: any) => void;
  onBack: () => void;
  onLogin: () => void;
  onContinue: () => void;
  submitting: boolean;
}) {
  const { form, onChange, onBack, onLogin, onContinue, submitting } = props;
  const upd = (k: string, v: string) => onChange({ ...form, [k]: v });
  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="top-bar-title">Create account</span>
        <img src={markWhite.url} alt="" className="top-bar-mark" />
      </div>
      <div className="form-body">
        <div className="form-row">
          <div className="form-group">
            <label>First name</label>
            <input type="text" placeholder="First name" value={form.fn} onChange={(e) => upd("fn", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Last name</label>
            <input type="text" placeholder="Last name" value={form.ln} onChange={(e) => upd("ln", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Email address</label>
          <input type="email" placeholder="you@email.com" value={form.em} onChange={(e) => upd("em", e.target.value)} />
        </div>
        <div className="form-group">
          <label>Mobile number</label>
          <input type="tel" placeholder="+61 4xx xxx xxx" value={form.mb} onChange={(e) => upd("mb", e.target.value)} />
        </div>
        <div className="form-group">
          <label>Suburb</label>
          <input type="text" placeholder="Your suburb" value={form.sb} onChange={(e) => upd("sb", e.target.value)} />
        </div>
      </div>
      <div className="form-action">
        <button className="btn-green" onClick={onContinue} disabled={submitting}>
          {submitting ? "Saving…" : "Continue →"}
        </button>
        <div className="form-link">
          Already have an account? <span onClick={onLogin}>Log in</span>
        </div>
      </div>
    </div>
  );
}

/* ───── LOGIN ───── */
function LoginScreen({ onBack, onLogin, onSignup }: { onBack: () => void; onLogin: () => void; onSignup: () => void }) {
  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="top-bar-title">Log in</span>
        <img src={markWhite.url} alt="" className="top-bar-mark" />
      </div>
      <div className="form-body">
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <img src={logoGreen.url} alt="playfair" style={{ height: 40, marginBottom: 14 }} />
          <div style={{ fontFamily: "'Libre Baskerville',Georgia,serif", fontSize: 22, color: "#111", marginBottom: 6, fontStyle: "italic" }}>
            Welcome back.
          </div>
          <div style={{ fontSize: 13, color: "#888", lineHeight: 1.55 }}>
            Log in to manage your membership, book bays, and track your game.
          </div>
        </div>
        <div className="form-group">
          <label>Email address</label>
          <input type="email" placeholder="your@email.com" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="••••••••" />
        </div>
        <div style={{ textAlign: "right", margin: "-4px 0 20px" }}>
          <span style={{ fontSize: 13, color: "#094811", cursor: "pointer", fontWeight: 500 }}>Forgot password?</span>
        </div>
      </div>
      <div className="form-action">
        <button className="btn-green" onClick={onLogin}>Log in</button>
        <div className="form-link">
          New to playfair? <span onClick={onSignup}>Create an account</span>
        </div>
      </div>
    </div>
  );
}

/* ───── SETUP ───── */
function SetupScreen(props: {
  hcp: number;
  setHcp: (n: number) => void;
  selected: Set<number>;
  setSelected: (s: Set<number>) => void;
  onContinue: () => void;
}) {
  const { hcp, setHcp, selected, setSelected, onContinue } = props;
  const adj = (d: number) => setHcp(Math.max(-5, Math.min(54, hcp + d)));
  const toggle = (i: number) => {
    const n = new Set(selected);
    if (n.has(i)) n.delete(i); else n.add(i);
    setSelected(n);
  };
  return (
    <div className="screen">
      <div className="top-bar">
        <img src={markWhite.url} alt="" className="top-bar-mark" />
        <span className="top-bar-title">Set up your bag</span>
        <span style={{ width: 60, fontSize: 12, color: "rgba(237,233,223,0.45)", textAlign: "right" }}>1 of 1</span>
      </div>
      <div className="setup-body">
        <div className="setup-title">Your handicap</div>
        <div className="setup-sub">Enter your current handicap index. Update it anytime from your profile.</div>
        <div className="hcp-row">
          <span className="hcp-label">Handicap index</span>
          <div className="hcp-btns">
            <button className="hcp-btn" onClick={() => adj(-1)}>−</button>
            <div className="hcp-val">{hcp}</div>
            <button className="hcp-btn" onClick={() => adj(1)}>+</button>
          </div>
        </div>
        <div className="section-lbl" style={{ marginBottom: 8 }}>Select your clubs</div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 14, lineHeight: 1.5 }}>
          Tap a club to add it to your bag. Edit carry distances after setup.
        </div>
        <div className="clubs-grid">
          {CLUBS.map((c, i) => (
            <button
              key={c.n}
              type="button"
              className={"club-chip" + (selected.has(i) ? " on" : "")}
              onClick={() => toggle(i)}
            >
              <span dangerouslySetInnerHTML={{ __html: CLUB_SVGS[i] }} />
              <span className="club-chip-name">{c.n}</span>
              <span className="club-chip-type">{c.t}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="form-action">
        <button className="btn-green" onClick={onContinue}>Save and continue →</button>
      </div>
    </div>
  );
}

/* ───── BOOK ───── */
function BookScreen({ active, onTab }: { active: "book" | "bag" | "profile"; onTab: (s: Screen) => void }) {
  const [frameError, setFrameError] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const url = "https://yourgolfbooking.com/account/login";
  useEffect(() => {
    const t = setTimeout(() => {
      const f = document.getElementById("playfair-webview") as HTMLIFrameElement | null;
      try {
        if (f && !f.contentWindow?.location?.href) setFrameError(true);
      } catch {
        /* cross-origin — normal */
      }
    }, 4000);
    return () => clearTimeout(t);
  }, []);
  // Show the "Click here for your venues" hint a few seconds after the user
  // arrives on Book — enough time to read the login page and sign in. Cross-
  // origin restrictions mean we can't detect the actual login event from the
  // YGB iframe, so a delay is the most reliable trigger.
  useEffect(() => {
    if (localStorage.getItem("pf-venues-hint-dismissed") === "1") return;
    const t = setTimeout(() => setShowHint(true), 10000);
    return () => clearTimeout(t);
  }, []);
  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem("pf-venues-hint-dismissed", "1");
  };
  return (
    <div className="screen screen-fixed">
      <div className="notice">
        <img src={markGreen.url} alt="" className="notice-mark" />
        <div className="notice-text">
          New or no membership yet?{" "}
          <a className="notice-link" href="https://playfairgolfclub.com" target="_blank" rel="noreferrer">
            Visit playfairgolfclub.com
          </a>{" "}
          to explore options. Once logged in below, tap <strong>Venues</strong> to choose your site.
        </div>
      </div>
      <div className="webview-wrap">
        <iframe
          id="playfair-webview"
          className="webview-frame"
          src={url}
          title="yourgolfbooking.com"
          referrerPolicy="no-referrer"
          onLoad={onFrameLoad}
        />
        {frameError && (
          <div className="webview-fallback">
            <p>
              The booking site couldn't be embedded here.{" "}
              <a href={url} target="_blank" rel="noreferrer">Open booking in a new tab →</a>
            </p>
          </div>
        )}
        {showHint && (
          <button type="button" className="venues-hint" onClick={dismissHint} aria-label="Dismiss hint">
            <div className="venues-hint-bubble">Click here for your venues</div>
            <svg className="venues-hint-arrow" viewBox="0 0 80 100" width="64" height="80">
              <path d="M14 6 C 50 30, 60 60, 56 86" fill="none" stroke="#094811" strokeWidth="5" strokeLinecap="round"/>
              <path d="M48 78 L 56 90 L 66 80" fill="none" stroke="#094811" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      <BottomNav active={active} onTab={onTab} />
    </div>
  );
}

/* ───── BAG ───── */
function BagScreen(props: {
  hcp: number;
  selected: Set<number>;
  clubs: Club[];
  setClubs: (c: Club[]) => void;
  onEdit: () => void;
  active: "book" | "bag" | "profile";
  onTab: (s: Screen) => void;
}) {
  const { hcp, selected, clubs, setClubs, onEdit, active, onTab } = props;
  const editDist = (i: number) => {
    const v = window.prompt(`Carry distance for ${clubs[i].n} (metres):`, String(clubs[i].d));
    if (v && !isNaN(parseInt(v))) {
      const next = [...clubs];
      next[i] = { ...next[i], d: parseInt(v) };
      setClubs(next);
    }
  };
  return (
    <div className="screen">
      <div className="top-bar">
        <img src={markWhite.url} alt="" className="top-bar-mark" />
        <span className="top-bar-title">My Bag</span>
        <button
          style={{ fontSize: 13, color: "rgba(237,233,223,0.7)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          onClick={onEdit}
        >
          Edit
        </button>
      </div>
      <div className="bag-body">
        <div className="bag-hcp-card">
          <span style={{ fontSize: 22 }}>🏌️</span>
          <div>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Handicap index
            </div>
            <div className="bag-hcp-num">{hcp}.0</div>
          </div>
        </div>
        <div className="section-lbl">Your clubs</div>
        <div className="club-list-section">
          {clubs.map((c, i) =>
            selected.has(i) ? (
              <div className="club-row" key={c.n}>
                <div>
                  <div className="club-row-name">{c.n}</div>
                  <div className="club-row-type">{c.t}</div>
                </div>
                {c.d > 0 ? (
                  <div className="club-dist">
                    <span>
                      <b>{c.d}</b>m
                    </span>
                    <button className="dist-edit" onClick={() => editDist(i)}>Edit</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#aaa" }}>—</div>
                )}
              </div>
            ) : null
          )}
        </div>
      </div>
      <BottomNav active={active} onTab={onTab} />
    </div>
  );
}

/* ───── PROFILE ───── */
function ProfileScreen(props: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  hcp: number;
  initials: string;
  avatar: string | null;
  onAvatarClick: () => void;
  onEditHcp: () => void;
  onViewBag: () => void;
  onLogout: () => void;
  active: "book" | "bag" | "profile";
  onTab: (s: Screen) => void;
}) {
  const { profile, setProfile, hcp, initials, avatar, onAvatarClick, onEditHcp, onViewBag, onLogout, active, onTab } = props;
  const [editing, setEditing] = useState<keyof Profile | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (k: keyof Profile) => {
    setEditing(k);
    setDraft(profile[k]);
  };
  const saveEdit = () => {
    if (editing) setProfile({ ...profile, [editing]: draft });
    setEditing(null);
  };

  const row = (label: string, key: keyof Profile, editable = true, small = false) => (
    <div className="pf-row">
      <span className="pf-lbl">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {editing === key ? (
          <input
            className="pf-val-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
          />
        ) : (
          <span className="pf-val" style={small ? { fontSize: 12 } : undefined}>
            {profile[key]}
          </span>
        )}
        {editable && editing !== key && (
          <button className="pf-edit" onClick={() => startEdit(key)}>Edit</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="profile-top">
        <img src={logoWhite.url} alt="playfair" className="profile-top-logo" />
        <div className="avatar" onClick={onAvatarClick}>
          {avatar ? <img src={avatar} alt="avatar" /> : <span>{initials}</span>}
          <div className="avatar-edit">Edit</div>
        </div>
        <div className="profile-name-h">{profile.firstName} {profile.lastName}</div>
        <div className="profile-email-h">{profile.email}</div>
      </div>
      <div className="profile-body">
        <div className="section-lbl" style={{ marginTop: 4 }}>Personal details</div>
        <div className="pf-section">
          {row("First name", "firstName")}
          {row("Last name", "lastName")}
          {row("Email", "email", true, true)}
          {row("Mobile", "mobile")}
          {row("Suburb", "suburb")}
        </div>
        <div className="section-lbl">Golf</div>
        <div className="pf-section">
          <div className="pf-row">
            <span className="pf-lbl">Handicap index</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="hcp-badge">{hcp}.0</span>
              <button className="pf-edit" onClick={onEditHcp}>Edit</button>
            </div>
          </div>
          <div className="pf-row">
            <span className="pf-lbl">My bag</span>
            <button className="pf-edit" onClick={onViewBag}>View bag →</button>
          </div>
        </div>
        <div className="section-lbl">Account</div>
        <div className="pf-section">
          <div className="pf-row" style={{ cursor: "pointer" }}>
            <span className="pf-lbl">Membership</span>
            <span style={{ fontSize: 13, color: "#094811", fontWeight: 500 }}>View →</span>
          </div>
          <div className="pf-row" style={{ cursor: "pointer" }} onClick={onLogout}>
            <span className="pf-lbl" style={{ color: "#c0392b" }}>Log out</span>
          </div>
        </div>
      </div>
      <BottomNav active={active} onTab={onTab} />
    </div>
  );
}

/* ───── ICONS ───── */
function GolferIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <circle cx="10" cy="5" r="2" />
      <path d="M14 21l-4-10 3-3" />
      <path d="M7 16l3-6 6 2" />
      <path d="M17 12c1.5 1 3 0 3-2s-1.5-3-3-2" />
    </svg>
  );
}
function GolfBagIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <rect x="6" y="6" width="12" height="14" rx="2" />
      <path d="M9 6v14" />
      <path d="M15 6v14" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
    </svg>
  );
}
function ProfileIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ───── BOTTOM NAV ───── */
function BottomNav({ active, onTab }: { active: "book" | "bag" | "profile"; onTab: (s: Screen) => void }) {
  return (
    <div className="bottom-nav">
      <button className={"nav-item" + (active === "book" ? " active" : "")} onClick={() => onTab("book")}>
        <span className="nav-ico"><GolferIcon size={22} /></span>
        <span className="nav-lbl">Book</span>
      </button>
      <button className={"nav-item" + (active === "bag" ? " active" : "")} onClick={() => onTab("bag")}>
        <span className="nav-ico"><GolfBagIcon size={22} /></span>
        <span className="nav-lbl">My Bag</span>
      </button>
      <button className={"nav-item" + (active === "profile" ? " active" : "")} onClick={() => onTab("profile")}>
        <span className="nav-ico"><ProfileIcon size={22} /></span>
        <span className="nav-lbl">Profile</span>
      </button>
    </div>
  );
}
