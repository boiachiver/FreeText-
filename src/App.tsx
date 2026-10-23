import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { Bell, Lock, Shield, User, UserPlus, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import Navbar from "./components/Navbar";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import Stories from "./components/Stories";
import Messages, { type Conversation } from "./components/Messages";
import CreatePost from "./components/CreatePost";
import Chat from "./components/Chat";
import Auth from "./components/Auth";
import PostCard, { type Post } from "./components/PostCard";
import AdminDashboard from "./components/AdminDashboard";

type Page = "home" | "explore" | "messages" | "profile" | "edit-profile";
type Person = { id: string; name: string; username: string; avatar: string };
type DbPost = { id: string; author_id: string; caption: string; image_url: string | null; created_at: string; profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null };
type DbMessage = { id: string; body: string; sender_id: string; created_at: string };

function LoadingScreen({ message }: { message: string }) { return <div className="auth-page"><div className="auth-card"><div className="auth-logo">💬</div><h1>FreeText</h1><p className="auth-subtitle">{message}</p></div></div>; }

function AdminDenied() {
  return <div className="auth-page"><div className="auth-card"><div className="auth-logo"><Shield size={30} /></div><h1>Admin access denied</h1><p className="auth-subtitle">This area is restricted to the FreeText super administrator.</p><button onClick={() => window.location.assign("/")}>Return to FreeText</button></div></div>;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter the administrator email and password.");
      return;
    }
    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError || !data.session) {
      setLoading(false);
      setError(loginError?.message || "Unable to sign in.");
      return;
    }
    const { data: allowed, error: roleError } = await supabase.rpc("is_super_admin");
    setLoading(false);
    if (roleError || !allowed) {
      await supabase.auth.signOut();
      setError("This account is not authorized as a FreeText super administrator.");
      return;
    }
    window.location.reload();
  };

  return <div className="auth-page">
    <div className="auth-glow auth-glow-one" />
    <div className="auth-glow auth-glow-two" />
    <section className="auth-card">
      <div className="auth-brand"><div className="auth-logo"><Shield size={28} /></div><span>FreeText Admin</span></div>
      <h1 className="auth-heading">Administrator Login</h1>
      <p className="auth-helper">Secure access to the FreeText administration center.</p>
      <form className="auth-form" onSubmit={login}>
        <div className="auth-input-wrap"><User size={18} /><input className="auth-input" type="email" autoComplete="username" placeholder="Administrator email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="auth-input-wrap"><Lock size={18} /><input className="auth-input" type="password" autoComplete="current-password" placeholder="Administrator password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? "Signing in securely..." : "Sign in to Admin Center"}</button>
        <button className="auth-phone-button" type="button" onClick={() => window.location.assign("/")}>Back to FreeText</button>
      </form>
      <p className="auth-terms">Admin access is restricted to authorized FreeText super administrators.</p>
    </section>
  </div>;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [verificationGate, setVerificationGate] = useState(() => localStorage.getItem("freetext_pending_verification_email") !== null || new URLSearchParams(window.location.search).get("verified") === "1");
  const [page, setPage] = useState<Page>("home");
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("freetext_dark_mode") === "true");
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<Conversation[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; text: string; sender: "me" | "them"; time: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [postCaption, setPostCaption] = useState("");
  const [postImage, setPostImage] = useState("");
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { let mounted = true; const load = async () => { const { data, error: e } = await supabase.auth.getSession(); if (!mounted) return; if (e) console.error(e); setSession(data.session); setAuthLoading(false); }; load(); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => { if (mounted) { setSession(s); setAuthLoading(false); } }); return () => { mounted = false; subscription.unsubscribe(); }; }, []);
  useEffect(() => { const done = () => { localStorage.removeItem("freetext_pending_verification_email"); setVerificationGate(false); }; window.addEventListener("freetext-verification-complete", done); return () => window.removeEventListener("freetext-verification-complete", done); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); localStorage.setItem("freetext_dark_mode", String(darkMode)); }, [darkMode]);

  const loadProfile = async () => { if (!session?.user?.id) { setProfile(null); return; } setProfileLoading(true); const { data, error: e } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(); if (e) console.error(e); setProfile(data); setProfileLoading(false); };
  useEffect(() => { loadProfile(); }, [session?.user?.id]);

  const loadPeople = async () => { if (!session?.user?.id) return; const { data, error: e } = await supabase.from("profiles").select("id,username,full_name,avatar_url,is_banned").neq("id", session.user.id).eq("is_banned", false).order("created_at", { ascending: false }).limit(100); if (e) { console.error(e); return; } setPeople((data || []).map((p: any) => ({ id: p.id, name: p.full_name || p.username || "FreeText user", username: p.username || p.id.slice(0, 8), avatar: p.avatar_url || "https://i.pravatar.cc/150?u=" + p.id })) as Conversation[]); };

  const loadPosts = async () => { if (!session?.user?.id) return; const { data, error: e } = await supabase.from("posts").select("id,author_id,caption,image_url,created_at,profiles(full_name,username,avatar_url)").order("created_at", { ascending: false }).limit(100); if (e) { setError(e.message); return; } const ids = (data || []).map((p: any) => p.id); const { data: likes } = ids.length ? await supabase.from("post_likes").select("post_id,user_id").in("post_id", ids) : { data: [] as any[] }; const likedSet = new Set((likes || []).filter((l: any) => l.user_id === session.user.id).map((l: any) => l.post_id)); const counts = new Map<string, number>(); (likes || []).forEach((l: any) => counts.set(l.post_id, (counts.get(l.post_id) || 0) + 1)); setPosts((data || []).map((p: DbPost) => ({ id: p.id, name: p.profiles?.full_name || p.profiles?.username || "FreeText user", username: p.profiles?.username || "user", avatar: p.profiles?.avatar_url || "https://i.pravatar.cc/150?u=" + p.author_id, image: p.image_url || "", caption: p.caption, likes: counts.get(p.id) || 0, comments: 0, liked: likedSet.has(p.id), saved: JSON.parse(localStorage.getItem("freetext_saved") || "[]").includes(p.id), time: new Date(p.created_at).toLocaleString() }))); };

  const loadNotifications = async () => { if (!session?.user?.id) return; const { data } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(50); setNotifications(data || []); };
  useEffect(() => { if (!session?.user?.id) return; loadPeople(); loadPosts(); loadNotifications(); const postChannel = supabase.channel("freetext-posts").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, loadPosts).subscribe(); const notificationChannel = supabase.channel("freetext-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, loadNotifications).subscribe(); return () => { supabase.removeChannel(postChannel); supabase.removeChannel(notificationChannel); }; }, [session?.user?.id]);

  const logout = async () => { const { error: e } = await supabase.auth.signOut(); if (e) setError(e.message); else { setProfile(null); setPage("home"); } };
  const openProfile = () => { setPage("profile"); setShowNotifications(false); };
  const profileAvatar = profile?.avatar_url || "https://i.pravatar.cc/150?u=" + (session?.user?.id || "freetext");

  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) { setError("Please choose an image smaller than 8MB."); return; } const reader = new FileReader(); reader.onload = () => setPostImage(String(reader.result || "")); reader.readAsDataURL(file); };

  const publishPost = async () => { if (!session?.user?.id || !postCaption.trim()) return; setError(""); let imageUrl: string | null = null; if (postImage) { const response = await fetch(postImage); const blob = await response.blob(); const path = `${session.user.id}/${crypto.randomUUID()}.${blob.type.split("/")[1] || "jpg"}`; const upload = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, upsert: false }); if (upload.error) { setError(upload.error.message); return; } imageUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl; } const { error: e } = await supabase.from("posts").insert({ author_id: session.user.id, caption: postCaption.trim(), image_url: imageUrl }); if (e) setError(e.message); else { setPostCaption(""); setPostImage(""); setShowCreate(false); await loadPosts(); } };

  const toggleLike = async (postId: string) => { if (!session?.user?.id) return; const current = posts.find(p => p.id === postId); if (!current) return; if (current.liked) await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", session.user.id); else { await supabase.from("post_likes").insert({ post_id: postId, user_id: session.user.id }); const target = (await supabase.from("posts").select("author_id").eq("id", postId).single()).data; if (target && target.author_id !== session.user.id) await supabase.from("notifications").insert({ user_id: target.author_id, actor_id: session.user.id, type: "like", entity_id: postId, message: `${profile?.full_name || profile?.username || "Someone"} liked your post` }); } await loadPosts(); };
  const toggleSave = (id: string) => { const saved: string[] = JSON.parse(localStorage.getItem("freetext_saved") || "[]"); const next = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]; localStorage.setItem("freetext_saved", JSON.stringify(next)); setPosts(p => p.map(x => x.id === id ? { ...x, saved: next.includes(id) } : x)); };
  const comment = async () => { if (!commentPost || !commentText.trim() || !session?.user?.id) return; const { error: e } = await supabase.from("comments").insert({ post_id: commentPost.id, author_id: session.user.id, body: commentText.trim() }); if (e) setError(e.message); else { setCommentText(""); setCommentPost(null); } };
  const sharePost = async (post: Post) => { const url = `${window.location.origin}/?post=${post.id}`; try { await navigator.clipboard.writeText(url); alert("Post link copied"); } catch { alert(url); } };

  const openChat = async (person: Person) => { if (!session?.user?.id) return; setSelectedPerson(person); const { data: mine } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", session.user.id); const ids = (mine || []).map((x: any) => x.conversation_id); let found: string | null = null; if (ids.length) { const { data } = await supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids).eq("user_id", person.id); const candidate = (data || [])[0]?.conversation_id; if (candidate) found = candidate; } if (!found) { const created = await supabase.from("conversations").insert({ created_by: session.user.id }).select("id").single(); if (created.data) { found = created.data.id; await supabase.from("conversation_members").insert([{ conversation_id: found, user_id: session.user.id }, { conversation_id: found, user_id: person.id }]); } } setConversationId(found); if (found) await loadChat(found); };
  const loadChat = async (id: string) => { const { data } = await supabase.from("messages").select("id,body,sender_id,created_at").eq("conversation_id", id).order("created_at", { ascending: true }); setChatMessages(((data || []) as DbMessage[]).map(m => ({ id: m.id, text: m.body, sender: m.sender_id === session?.user?.id ? "me" : "them", time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }))); };
  const sendMessage = async (text: string) => { if (!session?.user?.id || !conversationId) return; const { error: e } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: session.user.id, body: text }); if (e) setError(e.message); else await loadChat(conversationId); };

  const filteredPeople = useMemo(() => people.filter(p => `${p.name} ${p.username}`.toLowerCase().includes(search.toLowerCase())), [people, search]);
  if (authLoading) return <LoadingScreen message="Loading your account..." />;
  if (window.location.pathname === "/admin" && (!session || verificationGate || (!profileLoading && !!profile && !profile.is_super_admin))) return <AdminLogin />;
  if (!session || verificationGate) return <Auth />;
  if (profileLoading) return <LoadingScreen message="Loading your profile..." />;

  if (window.location.pathname === "/admin") {
    if (!profile?.is_super_admin) return <AdminDenied />;
    return <div className="app-shell"><main className="main-content"><AdminDashboard onClose={() => window.location.assign("/")} /></main></div>;
  }

  return <div className="app-shell">
    <Navbar search={search} setSearch={setSearch} darkMode={darkMode} toggleDarkMode={() => setDarkMode(v => !v)} openCreate={() => setShowCreate(true)} openNotifications={() => setShowNotifications(true)} openProfile={openProfile} profileAvatar={profileAvatar} logout={logout} />
    <main className="main-content">
      {error && <div className="page-section" role="alert"><strong>FreeText:</strong> {error} <button onClick={() => setError("")}><X size={15} /></button></div>}
      {page === "home" && <><Stories /><section className="feed">{posts.length ? posts.map(post => <PostCard key={post.id} post={post} onLike={toggleLike} onSave={toggleSave} onComment={setCommentPost} onShare={sharePost} />) : <div className="page-section"><h2>Your FreeText feed</h2><p>Be the first to share something with the community.</p><button onClick={() => setShowCreate(true)}>Create a post</button></div>}</section></>}
      {page === "explore" && <section className="page-section"><h2>Explore FreeText</h2><p>Find people, follow friends and start conversations.</p><div style={{ display: "grid", gap: 10 }}>{filteredPeople.map(p => <div key={p.id} className="conversation-row"><div className="conversation-main"><img src={p.avatar} alt={p.name} className="avatar" style={{ width: 48, height: 48 }} /><div><strong>{p.name}</strong><div>@{p.username}</div></div></div><button onClick={() => openChat(p)}><UserPlus size={18} /> Message</button></div>)}</div></section>}
      {page === "messages" && <Messages people={people} onOpenChat={openChat} onCall={(p, video) => alert(`${video ? "Video" : "Audio"} calling ${p.name} requires a WebRTC signaling service.`)} />}
      {page === "profile" && <Profile profile={profile} onEdit={() => setPage("edit-profile")} />}
      {page === "edit-profile" && <EditProfile profile={profile} onCancel={() => setPage("profile")} onSaved={(updated: any) => { setProfile(updated); setPage("profile"); }} />}
    </main>
    {showCreate && <CreatePost userName={profile?.full_name || profile?.username || "You"} profileAvatar={profileAvatar} caption={postCaption} image={postImage} onCaptionChange={setPostCaption} onImageChange={handleImage} onRemoveImage={() => setPostImage("")} onPublish={publishPost} onClose={() => setShowCreate(false)} />}
    {selectedPerson && <Chat person={selectedPerson} messages={chatMessages} onSendMessage={sendMessage} onBack={() => { setSelectedPerson(null); setConversationId(null); setPage("messages"); }} />}
    {commentPost && <div className="modal-backdrop" onClick={() => setCommentPost(null)}><div className="create-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><h2>Comment</h2><button onClick={() => setCommentPost(null)}>×</button></div><p>{commentPost.caption}</p><textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment…" rows={4} /><button className="publish-button" onClick={comment}>Post comment</button></div></div>}
    {showNotifications && <div className="modal-backdrop" onClick={() => setShowNotifications(false)}><div className="notification-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><h2><Bell size={20} /> Notifications</h2><button onClick={() => setShowNotifications(false)}>×</button></div>{notifications.length ? notifications.map(n => <div key={n.id} className="page-section"><strong>{n.type}</strong><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small></div>) : <div className="notification-empty"><Bell size={30} /><h3>No notifications yet</h3><p>Likes and activity will appear here.</p></div>}</div></div>}
    {showAdmin && profile?.is_admin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    <nav className="mobile-bottom-nav"><button onClick={() => setPage("home")} className={page === "home" ? "active" : ""}>🏠<span>Home</span></button><button onClick={() => setPage("explore")} className={page === "explore" ? "active" : ""}>🔍<span>Explore</span></button><button onClick={() => setShowCreate(true)}>➕<span>Create</span></button><button onClick={() => setPage("messages")} className={page === "messages" ? "active" : ""}>💬<span>Messages</span></button><button onClick={openProfile} className={page === "profile" ? "active" : ""}>👤<span>Profile</span></button>{profile?.is_admin && <button onClick={() => setShowAdmin(true)}><Shield size={18} /><span>Admin</span></button>}</nav>
  </div>;
}

export default App;