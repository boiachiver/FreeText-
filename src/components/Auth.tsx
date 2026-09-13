import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthMode = "login" | "signup";
type AuthStep = 1 | 2 | 3;

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const confirmed =
          session.user.email_confirmed_at;

        if (confirmed) {
          setStep(3);
        }
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
          setMessage(
            "Email verified successfully! Welcome to FreeText."
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

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const handleLogin = async () => {
    clearMessages();

    if (!email || !password) {
      setError("Please enter your email and password.");
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
      setMessage("Welcome back to FreeText!");
    }
  };

  const handleSignup = async () => {
    clearMessages();

    if (!email || !password || !fullName || !username) {
      setError("Please complete all fields.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);

    const { data, error: signupError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      setMessage(
        "Account created successfully. Complete your profile."
      );
      setStep(3);
    } else {
      setMessage(
        "Account created! Check your email and click the FreeText verification link."
      );
      setStep(2);
      setResendSeconds(120);
    }
  };

  const resendVerification = async () => {
    clearMessages();

    if (resendSeconds > 0) return;

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    const { error: resendError } =
      await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

    setLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

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
        "Your email is not verified yet. Please click the verification link in your email."
      );
      return;
    }

    if (!session.user.email_confirmed_at) {
      setError(
        "Your email is not verified yet. Please click the verification link in your email."
      );
      return;
    }

    setMessage(
      "Email verified successfully! Welcome to FreeText."
    );

    setStep(3);
  };

  const completeProfile = async () => {
    clearMessages();

    if (!fullName || !username) {
      setError(
        "Please enter your full name and username."
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

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

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

    setMessage("Profile created successfully!");
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

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">F</div>
          <span>FreeText</span>
        </div>

        {step === 1 && (
          <>
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
                  mode === "login"
                    ? "active"
                    : ""
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
                  mode === "signup"
                    ? "active"
                    : ""
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
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Full name"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                  />

                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                  />
                </>
              )}

              <input
                className="auth-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />

              <input
                className="auth-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />

              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              {message && (
                <div className="auth-message">
                  {message}
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
          </>
        )}

        {step === 2 && (
          <div className="auth-form">
            <div className="auth-welcome-icon">
              ✉️
            </div>

            <h1 className="auth-heading">
              Check your email
            </h1>

            <p className="auth-helper">
              We sent a FreeText verification link to:
            </p>

            <strong>{email}</strong>

            <p className="auth-helper">
              Open the email and click the verification
              link to confirm your account.
            </p>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-success">
                {message}
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
                : "I've verified my email"}
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
                ? `Resend email in ${resendSeconds}s`
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
              Back to login
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="auth-form">
            <div className="auth-welcome-icon">
              ✓
            </div>

            <h1 className="auth-heading">
              Complete your profile
            </h1>

            <p className="auth-helper">
              Your email has been verified. Tell us a
              little about yourself.
            </p>

            <input
              className="auth-input"
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
            />

            <input
              className="auth-input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
            />

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-success">
                {message}
              </div>
            )}

            <button
              className="auth-primary-button"
              type="button"
              onClick={completeProfile}
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : "Continue to FreeText"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
