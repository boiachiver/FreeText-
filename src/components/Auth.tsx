import { useState } from "react";
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
        "Account created successfully. Please check your email to confirm your account, then log in."
      );
      setMode("login");
      return;
    }

    setStep("profile");
    setMessage("Account created. Now complete your FreeText profile.");
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
        setError(
          "That username is already taken. Please choose another one."
        );
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
        <div className="auth-card">

          <div className="auth-logo">
            💬
          </div>

          <h1>Welcome to FreeText</h1>

          <p className="auth-subtitle">
            Complete your profile to get started.
          </p>

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(event) =>
              setFullName(event.target.value)
            }
          />

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
          />

          <button
            className="auth-primary-button"
            onClick={saveProfile}
            disabled={loading}
          >
            {loading
              ? "Creating profile..."
              : "Complete account"}
          </button>

        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          💬
        </div>

        <h1>FreeText</h1>

        <p className="auth-subtitle">
          {mode === "signup"
            ? "Create your account and connect with people."
            : "Log in to your FreeText account."}
        </p>

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
        />

        <button
          className="auth-primary-button"
          onClick={mode === "signup" ? signup : login}
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : mode === "signup"
            ? "Create new account"
            : "Log in"}
        </button>

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
          📱 Continue with phone number
        </button>

        <button
          className="auth-switch"
          onClick={switchMode}
        >
          {mode === "signup"
            ? "Already have an account? Log in"
            : "Don't have an account? Create one"}
        </button>

      </div>
    </div>
  );
}
