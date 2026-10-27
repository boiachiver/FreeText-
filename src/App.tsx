import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { Bell, Lock, Moon, Shield, Sun, User, UserPlus, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import { syncAiContext, clearAiContext } from "./lib/aiContext";
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

type Page = "home" | "explore" | "messages" | "profile" | "edit-profile" | "ai";
type Person = { id: string; name: string; username: string; avatar: string };
type DbPost = { id: string; author_id: string; caption: string; image_url: string | null; created_at: string; profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null };
type DbMessage = { id: string; body: string; sender_id: string; created_at: string };

const AI_ID = "boi-achiever-ai";
const AI_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%236d5dfc'/%3E%3Cstop offset='1' stop-color='%2300d4ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='60' fill='%230b1020'/%3E%3Ccircle cx='60' cy='60' r='46' fill='url(%23g)'/%3E%3Cpath d='M39 51c0-8 7-15 15-15h13c8 0 14 7 14 15v18c0 8-6 15-14 15H55c-8 0-16-7-16-15z' fill='white' opacity='.96'/%3E%3Ccircle cx='52' cy='60' r='4' fill='%236d5dfc'/%3E%3Ccircle cx='69' cy='60' r='4' fill='%2300a9d6'/%3E%3Cpath d='M50 71c6 5 14 5 20 0' fill='none' stroke='%236d5dfc' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E";
const AI_PERSON: Person = { id: AI_ID, name: "Boi Achiever AI", username: AI_ID, avatar: AI_AVATAR };

function LoadingScreen({ message }: { message: string }) { return <div className="auth-page"><div className="auth-card"><div className="auth-logo">💬</div><h1>FreeText</h1><p className="auth-subtitle">{message}</p></div></div>; }

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const login = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!email.trim() || !password) { setError("Enter the administrator email and password."); return; }
    setLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError || !data.session) { setLoading(false); setError(loginError?.message || "Unable to sign in."); return; }
    const { data: allowed, error: roleError } = await supabase.rpc("is_super_admin");
    setLoading(false);
    if (roleError || !allowed) { await supabase.auth.signOut(); setError("This account is not authorized as a FreeText super administrator."); return; }
    window.location.reload();
  };
  return <div className="auth-page"><div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" /><section className="auth-card">
    <div className="auth-brand"><div className="auth-logo"><Shield size={28} /></div><span>FreeText Admin</span></div>
    <h1 className="auth-heading">Administrator Login</h1><p className="auth-helper">Secure access to the FreeText administration center.</p>
    <form className="auth-form" onSubmit={login}>
      <div className="auth-input-wrap"><User size={18} /><input className="auth-input" type="email" autoComplete="username" placeholder="Administrator email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="auth-input-wrap"><Lock size={18} /><input className="auth-input" type="password" autoComplete="current-password" placeholder="Administrator password" value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <div className="auth-error">{error}</div>}
      <button className="auth-primary-button" type="submit" disabled={loading}>{loading ? "Signing in securely..." : "Sign in to Admin Center"}</button>
      <button className="auth-phone-button" type="button" onClick={() => window.location.assign("/")}>Back to FreeText</button>
    </form><p className="auth-terms">Admin access is restricted to authorized FreeText super administrators.</p>
  </section></div>;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [verificationGate, setVerificationGate] = useState(() => localStorage.getItem("freetext_pending_verification_email") !== null || new URLSearchParams(window.location.search).get("verified") === "1");
  const [page, setPage] = useState<Page>(() => window.location.pathname === "/ai" ? "ai" : "home");
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("freetext_dark_mode") === "true");
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(() => window.location.pathname === "/admin");
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<Conversation[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(() => window.location.pathname === "/ai" ? AI_PERSON : null);
  const [chatMessages, setChatMessages] = useState<{ id: string; text: string; sender: "me" | "them"; time: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [showStoryCreate, setShowStoryCreate] = useState(false);
  const [storyImage, setStoryImage] = useState("");
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [postCaption, setPostCaption] = useState("");
  const [postImage, setPostImage] = useState("");
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { let mounted = true; const load = async () => { const { data, error: e } = await supabase.auth.getSession(); if (!mounted) return; if (e) console.error(e); setSession(data.session); setAuthLoading(false); }; load(); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => { if (mounted) { setSession(s); setAuthLoading(false); } }); return () => { mounted = false; subscription.unsubscribe(); }; }, []);
  useEffect(() => { const done = () => { localStorage.removeItem("freetext_pending_verification_email"); setVerificationGate(false); }; window.addEventListener("freetext-verification-complete", done); return () => window.removeEventListener("freetext-verification-complete", done); }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); localStorage.setItem("freetext_dark_mode", String(darkMode)); }, [darkMode]);
  useEffect(() => { const onPopState = () => { if (window.location.pathname === "/ai") { setSelectedPerson(AI_PERSON); setPage("ai"); } else if (window.location.pathname === "/") { setSelectedPerson(current => current?.id === AI_ID ? null : current); setPage(current => current === "ai" ? "home" : current); } }; window.addEventListener("popstate", onPopState); return () => window.removeEventListener("popstate", onPopState); }, []);

  const loadProfile = async () => { if (!session?.user?.id) { setProfile(null); return; } setProfileLoading(true); const { data, error: e } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(); if (e) console.error(e); setProfile(data); setProfileLoading(false); };
  useEffect(() => { loadProfile(); }, [session?.user?.id]);
  const loadPeople = async () => { if (!session?.user?.id) return; const { data, error: e } = await supabase.from("profiles").select("id,username,full_name,avatar_url,is_banned").neq("id", session.user.id).eq("is_banned", false).order("created_at", { ascending: false }).limit(100); if (e) { console.error(e); return; } setPeople((data || []).map((p: any) => ({ id: p.id, name: p.full_name || p.username || "FreeText user", username: p.username || p.id.slice(0, 8), avatar: p.avatar_url || "https://i.pravatar.cc/150?u=" + p.id })) as Conversation[]); const { data: follows, error: followsError } = await supabase.from("follows").select("following_id").eq("follower_id", session.user.id); if (followsError) console.error(followsError); setFollowingIds((follows || []).map((f: any) => f.following_id)); };
  const loadPosts = async () => { if (!session?.user?.id) return; const { data, error: e } = await supabase.from("posts").select("id,author_id,caption,image_url,created_at,profiles(full_name,username,avatar_url)").order("created_at", { ascending: false }).limit(100); if (e) { setError(e.message); return; } const ids = (data || []).map((p: any) => p.id); const { data: likes } = ids.length ? await supabase.from("post_likes").select("post_id,user_id").in("post_id", ids) : { data: [] as any[] }; const { data: comments } = ids.length ? await supabase.from("comments").select("post_id").in("post_id", ids) : { data: [] as any[] }; const commentCounts = new Map<string, number>(); (comments || []).forEach((comment: any) => commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1)); const likedSet = new Set((likes || []).filter((l: any) => l.user_id === session.user.id).map((l: any) => l.post_id)); const counts = new Map<string, number>(); (likes || []).forEach((l: any) => counts.set(l.post_id, (counts.get(l.post_id) || 0) + 1)); setPosts((data || []).map((p: DbPost) => ({ id: p.id, name: p.profiles?.full_name || p.profiles?.username || "FreeText user", username: p.profiles?.username || "user", avatar: p.profiles?.avatar_url || "https://i.pravatar.cc/150?u=" + p.author_id, image: p.image_url || "", caption: p.caption, likes: counts.get(p.id) || 0, comments: commentCounts.get(p.id) || 0, liked: likedSet.has(p.id), saved: JSON.parse(localStorage.getItem("freetext_saved") || "[]").includes(p.id), time: new Date(p.created_at).toLocaleString() }))); };
  const loadNotifications = async () => { if (!session?.user?.id) return; const { data } = await supabase.from("notifications").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(50); setNotifications(data || []); };
  const loadStories = async () => { if (!session?.user?.id) return; const { data, error: e } = await supabase.from("stories").select("id,author_id,media_url,media_type,expires_at,created_at,profiles(full_name,username,avatar_url)").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(50); if (e) { console.error(e); return; } setStories((data || []).map((s: any) => ({ id: s.id, name: s.profiles?.full_name || s.profiles?.username || "FreeText user", username: s.profiles?.username || "user", avatar: s.profiles?.avatar_url || "https://i.pravatar.cc/150?u=" + s.author_id, mediaUrl: s.media_url, mediaType: s.media_type, createdAt: s.created_at, expiresAt: s.expires_at }))); };
  useEffect(() => { if (!session?.user?.id) { clearAiContext(); return; } syncAiContext({ profile, posts, notifications, stories, messages: chatMessages }); }, [session?.user?.id, profile, posts, notifications, stories, chatMessages]);

  const chooseStoryImage = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) { setError("Choose a story image smaller than 8MB."); return; } setStoryFile(file); setStoryImage(URL.createObjectURL(file)); };
  const publishStory = async () => { if (!session?.user?.id || !storyFile) { setError("Choose an image for your story first."); return; } setError(""); const ext = storyFile.name.split(".").pop()?.toLowerCase() || "jpg"; const path = `${session.user.id}/story-${crypto.randomUUID()}.${ext}`; const upload = await supabase.storage.from("media").upload(path, storyFile, { contentType: storyFile.type, upsert: false }); if (upload.error) { setError(upload.error.message); return; } const mediaUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl; const { error: e } = await supabase.from("stories").insert({ author_id: session.user.id, media_url: mediaUrl, media_type: storyFile.type.startsWith("video/") ? "video" : "image", expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }); if (e) { setError(e.message); return; } setStoryImage(""); setStoryFile(null); setShowStoryCreate(false); await loadStories(); };
  useEffect(() => { if (!session?.user?.id) return; loadPeople(); loadPosts(); loadNotifications(); loadStories(); const storyChannel = supabase.channel("freetext-stories").on("postgres_changes", { event: "*", schema: "public", table: "stories" }, loadStories).subscribe(); const postChannel = supabase.channel("freetext-posts").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, loadPosts).subscribe(); const notificationChannel = supabase.channel("freetext-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, loadNotifications).subscribe(); return () => { supabase.removeChannel(storyChannel); supabase.removeChannel(postChannel); supabase.removeChannel(notificationChannel); }; }, [session?.user?.id]);

  const logout = async () => { const { error: e } = await supabase.auth.signOut(); if (e) setError(e.message); else { clearAiContext(); setProfile(null); setPage("home"); window.history.replaceState({}, "", "/"); } };
  const openProfile = () => { setPage("profile"); setShowNotifications(false); };
  const openAI = () => { setShowNotifications(false); setSelectedPerson(AI_PERSON); setChatMessages([]); setConversationId(null); setPage("ai"); if (window.location.pathname !== "/ai") window.history.pushState({ page: "ai" }, "", "/ai"); };
  const toggleFollow = async (personId: string) => { if (!session?.user?.id) return; const alreadyFollowing = followingIds.includes(personId); const result = alreadyFollowing ? await supabase.from("follows").delete().eq("follower_id", session.user.id).eq("following_id", personId) : await supabase.from("follows").insert({ follower_id: session.user.id, following_id: personId }); if (result.error) { setError(result.error.message); return; } setFollowingIds(current => alreadyFollowing ? current.filter(id => id !== personId) : [...current, personId]); if (!alreadyFollowing) { const { error: notificationError } = await supabase.from("notifications").insert({ user_id: personId, actor_id: session.user.id, type: "follow", entity_id: session.user.id, message: `${profile?.full_name || profile?.username || "Someone"} started following you` }); if (notificationError) console.error(notificationError); } };
  const profileAvatar = profile?.avatar_url || "https://i.pravatar.cc/150?u=" + (session?.user?.id || "freetext");
  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) { setError("Please choose an image smaller than 8MB."); return; } const reader = new FileReader(); reader.onload = () => setPostImage(String(reader.result || "")); reader.readAsDataURL(file); };
  const publishPost = async () => { if (!session?.user?.id || !postCaption.trim()) return; setError(""); let imageUrl: string | null = null; if (postImage) { const response = await fetch(postImage); const blob = await response.blob(); const path = `${session.user.id}/${crypto.randomUUID()}.${blob.type.split("/")[1] || "jpg"}`; const upload = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, upsert: false }); if (upload.error) { setError(upload.error.message); return; } imageUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl; } const { error: e } = await supabase.from("posts").insert({ author_id: session.user.id, caption: postCaption.trim(), image_url: imageUrl }); if (e) setError(e.message); else { setPostCaption(""); setPostImage(""); setShowCreate(false); await loadPosts(); } };
  const toggleLike = async (postId: string) => { if (!session?.user?.id) return; const current = posts.find(p => p.id === postId); if (!current) return; if (current.liked) await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", session.user.id); else { await supabase.from("post_likes").insert({ post_id: postId, user_id: session.user.id }); const target = (await supabase.from("posts").select("author_id").eq("id", postId).single()).data; if (target && target.author_id !== session.user.id) await supabase.from("notifications").insert({ user_id: target.author_id, actor_id: session.user.id, type: "like", entity_id: postId, message: `${profile?.full_name || profile?.username || "Someone"} liked your post` }); } await loadPosts(); };
  const toggleSave = (id: string) => { const saved: string[] = JSON.parse(localStorage.getItem("freetext_saved") || "[]"); const next = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id]; localStorage.setItem("freetext_saved", JSON.stringify(next)); setPosts(p => p.map(x => x.id === id ? { ...x, saved: next.includes(id) } : x)); };
  const comment = async () => { if (!commentPost || !commentText.trim() || !session?.user?.id) return; const { error: e } = await supabase.from("comments").insert({ post_id: commentPost.id, author_id: session.user.id, body: commentText.trim() }); if (e) setError(e.message); else { setCommentText(""); setCommentPost(null); await loadPosts(); } };
  const sharePost = async (post: Post) => { const url = `${window.location.origin}/?post=${post.id}`; try { await navigator.clipboard.writeText(url); alert("Post link copied"); } catch { alert(url); } };

  const openChat = async (person: Person) => { if (!session?.user?.id) return; setSelectedPerson(person); const { data: mine } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", session.user.id); const ids = (mine || []).map((x: any) => x.conversation_id); let found: string | null = null; if (ids.length) { const { data } = await supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids).eq("user_id", person.id); const candidate = (data || [])[0]?.conversation_id; if (candidate) found = candidate; } if (!found) { const created = await supabase.from("conversations").insert({ created_by: session.user.id }).select("id").single(); if (created.data) { found = created.data.id; await supabase.from("conversation_members").insert([{ conversation_id: found, user_id: session.user.id }, { conversation_id: found, user_id: person.id }]); } } setConversationId(found); if (found) await loadChat(found); };
  const loadChat = async (id: string) => { const { data } = await supabase.from("messages").select("id,body,sender_id,created_at").eq("conversation_id", id).order("created_at", { ascending: true }); setChatMessages(((data || []) as DbMessage[]).map(m => ({ id: m.id, text: m.body, sender: m.sender_id === session?.user?.id ? "me" : "them", time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }))); };
  const sendMessage = async (text: string) => { if (!session?.user?.id || !conversationId) return; const { error: e } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: session.user.id, body: text }); if (e) setError(e.message); else await loadChat(conversationId); };
  useEffect(() => { if (!conversationId || selectedPerson?.id === AI_ID) return; loadChat(conversationId); const channel = supabase.channel(`freetext-chat-${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, () => loadChat(conversationId)).subscribe(); return () => { supabase.removeChannel(channel); }; }, [conversationId, selectedPerson?.id]);

  const filteredPeople = useMemo(() => people.filter(p => `${p.name} ${p.username}`.toLowerCase().includes(search.toLowerCase())), [people, search]);
  if (authLoading) return <LoadingScreen message="Loading your account..." />;
  if (window.location.pathname === "/admin" && (!session || verificationGate || (!profileLoading && !!profile && !profile.is_super_admin))) return <AdminLogin />;
  if (!session || verificationGate) return <Auth />;
  if (profileLoading) return <LoadingScreen message="Loading your profile..." />;

  return <div className="app-shell">
    <Navbar search={search} setSearch={value => { setSearch(value); if (value.trim()) setPage("explore"); }} darkMode={darkMode} toggleDarkMode={() => setDarkMode(v => !v)} openCreate={() => setShowCreate(true)} openNotifications={() => setShowNotifications(true)} openAI={openAI} openProfile={openProfile} profileAvatar={profileAvatar} logout={logout} />
    <main className="main-content">
      {error && <div className="page-section" role="alert"><strong>FreeText:</strong> {error} <button onClick={() => setError("")}><X size={15} /></button></div>}
      {page === "home" && <><Stories suggestions={stories} onCreateStory={() => setShowStoryCreate(true)} onOpenStory={story => { if (story.mediaUrl) window.open(story.mediaUrl, "_blank", "noopener,noreferrer"); }} /><section className="feed">{posts.length ? posts.map(post => <PostCard key={post.id} post={post} onLike={toggleLike} onSave={toggleSave} onComment={setCommentPost} onShare={sharePost} />) : <div className="page-section"><h2>Your FreeText feed</h2><p>Be the first to share something with the community.</p><button onClick={() => setShowCreate(true)}>Create a post</button></div>}</section></>}
      {page === "explore" && <section className="page-section"><h2>Explore FreeText</h2><p>Find people, follow friends and start conversations.</p><div style={{ display: "grid", gap: 10 }}>{filteredPeople.map(p => <div key={p.id} className="conversation-row"><div className="conversation-main"><img src={p.avatar} alt={p.name} className="avatar" style={{ width: 48, height: 48 }} /><div><strong>{p.name}</strong><div>@{p.username}</div></div></div><div style={{ display: "flex", gap: 8 }}><button onClick={() => toggleFollow(p.id)}><UserPlus size={18} /> {followingIds.includes(p.id) ? "Following" : "Follow"}</button><button onClick={() => openChat(p)}>Message</button></div></div>)}</div></section>}
      {page === "messages" && <Messages people={people} onOpenChat={openChat} onCall={(p, video) => alert(`${video ? "Video" : "Audio"} calling ${p.name} requires a WebRTC signaling service.`)} />}
      {page === "profile" && <Profile profile={profile} onEdit={() => setPage("edit-profile")} />}
      {page === "edit-profile" && <EditProfile profile={profile} onCancel={() => setPage("profile")} onSaved={(updated: any) => { setProfile(updated); setPage("profile"); }} />}
      {page === "ai" && selectedPerson?.id === AI_ID && <Chat person={AI_PERSON} messages={[]} onSendMessage={() => undefined} onBack={() => { setSelectedPerson(null); setPage("home"); window.history.pushState({ page: "home" }, "", "/"); }} />}
    </main>
    {showStoryCreate && <div className="modal-backdrop" onClick={() => { setShowStoryCreate(false); setStoryImage(""); setStoryFile(null); }}><div className="create-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><h2>Add to your story</h2><button onClick={() => { setShowStoryCreate(false); setStoryImage(""); setStoryFile(null); }} aria-label="Close">×</button></div><p>Stories disappear after 24 hours.</p><label className="upload-options"><span>Choose photo or video</span><input type="file" accept="image/*,video/*" onChange={chooseStoryImage} /></label>{storyImage && (storyFile?.type.startsWith("video/") ? <video src={storyImage} controls style={{ width: "100%", maxHeight: 320 }} /> : <img src={storyImage} alt="Story preview" style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />)}<button className="publish-button" onClick={publishStory}>Share story</button></div></div>}
    {showCreate && <CreatePost userName={profile?.full_name || profile?.username || "You"} profileAvatar={profileAvatar} caption={postCaption} image={postImage} onCaptionChange={setPostCaption} onImageChange={handleImage} onRemoveImage={() => setPostImage("")} onPublish={publishPost} onClose={() => setShowCreate(false)} />}
    {selectedPerson && page !== "ai" && <Chat person={selectedPerson} messages={chatMessages} onSendMessage={sendMessage} onBack={() => { setSelectedPerson(null); setConversationId(null); setPage("messages"); }} />}
    {commentPost && <div className="modal-backdrop" onClick={() => setCommentPost(null)}><div className="create-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><h2>Comment</h2><button onClick={() => setCommentPost(null)}>×</button></div><p>{commentPost.caption}</p><textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment…" rows={4} /><button className="publish-button" onClick={comment}>Post comment</button></div></div>}
    {showNotifications && <div className="modal-backdrop" onClick={() => setShowNotifications(false)}><div className="notification-modal" onClick={e => e.stopPropagation()}><div className="modal-header"><h2><Bell size={20} /> Notifications</h2><button onClick={() => setShowNotifications(false)}>×</button></div>{notifications.length ? notifications.map(n => <div key={n.id} className="page-section"><strong>{n.type}</strong><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small></div>) : <div className="notification-empty"><Bell size={30} /><h3>No notifications yet</h3><p>Likes and activity will appear here.</p></div>}</div></div>}
    {showAdmin && profile?.is_super_admin && <AdminDashboard onClose={() => { setShowAdmin(false); if (window.location.pathname === "/admin") window.location.replace("/"); }} />}
    <nav className="mobile-bottom-nav"><button onClick={() => setPage("home")} className={page === "home" ? "active" : ""}>🏠<span>Home</span></button><button onClick={() => setPage("explore")} className={page === "explore" ? "active" : ""}>🔍<span>Explore</span></button><button onClick={() => setShowCreate(true)}>➕<span>Create</span></button><button onClick={() => setPage("messages")} className={page === "messages" ? "active" : ""}>💬<span>Messages</span></button><button onClick={openAI} className={page === "ai" ? "active" : ""} aria-label="Open AI">🤖<span>AI</span></button><button onClick={openProfile} className={page === "profile" ? "active" : ""}>👤<span>Profile</span></button><button onClick={() => setDarkMode(v => !v)} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}<span>{darkMode ? "Light" : "Dark"}</span></button>{profile?.is_admin && <button onClick={() => setShowAdmin(true)}><Shield size={18} /><span>Admin</span></button>}</nav>
  </div>;
}

export default App;
