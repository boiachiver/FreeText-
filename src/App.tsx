import { useEffect, useState } from "react";
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  User,
  LogOut,
  Users,
} from "lucide-react";

import Navbar from "./components/Navbar";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import PostCard from "./components/PostCard";
import Stories from "./components/Stories";
import Messages from "./components/Messages";
import CreatePost from "./components/CreatePost";

import {
  defaultProfile,
  starterPosts,
  suggestions,
} from "./data/data";

import type { Page, Person, Post } from "./types/types";

const safeGet = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export default function App() {
  const [page, setPage] = useState<Page>("home");

  const [search, setSearch] = useState("");

  const [darkMode, setDarkMode] = useState(
    () => safeGet("freetext_dark", "false") === "true"
  );

  const [userName, setUserName] = useState(() =>
    safeGet("freetext_user", defaultProfile.name)
  );

  const [username, setUsername] = useState(() =>
    safeGet("freetext_username", defaultProfile.username)
  );

  const [bio, setBio] = useState(() =>
    safeGet("freetext_bio", defaultProfile.bio)
  );

  const [profileAvatar, setProfileAvatar] = useState(() =>
    safeGet("freetext_avatar", defaultProfile.avatar)
  );

  const [coverPhoto, setCoverPhoto] = useState(() =>
    safeGet("freetext_cover", defaultProfile.coverPhoto)
  );

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem("freetext_posts");
      return saved ? JSON.parse(saved) : starterPosts;
    } catch {
      return starterPosts;
    }
  });

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const [caption, setCaption] = useState("");
  const [postImage, setPostImage] = useState("");

  const [editName, setEditName] = useState(userName);
  const [editUsername, setEditUsername] = useState(username);
  const [editBio, setEditBio] = useState(bio);
  const [editAvatar, setEditAvatar] = useState(profileAvatar);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    safeSet("freetext_dark", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    safeSet("freetext_posts", JSON.stringify(posts));
  }, [posts]);

  const openProfile = () => {
    setPage("profile");
  };

  const toggleDarkMode = () => {
    setDarkMode((current) => !current);
  };

  const openCreate = () => {
    setShowCreatePost(true);
  };

  const openNotifications = () => {
    setPage("notifications");
  };

  const startEditProfile = () => {
    setEditName(userName);
    setEditUsername(username);
    setEditBio(bio);
    setEditAvatar(profileAvatar);
    setShowEditProfile(true);
  };

  const saveProfile = () => {
    const cleanName = editName.trim() || defaultProfile.name;
    const cleanUsername =
      editUsername.trim().replace(/\s+/g, "").toLowerCase() ||
      defaultProfile.username;
    const cleanBio = editBio.trim() || defaultProfile.bio;

    setUserName(cleanName);
    setUsername(cleanUsername);
    setBio(cleanBio);
    setProfileAvatar(editAvatar);

    safeSet("freetext_user", cleanName);
    safeSet("freetext_username", cleanUsername);
    safeSet("freetext_bio", cleanBio);
    safeSet("freetext_avatar", editAvatar);

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.username === "boiachiver") {
          return {
            ...post,
            name: cleanName,
            username: cleanUsername,
            avatar: editAvatar,
          };
        }

        return post;
      })
    );

    setShowEditProfile(false);
  };

  const handleProfileImage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Please choose a profile photo smaller than 3MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);
      setEditAvatar(result);
    };

    reader.readAsDataURL(file);
  };

  const handleCoverImage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Please choose a cover photo smaller than 3MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result);

      setCoverPhoto(result);

      const saved = safeSet("freetext_cover", result);

      if (!saved) {
        alert("Could not save the cover photo. Try a smaller image.");
      }
    };

    reader.readAsDataURL(file);
  };

  const handlePostImage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("Please choose an image smaller than 3MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPostImage(String(reader.result));
    };

    reader.readAsDataURL(file);
  };

  const publishPost = () => {
    if (!caption.trim() && !postImage) {
      alert("Write something or add a photo first.");
      return;
    }

    const newPost: Post = {
      id: Date.now().toString(),
      name: userName,
      username,
      avatar: profileAvatar,
      image:
        postImage ||
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      caption: caption.trim() || "New post ✨",
      likes: 0,
      comments: 0,
      liked: false,
      saved: false,
      time: "now",
    };

    setPosts((currentPosts) => [newPost, ...currentPosts]);

    setCaption("");
    setPostImage("");
    setShowCreatePost(false);
    setPage("home");
  };

  const likePost = (id: string) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked
                ? Math.max(0, post.likes - 1)
                : post.likes + 1,
            }
          : post
      )
    );
  };

  const savePost = (id: string) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === id
          ? {
              ...post,
              saved: !post.saved,
            }
          : post
      )
    );
  };

  const openChat = (person: Person) => {
    alert(`Chat with ${person.name} will be added next.`);
  };

  const filteredPosts = posts.filter((post) => {
    const value = search.toLowerCase().trim();

    if (!value) return true;

    return (
      post.name.toLowerCase().includes(value) ||
      post.username.toLowerCase().includes(value) ||
      post.caption.toLowerCase().includes(value)
    );
  });

  const navigation = [
    {
      label: "Home",
      icon: Home,
      value: "home" as Page,
    },
    {
      label: "Explore",
      icon: Compass,
      value: "explore" as Page,
    },
    {
      label: "Messages",
      icon: MessageCircle,
      value: "messages" as Page,
    },
    {
      label: "Notifications",
      icon: Bell,
      value: "notifications" as Page,
    },
    {
      label: "Profile",
      icon: User,
      value: "profile" as Page,
    },
  ];

  return (
    <div className={darkMode ? "app dark-mode" : "app"}>

      <Navbar
        search={search}
        setSearch={setSearch}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        openCreate={openCreate}
        openNotifications={openNotifications}
        openProfile={openProfile}
        profileAvatar={profileAvatar}
      />

      <div className="app-layout">

        <aside className="sidebar">

          <nav className="side-nav">

            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.value}
                  className={
                    page === item.value
                      ? "nav-item active"
                      : "nav-item"
                  }
                  onClick={() => setPage(item.value)}
                >
                  <Icon size={21} />
                  <span>{item.label}</span>
                </button>
              );
            })}

          </nav>

          <button className="nav-item">
            <Users size={21} />
            <span>Communities</span>
          </button>

          <button className="nav-item">
            <LogOut size={21} />
            <span>Log out</span>
          </button>

        </aside>

        <main className="main-content">

          {page === "home" && (
            <>

              <Stories
                suggestions={suggestions}
                onCreateStory={() =>
                  alert("Story creation will be added next.")
                }
              />

              <div className="page-heading">
                <div>
                  <h1>Home</h1>
                  <p>See what people are sharing.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={openCreate}
                >
                  Create post
                </button>
              </div>

              <div className="posts-list">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={likePost}
                    onSave={savePost}
                  />
                ))}

                {filteredPosts.length === 0 && (
                  <div className="empty-state">
                    <h2>No posts found</h2>
                    <p>Try another search.</p>
                  </div>
                )}
              </div>

            </>
          )}

          {page === "explore" && (
            <section className="page-section">

              <div className="page-heading">
                <div>
                  <h1>Explore</h1>
                  <p>Discover posts and people on FreeText.</p>
                </div>
              </div>

              <div className="posts-list">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={likePost}
                    onSave={savePost}
                  />
                ))}
              </div>

            </section>
          )}

          {page === "messages" && (
            <Messages
              people={suggestions}
              onOpenChat={openChat}
            />
          )}

          {page === "notifications" && (
            <section className="page-section">

              <div className="page-heading">
                <div>
                  <h1>Notifications</h1>
                  <p>Stay updated with your FreeText activity.</p>
                </div>
              </div>

              <div className="notification-card">
                <div className="notification-item">
                  <Bell size={20} />
                  <div>
                    <strong>Welcome to FreeText</strong>
                    <span>
                      Your notifications will appear here.
                    </span>
                  </div>
                </div>
              </div>

            </section>
          )}

          {page === "profile" && (
            <Profile
              userName={userName}
              username={username}
              bio={bio}
              profileAvatar={profileAvatar}
              coverPhoto={coverPhoto}
              postsCount={
                posts.filter(
                  (post) => post.username === username
                ).length
              }
              onEditProfile={startEditProfile}
              onChangeCover={handleCoverImage}
            />
          )}

        </main>

      </div>

      <div className="mobile-bottom-nav">

        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.value}
              className={
                page === item.value
                  ? "mobile-nav-item active"
                  : "mobile-nav-item"
              }
              onClick={() => setPage(item.value)}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </button>
          );
        })}

      </div>

      {showEditProfile && (
        <EditProfile
          editName={editName}
          editUsername={editUsername}
          editBio={editBio}
          editAvatar={editAvatar}
          onNameChange={setEditName}
          onUsernameChange={setEditUsername}
          onBioChange={setEditBio}
          onAvatarChange={handleProfileImage}
          onSave={saveProfile}
          onClose={() => setShowEditProfile(false)}
        />
      )}

      {showCreatePost && (
        <CreatePost
          userName={userName}
          profileAvatar={profileAvatar}
          caption={caption}
          image={postImage}
          onCaptionChange={setCaption}
          onImageChange={handlePostImage}
          onRemoveImage={() => setPostImage("")}
          onPublish={publishPost}
          onClose={() => setShowCreatePost(false)}
        />
      )}

    </div>
  );
}
