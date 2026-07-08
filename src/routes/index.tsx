import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { CLUBS, CLUB_SVGS, DEFAULT_SELECTED, type Club } from "@/lib/clubs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { PlayScreen, PerformanceScreen } from "@/lib/play-screen";
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

type Screen =
  | "loading"
  | "splash"
  | "signup"
  | "login"
  | "check-email"
  | "setup"
  | "play"
  | "performance"
  | "venue"
  | "bag"
  | "me";
type NavTab = "play" | "performance" | "venue" | "bag" | "me";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  suburb: string;
};

const EMPTY_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  suburb: "",
};

const signupSchema = z.object({
  fn: z.string().trim().min(1, "First name is required").max(100),
  ln: z.string().trim().min(1, "Last name is required").max(100),
  em: z.string().trim().email("Enter a valid email").max(255),
  mb: z.string().trim().min(6, "Enter a valid mobile number").max(50),
  sb: z.string().trim().min(1, "Suburb is required").max(120),
  pw: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const loginSchema = z.object({
  em: z.string().trim().email("Enter a valid email"),
  pw: z.string().min(1, "Enter your password"),
});

function PlayfairApp() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [hcp, setHcp] = useState(18);
  const [selected, setSelected] = useState<Set<number>>(new Set(DEFAULT_SELECTED));
  const [clubs, setClubs] = useState<Club[]>(CLUBS.map((c) => ({ ...c })));
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const go = (s: Screen) => setScreen(s);

  // Auth session gating
  useEffect(() => {
    let mounted = true;

    const loadProfile = async (uid: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name,last_name,email,mobile,suburb,handicap")
        .eq("id", uid)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setProfile({
          firstName: data.first_name ?? "",
          lastName: data.last_name ?? "",
          email: data.email ?? "",
          mobile: data.mobile ?? "",
          suburb: data.suburb ?? "",
        });
        if (typeof data.handicap === "number") setHcp(Math.round(data.handicap));
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const session = data.session;
      if (session) {
        setUserId(session.user.id);
        loadProfile(session.user.id);
        setScreen("play");
      } else {
        setScreen("splash");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session) {
        setUserId(session.user.id);
        loadProfile(session.user.id);
        setScreen("play");
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setProfile(EMPTY_PROFILE);
        setScreen("splash");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const persistProfile = async (next: Profile) => {
    setProfile(next);
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({
        first_name: next.firstName,
        last_name: next.lastName,
        mobile: next.mobile,
        suburb: next.suburb,
      })
      .eq("id", userId);
  };

  const persistHandicap = async (n: number) => {
    setHcp(n);
    if (!userId) return;
    await supabase.from("profiles").update({ handicap: n }).eq("id", userId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setScreen("splash");
  };

  const initials =
    (profile.firstName[0] || "").toUpperCase() + (profile.lastName[0] || "").toUpperCase();

  if (screen === "loading") {
    return (
      <div className="app">
        <div className="screen splash" style={{ justifyContent: "center" }}>
          <img src={markWhite.url} alt="" style={{ width: 56, opacity: 0.7 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {screen === "splash" && (
        <SplashScreen onCreate={() => go("signup")} onLogin={() => go("login")} />
      )}

      {screen === "signup" && (
        <SignupScreen
          onBack={() => go("splash")}
          onLogin={() => go("login")}
          onSignedUp={(email) => {
            setPendingEmail(email);
            go("check-email");
          }}
        />
      )}

      {screen === "check-email" && (
        <CheckEmailScreen email={pendingEmail} onBack={() => go("login")} />
      )}

      {screen === "login" && (
        <LoginScreen onBack={() => go("splash")} onSignup={() => go("signup")} />
      )}

      {screen === "setup" && (
        <SetupScreen
          hcp={hcp}
          setHcp={persistHandicap}
          selected={selected}
          setSelected={setSelected}
          onContinue={() => go("play")}
        />
      )}

      {screen === "play" && (
        <PlayScreen bottomNav={<BottomNav active="play" onTab={go} />} />
      )}

      {screen === "performance" && (
        <PerformanceScreen bottomNav={<BottomNav active="performance" onTab={go} />} />
      )}

      {(screen === "venue" || screen === "bag" || screen === "me") && (
        <div style={{ display: screen === "venue" ? "block" : "none", height: "100%" }}>
          <BookScreen active="venue" onTab={go} />
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

      {screen === "me" && (
        <ProfileScreen
          profile={profile}
          setProfile={persistProfile}
          hcp={hcp}
          initials={initials}
          avatar={avatar}
          setAvatar={setAvatar}
          userId={userId}
          onEditHcp={() => go("setup")}
          onViewBag={() => go("bag")}
          onLogout={handleLogout}
          active="me"
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const google = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) {
        setErr("Google sign-in failed. Try again.");
        setBusy(false);
        return;
      }
      // redirected or session set — auth listener handles the rest
    } catch {
      setErr("Google sign-in failed. Try again.");
      setBusy(false);
    }
  };
  return (
    <div className="screen splash">
      <div className="splash-logo-wrap">
        <img src={markWhite.url} alt="" className="splash-mark" />
        <img src={logoBeige.url} alt="playfair" className="splash-logo-img" />
        <div className="splash-tag">Golf Club</div>
      </div>
      <button className="btn-solid" onClick={onCreate}>Create account</button>
      <button className="btn-solid btn-outline" onClick={onLogin}>Log in</button>
      <button className="btn-solid btn-outline" onClick={google} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {err && <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 10 }}>{err}</div>}
      <div style={{ fontSize: 12, color: "rgba(237,233,223,0.3)", marginTop: 24, textAlign: "center", lineHeight: 1.65 }}>
        By continuing you agree to the<br />playfair Terms of Use and Privacy Policy
      </div>
    </div>
  );
}

/* ───── SIGNUP ───── */
function SignupScreen(props: {
  onBack: () => void;
  onLogin: () => void;
  onSignedUp: (email: string) => void;
}) {
  const { onBack, onLogin, onSignedUp } = props;
  const [form, setForm] = useState({ fn: "", ln: "", em: "", mb: "", sb: "", pw: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const upd = (k: string, v: string) => setForm({ ...form, [k]: v });

  const submit = async () => {
    setFormErr(null);
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      const es: Record<string, string> = {};
      for (const iss of parsed.error.issues) {
        const key = iss.path[0] as string;
        if (!es[key]) es[key] = iss.message;
      }
      setErrors(es);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { fn, ln, em, mb, sb, pw } = parsed.data;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password: pw,
        options: {
          emailRedirectTo: window.location.origin,
          data: { first_name: fn, last_name: ln, mobile: mb, suburb: sb },
        },
      });
      if (error) {
        setFormErr(error.message);
        setSubmitting(false);
        return;
      }
      // Also write lead row (best-effort; safe if it fails)
      supabase
        .from("signups")
        .insert({ first_name: fn, last_name: ln, email: em, mobile: mb, suburb: sb })
        .then(() => {}, () => {});
      // Email confirmation is required — no session yet
      if (!data.session) {
        onSignedUp(em);
      }
      setSubmitting(false);
    } catch (e: any) {
      setFormErr(e?.message ?? "Sign up failed");
      setSubmitting(false);
    }
  };

  const errStyle = { color: "#c0392b", fontSize: 12, marginTop: 4 };

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
            {errors.fn && <div style={errStyle}>{errors.fn}</div>}
          </div>
          <div className="form-group">
            <label>Last name</label>
            <input type="text" placeholder="Last name" value={form.ln} onChange={(e) => upd("ln", e.target.value)} />
            {errors.ln && <div style={errStyle}>{errors.ln}</div>}
          </div>
        </div>
        <div className="form-group">
          <label>Email address</label>
          <input type="email" placeholder="you@email.com" value={form.em} onChange={(e) => upd("em", e.target.value)} />
          {errors.em && <div style={errStyle}>{errors.em}</div>}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="At least 8 characters" value={form.pw} onChange={(e) => upd("pw", e.target.value)} />
          {errors.pw && <div style={errStyle}>{errors.pw}</div>}
        </div>
        <div className="form-group">
          <label>Mobile number</label>
          <input type="tel" placeholder="+61 4xx xxx xxx" value={form.mb} onChange={(e) => upd("mb", e.target.value)} />
          {errors.mb && <div style={errStyle}>{errors.mb}</div>}
        </div>
        <div className="form-group">
          <label>Suburb</label>
          <input type="text" placeholder="Your suburb" value={form.sb} onChange={(e) => upd("sb", e.target.value)} />
          {errors.sb && <div style={errStyle}>{errors.sb}</div>}
        </div>
        {formErr && <div style={{ ...errStyle, marginTop: 8 }}>{formErr}</div>}
      </div>
      <div className="form-action">
        <button className="btn-green" onClick={submit} disabled={submitting}>
          {submitting ? "Creating account…" : "Continue →"}
        </button>
        <div className="form-link">
          Already have an account? <span onClick={onLogin}>Log in</span>
        </div>
      </div>
    </div>
  );
}

/* ───── CHECK EMAIL ───── */
function CheckEmailScreen({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <span className="top-bar-title">Verify your email</span>
        <img src={markWhite.url} alt="" className="top-bar-mark" />
      </div>
      <div className="form-body" style={{ textAlign: "center", paddingTop: 40 }}>
        <img src={logoGreen.url} alt="playfair" style={{ height: 40, marginBottom: 20 }} />
        <div style={{ fontFamily: "'Libre Baskerville',Georgia,serif", fontSize: 22, color: "#111", marginBottom: 12, fontStyle: "italic" }}>
          Check your inbox.
        </div>
        <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6, maxWidth: 320, margin: "0 auto" }}>
          We've sent a confirmation link to<br />
          <strong style={{ color: "#111" }}>{email}</strong><br /><br />
          Click the link in that email to activate your account, then come back here to log in.<br /><br />
          <em>Can't find it? Check your Spam or Junk folder.</em>
        </div>
      </div>
      <div className="form-action">
        <button className="btn-green" onClick={onBack}>Back to log in</button>
      </div>
    </div>
  );
}

/* ───── LOGIN ───── */
function LoginScreen({ onBack, onSignup }: { onBack: () => void; onSignup: () => void }) {
  const [form, setForm] = useState({ em: "", pw: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const upd = (k: string, v: string) => setForm({ ...form, [k]: v });

  const submit = async () => {
    setFormErr(null);
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const es: Record<string, string> = {};
      for (const iss of parsed.error.issues) {
        const key = iss.path[0] as string;
        if (!es[key]) es[key] = iss.message;
      }
      setErrors(es);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.em,
      password: parsed.data.pw,
    });
    if (error) {
      setFormErr(error.message);
      setSubmitting(false);
      return;
    }
    // auth listener will navigate
  };

  const google = async () => {
    setFormErr(null);
    setSubmitting(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      setFormErr("Google sign-in failed.");
      setSubmitting(false);
    }
  };

  const forgot = async () => {
    setFormErr(null);
    if (!form.em) {
      setErrors({ em: "Enter your email first" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(form.em.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) {
      setFormErr(error.message);
    } else {
      setFormErr("Password reset email sent. Check your inbox (and Spam/Junk if you don't see it).");
    }
  };

  const errStyle = { color: "#c0392b", fontSize: 12, marginTop: 4 };

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
          <input type="email" placeholder="your@email.com" value={form.em} onChange={(e) => upd("em", e.target.value)} />
          {errors.em && <div style={errStyle}>{errors.em}</div>}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={form.pw} onChange={(e) => upd("pw", e.target.value)} />
          {errors.pw && <div style={errStyle}>{errors.pw}</div>}
        </div>
        <div style={{ textAlign: "right", margin: "-4px 0 20px" }}>
          <span onClick={forgot} style={{ fontSize: 13, color: "#094811", cursor: "pointer", fontWeight: 500 }}>Forgot password?</span>
        </div>
        {formErr && <div style={{ ...errStyle, marginBottom: 8 }}>{formErr}</div>}
      </div>
      <div className="form-action">
        <button className="btn-green" onClick={submit} disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
        <button className="btn-solid btn-outline" onClick={google} disabled={submitting} style={{ marginTop: 10, background: "transparent", color: "#094811", borderColor: "#094811" }}>
          Continue with Google
        </button>
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
function BookScreen({ active, onTab }: { active: NavTab; onTab: (s: Screen) => void }) {
  const [frameError, setFrameError] = useState(false);
  const [showVenueTip, setShowVenueTip] = useState(false);
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
  useEffect(() => {
    const t = setTimeout(() => setShowVenueTip(true), 10000);
    return () => clearTimeout(t);
  }, []);
  const dismissVenueTip = () => setShowVenueTip(false);
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
        />
        {frameError && (
          <div className="webview-fallback">
            <p>
              The booking site couldn't be embedded here.{" "}
              <a href={url} target="_blank" rel="noreferrer">Open booking in a new tab →</a>
            </p>
          </div>
        )}
      </div>
      {showVenueTip && (
        <div className="venue-tip-overlay" onClick={dismissVenueTip}>
          <div className="venue-tip-card" onClick={(e) => e.stopPropagation()}>
            <button className="venue-tip-close" onClick={dismissVenueTip} aria-label="Dismiss">✕</button>
            <div className="venue-tip-icon">☰</div>
            <div className="venue-tip-title">Find your venues</div>
            <div className="venue-tip-body">
              Tap the menu (☰) in the top-right corner to view your venues.
              <br /><br />
              Looking for a specific venue? Use the search bar and search for <strong>Playfair</strong>.
            </div>
            <button className="venue-tip-btn" onClick={dismissVenueTip}>Got it</button>
          </div>
        </div>
      )}
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
  active: NavTab;
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

/* ───── ME (profile) ───── */
function ProfileScreen(props: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  hcp: number;
  initials: string;
  avatar: string | null;
  setAvatar: (a: string | null) => void;
  userId: string | null;
  onEditHcp: () => void;
  onViewBag: () => void;
  onLogout: () => void;
  active: NavTab;
  onTab: (s: Screen) => void;
}) {
  const { profile, setProfile, hcp, initials, avatar, setAvatar, userId, onEditHcp, onViewBag, onLogout, active, onTab } = props;
  const [editing, setEditing] = useState<keyof Profile | null>(null);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const localFileRef = useRef<HTMLInputElement>(null);
  const [buddies, setBuddies] = useState<any>(null);

  useEffect(() => {
    // Load avatar from profile row (may already be a signed URL) + buddies
    if (!userId) return;
    supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle().then(({ data }) => {
      if (data?.avatar_url) setAvatar(data.avatar_url);
    });
    import("@/lib/buddies.functions").then((m) => m.listBuddies()).then(setBuddies).catch(() => {});
  }, [userId, setAvatar]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !userId) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, f, { upsert: true, contentType: f.type });
      if (up.error) throw up.error;
      const { setAvatarFromPath } = await import("@/lib/avatar.functions");
      const res = await setAvatarFromPath({ data: { path } });
      setAvatar(res.url);
    } catch (err: any) {
      setUploadErr(err?.message || "Upload failed");
    }
    setUploading(false);
    if (e.target) e.target.value = "";
  };

  const startEdit = (k: keyof Profile) => {
    if (k === "email") return;
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
        <div className="avatar" onClick={() => localFileRef.current?.click()}>
          {avatar ? <img src={avatar} alt="avatar" /> : <span>{initials}</span>}
          <div className="avatar-edit">{uploading ? "…" : "Edit"}</div>
        </div>
        <div className="profile-name-h">{profile.firstName} {profile.lastName}</div>
        <div className="profile-email-h">{profile.email}</div>
        {uploadErr && <div style={{ color: "#ff6b6b", fontSize: 12, marginTop: 6 }}>{uploadErr}</div>}
        <input ref={localFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
      </div>
      <div className="profile-body">
        <div className="section-lbl" style={{ marginTop: 4 }}>Personal details</div>
        <div className="pf-section">
          {row("First name", "firstName")}
          {row("Last name", "lastName")}
          {row("Email", "email", false, true)}
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
        <div className="section-lbl">Buddies</div>
        <div className="pf-section">
          {!buddies && <div className="pf-row"><span className="pf-lbl">Loading…</span></div>}
          {buddies && buddies.accepted.length === 0 && buddies.pendingIncoming.length === 0 && (
            <div className="pf-row"><span className="pf-lbl" style={{ color: "#888" }}>No buddies yet. Add them from a round.</span></div>
          )}
          {buddies?.pendingIncoming?.map((b: any) => (
            <div className="pf-row" key={b.id}>
              <span className="pf-lbl">{b.profile?.first_name} {b.profile?.last_name} <span style={{ color: "#888" }}>wants to be your buddy</span></span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="pf-edit" onClick={async () => {
                  const m = await import("@/lib/buddies.functions");
                  await m.respondBuddyRequest({ data: { buddyId: b.id, accept: true } });
                  m.listBuddies().then(setBuddies);
                }}>Accept</button>
                <button className="pf-edit" style={{ color: "#c0392b" }} onClick={async () => {
                  const m = await import("@/lib/buddies.functions");
                  await m.respondBuddyRequest({ data: { buddyId: b.id, accept: false } });
                  m.listBuddies().then(setBuddies);
                }}>Decline</button>
              </div>
            </div>
          ))}
          {buddies?.accepted?.map((b: any) => (
            <div className="pf-row" key={b.id}>
              <span className="pf-lbl">{b.profile?.first_name} {b.profile?.last_name}</span>
              <span style={{ fontSize: 12, color: "#888" }}>HCP {b.profile?.handicap ?? "—"}</span>
            </div>
          ))}
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
function FlagIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 3 2 3H5" />
      <circle cx="19" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}

/* ───── BOTTOM NAV ───── */
function BottomNav({ active, onTab }: { active: NavTab; onTab: (s: Screen) => void }) {
  return (
    <div className="bottom-nav">
      <button className={"nav-item" + (active === "play" ? " active" : "")} onClick={() => onTab("play")}>
        <span className="nav-ico"><FlagIcon size={22} /></span>
        <span className="nav-lbl">Play</span>
      </button>
      <button className={"nav-item" + (active === "performance" ? " active" : "")} onClick={() => onTab("performance")}>
        <span className="nav-ico"><PerfIcon size={22} /></span>
        <span className="nav-lbl">Performance</span>
      </button>
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

function PerfIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12l4-3" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}
