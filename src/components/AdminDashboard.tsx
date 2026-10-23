import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Ban, CheckCircle, Clock, Crown, FileText, Flag, History, LayoutDashboard, RefreshCw, Search, Shield, ShieldCheck, Trash2, UserCog, Users, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

type AdminDashboardProps = { onClose: () => void };
type UserRow = { id: string; username: string | null; full_name: string | null; is_admin: boolean; is_super_admin: boolean; is_verified: boolean; is_banned: boolean; created_at: string };
type PostRow = { id: string; author_id: string; caption: string | null; image_url?: string | null; created_at: string };
type ReportRow = { id: string; reporter_id: string | null; reported_user_id: string | null; post_id: string | null; message: string; status: string; created_at: string; resolved_at?: string | null };
type AuditRow = { id: string; admin_id: string | null; action: string; target_user_id: string | null; target_post_id: string | null; details: Record<string, unknown> | null; created_at: string };

const buttonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 12px", borderRadius: 10, cursor: "pointer" };
const smallButton: React.CSSProperties = { ...buttonStyle, padding: "7px 9px", fontSize: 12 };

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "posts" | "reports" | "admins" | "audit">("overview");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || "")); }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setNotice("");
    const [u, p, r, a] = await Promise.all([
      supabase.from("profiles").select("id,username,full_name,is_admin,is_super_admin,is_verified,is_banned,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("posts").select("id,author_id,caption,image_url,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("reports").select("id,reporter_id,reported_user_id,post_id,message,status,created_at,resolved_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("admin_audit_logs").select("id,admin_id,action,target_user_id,target_post_id,details,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (u.error) setError("Users: " + u.error.message);
    else setUsers((u.data || []) as UserRow[]);
    if (p.error) setError(prev => prev ? prev + " · Posts: " + p.error!.message : "Posts: " + p.error!.message);
    else setPosts((p.data || []) as PostRow[]);
    if (r.error) setError(prev => prev ? prev + " · Reports: " + r.error!.message : "Reports: " + r.error!.message);
    else setReports((r.data || []) as ReportRow[]);
    if (a.error) setError(prev => prev ? prev + " · Audit log: " + a.error!.message : "Audit log: " + a.error!.message);
    else setAudit((a.data || []) as AuditRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runRpc = async (name: string, args: Record<string, unknown>, success: string) => {
    setWorking(name); setError(""); setNotice("");
    const { error: rpcError } = await supabase.rpc(name, args as never);
    setWorking("");
    if (rpcError) { setError(rpcError.message); return; }
    setNotice(success); await load();
  };

  const setRole = async (user: UserRow, admin: boolean, superAdmin: boolean) => {
    if (user.id === currentUserId && (!admin || !superAdmin)) {
      setError("For safety, you cannot remove your own administrator or super-administrator access here."); return;
    }
    if (!window.confirm(`Change ${user.username || user.full_name || "this user"} to ${superAdmin ? "Super Administrator" : admin ? "Administrator" : "Regular User"}?`)) return;
    await runRpc("admin_set_role", { target: user.id, make_admin: admin, make_super_admin: superAdmin }, "Administrator role updated.");
  };

  const setReportStatus = async (report: ReportRow, status: "open" | "reviewed" | "resolved" | "dismissed") => {
    setWorking(report.id); setError(""); setNotice("");
    const { error: updateError } = await supabase.from("reports").update({ status, resolved_at: status === "resolved" || status === "dismissed" ? new Date().toISOString() : null }).eq("id", report.id);
    setWorking("");
    if (updateError) { setError(updateError.message); return; }
    setNotice("Report marked " + status + "."); await load();
  };

  const filteredUsers = useMemo(() => users.filter(u => {
    const term = search.toLowerCase().trim();
    const matches = !term || [u.username, u.full_name, u.id].some(v => (v || "").toLowerCase().includes(term));
    const roleMatch = filter === "all" || (filter === "banned" && u.is_banned) || (filter === "verified" && u.is_verified) || (filter === "admins" && u.is_admin) || (filter === "superadmins" && u.is_super_admin);
    return matches && roleMatch;
  }), [users, search, filter]);
  const filteredPosts = useMemo(() => posts.filter(p => !search || (p.caption || "").toLowerCase().includes(search.toLowerCase()) || p.author_id.toLowerCase().includes(search.toLowerCase())), [posts, search]);
  const filteredReports = useMemo(() => reports.filter(r => (filter === "all" || r.status === filter) && (!search || r.message.toLowerCase().includes(search.toLowerCase()) || r.id.includes(search))), [reports, filter, search]);
  const stat = (label: string, value: number, icon: React.ReactNode, hint?: string) => <div className="page-section" style={{ flex: "1 1 165px", minWidth: 145, margin: 0 }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}>{icon}<div><strong style={{ fontSize: 27 }}>{value}</strong><div>{label}</div>{hint && <small style={{ opacity: .7 }}>{hint}</small>}</div></div></div>;
  const tabs = [
    ["overview", "Overview", LayoutDashboard], ["users", "Users", Users], ["posts", "Posts", FileText],
    ["reports", "Reports", Flag], ["admins", "Admin roles", UserCog], ["audit", "Audit log", History],
  ] as const;

  return <div className="modal-backdrop">
    <div className="create-modal" style={{ width: "min(1180px, 98vw)", maxHeight: "94vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
      <div className="modal-header"><div><h2><Shield size={22} style={{ verticalAlign: "middle" }} /> FreeText Super Admin</h2><p>Platform control center · user safety · moderation · administrator access</p></div><button onClick={onClose} aria-label="Close admin center">×</button></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 16px" }}>
        {tabs.map(([id, label, Icon]) => <button key={id} style={{ ...buttonStyle, background: tab === id ? "var(--accent, #6750a4)" : "var(--surface, transparent)", color: tab === id ? "white" : "inherit" }} onClick={() => { setTab(id); setSearch(""); setFilter("all"); }}><Icon size={16} />{label}</button>)}
        <button style={buttonStyle} onClick={() => void load()} disabled={loading}><RefreshCw size={16} />{loading ? "Refreshing…" : "Refresh"}</button>
      </div>
      {error && <div className="page-section" role="alert" style={{ border: "1px solid #dc6464" }}><strong><AlertTriangle size={16} style={{ verticalAlign: "middle" }} /> Admin error:</strong> {error}</div>}
      {notice && <div className="page-section" role="status" style={{ border: "1px solid #42a878" }}>{notice}</div>}
      {(["users", "posts", "reports", "admins"].includes(tab)) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <label style={{ flex: "1 1 220px", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 10 }}><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === "posts" ? "Search caption or author ID" : tab === "reports" ? "Search reports" : "Search name, username or user ID"} style={{ border: 0, outline: 0, background: "transparent", width: "100%", color: "inherit" }} /></label>
        {(tab === "users" || tab === "admins") && <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 9, borderRadius: 9, background: "var(--surface, transparent)", color: "inherit" }}><option value="all">All users</option><option value="admins">Administrators</option><option value="superadmins">Super admins</option><option value="verified">Verified</option><option value="banned">Banned</option></select>}
        {tab === "reports" && <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 9, borderRadius: 9, background: "var(--surface, transparent)", color: "inherit" }}><option value="all">All statuses</option><option value="open">Open</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select>}
      </div>}
      {loading ? <div className="page-section">Loading secure admin data…</div> : tab === "overview" ? <>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {stat("Registered users", users.length, <Users size={24} />)}
          {stat("Posts", posts.length, <FileText size={24} />)}
          {stat("Open reports", reports.filter(r => r.status === "open").length, <Flag size={24} />)}
          {stat("Banned accounts", users.filter(u => u.is_banned).length, <Ban size={24} />)}
          {stat("Verified accounts", users.filter(u => u.is_verified).length, <CheckCircle size={24} />)}
          {stat("Administrators", users.filter(u => u.is_admin).length, <ShieldCheck size={24} />)}
          {stat("Super admins", users.filter(u => u.is_super_admin).length, <Crown size={24} />)}
          {stat("Audit events", audit.length, <Activity size={24} />)}
        </div>
        <div className="page-section" style={{ marginTop: 14 }}><h3><Clock size={18} style={{ verticalAlign: "middle" }} /> Recent admin activity</h3>{audit.slice(0, 8).length ? audit.slice(0, 8).map(a => <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}><strong>{a.action.replaceAll("_", " ")}</strong><div><small>{new Date(a.created_at).toLocaleString()} · Admin {a.admin_id || "unknown"}</small></div></div>) : <p>No audit events yet.</p>}</div>
      </> : tab === "users" ? <div className="page-section"><h3>Account management ({filteredUsers.length})</h3>{filteredUsers.map(u => <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "13px 0", borderBottom: "1px solid var(--border)" }}><div style={{ minWidth: 180, flex: "1 1 240px" }}><strong>{u.full_name || u.username || "FreeText user"}</strong><div>@{u.username || "unknown"} {u.is_super_admin && " · SUPER ADMIN"} {u.is_admin && !u.is_super_admin && " · ADMIN"} {u.is_verified && " · ✓ VERIFIED"} {u.is_banned && " · BANNED"}</div><small>{new Date(u.created_at).toLocaleDateString()} · ID: {u.id}</small></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button style={smallButton} title={u.is_verified ? "Remove verification" : "Verify user"} disabled={!!working} onClick={() => void runRpc("admin_set_verified", { target: u.id, verified: !u.is_verified }, u.is_verified ? "Verification removed." : "User verified.")}><CheckCircle size={15} />{u.is_verified ? "Unverify" : "Verify"}</button><button style={smallButton} title={u.is_banned ? "Unban user" : "Ban user"} disabled={!!working || u.is_super_admin} onClick={() => { if (window.confirm(`${u.is_banned ? "Unban" : "Ban"} ${u.username || "this user"}?`)) void runRpc("admin_set_banned", { target: u.id, banned: !u.is_banned }, u.is_banned ? "User unbanned." : "User banned."); }}><Ban size={15} />{u.is_banned ? "Unban" : "Ban"}</button></div></div>)}{!filteredUsers.length && <p>No users match your search.</p>}</div> : tab === "admins" ? <div className="page-section"><h3>Administrator access ({filteredUsers.filter(u => u.is_admin || u.is_super_admin).length})</h3><p>Only a super administrator can change these roles. Do not promote accounts you do not trust.</p>{filteredUsers.map(u => <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "13px 0", borderBottom: "1px solid var(--border)" }}><div style={{ flex: "1 1 220px" }}><strong>{u.full_name || u.username || "FreeText user"}</strong><div>@{u.username || "unknown"} · {u.is_super_admin ? "Super Administrator" : u.is_admin ? "Administrator" : "Regular user"}</div><small>{u.id}</small></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{!u.is_super_admin && <button style={smallButton} disabled={!!working || u.is_banned} onClick={() => void setRole(u, true, false)}><ShieldCheck size={15} />Make admin</button>}{u.is_admin && !u.is_super_admin && <button style={smallButton} disabled={!!working || u.id === currentUserId} onClick={() => void setRole(u, false, false)}>Remove admin</button>}{!u.is_super_admin && <button style={smallButton} disabled={!!working || u.is_banned} onClick={() => void setRole(u, true, true)}><Crown size={15} />Make super admin</button>}{u.is_super_admin && u.id !== currentUserId && <button style={smallButton} disabled={!!working} onClick={() => void setRole(u, true, false)}>Remove super admin</button>}</div></div>)}{!filteredUsers.length && <p>No users match your search.</p>}</div> : tab === "posts" ? <div className="page-section"><h3>Post moderation ({filteredPosts.length})</h3>{filteredPosts.map(p => <div key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}><p style={{ whiteSpace: "pre-wrap" }}>{p.caption || "(media post)"}</p>{p.image_url && <a href={p.image_url} target="_blank" rel="noreferrer">Open media</a>}<div><small>{new Date(p.created_at).toLocaleString()} · Author: {p.author_id} · Post: {p.id}</small></div><button style={{ ...smallButton, marginTop: 8 }} disabled={!!working} onClick={() => { if (window.confirm("Permanently delete this post?")) void runRpc("admin_delete_post", { target: p.id }, "Post deleted."); }}><Trash2 size={15} />Delete post</button></div>)}{!filteredPosts.length && <p>No posts match your search.</p>}</div> : tab === "reports" ? <div className="page-section"><h3>Report queue ({filteredReports.length})</h3>{filteredReports.map(r => <div key={r.id} style={{ padding: "13px 0", borderBottom: "1px solid var(--border)" }}><strong>{r.status.toUpperCase()}</strong><p>{r.message}</p><small>{new Date(r.created_at).toLocaleString()} · Reporter: {r.reporter_id || "unknown"} · Reported user: {r.reported_user_id || "none"} · Post: {r.post_id || "none"}</small><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>{(["open", "reviewed", "resolved", "dismissed"] as const).map(status => <button key={status} style={smallButton} disabled={!!working || r.status === status} onClick={() => void setReportStatus(r, status)}>{status === "resolved" ? <CheckCircle size={14} /> : status === "dismissed" ? <XCircle size={14} /> : <Flag size={14} />}{status}</button>)}</div></div>)}{!filteredReports.length && <p>No reports match this filter.</p>}</div> : <div className="page-section"><h3>Security audit log</h3><p>Latest 200 recorded administrator actions.</p>{audit.map(a => <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}><strong>{a.action.replaceAll("_", " ")}</strong><div><small>{new Date(a.created_at).toLocaleString()}</small></div><small>Admin: {a.admin_id || "unknown"} · User: {a.target_user_id || "—"} · Post: {a.target_post_id || "—"}</small>{a.details && Object.keys(a.details).length > 0 && <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>{JSON.stringify(a.details, null, 2)}</pre>}</div>)}{!audit.length && <p>No audit events yet.</p>}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 16 }}><small>FreeText · Restricted administration area</small><button style={buttonStyle} onClick={onClose}>Return to FreeText</button></div>
    </div>
  </div>;
}
