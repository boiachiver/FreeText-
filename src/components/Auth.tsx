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
} from "lucide-react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";
type AuthStep = 1 | 2 | 3;

const PENDING_VERIFICATION_KEY =
  "freetext_pending_verification_email";

const VERIFICATION_REDIRECT =
  "https://freetext-app.vercel.app/?verified=1";

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

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const verifiedRedirect =
        new URLSearchParams(window.location.search).get(
          "verified"
        ) === "1";

      const pendingEmail = localStorage.getItem(
        PENDING_VERIFICATION_KEY
      );

      if (pendingEmail) {
        setEmail(pendingEmail);
      }

      if (verifiedRedirect) {
        if (session?.user?.email_confirmed_at) {
          localStorage.removeItem(
            PENDING_VERIFICATION_KEY
          );

          setMessage(
            "Your email has been verified successfully."
          );
          setStep(3);
        } else {
          setStep(2);
        }

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        return;
      }

      if (session?.user?.email_confirmed_at) {
        setStep(3);
      } else if (pendingEmail) {
        setStep(2);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === "SIGNED_IN" &&
          session?.user?.email_confirmed_at
        ) {
          localStorage.removeItem(
            PENDING_VERIFICATION_KEY
          );

          setMessage(
            "Your email has been verified successfully."
          );
          setStep(3);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((current) =>
        current > 0 ? current - 1 : 0
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendSeconds]);

  const handleLogin = async () => {
    clearMessages();

    if (!email.trim() || !password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (loginError) {
      if (
        loginError.message
          .toLowerCase()
          .includes("email not confirmed")
      ) {
        localStorage.setItem(
          PENDING_VERIFICATION_KEY,
          email.trim().toLowerCase()
        );

        setError(
          "Please verify your email before logging in."
        );
        setStep(2);
        return;
      }

      setError(loginError.message);
      return;
    }

    if (data.session) {
      localStorage.removeItem(
        PENDING_VERIFICATION_KEY
      );

      setMessage("Welcome back to FreeText!");
    }
  };

  const handleSignup = async () => {
    clearMessages();

    if (
      !email.trim() ||
      !password ||
      !fullName.trim() ||
      !username.trim()
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters."
      );
      return;
    }

    const cleanUsername = username
      .trim()
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .toLowerCase();

    if (cleanUsername.length < 3) {
      setError(
        "Username must be at least 3 characters."
      );
      return;
    }

    setLoading(true);

    const { data, error: signupError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: VERIFICATION_REDIRECT,
        },
      });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      localStorage.removeItem(
        PENDING_VERIFICATION_KEY
      );

      setMessage(
        "Account created successfully."
      );
      setStep(3);
    } else {
      localStorage.setItem(
        PENDING_VERIFICATION_KEY,
        email.trim().toLowerCase()
      );

      setMessage(
        "We've sent a FreeText verification email to your inbox."
      );
      setStep(2);
      setResendSeconds(120);
    }
  };

  const resendVerification = async () => {
    clearMessages();

    if (resendSeconds > 0) return;

    const savedEmail = localStorage.getItem(
      PENDING_VERIFICATION_KEY
    );

    const verificationEmail =
      email.trim() || savedEmail || "";

    if (!verificationEmail) {
      setError("Please enter your email address.");
      return;
    }

    setEmail(verificationEmail);

    setLoading(true);

    const { error: resendError } =
      await supabase.auth.resend({
        type: "signup",
        email: verificationEmail,
        options: {
          emailRedirectTo: VERIFICATION_REDIRECT,
        },
      });

    setLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    localStorage.setItem(
      PENDING_VERIFICATION_KEY,
      verificationEmail.toLowerCase()
    );

    setMessage(
      "A new FreeText verification email has been sent."
    );

    setResendSeconds(120);
  };

  const checkVerification = async () => {
    clearMessages();
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    setLoading(false);

    if (!session?.user) {
      setError(
        "Your email has not been verified yet. Please open the FreeText verification email and click the link."
      );
      return;
    }

    if (!session.user.email_confirmed_at) {
      setError(
        "Your email has not been verified yet. Please click the verification link in your email."
      );
      return;
    }

    localStorage.removeItem(
      PENDING_VERIFICATION_KEY
    );

    setMessage(
      "Email verified successfully! Welcome to FreeText."
    );

    setStep(3);
  };

  const completeProfile = async () => {
    clearMessages();

    if (!fullName.trim() || !username.trim()) {
      setError(
        "Please enter your full name and username."
      );
      return;
    }

    const cleanUsername = username
      .trim()
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .toLowerCase();

    if (cleanUsername.length < 3) {
      setError(
        "Username must be at least 3 characters."
      );
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError(
        "Your session has expired. Please sign in again."
      );
      setStep(1);
      return;
    }

    const { data: existingProfile } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();

    if (
      existingProfile &&
      existingProfile.id !== user.id
    ) {
      setLoading(false);
      setError("That username is already taken.");
      return;
    }

    const { error: profileError } =
      await supabase.from("profiles").upsert({
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

    localStorage.removeItem(
      PENDING_VERIFICATION_KEY
    );

    setMessage(
      "Your FreeText profile is ready!"
    );
  };

  const submit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (mode === "login") {
      await handleLogin();
    } else {
      await handleSignup();
    }
  };

  if (step === 2) {
    return (
      <main className="auth-page">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />

        <section className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo">F</div>
            <span>FreeText</span>
          </div>

          <div className="auth-welcome-icon">
            <Mail size={34} />
          </div>

          <h1 className="auth-heading">
            Check your email
          </h1>

          <p className="auth-helper">
            We've sent a verification link to
          </p>

          <strong className="auth-email">
            {email}
          </strong>

          <p className="auth-helper">
            Open your email and tap the FreeText
            verification link. Then come back here and
            tap "I have verified my email".
          </p>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          <button
            className="auth-primary-button"
            type="button"
            onClick={checkVerification}
            disabled={loading}
          >
            {loading
              ? "Checking..."
              : "I have verified my email"}
          </button>

          <button
            className="auth-phone-button"
            type="button"
            onClick={resendVerification}
            disabled={
              loading || resendSeconds > 0
            }
          >
            {resendSeconds > 0
              ? `Resend verification email in ${resendSeconds}s`
              : "Resend verification email"}
          </button>

          <button
            className="auth-phone-button"
            type="button"
            onClick={() => {
              clearMessages();
              setStep(1);
            }}
          >
            <ArrowLeft size={17} />
            Back to sign in
          </button>

          <p className="auth-terms">
            Make sure to check your spam or junk folder
            if you don't see the email.
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
          <div className="auth-brand">
            <div className="auth-logo">F</div>
            <span>FreeText</span>
          </div>

          <div className="auth-welcome-icon">
            <CheckCircle2 size={34} />
          </div>

          <h1 className="auth-heading">
            Complete your profile
          </h1>

          <p className="auth-helper">
            Your email is verified. Let's finish setting
            up your FreeText profile.
          </p>

          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault();
              completeProfile();
            }}
          >
            <div className="auth-input-wrap">
              <User size={18} />
              <input
                className="auth-input"
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
              />
            </div>

            <div className="auth-input-wrap">
              <AtSign size={18} />
              <input
                className="auth-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-success">
                <CheckCircle2 size={18} />
                <span>{message}</span>
              </div>
            )}

            <button
              className="auth-primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Saving profile..."
                : "Continue to FreeText"}
            </button>
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
        <div className="auth-brand">
          <div className="auth-logo">F</div>
          <span>FreeText</span>
        </div>

        <h1 className="auth-heading">
          {mode === "login"
            ? "Welcome back"
            : "Create your account"}
        </h1>

        <p className="auth-helper">
          {mode === "login"
            ? "Sign in to continue to FreeText"
            : "Join FreeText and connect with people"}
        </p>

        <div className="auth-mode-switch">
          <button
            type="button"
            className={
              mode === "login" ? "active" : ""
            }
            onClick={() => {
              clearMessages();
              setMode("login");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={
              mode === "signup" ? "active" : ""
            }
            onClick={() => {
              clearMessages();
              setMode("signup");
            }}
          >
            Sign up
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={submit}
        >
          {mode === "signup" && (
            <>
              <div className="auth-input-wrap">
                <User size={18} />

                <input
                  className="auth-input"
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                />
              </div>

              <div className="auth-input-wrap">
                <AtSign size={18} />

                <input
                  className="auth-input"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                />
              </div>
            </>
          )}

          <div className="auth-input-wrap">
            <Mail size={18} />

            <input
              className="auth-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
            />
          </div>

          <div className="auth-input-wrap">
            <Lock size={18} />

            <input
              className="auth-input"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
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

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Log in"
              : "Create account"}
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
              "Phone sign-in will be available soon."
            )
          }
        >
          Continue with phone
        </button>

        <p className="auth-terms">
          By continuing, you agree to the FreeText
          Terms of Service and Privacy Policy.
        </p>

        <div className="auth-footer">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setMode("signup");
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  clearMessages();
                  setMode("login");
                }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
