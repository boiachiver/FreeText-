import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Eye, EyeOff, Image as ImageIcon, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";
type AuthStep = 1 | 2 | 3;

const PENDING_VERIFICATION_KEY = "freetext_pending_verification_email";
const VERIFICATION_REDIRECT = "https://freetext-app.vercel.app/?verified=1";

const cleanEmail = (value: string) => value.trim().toLowerCase();
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const friendlyError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many") || lower.includes("email rate")) {
    return "The email service is temporarily rate-limited. Your account form is ready—please try the request again shortly.";
  }
  if (lower.includes("user already registered")) return "This email already has a FreeText account. Sign in instead.";
  if (lower.includes("email") && lower.includes("invalid")) return "Please check the email address and try again.";
  if (lower.includes("bucket") && lower.includes("not found")) return "Photo storage is not ready yet. Please try again later.";
  return message;
};

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const clearMessages = () => { setError(""); setMessage(""); };

  const moveToVerification = (verificationEmail: string, text = "We've sent a verification link to your inbox.") => {
    localStorage.setItem(PENDING_VERIFICATION_KEY, verificationEmail);
    setEmail(verificationEmail);
    setMessage(text);
    setError("");
    setStep(2);
  };

  const moveToProfile = () => {
    localStorage.removeItem(PENDING_VERIFICATION_KEY);
    setMessage("Email verified! Now make your FreeText profile yours.");
    setStep(3);
  };

  const checkVerificationStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email_confirmed_at) moveToProfile();
  };

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_VERIFICATION_KEY);
    if (pending) {
      setEmail(pending);
      setStep(2);
    }
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const verified = new URLSearchParams(window.location.search).get("verified") === "1";
      if (verified) {
        await checkVerificationStatus();
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (session?.user?.email_confirmed_at) {
        setStep(3);
      }
    };
    void checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event) && session?.user?.email_confirmed_at) moveToProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    const onFocus = () => void checkVerificationStatus();
    const onVisibility = () => { if (document.visibilityState === "visible") void checkVerificationStatus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const poll = window.setInterval(() => void checkVerificationStatus(), 5000);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisibility); window.clearInterval(poll); };
  }, [step]);

  const validate = () => {
    const value = cleanEmail(email);
    if (!validEmail(value)) { setError("Please enter a valid email address."); return false; }
    if (!password) { setError(mode === "login" ? "Please enter your password." : "Create a password to get started."); return false; }
    if (mode === "signup" && password.length < 6) { setError("Your password must be at least 6 characters."); return false; }
    return true;
  };

  const handleLogin = async () => {
    clearMessages();
    if (!validate() || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail(email), password });
      if (loginError) {
        if (loginError.message.toLowerCase().includes("email not confirmed")) {
          localStorage.setItem(PENDING_VERIFICATION_KEY, cleanEmail(email));
          setStep(2);
          setError("Please verify your email before signing in.");
        } else setError(friendlyError(loginError.message));
        return;
      }
      if (data.session) { localStorage.removeItem(PENDING_VERIFICATION_KEY); setMessage("Welcome back to FreeText!"); }
    } finally { setLoading(false); submitting.current = false; }
  };

  const handleSignup = async () => {
    clearMessages();
    const verificationEmail = cleanEmail(email);
    if (!validate() || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: verificationEmail,
        password,
        options: { emailRedirectTo: VERIFICATION_REDIRECT },
      });
      if (signupError) {
        setError(friendlyError(signupError.message));
        return;
      }
      if (data.session) {
        localStorage.removeItem(PENDING_VERIFICATION_KEY);
        setStep(3);
      } else {
        moveToVerification(verificationEmail);
      }
    } finally { setLoading(false); submitting.current = false; }
  };

  const resendVerification = async () => {
    clearMessages();
    if (loading) return;
    const verificationEmail = cleanEmail(email || localStorage.getItem(PENDING_VERIFICATION_KEY) || "");
    if (!validEmail(verificationEmail)) { setError("Please enter a valid email address."); setStep(1); return; }
    setLoading(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: verificationEmail, options: { emailRedirectTo: VERIFICATION_REDIRECT } });
      if (resendError) { setError(friendlyError(resendError.message)); return; }
      moveToVerification(verificationEmail, "A fresh verification link is on its way. Check your inbox and spam folder.");
    } finally { setLoading(false); }
  };

  const selectImage = (file: File | undefined, type: "avatar" | "cover") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Please choose an image smaller than 8MB."); return; }
    clearMessages();
    const url = URL.createObjectURL(file);
    if (type === "avatar") { setAvatarFile(file); setAvatarPreview(url); } else { setCoverFile(file); setCoverPreview(url); }
  };

  const uploadImage = async (file: File, folder: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Your session has expired. Please sign in again.");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${user.id}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

  const completeProfile = async () => {
    clearMessages();
    if (!avatarFile && !coverFile) { setError("Add at least a profile picture or cover photo to continue."); return; }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Please sign in again.");
      const existing = await supabase.from("profiles").select("username,full_name,avatar_url,cover_url").eq("id", user.id).maybeSingle();
      const avatarUrl = avatarFile ? await uploadImage(avatarFile, "profiles/avatar") : (existing.data?.avatar_url || "");
      const coverUrl = coverFile ? await uploadImage(coverFile, "profiles/cover") : (existing.data?.cover_url || "");
      const fallbackName = (user.user_metadata?.full_name || user.email?.split("@")[0] || "FreeText User").trim();
      const fallbackUsername = (user.user_metadata?.username || user.email?.split("@")[0] || `user${user.id.slice(0, 8)}`).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 30) || `user${user.id.slice(0, 8)}`;
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, username: existing.data?.username || fallbackUsername, full_name: existing.data?.full_name || fallbackName, bio: "", avatar_url: avatarUrl, cover_url: coverUrl });
      if (profileError) throw profileError;
      localStorage.removeItem(PENDING_VERIFICATION_KEY);
      setMessage("Your profile is ready. Welcome to FreeText!");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (e) { setError(friendlyError(e instanceof Error ? e.message : "We couldn't finish your profile.")); }
    finally { setLoading(false); }
  };

  if (step === 2) return <main className="auth-page"><section className="auth-card"><div className="brand-mark">F</div><div className="brand-label">FreeText</div><h1>Check your email</h1><p className="auth-subtitle">Tap the FreeText verification link. We'll detect verification automatically.</p><div className="verification-email"><Mail size={17}/><strong>{email}</strong></div>{message && <div className="auth-message">{message}</div>}{error && <div className="auth-error">{error}</div>}<div className="verify-status"><ShieldCheck size={16}/> Waiting for verification</div><button className="auth-primary-button" type="button" onClick={resendVerification} disabled={loading}>{loading ? "Sending..." : "Resend verification"}</button><button className="mode-switch" type="button" onClick={() => { clearMessages(); setStep(1); setMode("login"); }}>Back to sign in</button></section></main>;

  if (step === 3) return <main className="auth-page"><section className="auth-card profile-card"><div className="brand-mark">F</div><div className="brand-label">FreeText</div><h1>Make your profile yours</h1><p className="auth-subtitle">Add a profile picture or cover photo to finish your account.</p><div className="profile-preview" style={{ backgroundImage: coverPreview ? `url(${coverPreview})` : undefined }}><div className="avatar-preview">{avatarPreview ? <img src={avatarPreview} alt="Profile preview"/> : <UserRound size={38}/>}</div></div><input ref={avatarInput} className="hidden-input" type="file" accept="image/*" onChange={e => selectImage(e.target.files?.[0], "avatar")}/><input ref={coverInput} className="hidden-input" type="file" accept="image/*" onChange={e => selectImage(e.target.files?.[0], "cover")}/><div className="photo-grid"><button type="button" onClick={() => avatarInput.current?.click()}><Camera size={18}/><strong>Profile picture</strong><small>{avatarFile ? "Selected" : "Add photo"}</small>{avatarFile && <CheckCircle2 size={16}/>}</button><button type="button" onClick={() => coverInput.current?.click()}><ImageIcon size={18}/><strong>Cover photo</strong><small>{coverFile ? "Selected" : "Add cover"}</small>{coverFile && <CheckCircle2 size={16}/>}</button></div>{message && <div className="auth-message">{message}</div>}{error && <div className="auth-error">{error}</div>}<button className="auth-primary-button" type="button" onClick={completeProfile} disabled={loading}>{loading ? "Setting up your profile..." : "Finish profile"}</button></section></main>;

  return <main className="auth-page"><section className="auth-card"><div className="brand-mark">F</div><div className="brand-label">FreeText</div><div className="auth-pill">{mode === "login" ? "Welcome back" : "New account"}</div><h1>{mode === "login" ? "Sign in to FreeText" : "Create your FreeText account"}</h1><p className="auth-subtitle">{mode === "login" ? "Sign in to continue to your social world." : "Join your social world with messaging, posts, stories and calls."}</p>{message && <div className="auth-message">{message}</div>}{error && <div className="auth-error">{error}</div>}<form onSubmit={e => { e.preventDefault(); if (mode === "login") void handleLogin(); else void handleSignup(); }}><label>Email address</label><div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div><label>Password</label><div className="input-wrap"><Lock size={17}/><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"}/><button type="button" className="icon-button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><button className="auth-primary-button" type="submit" disabled={loading}>{loading ? "Creating your account..." : mode === "login" ? "Sign in" : "Create account"}</button></form><div className="auth-divider"><span>or</span></div><button className="mode-switch" type="button" onClick={() => { clearMessages(); setMode(mode === "login" ? "signup" : "login"); }}>{mode === "login" ? "New to FreeText? Create an account" : "Already have an account? Sign in"}</button><p className="auth-footnote">By creating an account, you agree to use FreeText responsibly.</p></section></main>;
}

const styles = `.auth-page{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px 14px;background:radial-gradient(circle at 10% 5%,#dbe7ff,transparent 32%),radial-gradient(circle at 90% 90%,#efe4ff,transparent 30%),#f5f7fb;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.auth-card{width:100%;max-width:460px;background:rgba(255,255,255,.96);border:1px solid #e5eaf1;border-radius:26px;padding:30px 26px;box-shadow:0 25px 80px rgba(15,23,42,.14);backdrop-filter:blur(14px)}.brand-mark{width:52px;height:52px;border-radius:17px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:grid;place-items:center;color:#fff;font-size:25px;font-weight:900;box-shadow:0 10px 25px rgba(79,70,229,.24);margin-bottom:11px}.brand-label{font-size:13px;font-weight:900;letter-spacing:.02em;color:#4f46e5;margin-bottom:17px}.auth-pill{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eef2ff;color:#4f46e5;font-size:11px;font-weight:850;margin-bottom:10px}.auth-card h1{font-size:28px;line-height:1.12;margin:0 0 9px;color:#101828;letter-spacing:-.02em}.auth-subtitle{color:#667085;font-size:14px;line-height:1.55;margin:0 0 21px}.auth-card form label{display:block;font-size:12px;font-weight:850;color:#344054;margin:14px 0 7px}.input-wrap{height:52px;border:1px solid #dfe4ec;border-radius:14px;display:flex;align-items:center;gap:9px;padding:0 13px;color:#98a2b3;background:#fff;transition:.18s}.input-wrap:focus-within{border-color:#6d8fe8;box-shadow:0 0 0 4px rgba(37,99,235,.09)}.input-wrap input{border:0;outline:0;flex:1;min-width:0;font:inherit;color:#101828;background:transparent}.icon-button{border:0;background:transparent;color:#98a2b3;display:grid;place-items:center;padding:6px;border-radius:8px}.icon-button:hover{background:#f2f4f7;color:#475467}.auth-primary-button{width:100%;min-height:52px;margin-top:19px;border:0;border-radius:14px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;font-weight:850;letter-spacing:.01em;box-shadow:0 10px 22px rgba(37,99,235,.18);cursor:pointer;transition:transform .16s,box-shadow .16s}.auth-primary-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 13px 26px rgba(37,99,235,.24)}.auth-primary-button:disabled{opacity:.58;cursor:not-allowed;box-shadow:none}.auth-divider{display:flex;align-items:center;gap:10px;margin:21px 0 14px;color:#98a2b3;font-size:12px}.auth-divider:before,.auth-divider:after{content:"";height:1px;background:#e6e9ef;flex:1}.mode-switch{width:100%;border:0;background:transparent;color:#2563eb;font-weight:800;padding:9px;border-radius:10px;cursor:pointer}.mode-switch:hover{background:#f4f7ff}.auth-footnote{text-align:center;color:#98a2b3;font-size:10px;line-height:1.5;margin:12px 0 0}.auth-error,.auth-message{margin:14px 0;padding:12px 13px;border-radius:13px;font-size:12px;line-height:1.5}.auth-error{background:#fff1f2;color:#be123c;border:1px solid #ffe0e5}.auth-message{background:#eef9f1;color:#147a37;border:1px solid #d8f0df}.verification-email{display:flex;gap:9px;align-items:center;border:1px solid #dce5f2;background:#f8fbff;padding:14px;border-radius:14px;overflow:hidden}.verification-email strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.verify-status{display:flex;gap:7px;align-items:center;color:#667085;font-size:12px;margin:15px 0}.profile-preview{height:180px;border-radius:18px;background:#eef2f7 center/cover;position:relative;margin-bottom:14px;overflow:hidden}.avatar-preview{position:absolute;left:18px;bottom:18px;width:82px;height:82px;border-radius:24px;background:#fff;border:4px solid #fff;display:grid;place-items:center;overflow:hidden;color:#98a2b3;box-shadow:0 7px 20px rgba(15,23,42,.15)}.avatar-preview img{width:100%;height:100%;object-fit:cover}.hidden-input{display:none}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.photo-grid button{position:relative;text-align:left;border:1px solid #e1e7ef;border-radius:14px;background:#fff;padding:13px;display:flex;flex-direction:column;gap:5px;color:#2563eb;cursor:pointer}.photo-grid strong{color:#344054;font-size:12px}.photo-grid small{color:#98a2b3;font-size:10px}.photo-grid svg:last-child{position:absolute;right:10px;top:10px;color:#22c55e}html.dark .auth-page{background:radial-gradient(circle at 10% 5%,#16213a,transparent 32%),radial-gradient(circle at 90% 90%,#20163a,transparent 30%),#080d14}html.dark .auth-card{background:rgba(18,25,35,.97);border-color:#263242;box-shadow:0 25px 80px rgba(0,0,0,.34)}html.dark .auth-card h1{color:#f8fafc}html.dark .auth-subtitle{color:#98a2b3}html.dark .auth-pill{background:#1e2345;color:#a5b4fc}html.dark .auth-card form label{color:#d0d5dd}html.dark .input-wrap{background:#0e151f;border-color:#2b3747}html.dark .input-wrap input{color:#f8fafc}html.dark .input-wrap:focus-within{border-color:#667eea}html.dark .photo-grid button{background:#101923;border-color:#2b394b}html.dark .photo-grid strong{color:#e6eefc}html.dark .mode-switch:hover{background:#171f2b}html.dark .verification-email{background:#0e1723;border-color:#2a3a4e}html.dark .verify-status{color:#98a2b3}`;

if (typeof document !== "undefined" && !document.getElementById("freetext-auth-styles")) {
  const style = document.createElement("style");
  style.id = "freetext-auth-styles";
  style.textContent = styles;
  document.head.appendChild(style);
}