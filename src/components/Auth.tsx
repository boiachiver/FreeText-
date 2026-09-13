import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  User,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const switchMode = (nextMode: AuthMode) => {
    if (loading) return;

    clearMessages();
    setMode(nextMode);
    setStep(1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading) return;

    clearMessages();

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) throw loginError;

        setMessage("Welcome back to FreeText.");
        return;
      }

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

      if (signupError) throw signupError;

      if (!data.user) {
        throw new Error("We could not create your account.");
      }

      setStep(2);
      setMessage(
        "Your account has been created. Complete your profile below."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (loading) return;

    clearMessages();

    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanName || !cleanUsername) {
      setError("Please enter your full name and username.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError(
        "Username must be 3–20 characters using letters, numbers, or underscores."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: cleanUsername,
          full_name: cleanName,
        });

      if (profileError) throw profileError;

      setMessage("Profile created successfully. Welcome to FreeText!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not complete your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <main className="auth-page">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />

        <section className="auth-card auth-profile-card">
          <div className="auth-brand">
            <div className="auth-logo">F</div>
            <span>FreeText</span>
          </div>

          <div className="auth-welcome-icon">
            <CheckCircle2 size={30} />
          </div>

          <h1 className="auth-heading">Complete your profile</h1>

          <p className="auth-subheading">
            One last step and your FreeText account is ready.
          </p>

          {error && (
            <div className="auth-message auth-error">
              {error}
            </div>
          )}

          {message && !error && (
            <div className="auth-message auth-success">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          <form className="auth-form" onSubmit={completeProfile}>
            <label className="auth-field">
              <span>Full name</span>
              <div className="auth-input-wrap">
                <User size={18} />
                <input
                  className="auth-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  disabled={loading}
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Username</span>
              <div className="auth-input-wrap">
                <span className="username-symbol">@</span>
                <input
                  className="auth-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourusername"
                  disabled={loading}
                />
              </div>
            </label>

            <button
              className="auth-primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="auth-spinner" size={19} />
                  Creating profile...
                </>
              ) : (
                <>
                  Finish setup
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="auth-progress">
            <span className="active" />
            <span className="active" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">F</div>
          <span>FreeText</span>
        </div>

        <h1 className="auth-heading">
          {mode === "signup"
            ? "Create your account"
            : "Welcome back"}
        </h1>

        <p className="auth-subheading">
          {mode === "signup"
            ? "Connect, share and express yourself freely."
            : "Sign in and continue your FreeText journey."}
        </p>

        <div className="auth-mode-switch">
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => switchMode("signup")}
            type="button"
            disabled={loading}
          >
            Create account
          </button>

          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => switchMode("login")}
            type="button"
            disabled={loading}
          >
            Log in
          </button>
        </div>

        {error && (
          <div className="auth-message auth-error">
            {error}
          </div>
        )}

        {message && !error && (
          <div className="auth-message auth-success">
            <CheckCircle2 size={17} />
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email address</span>

            <div className="auth-input-wrap">
              <Mail size={18} />

              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>

            <div className="auth-input-wrap">
              <LockKeyhole size={18} />

              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                disabled={loading}
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          {mode === "signup" && (
            <p className="auth-helper">
              Use at least 6 characters. Choose something only you know.
            </p>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="auth-spinner" size={19} />
                {mode === "signup"
                  ? "Creating account..."
                  : "Signing in..."}
              </>
            ) : (
              <>
                {mode === "signup"
                  ? "Create account"
                  : "Log in"}
                <ArrowRight size={19} />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          className="auth-phone-button"
          type="button"
          onClick={() =>
            setMessage(
              "Phone signup with SMS verification is coming soon."
            )
          }
          disabled={loading}
        >
          <MessageCircle size={19} />
          Continue with phone
        </button>

        {mode === "signup" && (
          <p className="auth-terms">
            By creating an account, you agree to use FreeText
            respectfully and responsibly.
          </p>
        )}

        <p className="auth-footer">
          {mode === "signup"
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() =>
              switchMode(mode === "signup" ? "login" : "signup")
            }
            disabled={loading}
          >
            {mode === "signup" ? "Log in" : "Create account"}
          </button>
        </p>
      </section>
    </main>
  );
}
