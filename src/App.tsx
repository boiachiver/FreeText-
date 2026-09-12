import { useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Camera,
  Compass,
  Heart,
  Home,
  Image as ImageIcon,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";

type Page = "home" | "explore" | "messages" | "notifications" | "profile";

type Post = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  time: string;
};

const starterPosts: Post[] = [
  {
    id: "1",
    name: "Boi Achiver",
    username: "boiachiver",
    avatar: "https://i.pravatar.cc/150?img=12",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    caption: "Building FreeText one step at a time 🚀",
    likes: 128,
    comments: 24,
    liked: false,
    saved: false,
    time: "2h",
  },
  {
    id: "2",
    name: "Maya Johnson",
    username: "mayaj",
    avatar: "https://i.pravatar.cc/150?img=47",
    image:
      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=80",
    caption: "Good energy. Good people. Good memories. ✨",
    likes: 94,
    comments: 13,
    liked: false,
    saved: false,
    time: "4h",
  },
  {
    id: "3",
    name: "Daniel Carter",
    username: "dcarter",
    avatar: "https://i.pravatar.cc/150?img=33",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80",
    caption: "Sometimes you just need to enjoy the journey 🌍",
    likes: 211,
    comments: 31,
    liked: false,
    saved: false,
    time: "6h",
  },
];

const suggestions = [
  {
    name: "Sophia Williams",
    username: "sophiaw",
    avatar: "https://i.pravatar.cc/150?img=32",
  },
  {
    name: "Chris Brown",
    username: "chrisb",
    avatar: "https://i.pravatar.cc/150?img=11",
  },
  {
    name: "Aisha Smith",
    username: "aishas",
    avatar: "https://i.pravatar.cc/150?img=44",
  },
];

function timeAgo(time: string) {
  return time;
}

function Avatar({
  src,
  size = 44,
}: {
  src: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt="avatar"
      className="avatar"
      style={{ width: size, height: size }}
    />
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem("freetext_posts");
      return saved ? JSON.parse(saved) : starterPosts;
    } catch {
      return starterPosts;
    }
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("freetext_dark") === "true";
  });

  const [search, setSearch] = useState("");
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [userName] = useState(() => {
    return localStorage.getItem("freetext_user") || "Boi Achiver";
  });

  const filteredPosts = useMemo(() => {
    if (!search.trim()) return posts;

    const query = search.toLowerCase();

    return posts.filter(
      (post) =>
        post.name.toLowerCase().includes(query) ||
        post.username.toLowerCase().includes(query) ||
        post.caption.toLowerCase().includes(query)
    );
  }, [posts, search]);

  function savePosts(next: Post[]) {
    setPosts(next);
    localStorage.setItem("freetext_posts", JSON.stringify(next));
  }

  function toggleLike(id: string) {
    const next = posts.map((post) =>
      post.id === id
        ? {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1,
          }
        : post
    );

    savePosts(next);
  }

  function toggleSave(id: string) {
    const next = posts.map((post) =>
      post.id === id ? { ...post, saved: !post.saved } : post
    );

    savePosts(next);
  }

  function createPost() {
    if (!caption.trim() && !image) return;

    const newPost: Post = {
      id: Date.now().toString(),
      name: userName,
      username: userName.toLowerCase().replace(/\s+/g, ""),
      avatar: "https://i.pravatar.cc/150?img=12",
      image:
        image ||
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
      caption: caption.trim() || "Sharing something new on FreeText ✨",
      likes: 0,
      comments: 0,
      liked: false,
      saved: false,
      time: "now",
    };

    savePosts([newPost, ...posts]);
    setCaption("");
    setImage("");
    setShowCreate(false);
  }

  function handleImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image.");
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

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("freetext_dark", String(next));
  }

  function navigation(label: Page) {
    setPage(label);
    setShowMenu(false);
  }

  return (
    <div className={darkMode ? "app dark" : "app"}>
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => navigation("home")}>
            <span className="brand-icon">
              <MessageCircle size={22} />
            </span>
            <span>FreeText</span>
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
              onClick={() => setShowCreate(true)}
              aria-label="Create post"
            >
              <Plus size={21} />
            </button>

            <button
              className="icon-button"
              onClick={toggleDarkMode}
              aria-label="Toggle theme"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <button
              className="icon-button"
              onClick={() => navigation("notifications")}
            >
              <Bell size={21} />
            </button>

            <button
              className="profile-mini"
              onClick={() => navigation("profile")}
            >
              <Avatar
                src="https://i.pravatar.cc/150?img=12"
                size={36}
              />
            </button>
          </div>

          <button
            className="mobile-menu-button"
            onClick={() => setShowMenu(!showMenu)}
          >
            {showMenu ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className={showMenu ? "sidebar mobile-open" : "sidebar"}>
          <nav>
            <button
              className={page === "home" ? "nav-item active" : "nav-item"}
              onClick={() => navigation("home")}
            >
              <Home size={21} />
              <span>Home</span>
            </button>

            <button
              className={page === "explore" ? "nav-item active" : "nav-item"}
              onClick={() => navigation("explore")}
            >
              <Compass size={21} />
              <span>Explore</span>
            </button>

            <button
              className={page === "messages" ? "nav-item active" : "nav-item"}
              onClick={() => navigation("messages")}
            >
              <MessageCircle size={21} />
              <span>Messages</span>
            </button>

            <button
              className={
                page === "notifications" ? "nav-item active" : "nav-item"
              }
              onClick={() => navigation("notifications")}
            >
              <Bell size={21} />
              <span>Notifications</span>
            </button>

            <button
              className={page === "profile" ? "nav-item active" : "nav-item"}
              onClick={() => navigation("profile")}
            >
              <User size={21} />
              <span>Profile</span>
            </button>
          </nav>

          <button className="create-button" onClick={() => setShowCreate(true)}>
            <Plus size={20} />
            Create Post
          </button>

          <div className="sidebar-bottom">
            <button className="nav-item">
              <Settings size={21} />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        <main className="main-content">
          {page === "home" && (
            <>
              <section className="stories-card">
                <div className="section-title">
                  <h2>Stories</h2>
                  <button>See all</button>
                </div>

                <div className="stories">
                  <button
                    className="story add-story"
                    onClick={() => setShowCreate(true)}
                  >
                    <span className="story-add">
                      <Plus size={20} />
                    </span>
                    <span>Your story</span>
                  </button>

                  {suggestions.map((person) => (
                    <button className="story" key={person.username}>
                      <span className="story-ring">
                        <Avatar src={person.avatar} size={56} />
                      </span>
                      <span>{person.username}</span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="feed">
                {filteredPosts.map((post) => (
                  <article className="post-card" key={post.id}>
                    <div className="post-header">
                      <div className="user-info">
                        <Avatar src={post.avatar} size={44} />
                        <div>
                          <strong>{post.name}</strong>
                          <span>
                            @{post.username} · {timeAgo(post.time)}
                          </span>
                        </div>
                      </div>

                      <button className="more-button">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>

                    <p className="post-caption">{post.caption}</p>

                    <img
                      className="post-image"
                      src={post.image}
                      alt={post.caption}
                    />

                    <div className="post-stats">
                      <span>{post.likes} likes</span>
                      <span>{post.comments} comments</span>
                    </div>

                    <div className="post-actions">
                      <button
                        className={post.liked ? "liked" : ""}
                        onClick={() => toggleLike(post.id)}
                      >
                        <Heart
                          size={21}
                          fill={post.liked ? "currentColor" : "none"}
                        />
                        Like
                      </button>

                      <button>
                        <MessageCircle size={21} />
                        Comment
                      </button>

                      <button>
                        <Send size={21} />
                        Share
                      </button>

                      <button
                        className={post.saved ? "saved" : ""}
                        onClick={() => toggleSave(post.id)}
                      >
                        <Bookmark
                          size={21}
                          fill={post.saved ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {page === "explore" && (
            <section className="page-section">
              <div className="page-heading">
                <div>
                  <h1>Explore</h1>
                  <p>Discover what's happening on FreeText.</p>
                </div>
              </div>

              <div className="explore-grid">
                {posts.concat(posts).map((post, index) => (
                  <div className="explore-item" key={`${post.id}-${index}`}>
                    <img src={post.image} alt={post.caption} />
                    <div className="explore-overlay">
                      <span>
                        <Heart size={17} /> {post.likes}
                      </span>
                      <span>
                        <MessageCircle size={17} /> {post.comments}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {page === "messages" && (
            <section className="page-section">
              <div className="page-heading">
                <div>
                  <h1>Messages</h1>
                  <p>Chat with people you connect with.</p>
                </div>
              </div>

              <div className="messages-card">
                {suggestions.map((person) => (
                  <button className="message-row" key={person.username}>
                    <Avatar src={person.avatar} size={50} />
                    <div>
                      <strong>{person.name}</strong>
                      <span>Tap to start a conversation</span>
                    </div>
                    <MessageCircle size={20} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {page === "notifications" && (
            <section className="page-section">
              <div className="page-heading">
                <div>
                  <h1>Notifications</h1>
                  <p>Stay updated with your FreeText activity.</p>
                </div>
              </div>

              <div className="notifications-card">
                <div className="notification">
                  <span className="notification-icon">
                    <Heart size={19} />
                  </span>
                  <div>
                    <strong>Maya Johnson</strong> liked your post
                    <small>2 hours ago</small>
                  </div>
                </div>

                <div className="notification">
                  <span className="notification-icon">
                    <Users size={19} />
                  </span>
                  <div>
                    <strong>Sophia Williams</strong> started following you
                    <small>4 hours ago</small>
                  </div>
                </div>

                <div className="notification">
                  <span className="notification-icon">
                    <MessageCircle size={19} />
                  </span>
                  <div>
                    <strong>Chris Brown</strong> commented on your post
                    <small>6 hours ago</small>
                  </div>
                </div>
              </div>
            </section>
          )}

          {page === "profile" && (
            <section className="page-section">
              <div className="profile-card">
                <div className="profile-cover"></div>

                <div className="profile-main">
                  <Avatar
                    src="https://i.pravatar.cc/150?img=12"
                    size={96}
                  />

                  <div className="profile-details">
                    <h1>{userName}</h1>
                    <p>@{userName.toLowerCase().replace(/\s+/g, "")}</p>
                    <span>
                      Building, sharing and connecting on FreeText 🌐
                    </span>
                  </div>

                  <button className="edit-profile">Edit Profile</button>
                </div>

                <div className="profile-stats">
                  <div>
                    <strong>{posts.length}</strong>
                    <span>Posts</span>
                  </div>
                  <div>
                    <strong>1.2K</strong>
                    <span>Followers</span>
                  </div>
                  <div>
                    <strong>348</strong>
                    <span>Following</span>
                  </div>
                </div>
              </div>

              <div className="profile-posts">
                {posts.map((post) => (
                  <div className="profile-post" key={post.id}>
                    <img src={post.image} alt={post.caption} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="right-rail">
          <div className="account-card">
            <div className="account-row">
              <Avatar
                src="https://i.pravatar.cc/150?img=12"
                size={54}
              />
              <div>
                <strong>{userName}</strong>
                <span>@{userName.toLowerCase().replace(/\s+/g, "")}</span>
              </div>
            </div>

            <button className="profile-link" onClick={() => navigation("profile")}>
              View profile
            </button>
          </div>

          <div className="suggestions-card">
            <div className="suggestions-heading">
              <strong>Suggestions for you</strong>
              <button>See all</button>
            </div>

            {suggestions.map((person) => (
              <div className="suggestion-row" key={person.username}>
                <Avatar src={person.avatar} size={42} />
                <div>
                  <strong>{person.name}</strong>
                  <span>@{person.username}</span>
                </div>
                <button>Follow</button>
              </div>
            ))}
          </div>

          <p className="footer-note">
            © 2026 FreeText · Privacy · Terms · About
          </p>
        </aside>
      </div>

      <nav className="mobile-bottom-nav">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => navigation("home")}
        >
          <Home size={21} />
          <span>Home</span>
        </button>

        <button
          className={page === "explore" ? "active" : ""}
          onClick={() => navigation("explore")}
        >
          <Compass size={21} />
          <span>Explore</span>
        </button>

        <button onClick={() => setShowCreate(true)}>
          <span className="bottom-create">
            <Plus size={22} />
          </span>
          <span>Create</span>
        </button>

        <button
          className={page === "messages" ? "active" : ""}
          onClick={() => navigation("messages")}
        >
          <MessageCircle size={21} />
          <span>Messages</span>
        </button>

        <button
          className={page === "profile" ? "active" : ""}
          onClick={() => navigation("profile")}
        >
          <User size={21} />
          <span>Profile</span>
        </button>
      </nav>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Create post</h2>
              <button onClick={() => setShowCreate(false)}>
                <X size={21} />
              </button>
            </div>

            <div className="create-user">
              <Avatar
                src="https://i.pravatar.cc/150?img=12"
                size={45}
              />
              <div>
                <strong>{userName}</strong>
                <span>Public post</span>
              </div>
            </div>

            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="What's on your mind?"
              rows={5}
            />

            {image && (
              <div className="upload-preview">
                <img src={image} alt="Preview" />
                <button onClick={() => setImage("")}>
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="upload-options">
              <label>
                <ImageIcon size={21} />
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  hidden
                />
              </label>

              <label>
                <Camera size={21} />
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

            <button className="publish-button" onClick={createPost}>
              Publish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
