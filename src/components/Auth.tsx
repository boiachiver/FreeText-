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

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.user) {
      setStep("profile");
      setMessage(
        "Account created. Now complete your FreeText profile."
      );
    }
  };

  const saveProfile = async () => {
    setError("");
    setMessage("");

    if (!fullName.trim() || !username.trim()) {
      setError("Please enter your name and username.");
      return;
    }

    const cleanUsername = username
      .trim()
      .replace(/^@/, "")
      .replace(/\s+/g, "")
      .toLowerCase();

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setError("Your session has expired. Please log in again.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username: cleanUsername,
        full_name: fullName.trim(),
      });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onAuthenticated();
  };

  const login = async () => {
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onAuthenticated();
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
          onClick={
            mode === "signup"
              ? signup
              : login
          }
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
              "Phone signup will be enabled after SMS verification is configured."
            )
          }
        >
          📱 Continue with phone number
        </button>

        <button
          className="auth-switch"
          onClick={() => {
            setMode(
              mode === "signup"
                ? "login"
                : "signup"
            );
            setError("");
            setMessage("");
          }}
        >
          {mode === "signup"
            ? "Already have an account? Log in"
            : "Don't have an account? Create one"}
        </button>

      </div>

    </div>
  );
}
