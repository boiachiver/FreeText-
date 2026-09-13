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
