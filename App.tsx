import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Camera,
  Compass,
  Heart,
  Home,
  Image as ImageIcon,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";

type Page =
  | "home"
  | "explore"
  | "messages"
  | "notifications"
  | "profile";

type Post = {
  id: string;
  author: string;
  username: string;
  avatar: string;
  caption: string;
  image?: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  createdAt: number;
};

const starterPosts: Post[] = [
  {
    id: "1",
    author: "FreeText",
    username: "freetext",
    avatar: "FT",
    caption: "Welcome to FreeText 🎉 A place to connect, share and express yourself.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    likes: 128,
    comments: 24,
    liked: false,
    saved: false,
    createdAt: Date.now() - 1000 * 60 * 25,
  },
  {
    id: "2",
    author: "Boi Achiver",
    username: "boiachiver",
    avatar: "BA",
    caption: "Building something new. 🚀 Dreams become reality when you keep working.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    likes: 76,
    comments: 12,
    liked: false,
    saved: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
];

const stories = [
  { name: "Your story", avatar: "YA", own: true },
  { name: "Alex", avatar: "AL" },
  { name: "Sarah", avatar: "SA" },
  { name: "Daniel", avatar: "DA" },
  { name: "Maya", avatar: "MY" },
  { name: "Chris", avatar: "CH" },
];

function timeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

  return `${Math.floor(seconds / 86400)}d`;
}

function Avatar({
  text,
  large = false,
}: {
  text: string;
  large?: boolean;
}) {
  return (
    <div className={`avatar ${large ? "avatar-large" : ""}`}>
      {text.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem("freetext-posts");
    return saved ? JSON.parse(saved) : starterPosts;
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("freetext-dark") === "true";
  });

  const [search, setSearch] = useState("");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [user, setUser] = useState(() => {
    return (
      localStorage.getItem("freetext-user") || "Boi Achiver"
    );
  });

  useEffect(() => {
    localStorage.setItem("freetext-posts", JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem("freetext-dark", String(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("freetext-user", user);
  }, [user]);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return posts;

    return posts.filter(
      (post) =>
        post.author.toLowerCase().includes(query) ||
        post.username.toLowerCase().includes(query) ||
        post.caption.toLowerCase().includes(query)
    );
  }, [posts, search]);

  function toggleLike(id: string) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post
      )
    );
  }

  function toggleSave(id: string) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, saved: !post.saved }
          : post
      )
    );
  }

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage(String(reader.result));
    };

    reader.readAsDataURL(file);
  }

  function createPost() {
    if (!caption.trim() && !image) {
      alert("Write something or choose an image.");
      return;
    }

    const newPost: Post = {
      id: crypto.randomUUID(),
      author: user,
      username: user.toLowerCase().replace(/\s+/g, ""),
      avatar: user,
      caption: caption.trim(),
      image: image || undefined,
      likes: 0,
      comments: 0,
      liked: false,
      saved: false,
      createdAt: Date.now(),
    };

    setPosts((current) => [newPost, ...current]);
    setCaption("");
    setImage("");
    setShowCreate(false);
    setPage("home");
  }

  function logout() {
    localStorage.removeItem("freetext-user");
    setUser("Guest");
    setMenuOpen(false);
  }

  function renderHome() {
    return (
      <>
        <div className="stories">
          {stories.map((story) => (
            <div className="story" key={story.name}>
              <div className={`story-ring ${story.own ? "own" : ""}`}>
                <Avatar text={story.avatar} />
                {story.own && (
                  <span className="story-plus">
                    <Plus size={13} />
                  </span>
                )}
              </div>
              <span>{story.name}</span>
            </div>
          ))}
        </div>

        <div className="feed">
          {filteredPosts.map((post) => (
            <article className="post-card" key={post.id}>
              <div className="post-header">
                <div className="post-user">
                  <Avatar text={post.avatar} />
                  <div>
                    <strong>{post.author}</strong>
                    <span>
                      @{post.username} · {timeAgo(post.createdAt)}
                    </span>
                  </div>
                </div>

                <button className="icon-button">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              {post.caption && (
                <p className="post-caption">{post.caption}</p>
              )}

              {post.image && (
                <img
                  className="post-image"
                  src={post.image}
                  alt="Post"
                />
              )}

              <div className="post-actions">
                <div>
                  <button
                    className={post.liked ? "active-action" : ""}
                    onClick={() => toggleLike(post.id)}
                  >
                    <Heart
                      size={23}
                      fill={post.liked ? "currentColor" : "none"}
                    />
                  </button>

                  <button>
                    <MessageCircle size={23} />
                  </button>

                  <button>
                    <Send size={23} />
                  </button>
                </div>

                <button
                  className={post.saved ? "active-action" : ""}
                  onClick={() => toggleSave(post.id)}
                >
                  <Bookmark
                    size={23}
                    fill={post.saved ? "currentColor" : "none"}
                  />
                </button>
              </div>

              <div className="post-stats">
                <strong>{post.likes} likes</strong>
                <span>
                  {post.comments} comments
                </span>
              </div>
            </article>
          ))}

          {filteredPosts.length === 0 && (
            <div className="empty-state">
              <Search size={42} />
              <h3>No posts found</h3>
              <p>Try another search.</p>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderExplore() {
    return (
      <section className="page-section">
        <div className="section-heading">
          <div>
            <h1>Explore</h1>
            <p>Discover posts and people on FreeText.</p>
          </div>
        </div>

        <div className="explore-grid">
          {posts
            .filter((post) => post.image)
            .map((post) => (
              <div className="explore-item" key={post.id}>
                <img src={post.image} alt="Explore post" />
              </div>
            ))}
        </div>
      </section>
    );
  }

  function renderMessages() {
    return (
      <section className="page-section">
        <div className="section-heading">
          <div>
            <h1>Messages</h1>
            <p>Chat with your friends.</p>
          </div>
          <button className="primary-button">
            <MessageCircle size={18} />
            New message
          </button>
        </div>

        <div className="message-list">
          {["Alex", "Sarah", "Daniel", "Maya"].map(
            (name, index) => (
              <div className="message-row" key={name}>
                <Avatar text={name} />
                <div className="message-info">
                  <strong>{name}</strong>
                  <span>
                    {index === 0
                      ? "Hey! Welcome to FreeText 👋"
                      : "Tap to start a conversation"}
                  </span>
                </div>
                <span className="message-time">
                  {index + 1}h
                </span>
              </div>
            )
          )}
        </div>
      </section>
    );
  }

  function renderNotifications() {
    return (
      <section className="page-section">
        <div className="section-heading">
          <div>
            <h1>Notifications</h1>
            <p>Stay updated with what is happening.</p>
          </div>
        </div>

        <div className="notification-list">
          <div className="notification-row">
            <div className="notification-icon">
              <Heart size={20} />
            </div>
            <div>
              <strong>Welcome to FreeText</strong>
              <p>
                Start sharing your moments with the community.
              </p>
            </div>
          </div>

          <div className="notification-row">
            <div className="notification-icon">
              <Users size={20} />
            </div>
            <div>
              <strong>Build your community</strong>
              <p>Follow people and make new connections.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <section className="profile-page">
        <div className="profile-cover" />

        <div className="profile-main">
          <div className="profile-avatar">
            <Avatar text={user} large />
          </div>

          <div className="profile-top">
            <div>
              <h1>{user}</h1>
              <p>@{user.toLowerCase().replace(/\s+/g, "")}</p>
            </div>

            <button className="secondary-button">
              <Settings size={18} />
              Edit profile
            </button>
          </div>

          <p className="profile-bio">
            Welcome to my FreeText profile. ✨
          </p>

          <div className="profile-stats">
            <div>
              <strong>{posts.length}</strong>
              <span>Posts</span>
            </div>
            <div>
              <strong>248</strong>
              <span>Followers</span>
            </div>
            <div>
              <strong>186</strong>
              <span>Following</span>
            </div>
          </div>

          <div className="profile-grid">
            {posts
              .filter((post) => post.image)
              .map((post) => (
                <img
                  key={post.id}
                  src={post.image}
                  alt="Profile post"
                />
              ))}
          </div>
        </div>
      </section>
    );
  }

  function pageContent() {
    switch (page) {
      case "explore":
        return renderExplore();
      case "messages":
        return renderMessages();
      case "notifications":
        return renderNotifications();
      case "profile":
        return renderProfile();
      default:
        return renderHome();
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu size={23} />
          </button>

          <button
            className="brand"
            onClick={() => setPage("home")}
          >
            Free<span>Text</span>
          </button>

          <div className="search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search FreeText"
            />
          </div>

          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme"
            >
              {darkMode ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )}
            </button>

            <button
              className="icon-button"
              onClick={() => setPage("notifications")}
            >
              <Bell size={20} />
            </button>

            <button
              className="profile-mini"
              onClick={() => setPage("profile")}
            >
              <Avatar text={user} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className={`layout ${menuOpen ? "menu-visible" : ""}`}>
        <aside className="sidebar">
          <nav>
            <button
              className={page === "home" ? "nav-active" : ""}
              onClick={() => {
                setPage("home");
                setMenuOpen(false);
              }}
            >
              <Home size={21} />
              <span>Home</span>
            </button>

            <button
              className={page === "explore" ? "nav-active" : ""}
              onClick={() => {
                setPage("explore");
                setMenuOpen(false);
              }}
            >
              <Compass size={21} />
              <span>Explore</span>
            </button>

            <button
              className={page === "messages" ? "nav-active" : ""}
              onClick={() => {
                setPage("messages");
                setMenuOpen(false);
              }}
            >
              <MessageCircle size={21} />
              <span>Messages</span>
            </button>

            <button
              className={
                page === "notifications" ? "nav-active" : ""
              }
              onClick={() => {
                setPage("notifications");
                setMenuOpen(false);
              }}
            >
              <Bell size={21} />
              <span>Notifications</span>
            </button>

            <button
              className={page === "profile" ? "nav-active" : ""}
              onClick={() => {
                setPage("profile");
                setMenuOpen(false);
              }}
            >
              <User size={21} />
              <span>Profile</span>
            </button>
          </nav>

          <button
            className="create-button"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={21} />
            Create
          </button>

          <div className="sidebar-bottom">
            <button
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )}
              <span>
                {darkMode ? "Light mode" : "Dark mode"}
              </span>
            </button>

            <button onClick={logout}>
              <LogOut size={20} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        <main className="main-content">
          {pageContent()}
        </main>

        <aside className="right-rail">
          <div className="profile-card">
            <div className="profile-card-user">
              <Avatar text={user} large />
              <div>
                <strong>{user}</strong>
                <span>
                  @{user.toLowerCase().replace(/\s+/g, "")}
                </span>
              </div>
            </div>

            <button
              className="secondary-button full-width"
              onClick={() => setPage("profile")}
            >
              View profile
            </button>
          </div>

          <div className="suggestions-card">
            <div className="card-heading">
              <strong>Suggested for you</strong>
              <button>See all</button>
            </div>

            {["Jordan", "Emma", "Michael"].map((name) => (
              <div className="suggestion" key={name}>
                <Avatar text={name} />
                <div>
                  <strong>{name}</strong>
                  <span>Suggested for you</span>
                </div>
                <button>Follow</button>
              </div>
            ))}
          </div>

          <div className="footer-links">
            <span>About</span>
            <span>Help</span>
            <span>Privacy</span>
            <span>Terms</span>
            <span>© 2026 FreeText</span>
          </div>
        </aside>
      </div>

      <nav className="mobile-nav">
        <button
          className={page === "home" ? "nav-active" : ""}
          onClick={() => setPage("home")}
        >
          <Home size={21} />
          <span>Home</span>
        </button>

        <button
          className={page === "explore" ? "nav-active" : ""}
          onClick={() => setPage("explore")}
        >
          <Compass size={21} />
          <span>Explore</span>
        </button>

        <button
          className="mobile-create"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={23} />
        </button>

        <button
          className={page === "messages" ? "nav-active" : ""}
          onClick={() => setPage("messages")}
        >
          <MessageCircle size={21} />
          <span>Messages</span>
        </button>

        <button
          className={page === "profile" ? "nav-active" : ""}
          onClick={() => setPage("profile")}
        >
          <User size={21} />
          <span>Profile</span>
        </button>
      </nav>

      {showCreate && (
        <div className="modal-backdrop">
          <div className="create-modal">
            <div className="modal-header">
              <div>
                <h2>Create post</h2>
                <p>Share something with FreeText.</p>
              </div>

              <button
                className="icon-button"
                onClick={() => {
                  setShowCreate(false);
                  setCaption("");
                  setImage("");
                }}
              >
                <X size={21} />
              </button>
            </div>

            <div className="composer-user">
              <Avatar text={user} />
              <strong>{user}</strong>
            </div>

            <textarea
              value={caption}
              onChange={(event) =>
                setCaption(event.target.value)
              }
              placeholder="What's on your mind?"
              rows={5}
            />

            {image && (
              <div className="image-preview">
                <img src={image} alt="Preview" />
                <button
                  onClick={() => setImage("")}
                  className="remove-image"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="upload-row">
              <label className="upload-button">
                <ImageIcon size={20} />
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  hidden
                />
              </label>

              <label className="upload-button">
                <Camera size={20} />
                Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImage}
                  hidden
                />
              </label>
            </div>

            <button
              className="primary-button publish-button"
              onClick={createPost}
            >
              <Send size={18} />
              Publish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
