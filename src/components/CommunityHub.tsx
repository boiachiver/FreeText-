import { useEffect, useState } from "react";
import { Compass, Users, Plus, Search, UserPlus, LogIn } from "lucide-react";
import { supabase } from "../lib/supabase";

type Community = { id: string; name: string; slug: string; description: string | null; cover_url: string | null; visibility: string; member_count: number };

export default function CommunityHub({ onClose }: { onClose?: () => void }) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from("communities").select("id,name,slug,description,cover_url,visibility,member_count").order("member_count", { ascending: false }).limit(50);
    if (e) setError(e.message); else setCommunities((data || []) as Community[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const createCommunity = async () => {
    const clean = name.trim();
    if (clean.length < 2) { setError("Community name must be at least 2 characters."); return; }
    setError("");
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setError("Sign in to create a community."); return; }
    const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error: e } = await supabase.from("communities").insert({ owner_id: user.user.id, name: clean, slug, description: description.trim() || null }).select("id").single();
    if (e) { setError(e.message); return; }
    await supabase.from("community_members").insert({ community_id: data.id, user_id: user.user.id, role: "owner" });
    setName(""); setDescription(""); setCreating(false); await load();
  };

  const join = async (communityId: string) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setError("Sign in to join a community."); return; }
    const { error: e } = await supabase.from("community_members").upsert({ community_id: communityId, user_id: user.user.id, role: "member" });
    if (e) setError(e.message); else await load();
  };

  const visible = communities.filter(c => !search.trim() || `${c.name} ${c.description || ""}`.toLowerCase().includes(search.toLowerCase()));

  return <section className="page-section" aria-label="FreeText Communities">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div><h2><Compass size={22} style={{ verticalAlign: "middle" }} /> Communities</h2><p>Build communities around interests, creators, local groups and conversations.</p></div>
      {onClose && <button onClick={onClose}>Close</button>}
      <button className="auth-primary-button" onClick={() => setCreating(v => !v)}><Plus size={17} /> Create community</button>
    </div>
    {creating && <div className="create-modal" style={{ marginTop: 14 }}><h3>Create a community</h3><input className="auth-input" placeholder="Community name" value={name} onChange={e => setName(e.target.value)} /><textarea className="auth-input" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} /><button className="auth-primary-button" onClick={() => void createCommunity()}>Create</button></div>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "16px 0" }}><Search size={18} /><input className="auth-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a community" /></label>
    {loading ? <p>Loading communities…</p> : visible.length === 0 ? <p>No communities yet. Be the first to create one.</p> : <div style={{ display: "grid", gap: 12 }}>{visible.map(c => <article key={c.id} className="page-section" style={{ margin: 0 }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><div className="brand-icon"><Users size={20} /></div><div style={{ flex: 1 }}><h3 style={{ margin: 0 }}>{c.name}</h3><p style={{ margin: "4px 0" }}>{c.description || "A FreeText community"}</p><small>{c.member_count} members · {c.visibility}</small></div><button onClick={() => void join(c.id)}><UserPlus size={16} /> Join</button></div></article>)}</div>}
  </section>;
}
