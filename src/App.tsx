import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

import Navbar from "./components/Navbar";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import Stories from "./components/Stories";
import Messages from "./components/Messages";
import CreatePost from "./components/CreatePost";
import Chat from "./components/Chat";
import Auth from "./components/Auth";

type Page =
  | "home"
  | "explore"
  | "messages"
  | "profile"
  | "edit-profile";

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <h1>FreeText</h1>
        <p className="auth-subtitle">{message}</p>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [verificationGate, setVerificationGate] = useState(() =>
    localStorage.getItem("freetext_pending_verification_email") !== null ||
    new URLSearchParams(window.location.search).get("verified") === "1"
  );
  const [page, setPage] = useState<Page>("home");
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("freetext_dark_mode") === "true"
  );
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("FreeText session error:", error);
        setSession(null);
      } else {
        setSession(data.session);
      }

      setAuthLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleVerificationComplete = () => {
      localStorage.removeItem("freetext_pending_verification_email");
      setVerificationGate(false);
    };

    window.addEventListener(
      "freetext-verification-complete",
      handleVerificationComplete
    );

    return () => {
      window.removeEventListener(
        "freetext-verification-complete",
        handleVerificationComplete
      );
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("freetext_dark_mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("FreeText profile error:", error);
        setProfile(null);
      } else {
        setProfile(data);
      }

      setProfileLoading(false);
    };

    loadProfile();
  }, [session]);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("FreeText logout error:", error);
      return;
    }

    setProfile(null);
    setPage("home");
    setShowNotifications(false);
    setShowChat(false);
  };

  const toggleDarkMode = () => setDarkMode((value) => !value);

  const openProfile = () => {
    setPage("profile");
    setShowNotifications(false);
  };

  const openNotifications = () => setShowNotifications(true);

  const profileAvatar =
    profile?.avatar_url || "https://i.pravatar.cc/150?img=12";

  if (authLoading) {
    return <LoadingScreen message="Loading your account..." />;
  }

  if (!session || verificationGate) {
    return <Auth />;
  }

  if (profileLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  return (
    <div className="app-shell">
      <Navbar
        search={search}
        setSearch={setSearch}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        openCreate={() => setShowCreate(true)}
        openNotifications={openNotifications}
        openProfile={openProfile}
        profileAvatar={profileAvatar}
        logout={logout}
      />

      <main className="main-content">
        {page === "home" && (
          <>
            <Stories />

            <section className="feed">
              <div className="page-section">
                <h2>Your FreeText feed</h2>
                <p>
                  Your feed is ready. Create your first post to start sharing
                  with the FreeText community.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                >
                  Create a post
                </button>
              </div>
            </section>
          </>
        )}

        {page === "explore" && (
          <section className="page-section">
            <h2>Explore</h2>
            <p>Discover people and posts on FreeText.</p>
          </section>
        )}

        {page === "messages" && (
          <Messages openChat={() => setShowChat(true)} />
        )}

        {page === "profile" && (
          <Profile
            profile={profile}
            onEdit={() => setPage("edit-profile")}
          />
        )}

        {page === "edit-profile" && (
          <EditProfile
            profile={profile}
            onCancel={() => setPage("profile")}
            onSaved={(updatedProfile: any) => {
              setProfile(updatedProfile);
              setPage("profile");
            }}
          />
        )}
      </main>

      {showCreate && (
        <CreatePost onClose={() => setShowCreate(false)} />
      )}

      {showChat && <Chat onClose={() => setShowChat(false)} />}

      {showNotifications && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNotifications(false)}
        >
          <div
            className="notification-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Notifications</h2>
              <button
                className="modal-close"
                type="button"
                aria-label="Close notifications"
                onClick={() => setShowNotifications(false)}
              >
                ×
              </button>
            </div>

            <div className="notification-empty">
              <div className="notification-icon">🔔</div>
              <h3>No new notifications</h3>
              <p>You're all caught up.</p>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav">
        <button
          type="button"
          onClick={() => setPage("home")}
          className={page === "home" ? "active" : ""}
        >
          🏠
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setPage("explore")}
          className={page === "explore" ? "active" : ""}
        >
          🔍
          <span>Explore</span>
        </button>

        <button type="button" onClick={() => setShowCreate(true)}>
          ➕
          <span>Create</span>
        </button>

        <button
          type="button"
          onClick={() => setPage("messages")}
          className={page === "messages" ? "active" : ""}
        >
          💬
          <span>Messages</span>
        </button>

        <button
          type="button"
          onClick={openProfile}
          className={
            page === "profile" || page === "edit-profile" ? "active" : ""
          }
        >
          👤
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
