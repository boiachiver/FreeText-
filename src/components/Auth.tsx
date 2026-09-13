import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MessageCircle,
  User,
} from "lucide-react";
import { supabase } from "../lib/supabase";

type AuthProps = {
  onAuthenticated: () => void;
};

export default function Auth({ onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [step, setStep] = useState<"account" | "profile">("account");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const signup = async () => {
    setError("");
    setMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.user) {
      setError("Account could not be created. Please try again.");
      return;
    }

    if (!data.session) {
      setMessage(
        "Your account is ready. Check your email to confirm your FreeText account."
      );
      setMode("login");
      return;
    }

    setStep("profile");
    setMessage("Account created. Let's finish your profile.");
  };

  const saveProfile = async () => {
    setError("");
    setMessage("");

    const cleanName = fullName.trim();
    const cleanUsername = username
      .trim()
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .toLowerCase();

    if (!cleanName || !cleanUsername) {
      setError("Please enter your full name and username.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Your session has expired. Please log in again.");
      setStep("account");
      setMode("login");
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username: cleanUsername,
      full_name: cleanName,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505") {
        setError("That username is already taken.");
      } else {
        setError(error.message);
      }
      return;
    }

    onAuthenticated();
  };

  const login = async () => {
    setError("");
    setMessage("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.user) {
      setError("Login failed. Please try again.");
      return;
    }

    onAuthenticated();
  };

  const switchMode = () => {
    setMode(mode === "signup" ? "login" : "signup");
    setError("");
    setMessage("");
    setStep("account");
  };

  if (step === "profile") {
    return (
      <div className="auth-page">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />

        <div className="auth-card auth-profile-card">
          <div className="auth-brand">
            <div className="auth-logo">
              <MessageCircle size={24} />
            </div>

            <span>FreeText</span>
          </div>

          <div className="auth-progress">
            <span className="active" />
            <span className="active" />
          </div>

          <div className="auth-heading">
            <div className="auth-welcome-icon">
              <User size={24} />
            </div>

            <h1>Complete your profile</h1>

            <p>
              Tell people a little about yourself and choose
              your FreeText username.
            </p>
          </div>

          {message && (
            <div className="auth-message">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="auth-form">
            <label>Full name</label>

            <div className="auth-input">
              <User size={18} />

              <input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
              />
            </div>

            <label>Username</label>

            <div className="auth-input">
              <span className="username-symbol">@</span>

              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
              />
            </div>

            <p className="auth-helper">
              Your username must be at least 3 characters.
            </p>

            <button
              className="auth-primary-button"
              onClick={saveProfile}
              disabled={loading}
            >
              {loading ? "Creating profile..." : "Finish setup"}
              {!loading && <ArrowRight size={19} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSignup = mode === "signup";

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <MessageCircle size={24} />
          </div>

          <span>FreeText</span>
        </div>

        <div className="auth-heading">
          <h1>
            {isSignup
              ? "Join the conversation"
              : "Welcome back"}
          </h1>

          <p>
            {isSignup
              ? "Create your account and connect with people who matter."
              : "Log in and continue where you left off."}
          </p>
        </div>

        <div className="auth-mode-switch">
          <button
            className={isSignup ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setError("");
              setMessage("");
            }}
          >
            Create account
          </button>

          <button
            className={!isSignup ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Log in
          </button>
        </div>

        {message && (
          <div className="auth-message">
            <CheckCircle2 size={18} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <div className="auth-form">
          <label>Email address</label>

          <div className="auth-input">
            <Mail size={18} />

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              autoComplete="email"
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />
          </div>

          <label>Password</label>

          <div className="auth-input">
            <LockKeyhole size={18} />

            <input
              type={showPassword ? "text" : "password"}
              placeholder={
                isSignup
                  ? "Create a password"
                  : "Enter your password"
              }
              value={password}
              autoComplete={
                isSignup ? "new-password" : "current-password"
              }
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword((current) => !current)
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

          {isSignup && (
            <p className="auth-helper">
              Use at least 6 characters for your password.
            </p>
          )}

          <button
            className="auth-primary-button"
            onClick={isSignup ? signup : login}
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isSignup
              ? "Create my account"
              : "Log in"}

            {!loading && <ArrowRight size={19} />}
          </button>
        </div>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          className="auth-phone-button"
          onClick={() =>
            setMessage(
              "Phone signup will be available after SMS/WhatsApp verification is configured."
            )
          }
        >
          <MessageCircle size={19} />
          Continue with phone number
        </button>

        <p className="auth-terms">
          By continuing, you agree to use FreeText responsibly
          and respectfully.
        </p>

        <div className="auth-footer">
          {isSignup
            ? "Already have a FreeText account?"
            : "Don't have a FreeText account?"}

          <button onClick={switchMode}>
            {isSignup ? "Log in" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
/* =========================
   FreeText Professional Auth
   ========================= */

.auth-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 28px 16px;
  background:
    radial-gradient(circle at 15% 10%, rgba(99, 102, 241, 0.14), transparent 32%),
    radial-gradient(circle at 90% 90%, rgba(236, 72, 153, 0.1), transparent 30%),
    #f7f8fc;
}

.auth-glow {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  opacity: 0.35;
}

.auth-glow-one {
  top: -150px;
  left: -120px;
  background: #818cf8;
}

.auth-glow-two {
  right: -130px;
  bottom: -150px;
  background: #f472b6;
}

.auth-card {
  position: relative;
  z-index: 2;
  width: min(440px, 100%);
  padding: 34px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(225, 228, 237, 0.9);
  border-radius: 28px;
  box-shadow:
    0 30px 80px rgba(24, 32, 51, 0.1),
    0 8px 25px rgba(24, 32, 51, 0.04);
  backdrop-filter: blur(18px);
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  font-size: 22px;
  font-weight: 850;
  letter-spacing: -0.8px;
}

.auth-logo {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: white;
  background: #181d2d;
  box-shadow: 0 8px 20px rgba(24, 29, 45, 0.18);
}

.auth-heading {
  margin-bottom: 22px;
}

.auth-heading h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: -1.2px;
  color: #171c2b;
}

.auth-heading p {
  margin: 10px 0 0;
  color: #7c8496;
  font-size: 13px;
  line-height: 1.6;
}

.auth-mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  margin-bottom: 22px;
  border-radius: 13px;
  background: #f0f2f6;
}

.auth-mode-switch button {
  min-height: 38px;
  border-radius: 10px;
  color: #7b8293;
  font-size: 12px;
  font-weight: 750;
  transition: 0.2s ease;
}

.auth-mode-switch button.active {
  background: white;
  color: #181d2d;
  box-shadow: 0 3px 10px rgba(25, 31, 47, 0.07);
}

.auth-form {
  display: grid;
  gap: 9px;
}

.auth-form label {
  margin-top: 5px;
  color: #454d60;
  font-size: 11px;
  font-weight: 800;
}

.auth-input {
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #e0e3eb;
  border-radius: 14px;
  background: #fafbfc;
  color: #8b93a5;
  transition: 0.2s ease;
}

.auth-input:focus-within {
  border-color: #777bf0;
  background: white;
  box-shadow: 0 0 0 4px rgba(119, 123, 240, 0.1);
}

.auth-input input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1b2130;
  font-size: 13px;
}

.auth-input input::placeholder {
  color: #a0a6b4;
}

.username-symbol {
  font-size: 17px;
  font-weight: 800;
  color: #777bf0;
}

.password-toggle {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #858d9e;
}

.password-toggle:hover {
  background: #f0f2f6;
}

.auth-helper {
  margin: 0 2px 5px;
  color: #9299a9;
  font-size: 10px;
  line-height: 1.5;
}

.auth-primary-button {
  width: 100%;
  min-height: 50px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 14px;
  background: #181d2d;
  color: white;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 10px 22px rgba(24, 29, 45, 0.14);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.auth-primary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 13px 28px rgba(24, 29, 45, 0.18);
}

.auth-primary-button:active:not(:disabled) {
  transform: translateY(0);
}

.auth-divider {
  height: 1px;
  margin: 23px 0 18px;
  position: relative;
  background: #e7e9ef;
}

.auth-divider span {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 0 10px;
  background: white;
  color: #a0a6b4;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
}

.auth-phone-button {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid #e0e3eb;
  border-radius: 14px;
  background: white;
  color: #343b4d;
  font-size: 12px;
  font-weight: 800;
  transition: 0.2s ease;
}

.auth-phone-button:hover {
  background: #f7f8fb;
  border-color: #d5d9e2;
}

.auth-terms {
  margin: 17px 5px 0;
  text-align: center;
  color: #a0a6b4;
  font-size: 9px;
  line-height: 1.6;
}

.auth-footer {
  margin-top: 22px;
  text-align: center;
  color: #8a91a2;
  font-size: 11px;
}

.auth-footer button {
  margin-left: 5px;
  color: #6569df;
  font-weight: 850;
}

.auth-message,
.auth-error {
  margin-bottom: 15px;
  padding: 11px 13px;
  border-radius: 12px;
  font-size: 11px;
  line-height: 1.5;
}

.auth-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #edfdf4;
  border: 1px solid #c9f3dc;
  color: #23724a;
}

.auth-error {
  background: #fff1f3;
  border: 1px solid #ffd5dc;
  color: #b12d45;
}

.auth-progress {
  display: flex;
  gap: 5px;
  margin: -10px 0 26px;
}

.auth-progress span {
  height: 4px;
  flex: 1;
  border-radius: 10px;
  background: #e7e9ef;
}

.auth-progress span.active {
  background: #181d2d;
}

.auth-profile-card .auth-heading {
  margin-bottom: 24px;
}

.auth-welcome-icon {
  width: 46px;
  height: 46px;
  margin-bottom: 15px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #f0f1ff;
  color: #6469df;
}

@media (max-width: 520px) {
  .auth-page {
    padding: 18px 12px;
  }

  .auth-card {
    padding: 26px 20px;
    border-radius: 23px;
  }

  .auth-brand {
    margin-bottom: 23px;
  }

  .auth-heading h1 {
    font-size: 27px;
  }
}

@media (max-width: 360px) {
  .auth-card {
    padding: 23px 16px;
  }

  .auth-heading h1 {
    font-size: 24px;
  }

  .auth-input,
  .auth-primary-button {
    min-height: 47px;
  }
}

/* Dark mode */
html[data-theme='dark'] .auth-page {
  background:
    radial-gradient(circle at 15% 10%, rgba(99, 102, 241, 0.15), transparent 32%),
    radial-gradient(circle at 90% 90%, rgba(236, 72, 153, 0.08), transparent 30%),
    #0c0f16;
}

html[data-theme='dark'] .auth-card {
  background: rgba(20, 25, 35, 0.97);
  border-color: #2a3040;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
}

html[data-theme='dark'] .auth-heading h1,
html[data-theme='dark'] .auth-brand {
  color: #edf0f7;
}

html[data-theme='dark'] .auth-heading p,
html[data-theme='dark'] .auth-footer,
html[data-theme='dark'] .auth-helper {
  color: #929caf;
}

html[data-theme='dark'] .auth-mode-switch {
  background: #1b2130;
}

html[data-theme='dark'] .auth-mode-switch button.active {
  background: #272e3d;
  color: #edf0f7;
}

html[data-theme='dark'] .auth-input {
  background: #111620;
  border-color: #2b3240;
  color: #8993a8;
}

html[data-theme='dark'] .auth-input:focus-within {
  background: #151b27;
}

html[data-theme='dark'] .auth-input input {
  color: #edf0f7;
}

html[data-theme='dark'] .auth-phone-button {
  background: #151b27;
  border-color: #303747;
  color: #edf0f7;
}

html[data-theme='dark'] .auth-phone-button:hover,
html[data-theme='dark'] .password-toggle:hover {
  background: #202737;
}

html[data-theme='dark'] .auth-divider {
  background: #2a3040;
}

html[data-theme='dark'] .auth-divider span {
  background: #141923;
}

html[data-theme='dark'] .auth-progress span {
  background: #303747;
}

html[data-theme='dark'] .auth-progress span.active {
  background: #edf0f7;
}

html[data-theme='dark'] .auth-welcome-icon {
  background: #22283d;
  color: #9699ff;
}
