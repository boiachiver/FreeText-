import { useEffect, useState } from "react";
import { Ban, CheckCircle, Shield, Trash2, Users, FileText, Flag } from "lucide-react";
import { supabase } from "../lib/supabase";

type AdminDashboardProps = { onClose: () => void };

type UserRow = { id: string; username: string | null; full_name: string | null; is_admin: boolean; is_verified: boolean; is_banned: boolean; created_at: string };
type PostRow = { id: string; author_id: string; caption: string; created_at: string };
type ReportRow = { id: string; reporter_id: string | null; reported_user_id: string | null; post_id: string | null; message: string; status: string; created_at: string };

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "posts" | "reports">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    const [u, p, r] = await Promise.all([
      supabase.from("profiles").select("id,username,full_name,is_admin,is_verified,is_banned,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("posts").select("id,author_id,caption,created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("reports").select("id,reporter_id,reported_user_id,post_id,message,status,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (u.error || p.error || r.error) setError(u.error?.message || p.error?.message || r.error?.message || "Unable to load admin data");
    setUsers((u.data || []) as UserRow[]); setPosts((p.data || []) as PostRow[]); setReports((r.data || []) as ReportRow[]); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const action = async (name: "admin_set_banned" | "admin_set_verified" | "admin_delete_post", target: string, value?: boolean) => {
    const { error: callError } = await supabase.rpc(name, name === "admin_delete_post" ? { target } : { target, [name === "admin_set_banned" ? "banned" : "verified"]: value });
    if (callError) { setError(callError.message); return; }
    await load();
  };

  const stat = (label: string, value: number, icon: React.ReactNode) => <div className="page-section" style={{ flex: 1, minWidth: 160 }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}>{icon}<div><strong style={{ fontSize: 26 }}>{value}</strong><div>{label}</div></div></div></div>;

  return <div className="modal-backdrop">
    <div className="create-modal" style={{ width: "min(1100px, 96vw)", maxHeight: "92vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><div><h2><Shield size={21} style={{ verticalAlign: "middle" }} /> Admin Center</h2><p>Moderation, users, posts and reports</p></div><button onClick={onClose}>×</button></div>
      {error && <div className="page-section"><strong>Admin error:</strong> {error}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setTab("overview")}>Overview</button><button onClick={() => setTab("users")}>Users</button><button onClick={() => setTab("posts")}>Posts</button><button onClick={() => setTab("reports")}>Reports</button><button onClick={load}>Refresh</button>
      </div>
      {loading ? <div className="page-section">Loading admin data…</div> : tab === "overview" ? <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {stat("Users", users.length, <Users />)}{stat("Posts", posts.length, <FileText />)}{stat("Open reports", reports.filter(r => r.status === "open").length, <Flag />)}{stat("Banned", users.filter(u => u.is_banned).length, <Ban />)}
      </div> : tab === "users" ? <div className="page-section">{users.map(u => <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}><div><strong>{u.full_name || u.username || "User"}</strong><div>@{u.username || "unknown"} {u.is_admin && "· ADMIN"} {u.is_verified && "· ✓"} {u.is_banned && "· BANNED"}</div></div><div style={{ display: "flex", gap: 6 }}><button title="Verify" onClick={() => action("admin_set_verified", u.id, !u.is_verified)}><CheckCircle size={17} /></button><button title={u.is_banned ? "Unban" : "Ban"} onClick={() => action("admin_set_banned", u.id, !u.is_banned)}><Ban size={17} /></button></div></div>)}</div> : tab === "posts" ? <div className="page-section">{posts.map(p => <div key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}><p>{p.caption || "(media post)"}</p><small>{new Date(p.created_at).toLocaleString()}</small><button style={{ float: "right" }} onClick={() => action("admin_delete_post", p.id)} title="Delete post"><Trash2 size={17} /></button></div>)}</div> : <div className="page-section">{reports.map(r => <div key={r.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}><strong>{r.status.toUpperCase()}</strong><p>{r.message}</p><small>{new Date(r.created_at).toLocaleString()}</small></div>)}</div>}
    </div>
  </div>;
}
