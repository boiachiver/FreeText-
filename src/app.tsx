import { useEffect, useState } from "react";
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  User,
  LogOut,
} from "lucide-react";

import Navbar from "./components/Navbar";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import PostCard from "./components/PostCard";
import Stories from "./components/Stories";
import Messages from "./components/Messages";
import CreatePost from "./components/CreatePost";
import Chat from "./components/Chat";

import {
  defaultProfile,
  starterPosts,
  suggestions,
} from "./data/data";

import type {
  Page,
  Post,
  Person,
} from "./types/types";

type ChatMessage = {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
};

type ChatData = Record<string, ChatMessage[]>;

function App() {
  const [page, setPage] = useState<Page>("home");

  const [search, setSearch] = useState("");

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("freetext_dark") === "true";
  });

  const [userName, setUserName] = useState(() => {
    return (
      localStorage.getItem("freetext_user") ||
      defaultProfile.name
    );
  });

  const [username, setUsername] = useState(() => {
    return (
      localStorage.getItem("freetext_username") ||
      defaultProfile.username
    );
  });

  const [bio, setBio] = useState(() => {
    return (
      localStorage.getItem("freetext_bio") ||
      defaultProfile.bio
    );
  });

  const [profileAvatar, setProfileAvatar] = useState(() => {
    return (
      localStorage.getItem("freetext_avatar") ||
      defaultProfile.avatar
    );
  });

  const [coverPhoto, setCoverPhoto] = useState(() => {
    return (
      localStorage.getItem("freetext_cover") ||
      defaultProfile.coverPhoto
    );
  });

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem("freetext_posts");
      return saved ? JSON.parse(saved) : starterPosts;
    } catch {
      return starterPosts;
    }
  });

  const [chatMessages, setChatMessages] =
    useState<ChatData>(() => {
      try {
        const saved =
          localStorage.getItem("freetext_chats");

        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    });

  const [activeChat, setActiveChat] =
    useState<Person | null>(null);

  const [showCreatePost, setShowCreatePost] =
    useState(false);

  const [showEditProfile, setShowEditProfile] =
    useState(false);

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [newCaption, setNewCaption] =
    useState("");

  const [newPostImage, setNewPostImage] =
    useState("");

  const [editName, setEditName] =
    useState(userName);

  const [editUsername, setEditUsername] =
    useState(username);

  const [editBio, setEditBio] =
    useState(bio);

  const [editAvatar, setEditAvatar] =
    useState(profileAvatar);

  useEffect(() => {
    localStorage.setItem(
      "freetext_dark",
      String(darkMode)
    );

    document.documentElement.classList.toggle(
      "dark",
      darkMode
    );
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(
      "freetext_user",
      userName
    );

    localStorage.setItem(
      "freetext_username",
      username
    );

    localStorage.setItem(
      "freetext_bio",
      bio
    );

    localStorage.setItem(
      "freetext_avatar",
      profileAvatar
    );

    localStorage.setItem(
      "freetext_cover",
      coverPhoto
    );
  }, [
    userName,
    username,
    bio,
    profileAvatar,
    coverPhoto,
  ]);

  useEffect(() => {
    localStorage.setItem(
      "freetext_posts",
      JSON.stringify(posts)
    );
  }, [posts]);

  useEffect(() => {
    localStorage.setItem(
      "freetext_chats",
      JSON.stringify(chatMessages)
    );
  }, [chatMessages]);

  const toggleDarkMode = () => {
    setDarkMode((current) => !current);
  };

  const openCreate = () => {
    setShowCreatePost(true);
  };

  const openProfile = () => {
    setActiveChat(null);
    setPage("profile");
  };

  const openNotifications = () => {
    setActiveChat(null);
    setShowNotifications(true);
  };

  const likePost = (id: string) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked
                ? post.likes - 1
                : post.likes + 1,
            }
          : post
      )
    );
  };

  const savePost = (id: string) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              saved: !post.saved,
            }
          : post
      )
    );
  };

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Please choose an image smaller than 3MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setNewPostImage(
        String(reader.result)
      );
    };

    reader.readAsDataURL(file);
  };

  const publishPost = () => {
    if (!newCaption.trim() && !newPostImage) {
      alert("Write something or add a photo.");
      return;
    }

    const newPost: Post = {
      id: Date.now().toString(),
      name: userName,
      username,
      avatar: profileAvatar,
      image:
        newPostImage ||
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      caption: newCaption.trim(),
      likes: 0,
      comments: 0,
      liked: false,
      saved: false,
      time: "now",
    };

    setPosts((current) => [
      newPost,
      ...current,
    ]);

    setNewCaption("");
    setNewPostImage("");
    setShowCreatePost(false);
    setPage("home");
  };

  const changeCover = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Please choose an image smaller than 3MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setCoverPhoto(
        String(reader.result)
      );
    };

    reader.readAsDataURL(file);
  };

  const changeProfileAvatar = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Please choose an image smaller than 3MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setEditAvatar(
        String(reader.result)
      );
    };

    reader.readAsDataURL(file);
  };

  const openEditProfile = () => {
    setEditName(userName);
    setEditUsername(username);
    setEditBio(bio);
    setEditAvatar(profileAvatar);
    setShowEditProfile(true);
  };

  const saveProfile = () => {
    setUserName(editName.trim() || userName);

    setUsername(
      editUsername
        .trim()
        .replace(/^@/, "")
        .replace(/\s+/g, "")
        .toLowerCase() || username
    );

    setBio(editBio.trim());

    setProfileAvatar(editAvatar);

    setShowEditProfile(false);
  };

  const openChat = (person: Person) => {
    setActiveChat(person);
    setPage("messages");
  };

  const backToMessages = () => {
    setActiveChat(null);
    setPage("messages");
  };

  const sendMessage = (text: string) => {
    if (!activeChat) return;

    const key = activeChat.username;

    const now = new Date();

    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: "me",
      time,
    };

    setChatMessages((current) => ({
      ...current,
      [key]: [
        ...(current[key] || []),
        newMessage,
      ],
    }));
  };

  const conversations = suggestions.map(
    (person) => {
      const messages =
        chatMessages[person.username] || [];

      const lastMessage =
        messages[messages.length - 1];

      return {
        ...person,
        lastMessage:
          lastMessage?.text,
        lastTime:
          lastMessage?.time,
        unread: 0,
        online: true,
      };
    }
  );

  return (
    <div
      className={
        darkMode
          ? "app dark-mode"
          : "app"
      }
    >

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

          <button
            className={
              page === "home"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => {
              setActiveChat(null);
              setPage("home");
            }}
          >
            <Home size={20} />
            Home
          </button>

          <button
            className={
              page === "explore"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => {
              setActiveChat(null);
              setPage("explore");
            }}
          >
            <Compass size={20} />
            Explore
          </button>

          <button
            className={
              page === "messages"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => {
              setActiveChat(null);
              setPage("messages");
            }}
          >
            <MessageCircle size={20} />
            Messages
          </button>

          <button
            className="nav-item"
            onClick={openNotifications}
          >
            <Bell size={20} />
            Notifications
          </button>

          <button
            className={
              page === "profile"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={openProfile}
          >
            <User size={20} />
            Profile
          </button>

          <div className="sidebar-spacer" />

          <button
            className="nav-item"
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
          >
            <LogOut size={20} />
            Reset App
          </button>

        </aside>

        <main className="main-content">

          {page === "home" && (
            <>
              <Stories
                suggestions={suggestions}
                onCreateStory={() =>
                  alert(
                    "Story creation will be added next."
                  )
                }
              />

              <div className="feed">

                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={likePost}
                    onSave={savePost}
                  />
                ))}

              </div>
            </>
          )}

          {page === "profile" && (
            <Profile
              userName={userName}
              username={username}
              bio={bio}
              profileAvatar={profileAvatar}
              coverPhoto={coverPhoto}
              postsCount={posts.length}
              onEditProfile={openEditProfile}
              onChangeCover={changeCover}
            />
          )}

          {page === "explore" && (
            <section className="page-section">

              <div className="page-heading">
                <div>
                  <h1>Explore</h1>
                  <p>
                    Discover people and posts on FreeText.
                  </p>
                </div>
              </div>

              <div className="feed">
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

          {page === "messages" &&
            !activeChat && (
              <Messages
                people={conversations}
                onOpenChat={openChat}
              />
            )}

          {page === "messages" &&
            activeChat && (
              <Chat
                person={activeChat}
                messages={
                  chatMessages[
                    activeChat.username
                  ] || []
                }
                onSendMessage={sendMessage}
                onBack={backToMessages}
              />
            )}

        </main>

      </div>

      {showCreatePost && (
        <CreatePost
          userName={userName}
          profileAvatar={profileAvatar}
          caption={newCaption}
          image={newPostImage}
          onCaptionChange={setNewCaption}
          onImageChange={handleImageChange}
          onRemoveImage={() =>
            setNewPostImage("")
          }
          onPublish={publishPost}
          onClose={() =>
            setShowCreatePost(false)
          }
        />
      )}

      {showEditProfile && (
        <EditProfile
          editName={editName}
          editUsername={editUsername}
          editBio={editBio}
          editAvatar={editAvatar}
          onNameChange={setEditName}
          onUsernameChange={setEditUsername}
          onBioChange={setEditBio}
          onAvatarChange={changeProfileAvatar}
          onSave={saveProfile}
          onClose={() =>
            setShowEditProfile(false)
          }
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
            className="create-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>Notifications</h2>

              <button
                onClick={() =>
                  setShowNotifications(false)
                }
              >
                ×
              </button>
            </div>

            <p>
              You don't have any new notifications.
            </p>
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav">

        <button
          onClick={() => {
            setActiveChat(null);
            setPage("home");
          }}
        >
          <Home size={20} />
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            setActiveChat(null);
            setPage("explore");
          }}
        >
          <Compass size={20} />
          <span>Explore</span>
        </button>

        <button
          onClick={() => {
            setActiveChat(null);
            setPage("messages");
          }}
        >
          <MessageCircle size={20} />
          <span>Messages</span>
        </button>

        <button
          onClick={openProfile}
        >
          <User size={20} />
          <span>Profile</span>
        </button>

      </nav>

    </div>
  );
}

export default App;
