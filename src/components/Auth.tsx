import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AtSign,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Pencil,
  Inbox,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";
type AuthStep = 1 | 2 | 3;

const PENDING_VERIFICATION_KEY = "freetext_pending_verification_email";
const VERIFICATION_REDIRECT = "https://freetext-app.vercel.app/?verified=1";
const RESEND_COOLDOWN = 120;

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const verifiedRedirect = new URLSearchParams(window.location.search).get("verified") === "1";
      const pendingEmail = localStorage.getItem(PENDING_VERIFICATION_KEY);

      if (pendingEmail) setEmail(pendingEmail);

      if (verifiedRedirect) {
        if (session?.user?.email_confirmed_at) {
          localStorage.removeItem(PENDING_VERIFICATION_KEY);
          setMessage("Your email has been verified successfully.");
          setStep(3);
        } else {
          setStep(2);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (session?.user?.email_confirmed_at) setStep(3);
      else if (pendingEmail) setStep(2);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
        localStorage.removeItem(PENDING_VERIFICATION_KEY);
        setMessage("Your email has been verified successfully.");
        setStep(3);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((current) => current > 0 ? current - 1 : 0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleLogin = async () => {
    clearMessages();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (loginError) {
      if (loginError.message.toLowerCase().includes("email not confirmed")) {
        localStorage.setItem(PENDING_VERIFICATION_KEY, email.trim().toLowerCase());
        setError("Please verify your email before logging in.");
        setStep(2);
        return;
      }
      setError(loginError.message);
      return;
    }

    if (data.session) {
      localStorage.removeItem(PENDING_VERIFICATION_KEY);
      setMessage("Welcome back to FreeText!");
    }
  };

  const handleSignup = async () => {
    clearMessages();
    if (!email.trim() || !password || !fullName.trim() || !username.trim()) {
      setError("Please complete all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }

    const cleanUsername = username.trim().replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: VERIFICATION_REDIRECT },
    });
    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      localStorage.removeItem(PENDING_VERIFICATION_KEY);
      setMessage("Account created successfully.");
      setStep(3);
    } else {
      localStorage.setItem(PENDING_VERIFICATION_KEY, email.trim().toLowerCase());
      setMessage("We've sent a verification email to your inbox.");
      setStep(2);
      setResendSeconds(RESEND_COOLDOWN);
    }
  };

  const resendVerification = async () => {
    clearMessages();
    if (resendSeconds > 0 || loading) return;

    const savedEmail = localStorage.getItem(PENDING_VERIFICATION_KEY);
    const verificationEmail = email.trim() || savedEmail || "";
    if (!verificationEmail) {
      setError("Please enter your email address first.");
      setStep(1);
      return;
    }

    setEmail(verificationEmail);
    setLoading(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: verificationEmail,
      options: { emailRedirectTo: VERIFICATION_REDIRECT },
    });
    setLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    localStorage.setItem(PENDING_VERIFICATION_KEY, verificationEmail.toLowerCase());
    setMessage("A fresh verification email is on its way. Check your inbox and spam folder.");
    setResendSeconds(RESEND_COOLDOWN);
  };

  const changeEmailAndResend = async () => {
    clearMessages();
    const targetEmail = newEmail.trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    if (targetEmail === email.trim().toLowerCase()) {
      setError("That's already the email on this screen.");
      return;
    }

    if (!password) {
      setError("For security, go back and enter your password before changing the email.");
      return;
    }

    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: targetEmail,
      password,
      options: { emailRedirectTo: VERIFICATION_REDIRECT },
    });
    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    setEmail(targetEmail);
    localStorage.setItem(PENDING_VERIFICATION_KEY, targetEmail);
    setNewEmail("");
    setChangingEmail(false);
    setMessage(data.session ? "Email updated successfully." : "We've sent a new verification email to your new address.");
    setResendSeconds(RESEND_COOLDOWN);
  };

  const checkVerification = async () => {
    clearMessages();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    setLoading(false);

    if (!session?.user) {
      setError("We couldn't find an active session. Open the verification link from your email, then return here.");
      return;
    }
    if (!session.user.email_confirmed_at) {
      setError("Your email is not verified yet. Open the FreeText verification email and tap the verification link.");
      return;
    }

    localStorage.removeItem(PENDING_VERIFICATION_KEY);
    setMessage("Email verified successfully! Welcome to FreeText.");
    setStep(3);
  };

  const completeProfile = async () => {
    clearMessages();
    if (!fullName.trim() || !username.trim()) {
      setError("Please enter your full name and username.");
      return;
    }

    const cleanUsername = username.trim().replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Your session has expired. Please sign in again.");
      setStep(1);
      return;
    }

    const { data: existingProfile } = await supabase.from("profiles").select("id").eq("username", cleanUsername).maybeSingle();
    if (existingProfile && existingProfile.id !== user.id) {
      setLoading(false);
      setError("That username is already taken.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      username: cleanUsername,
      full_name: fullName.trim(),
      bio: "",
      avatar_url: "",
      cover_url: "",
    });
    setLoading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    localStorage.removeItem(PENDING_VERIFICATION_KEY);
    setMessage("Your FreeText profile is ready!");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "login") await handleLogin();
    else await handleSignup();
  };

  if (step === 2) {
    return (
      <main className="auth-page">
        <style>{`
          .verification-card{position:relative;overflow:hidden;max-width:520px!important;background:rgba(255,255,255,.96)!important;border:1px solid rgba(255,255,255,.8)!important;box-shadow:0 30px 90px rgba(31,41,55,.18),0 8px 28px rgba(37,99,235,.08)!important}
          html.dark .verification-card{background:rgba(18,24,33,.97)!important;border-color:#263242!important}
          .verification-visual{height:150px;margin:-4px -4px 22px;border-radius:22px;background:linear-gradient(135deg,#eef5ff,#f7f9ff);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}
          html.dark .verification-visual{background:linear-gradient(135deg,#13233d,#17202d)}
          .verification-visual::before,.verification-visual::after{content:"";position:absolute;border-radius:999px;background:rgba(37,99,235,.08);animation:verifyPulse 3s ease-in-out infinite}
          .verification-visual::before{width:180px;height:180px}.verification-visual::after{width:250px;height:250px;animation-delay:1s}
          .verify-scene{position:relative;z-index:2;width:220px;height:110px}
          .verify-mail{position:absolute;left:35px;top:28px;width:82px;height:60px;border-radius:14px;background:white;border:1px solid #dce7f8;box-shadow:0 14px 28px rgba(37,99,235,.16);display:grid;place-items:center;color:#2563eb;animation:mailFloat 2.8s ease-in-out infinite}
          html.dark .verify-mail{background:#202b3a;border-color:#34445a}
          .verify-mail::after{content:"";position:absolute;inset:12px;border:2px solid #dbe7fb;border-top:0;border-radius:5px;transform:skewY(-24deg)}
          .verify-arrow{position:absolute;left:115px;top:50px;width:55px;height:2px;background:#8db0f5;animation:arrowGlow 1.8s ease-in-out infinite}
          .verify-arrow::after{content:"";position:absolute;right:0;top:-4px;width:9px;height:9px;border-top:2px solid #2563eb;border-right:2px solid #2563eb;transform:rotate(45deg)}
          .verify-inbox{position:absolute;right:12px;top:23px;width:72px;height:70px;border-radius:16px;background:#eaf1ff;border:1px solid #cfe0ff;display:grid;place-items:center;color:#2563eb;animation:inboxGlow 2.8s ease-in-out infinite}
          html.dark .verify-inbox{background:#203250;border-color:#31517e}
          .verify-check{position:absolute;right:0;bottom:8px;width:30px;height:30px;border-radius:50%;background:#22c55e;color:white;display:grid;place-items:center;border:3px solid white;box-shadow:0 6px 15px rgba(34,197,94,.28);animation:checkPop 2.8s ease-in-out infinite}
          html.dark .verify-check{border-color:#17202d}
          @keyframes mailFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}
          @keyframes inboxGlow{0%,100%{transform:scale(1);box-shadow:0 0 0 rgba(37,99,235,0)}50%{transform:scale(1.05);box-shadow:0 0 28px rgba(37,99,235,.18)}}
          @keyframes arrowGlow{0%,100%{opacity:.45;width:45px}50%{opacity:1;width:58px}}
          @keyframes checkPop{0%,65%,100%{transform:scale(1)}72%{transform:scale(1.16)}
          }
          @keyframes verifyPulse{0%,100%{transform:scale(.85);opacity:.45}50%{transform:scale(1.08);opacity:.9}}
          .verification-badge{width:max-content;max-width:100%;margin:0 auto 12px;padding:7px 11px;border-radius:999px;background:#edf7ef;color:#16803b;font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px}
          html.dark .verification-badge{background:#10281a;color:#6ee7a0}
          .verification-lead{max-width:400px;margin-left:auto;margin-right:auto}
          .verification-email-box{margin:18px 0;padding:15px 16px;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:15px;background:#f5f8ff;border:1px solid #dce7fb;color:#25324a;word-break:break-word}
          html.dark .verification-email-box{background:#172231;border-color:#2a3b50;color:#e7edf7}
          .verification-email-box strong{font-size:14px}
          .verification-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:18px 0 20px}
          .verification-step{padding:12px 8px;border:1px solid #e7ebf2;border-radius:14px;background:#fafbfd;text-align:center}
          html.dark .verification-step{background:#141c27;border-color:#273342}
          .verification-step span{width:26px;height:26px;margin:0 auto 7px;display:grid;place-items:center;border-radius:50%;background:#e8f0ff;color:#2563eb;font-size:12px;font-weight:900}
          .verification-step p{font-size:11px;line-height:1.35;color:#667085}
          html.dark .verification-step p{color:#aab5c5}
          .verification-resend-box{margin-top:15px;padding:15px;border-radius:16px;background:linear-gradient(135deg,#f8faff,#f3f7ff);border:1px solid #e0e8f8;display:flex;align-items:center;justify-content:space-between;gap:14px;text-align:left}
          html.dark .verification-resend-box{background:#151f2d;border-color:#2a3a4d}
          .verification-resend-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
          .verification-resend-copy strong{font-size:13px}.verification-resend-copy span{font-size:11px;color:#7b8798;line-height:1.4}
          .verification-resend-button{flex:0 0 auto;min-height:40px;padding:0 13px;border-radius:11px;background:#2563eb;color:white;font-size:12px;font-weight:800;display:flex;align-items:center;gap:7px;white-space:nowrap;transition:.2s}
          .verification-resend-button:hover:not(:disabled){transform:translateY(-1px);background:#1d4ed8}.verification-resend-button:disabled{opacity:.55;cursor:not-allowed}
          .change-email-link{margin:16px auto 4px;background:transparent;color:#2563eb;font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px}.change-email-link:hover{text-decoration:underline}
          .change-email-panel{margin:12px 0 4px;padding:14px;border-radius:15px;background:#f8fafc;border:1px solid #e2e8f0;text-align:left}.change-email-panel label{display:block;margin-bottom:7px;font-size:12px;font-weight:800;color:#475569}.change-email-row{display:flex;gap:8px}.change-email-row input{flex:1;min-width:0;border:1px solid #d6deea;border-radius:10px;padding:10px 12px;background:white;color:#172033}.change-email-row button{padding:0 13px;border-radius:10px;background:#172033;color:white;font-weight:800;font-size:12px}.change-email-cancel{margin-top:8px;background:transparent;color:#64748b;font-size:11px}
          html.dark .change-email-panel{background:#141c27;border-color:#2a3747}html.dark .change-email-row input{background:#0f151d;border-color:#334155;color:white}html.dark .change-email-row button{background:#2563eb}
          .verification-tip{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;font-size:11px;color:#8490a2;line-height:1.45}
          @media(max-width:520px){.verification-card{padding:18px!important;border-radius:22px!important}.verification-visual{height:132px}.verification-steps{gap:6px}.verification-step{padding:10px 5px}.verification-resend-box{flex-direction:column;align-items:stretch}.verification-resend-button{justify-content:center}.change-email-row{flex-direction:column}.change-email-row button{height:42px}}
        `}</style>

        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />

        <section className="auth-card verification-card">
          <div className="auth-brand">
            <div className="auth-logo">F</div>
            <span>FreeText</span>
          </div>

          <div className="verification-visual" aria-hidden="true">
            <div className="verify-scene">
              <div className="verify-mail"><Mail size={28} /></div>
              <div className="verify-arrow" />
              <div className="verify-inbox"><Inbox size={30} /></div>
              <div className="verify-check"><CheckCircle2 size={15} /></div>
            </div>
          </div>

          <div className="verification-badge">
            <ShieldCheck size={15} /> Secure email verification
          </div>

          <h1 className="auth-heading">Check your email</h1>
          <p className="auth-helper verification-lead">
            Your FreeText account is almost ready. We sent a secure verification link to:
          </p>

          <div className="verification-email-box">
            <Mail size={18} />
            <strong>{email || "your email address"}</strong>
          </div>

          <div className="verification-steps">
            <div className="verification-step"><span>1</span><p>Open the FreeText email.</p></div>
            <div className="verification-step"><span>2</span><p>Tap the verify link.</p></div>
            <div className="verification-step"><span>3</span><p>Come back and continue.</p></div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && (
            <div className="auth-success">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          <button className="auth-primary-button verification-primary" type="button" onClick={checkVerification} disabled={loading}>
            {loading ? "Checking your verification..." : "I've verified my email"}
          </button>

          <div className="verification-resend-box">
            <div className="verification-resend-copy">
              <strong>Didn't receive the email?</strong>
              <span>Check spam or junk, then request another link.</span>
            </div>
            <button className="verification-resend-button" type="button" onClick={resendVerification} disabled={loading || resendSeconds > 0}>
              <RefreshCw size={17} />
              {loading ? "Sending..." : resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend email"}
            </button>
          </div>

          {!changingEmail ? (
            <button className="change-email-link" type="button" onClick={() => { clearMessages(); setNewEmail(email); setChangingEmail(true); }}>
              <Pencil size={14} /> Change email address
            </button>
          ) : (
            <div className="change-email-panel">
              <label htmlFor="change-email">Use a different email</label>
              <div className="change-email-row">
                <input id="change-email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="new@email.com" autoComplete="email" />
                <button type="button" onClick={changeEmailAndResend} disabled={loading}>
                  {loading ? "Sending..." : "Send there"}
                </button>
              </div>
              <button className="change-email-cancel" type="button" onClick={() => setChangingEmail(false)}>Cancel</button>
            </div>
          )}

          <button className="auth-phone-button" type="button" onClick={() => { clearMessages(); setChangingEmail(false); setStep(1); }}>
            <ArrowLeft size={17} /> Back to sign in
          </button>

          <p className="verification-tip">
            <Sparkles size={13} /> Tip: search your inbox for “FreeText” if the email isn't visible yet.
          </p>
        </section>
      </main>
    );
  }

  if (step === 3) {
    return (
      <main className="auth-page">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <section className="auth-card">
          <div className="auth-brand"><div className="auth-logo">F</div><span>FreeText</span></div>
          <div className="auth-welcome-icon"><CheckCircle2 size={34} /></div>
          <h1 className="auth-heading">Complete your profile</h1>
          <p className="auth-helper">Your email is verified. Let's finish setting up your FreeText profile.</p>
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); completeProfile(); }}>
            <div className="auth-input-wrap"><User size={18} /><input className="auth-input" type="text" placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
            <div className="auth-input-wrap"><AtSign size={18} /><input className="auth-input" type="text" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} /></div>
            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success"><CheckCircle2 size={18} /><span>{message}</span></div>}
            <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? "Saving profile..." : "Continue to FreeText"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <section className="auth-card">
        <div className="auth-brand"><div className="auth-logo">F</div><span>FreeText</span></div>
        <h1 className="auth-heading">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-helper">{mode === "login" ? "Sign in to continue to FreeText" : "Join FreeText and connect with people"}</p>

        <div className="auth-mode-switch">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { clearMessages(); setMode("login"); }}>Login</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { clearMessages(); setMode("signup"); }}>Sign up</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <>
            <div className="auth-input-wrap"><User size={18} /><input className="auth-input" type="text" placeholder="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
            <div className="auth-input-wrap"><AtSign size={18} /><input className="auth-input" type="text" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} /></div>
          </>}
          <div className="auth-input-wrap"><Mail size={18} /><input className="auth-input" type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></div>
          <div className="auth-input-wrap">
            <Lock size={18} />
            <input className="auth-input" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success"><CheckCircle2 size={18} /><span>{message}</span></div>}
          <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}</button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <button className="auth-phone-button" type="button" onClick={() => setMessage("Phone sign-in will be available soon.")}>Continue with phone</button>
        <p className="auth-terms">By continuing, you agree to the FreeText Terms of Service and Privacy Policy.</p>
        <div className="auth-footer">
          {mode === "login" ? <>
            Don't have an account? <button type="button" onClick={() => { clearMessages(); setMode("signup"); }}>Sign up</button>
          </> : <>
            Already have an account? <button type="button" onClick={() => { clearMessages(); setMode("login"); }}>Log in</button>
          </>}
        </div>
      </section>
    </main>
  );
}
