import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

import Navbar from "./components/Navbar";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import PostCard from "./components/PostCard";
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

function App() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [verificationGate, setVerificationGate] =
    useState(() =>
      localStorage.getItem(
        "freetext_pending_verification_email"
      ) !== null ||
      new URLSearchParams(window.location.search).get(
        "verified"
      ) === "1"
    );

  const [page, setPage] =
    useState<Page>("home");

  const [search, setSearch] =
    useState("");

  const [darkMode, setDarkMode] =
    useState(() =>
      localStorage.getItem(
        "freetext_dark_mode"
      ) === "true"
    );

  const [showCreate, setShowCreate] =
    useState(false);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [showChat, setShowChat] =
    useState(false);

  const [profile, setProfile] =
    useState<any>(null);

  const [profileLoading, setProfileLoading] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } =
        await supabase.auth.getSession();

      if (mounted) {
        setSession(data.session);
        setAuthLoading(false);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (mounted) {
            setSession(newSession);
            setAuthLoading(false);
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleVerificationComplete = () => {
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
    document.documentElement.classList.toggle(
      "dark",
      darkMode
    );

    localStorage.setItem(
      "freetext_dark_mode",
      String(darkMode)
    );
  }, [darkMode]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);

      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

      if (!error) {
        setProfile(data);
      }

      setProfileLoading(false);
    };

    loadProfile();
  }, [session]);

  const logout = async () => {
    await supabase.auth.signOut();

    setProfile(null);
    setPage("home");
  };

  const toggleDarkMode = () => {
    setDarkMode((value) => !value);
  };

  const openProfile = () => {
    setPage("profile");
    setShowNotifications(false);
  };

  const openNotifications = () => {
    setShowNotifications(true);
  };

  const profileAvatar =
    profile?.avatar_url ||
    "https://i.pravatar.cc/150?img=12";

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            💬
          </div>

          <h1>FreeText</h1>

          <p className="auth-subtitle">
            Loading your account...
          </p>
        </div>
      </div>
    );
  }

  if (!session || verificationGate) {
    return <Auth />;
  }

  if (profileLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            💬
          </div>

          <h1>FreeText</h1>

          <p className="auth-subtitle">
            Loading your profile...
          </p>
        </div>
      </div>
    );
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
              <PostCard />
              <PostCard />
            </section>
          </>
        )}

        {page === "explore" && (
          <section className="page-section">
            <h2>Explore</h2>
            <p>
              Discover people and posts on FreeText.
            </p>
          </section>
        )}

        {page === "messages" && (
          <Messages
            openChat={() => setShowChat(true)}
          />
        )}

        {page === "profile" && (
          <Profile
            profile={profile}
            onEdit={() =>
              setPage("edit-profile")
            }
          />
        )}

        {page === "edit-profile" && (
          <EditProfile
            profile={profile}
            onCancel={() =>
              setPage("profile")
            }
            onSaved={(updatedProfile: any) => {
              setProfile(updatedProfile);
              setPage("profile");
            }}
          />
        )}
      </main>

      {showCreate && (
        <CreatePost
          onClose={() => setShowCreate(false)}
        />
      )}

      {showChat && (
        <Chat
          onClose={() => setShowChat(false)}
        />
      )}

      {showNotifications && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setShowNotifications(false)
          }
        >
          <div
            className="notification-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>Notifications</h2>

              <button
                className="modal-close"
                onClick={() =>
                  setShowNotifications(false)
                }
              >
                ×
              </button>
            </div>

            <div className="notification-empty">
              <div className="notification-icon">
                🔔
              </div>

              <h3>No new notifications</h3>

              <p>
                You're all caught up.
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav">
        <button
          onClick={() => setPage("home")}
          className={
            page === "home" ? "active" : ""
          }
        >
          🏠
          <span>Home</span>
        </button>

        <button
          onClick={() => setPage("explore")}
          className={
            page === "explore" ? "active" : ""
          }
        >
          🔍
          <span>Explore</span>
        </button>

        <button
          onClick={() => setShowCreate(true)}
        >
          ➕
          <span>Create</span>
        </button>

        <button
          onClick={() => setPage("messages")}
          className={
            page === "messages" ? "active" : ""
          }
        >
          💬
          <span>Messages</span>
        </button>

        <button
          onClick={openProfile}
          className={
            page === "profile" ||
            page === "edit-profile"
              ? "active"
              : ""
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
