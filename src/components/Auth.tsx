import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, CheckCircle2, Eye, EyeOff, Image as ImageIcon, Inbox, Lock, Mail, RefreshCw, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";
type AuthStep = 1 | 2 | 3;

const PENDING_VERIFICATION_KEY = "freetext_pending_verification_email";
const VERIFICATION_REDIRECT = "https://freetext-app.vercel.app/?verified=1";
const RESEND_COOLDOWN = 120;

const friendlyError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("bucket") && lower.includes("not found")) {
    return "Photo storage is not ready yet. Run supabase/profile_media_bucket_fix.sql in the Supabase SQL Editor, then try your photo again.";
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return "The email service rejected this address. Please check the address and try again.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many email requests. Please wait a little before trying again.";
  }
  if (lower.includes("user already registered")) {
    return "This email already has a FreeText account. Try signing in instead.";
  }
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
  const [resendSeconds, setResendSeconds] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const clearMessages = () => { setError(""); setMessage(""); };

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
    if (initialized.current) return;
    initialized.current = true;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const verifiedRedirect = new URLSearchParams(window.location.search).get("verified") === "1";
      const pendingEmail = localStorage.getItem(PENDING_VERIFICATION_KEY);
      if (pendingEmail) setEmail(pendingEmail);
      if (verifiedRedirect) {
        await checkVerificationStatus();
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      if (session?.user?.email_confirmed_at) setStep(3);
      else if (pendingEmail) setStep(2);
    };
    checkSession();
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
    const poll = window.setInterval(() => void checkVerificationStatus(), 3500);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(poll);
    };
  }, [step]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds((current) => current > 0 ? current - 1 : 0), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const validateCredentials = () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address, for example you@example.com.");
      return false;
    }
    if (!password) {
      setError(mode === "login" ? "Please enter your password." : "Create a password to get started.");
      return false;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    clearMessages();
    if (!validateCredentials()) return;
    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (loginError) {
      if (loginError.message.toLowerCase().includes("email not confirmed")) {
        localStorage.setItem(PENDING_VERIFICATION_KEY, email.trim().toLowerCase());
        setError("Please verify your email before signing in.");
        setStep(2);
        return;
      }
      setError(friendlyError(loginError.message));
      return;
    }
    if (data.session) {
      localStorage.removeItem(PENDING_VERIFICATION_KEY);
      setMessage("Welcome back to FreeText!");
    }
  };

  const handleSignup = async () => {
    clearMessages();
    if (!validateCredentials()) return;
    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: VERIFICATION_REDIRECT },
    });
    setLoading(false);
    if (signupError) {
      setError(friendlyError(signupError.message));
      return;
    }
    if (data.session) {
      localStorage.removeItem(PENDING_VERIFICATION_KEY);
      setStep(3);
    } else {
      localStorage.setItem(PENDING_VERIFICATION_KEY, email.trim().toLowerCase());
      setMessage("We've sent a verification link to your inbox.");
      setStep(2);
      setResendSeconds(RESEND_COOLDOWN);
    }
  };

  const resendVerification = async () => {
    clearMessages();
    if (resendSeconds > 0 || loading) return;
    const savedEmail = localStorage.getItem(PENDING_VERIFICATION_KEY);
    const verificationEmail = (email.trim() || savedEmail || "").toLowerCase();
    if (!verificationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verificationEmail)) {
      setError("Please enter a valid email address before requesting another link.");
      setStep(1);
      return;
    }
    setEmail(verificationEmail);
    setLoading(true);
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email: verificationEmail, options: { emailRedirectTo: VERIFICATION_REDIRECT } });
    setLoading(false);
    if (resendError) {
      setError(friendlyError(resendError.message));
      return;
    }
    localStorage.setItem(PENDING_VERIFICATION_KEY, verificationEmail);
    setMessage("A fresh verification link is on its way. Check your inbox and spam folder.");
    setResendSeconds(RESEND_COOLDOWN);
  };

  const selectImage = (file: File | undefined, type: "avatar" | "cover") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Please choose an image smaller than 8MB."); return; }
    clearMessages();
    const url = URL.createObjectURL(file);
    if (type === "avatar") { setAvatarFile(file); setAvatarPreview(url); }
    else { setCoverFile(file); setCoverPreview(url); }
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
      const existing = await supabase.from("profiles").select("username, full_name, avatar_url, cover_url").eq("id", user.id).maybeSingle();
      const avatarUrl = avatarFile ? await uploadImage(avatarFile, "profiles/avatar") : (existing.data?.avatar_url || "");
      const coverUrl = coverFile ? await uploadImage(coverFile, "profiles/cover") : (existing.data?.cover_url || "");
      const fallbackName = (user.user_metadata?.full_name || user.email?.split("@")[0] || "FreeText User").trim();
      const fallbackUsername = (user.user_metadata?.username || user.email?.split("@")[0] || `user${user.id.slice(0, 8)}`).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 30) || `user${user.id.slice(0, 8)}`;
      const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, username: existing.data?.username || fallbackUsername, full_name: existing.data?.full_name || fallbackName, bio: "", avatar_url: avatarUrl, cover_url: coverUrl });
      if (profileError) throw profileError;
      localStorage.removeItem(PENDING_VERIFICATION_KEY);
      setMessage("Your profile is ready. Welcome to FreeText!");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      const message = e instanceof Error ? e.message : "We couldn't finish your profile. Please try again.";
      setError(friendlyError(message));
    } finally { setLoading(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "login") await handleLogin();
    else await handleSignup();
  };

  if (step === 2) return (
    <main className="auth-page"><style>{verificationStyles}</style><section className="auth-card verification-card">
      <div className="verification-visual"><div className="verify-scene"><div className="verify-mail"><Mail size={30}/></div><div className="verify-arrow"/><div className="verify-inbox"><Inbox size={31}/><div className="verify-check"><Check size={16}/></div></div></div></div>
      <div className="verification-badge"><ShieldCheck size={14}/> Secure email verification</div><h1>Check your email</h1>
      <p className="auth-subtitle verification-lead">Tap the FreeText verification link. When you return, we'll detect it automatically.</p>
      <div className="verification-email-box"><Mail size={17}/><strong>{email}</strong></div><div className="auto-check"><span className="live-dot"/> Waiting for verification automatically</div>
      <div className="verification-steps"><div className="verification-step"><span>1</span><p>Open the email</p></div><div className="verification-step"><span>2</span><p>Tap verify</p></div><div className="verification-step"><span>3</span><p>Return to FreeText</p></div></div>
      {message && <div className="auth-message">{message}</div>}{error && <div className="auth-error">{error}</div>}
      <div className="verification-resend-box"><div className="verification-resend-copy"><strong>Didn't receive it?</strong><span>Check spam or junk, then request another link.</span></div><button className="verification-resend-button" type="button" onClick={resendVerification} disabled={resendSeconds > 0 || loading}><RefreshCw size={14}/>{resendSeconds > 0 ? `${resendSeconds}s` : "Resend"}</button></div>
      <button className="auth-back-button" type="button" onClick={() => { clearMessages(); localStorage.removeItem(PENDING_VERIFICATION_KEY); setStep(1); }}><ArrowLeft size={15}/> Back to sign in</button>
    </section></main>
  );

  if (step === 3) return (
    <main className="auth-page"><style>{profileStyles}</style><section className="auth-card profile-setup-card">
      <div className="profile-setup-top"><div className="profile-sparkle"><Sparkles size={20}/></div><span>Almost there</span></div><h1>Make your profile yours</h1>
      <p className="auth-subtitle">Add a profile picture and cover photo. You can change them anytime.</p>
      <div className="profile-preview" style={{ backgroundImage: coverPreview ? `url(${coverPreview})` : undefined }}>{!coverPreview && <div className="cover-placeholder"><ImageIcon size={28}/><span>Add cover photo</span></div>}{coverPreview && <button className="remove-cover" type="button" onClick={() => { setCoverFile(null); setCoverPreview(""); }} aria-label="Remove cover"><X size={15}/></button>}<div className="avatar-wrap"><div className="avatar-preview">{avatarPreview ? <img src={avatarPreview} alt="Profile preview"/> : <UserRound size={42}/>}</div><button className="avatar-edit" type="button" onClick={() => avatarInput.current?.click()} aria-label="Add profile picture"><Camera size={16}/></button></div><div className="profile-name-preview">Your profile</div></div>
      <input ref={avatarInput} className="hidden-input" type="file" accept="image/*" onChange={(e) => selectImage(e.target.files?.[0], "avatar")}/><input ref={coverInput} className="hidden-input" type="file" accept="image/*" onChange={(e) => selectImage(e.target.files?.[0], "cover")}/>
      <div className="photo-options"><button type="button" className="photo-option" onClick={() => avatarInput.current?.click()}><span><Camera size={19}/></span><strong>Profile picture</strong><small>{avatarFile ? "Photo selected" : "Add your face or favorite photo"}</small>{avatarFile && <CheckCircle2 size={17} className="selected-check"/>}</button><button type="button" className="photo-option" onClick={() => coverInput.current?.click()}><span><ImageIcon size={19}/></span><strong>Cover photo</strong><small>{coverFile ? "Photo selected" : "Show your style"}</small>{coverFile && <CheckCircle2 size={17} className="selected-check"/>}</button></div>
      {message && <div className="auth-message">{message}</div>}{error && <div className="auth-error">{error}</div>}
      <button className="auth-primary-button profile-finish" type="button" onClick={completeProfile} disabled={loading}>{loading ? <><RefreshCw size={17} className="spin"/> Setting up your profile...</> : <><Sparkles size={17}/> Finish profile</>}</button>
      <p className="profile-note"><ShieldCheck size={14}/> Your photos are private to your account until you choose to share them.</p>
    </section></main>
  );

  return (
    <main className="auth-page"><style>{baseStyles}</style><section className="auth-card"><div className="brand-mark"><span>F</span></div><div className="brand-label">FreeText</div><h1>{mode === "login" ? "Welcome back" : "Join FreeText"}</h1><p className="auth-subtitle">{mode === "login" ? "Sign in to continue to your social world." : "Create your account in seconds. We'll help you finish your profile next."}</p>
      {message && <div className="auth-message">{message}</div>}{error && <div className="auth-error">{error}</div>}<form onSubmit={submit}><label>Email address</label><div className="input-wrap"><Mail size={17}/><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></div><label>Password</label><div className="input-wrap"><Lock size={17}/><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"}/><button type="button" className="icon-button" onClick={() => setShowPassword((v) => !v)} aria-label="Show password">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><button className="auth-primary-button" type="submit" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button></form><div className="auth-divider"><span>or</span></div><button className="mode-switch" type="button" onClick={() => { clearMessages(); setMode(mode === "login" ? "signup" : "login"); }}>{mode === "login" ? "New to FreeText? Create an account" : "Already have an account? Sign in"}</button>
    </section></main>
  );
}

const baseStyles = `.auth-page{min-height:100vh;display:grid;place-items:center;padding:22px 16px;background:radial-gradient(circle at 15% 10%,#e8f0ff 0,transparent 30%),linear-gradient(135deg,#f7f9fc,#eef3f9);font-family:Inter,system-ui,sans-serif}.auth-card{width:100%;max-width:440px;background:rgba(255,255,255,.96);border:1px solid #e7ebf2;border-radius:26px;padding:30px;box-shadow:0 28px 80px rgba(15,23,42,.13)}.brand-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(135deg,#2563eb,#4f46e5);display:grid;place-items:center;color:#fff;font-size:24px;font-weight:900;margin-bottom:9px;box-shadow:0 10px 24px rgba(37,99,235,.25)}.brand-mark span{transform:translateY(-1px)}.brand-label{font-size:13px;font-weight:800;color:#2563eb;margin-bottom:20px}.auth-card h1{font-size:28px;line-height:1.15;margin:0 0 8px;color:#101828;letter-spacing:-.6px}.auth-subtitle{margin:0 0 22px;color:#667085;font-size:14px;line-height:1.55}.auth-card form label{display:block;margin:15px 0 7px;font-size:12px;font-weight:800;color:#344054}.input-wrap{height:50px;border:1px solid #dfe4ec;border-radius:14px;background:#fff;display:flex;align-items:center;gap:10px;padding:0 13px;color:#98a2b3;transition:.2s}.input-wrap:focus-within{border-color:#7da5f7;box-shadow:0 0 0 4px rgba(37,99,235,.08)}.input-wrap input{border:0;outline:0;min-width:0;flex:1;font:inherit;font-size:14px;color:#101828;background:transparent}.icon-button{border:0;background:transparent;color:#98a2b3;padding:5px;display:grid;place-items:center}.auth-primary-button{width:100%;min-height:50px;margin-top:20px;border:0;border-radius:14px;background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;font-size:14px;font-weight:850;display:flex;justify-content:center;align-items:center;gap:8px;box-shadow:0 12px 25px rgba(37,99,235,.22)}.auth-primary-button:disabled{opacity:.65}.auth-divider{display:flex;align-items:center;gap:12px;color:#98a2b3;font-size:12px;margin:22px 0}.auth-divider:before,.auth-divider:after{content:"";height:1px;background:#e6e9ef;flex:1}.mode-switch,.auth-back-button{border:0;background:transparent;color:#2563eb;font-weight:800;font-size:13px;width:100%;padding:8px}.auth-message{margin:14px 0;padding:11px 13px;border-radius:12px;background:#eef9f1;color:#147a37;font-size:12px;line-height:1.45}.auth-error{margin:14px 0;padding:11px 13px;border-radius:12px;background:#fff1f2;color:#be123c;font-size:12px;line-height:1.45}.hidden-input{display:none}@media(max-width:480px){.auth-page{padding:12px}.auth-card{padding:23px 18px;border-radius:22px}.auth-card h1{font-size:25px}}html.dark .auth-page{background:radial-gradient(circle at 15% 10%,#14284a 0,transparent 32%),#0b111a}html.dark .auth-card{background:#121923;border-color:#263242;box-shadow:0 28px 80px rgba(0,0,0,.4)}html.dark .auth-card h1{color:#f8fafc}html.dark .auth-subtitle{color:#98a2b3}html.dark .input-wrap{background:#0e151f;border-color:#2b3747}html.dark .input-wrap input{color:#f8fafc}html.dark .auth-divider:before,html.dark .auth-divider:after{background:#2b3747}`;

const verificationStyles = `${baseStyles}.verification-card{max-width:520px!important}.verification-visual{height:150px;margin:-4px -4px 22px;border-radius:22px;background:linear-gradient(135deg,#eef5ff,#f7f9ff);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}.verification-visual:before,.verification-visual:after{content:"";position:absolute;border-radius:999px;background:rgba(37,99,235,.08);animation:verifyPulse 3s ease-in-out infinite}.verification-visual:before{width:180px;height:180px}.verification-visual:after{width:250px;height:250px;animation-delay:1s}.verify-scene{position:relative;z-index:2;width:220px;height:110px}.verify-mail{position:absolute;left:35px;top:28px;width:82px;height:60px;border-radius:14px;background:#fff;border:1px solid #dce7f8;box-shadow:0 14px 28px rgba(37,99,235,.16);display:grid;place-items:center;color:#2563eb;animation:mailFloat 2.8s ease-in-out infinite}.verify-arrow{position:absolute;left:115px;top:50px;width:55px;height:2px;background:#8db0f5;animation:arrowGlow 1.8s ease-in-out infinite}.verify-arrow:after{content:"";position:absolute;right:0;top:-4px;width:9px;height:9px;border-top:2px solid #2563eb;border-right:2px solid #2563eb;transform:rotate(45deg)}.verify-inbox{position:absolute;right:12px;top:23px;width:72px;height:70px;border-radius:16px;background:#eaf1ff;border:1px solid #cfe0ff;display:grid;place-items:center;color:#2563eb;animation:inboxGlow 2.8s ease-in-out infinite}.verify-check{position:absolute;right:0;bottom:8px;width:30px;height:30px;border-radius:50%;background:#22c55e;color:#fff;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 6px 15px rgba(34,197,94,.28);animation:checkPop 2.8s ease-in-out infinite}@keyframes mailFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-8px) rotate(2deg)}}@keyframes inboxGlow{0%,100%{transform:scale(1)}50%{transform:scale(1.05);box-shadow:0 0 28px rgba(37,99,235,.16)}}@keyframes arrowGlow{0%,100%{opacity:.45}50%{opacity:1;box-shadow:0 0 12px rgba(37,99,235,.4)}}@keyframes checkPop{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}@keyframes verifyPulse{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.06);opacity:1}}.verification-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#edf4ff;color:#2563eb;font-size:10px;font-weight:850;margin-bottom:11px}.verification-lead{max-width:440px}.verification-email-box{display:flex;align-items:center;gap:10px;border:1px solid #dce5f2;background:#f8fbff;border-radius:14px;padding:13px;color:#344054;font-size:13px;overflow:hidden}.verification-email-box strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.auto-check{display:flex;align-items:center;gap:8px;color:#667085;font-size:11px;margin:12px 2px 18px}.live-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 5px rgba(34,197,94,.1);animation:dotPulse 1.6s infinite}@keyframes dotPulse{0%,100%{opacity:1}50%{opacity:.45}}.verification-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:17px}.verification-step{padding:11px 9px;border:1px solid #e4eaf3;border-radius:14px;background:#fbfdff;text-align:center}.verification-step span{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;margin:0 auto 6px;background:#eaf1ff;color:#2563eb;font-size:11px;font-weight:900}.verification-step p{margin:0;color:#667085;font-size:10px;font-weight:700}.verification-resend-box{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e4e9f1;background:#fafbfc;border-radius:15px;padding:12px}.verification-resend-copy{display:flex;flex-direction:column;gap:3px}.verification-resend-copy strong{font-size:12px;color:#344054}.verification-resend-copy span{font-size:10px;color:#7b8799;line-height:1.35}.verification-resend-button{display:flex;align-items:center;gap:6px;white-space:nowrap;border:1px solid #cbd9ef;background:#fff;color:#2563eb;border-radius:11px;padding:9px 11px;font-size:11px;font-weight:850}.verification-resend-button:disabled{opacity:.55}.auth-back-button{margin-top:12px;display:flex;align-items:center;justify-content:center;gap:6px}.auth-back-button:hover{text-decoration:underline}@media(max-width:480px){.verification-visual{height:130px}.verification-steps{gap:6px}.verification-step{padding:9px 5px}.verification-resend-box{align-items:flex-start}.verification-resend-button{margin-top:1px}}html.dark .verification-visual{background:linear-gradient(135deg,#101d34,#0d1728)}html.dark .verification-email-box,html.dark .verification-resend-box,html.dark .verification-step{background:#0f1825;border-color:#27364b}html.dark .verification-email-box,html.dark .verification-resend-copy strong{color:#e6eefc}html.dark .verification-step p,html.dark .auto-check,.html.dark .verification-resend-copy span{color:#8e9bb1}html.dark .verification-resend-button{background:#111d2d;border-color:#2c4364;color:#77a8ff}`;

const profileStyles = `${baseStyles}.profile-setup-card{max-width:560px!important}.profile-setup-top{display:flex;align-items:center;gap:8px;color:#667085;font-size:11px;font-weight:850;margin-bottom:12px}.profile-sparkle{width:38px;height:38px;border-radius:12px;background:#edf4ff;color:#2563eb;display:grid;place-items:center}.profile-preview{position:relative;height:220px;border-radius:22px;overflow:hidden;background:#eef2f7 center/cover no-repeat;margin-bottom:15px;border:1px solid #e1e7ef}.profile-preview:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(15,23,42,.62) 100%);pointer-events:none}.cover-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;color:#98a2b3}.avatar-wrap{position:absolute;left:20px;bottom:32px;z-index:2}.avatar-preview{width:84px;height:84px;border-radius:24px;background:#fff;border:4px solid #fff;display:grid;place-items:center;overflow:hidden;color:#98a2b3;box-shadow:0 10px 25px rgba(15,23,42,.22)}.avatar-preview img{width:100%;height:100%;object-fit:cover}.avatar-edit{position:absolute;right:-6px;bottom:-5px;width:32px;height:32px;border-radius:11px;border:3px solid #fff;background:#2563eb;color:#fff;display:grid;place-items:center}.profile-name-preview{position:absolute;left:118px;bottom:46px;z-index:2;color:#fff;font-size:15px;font-weight:850}.remove-cover{position:absolute;right:12px;top:12px;z-index:3;width:34px;height:34px;border:0;border-radius:11px;background:rgba(15,23,42,.55);color:#fff;display:grid;place-items:center}.photo-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}.photo-option{position:relative;text-align:left;border:1px solid #e1e7ef;border-radius:15px;background:#fff;padding:12px}.photo-option>span{width:32px;height:32px;border-radius:10px;background:#edf4ff;color:#2563eb;display:grid;place-items:center;margin-bottom:7px}.photo-option strong,.photo-option small{display:block}.photo-option strong{font-size:12px;color:#344054}.photo-option small{font-size:10px;color:#98a2b3;margin-top:3px;line-height:1.35}.selected-check{position:absolute;right:11px;top:11px;color:#22c55e}.profile-finish{margin-top:15px}.profile-note{display:flex;align-items:center;gap:6px;justify-content:center;color:#98a2b3;font-size:10px;margin:12px 0 0}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}html.dark .profile-sparkle{background:#152747;color:#77a8ff}html.dark .profile-preview{border-color:#29374a;background:#182230}.html.dark .photo-option{background:#101923;border-color:#2b394b}.html.dark .photo-option strong{color:#e6eefc}.html.dark .photo-option small{color:#8e9bb1}`;
