import { useEffect, useState } from "react";
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
type AuthStep = 1 | 2 | 3;

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<AuthStep>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const switchMode = (nextMode: AuthMode) => {
    if (loading) return;

    clearMessages();
    setMode(nextMode);
    setStep(1);
    setCode("");
    setResendSeconds(0);
  };

  const startVerification = () => {
    clearMessages();
    setCode("");
    setResendSeconds(120);
    setStep(2);
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
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) {
          const needsVerification =
            loginError.message
              .toLowerCase()
              .includes("email not confirmed");

          if (needsVerification) {
            setCode("");
            setResendSeconds(120);
            setStep(2);
            setMessage(
              "Please verify your email with the 6-digit code we sent you."
            );
            return;
          }

          throw loginError;
        }

        if (!data.session || !data.user) {
          throw new Error(
            "We could not start your session. Please try again."
          );
        }

        const { data: existingProfile, error: profileCheckError } =
          await supabase
            .from("profiles")
            .select("id, username, full_name")
            .eq("id", data.user.id)
            .maybeSingle();

        if (profileCheckError) {
          throw profileCheckError;
        }

        if (!existingProfile) {
          setStep(3);
          setMessage(
            "Welcome back. Complete your FreeText profile to continue."
          );
          return;
        }

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

      if (data.session) {
        setStep(3);
        setMessage(
          "Your account has been created. Complete your profile below."
        );
        return;
      }

      startVerification();
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

  const verifyEmailCode = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (loading) return;

    clearMessages();

    const cleanCode = code.replace(/\D/g, "");

    if (cleanCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: verifyError } =
        await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanCode,
          type: "signup",
        });

      if (verifyError) throw verifyError;

      if (!data.user || !data.session) {
        throw new Error(
          "Verification succeeded, but we could not start your session. Please log in again."
        );
      }

      setStep(3);
      setCode("");
      setMessage(
        "Email verified successfully. Now complete your FreeText profile."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (loading || resendSeconds > 0) return;

    clearMessages();
    setLoading(true);

    try {
      const { error: resendError } =
        await supabase.auth.resend({
          type: "signup",
          email: email.trim(),
        });

      if (resendError) throw resendError;

      setCode("");
      setResendSeconds(120);

      setMessage(
        "A new 6-digit verification code has been sent to your email."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not resend the verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async (
    event: React.FormEvent
  ) => {
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
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const user = session.user;

      const { data: existingUsername, error: usernameCheckError } =
        await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();

      if (usernameCheckError) {
        throw usernameCheckError;
      }

      if (
        existingUsername &&
        existingUsername.id !== user.id
      ) {
        throw new Error(
          "That username is already taken. Please choose another one."
        );
      }

      const { error: profileError } =
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            username: cleanUsername,
            full_name: cleanName,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) throw profileError;

      setMessage(
        "Profile created successfully. Welcome to FreeText!"
      );
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
            <Mail size={30} />
          </div>

          <h1 className="auth-heading">
            Verify your email
          </h1>

          <p className="auth-subheading">
            We sent a 6-digit verification code to{" "}
            <strong>{email}</strong>. You can also use
            the confirmation link in the email.
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

          <form
            className="auth-form"
            onSubmit={verifyEmailCode}
          >
            <label className="auth-field">
              <span>6-digit verification code</span>

              <div className="auth-input-wrap">
                <Mail size={18} />

                <input
                  className="auth-input"
                  value={code}
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </label>

            <button
              className="auth-primary-button"
              type="submit"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2
                    className="auth-spinner"
                    size={19}
                  />
                  Verifying...
                </>
              ) : (
                <>
                  Verify email
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              marginTop: "16px",
            }}
          >
            {resendSeconds > 0 ? (
              <p className="auth-helper">
                Resend code in{" "}
                <strong>
                  {Math.floor(resendSeconds / 60)}:
                  {String(resendSeconds % 60).padStart(
                    2,
                    "0"
                  )}
                </strong>
              </p>
            ) : (
              <button
                type="button"
                className="auth-footer"
                onClick={resendCode}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Didn't receive the code?{" "}
                <strong>Resend code</strong>
              </button>
            )}
          </div>

          <p
            className="auth-helper"
            style={{
              textAlign: "center",
              marginTop: "14px",
            }}
          >
            You can also confirm your account using
            the link inside the email.
          </p>

          <div className="auth-progress">
            <span className="active" />
            <span className="active" />
            <span />
          </div>
        </section>
      </main>
    );
  }

  if (step === 3) {
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

          <h1 className="auth-heading">
            Complete your profile
          </h1>

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

          <form
            className="auth-form"
            onSubmit={completeProfile}
          >
            <label className="auth-field">
              <span>Full name</span>

              <div className="auth-input-wrap">
                <User size={18} />

                <input
                  className="auth-input"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="Your full name"
                  disabled={loading}
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Username</span>

              <div className="auth-input-wrap">
                <span className="username-symbol">
                  @
                </span>

                <input
                  className="auth-input"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
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
                  <Loader2
                    className="auth-spinner"
                    size={19}
                  />
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

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label className="auth-field">
            <span>Email address</span>

            <div className="auth-input-wrap">
              <Mail size={18} />

              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
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
                type={
                  showPassword ? "text" : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
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
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
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
              Use at least 6 characters. Choose
              something only you know.
            </p>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2
                  className="auth-spinner"
                  size={19}
                />
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
            By creating an account, you agree to use
            FreeText respectfully and responsibly.
          </p>
        )}

        <p className="auth-footer">
          {mode === "signup"
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() =>
              switchMode(
                mode === "signup"
                  ? "login"
                  : "signup"
              )
            }
            disabled={loading}
          >
            {mode === "signup"
              ? "Log in"
              : "Create account"}
          </button>
        </p>
      </section>
    </main>
  );
}
