import { useEffect, useState } from "react";
import { Edit3, LogOut, ShieldCheck, Users, UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";

type ProfileProps = { profile: any; onEdit: () => void; onLogout?: () => void };
type Follower = { id: string; username: string | null; full_name: string | null; avatar_url: string | null; is_verified: boolean };

export default function Profile({ profile, onEdit, onLogout }: ProfileProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const name = profile?.full_name || profile?.username || "FreeText user";
  const username = profile?.username || "user";
  const avatar = profile?.avatar_url || "https://i.pravatar.cc/150?u=" + (profile?.id || "freetext");

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;
    setFollowersLoading(true);
    supabase.rpc("get_profile_followers", { target_user: profile.id }).then(({ data, error }) => {
      if (error) console.error(error);
      if (active) { setFollowers((data || []) as Follower[]); setFollowersLoading(false); }
    });
    return () => { active = false; };
  }, [profile?.id]);

  const handleLogout = async () => {
    if (onLogout) { onLogout(); return; }
    await supabase.auth.signOut();
    window.location.assign("/");
  };

  return <section className="page-section">
    <div className="profile-card modern-profile">
      <div className="profile-cover modern-cover" style={{ backgroundImage: profile?.cover_url ? `url(${profile.cover_url})` : "none" }} />
      <div className="profile-main modern-profile-main">
        <div className="profile-avatar-wrapper"><img src={avatar} alt={name} className="avatar profile-avatar-image" style={{ width: 110, height: 110 }} /></div>
        <div className="profile-details">
          <div className="profile-name-row"><div><h1>{name} {profile?.is_verified && <ShieldCheck size={18} aria-label="Verified account" />}</h1><p>@{username}</p></div><button className="edit-profile modern-edit-button" onClick={onEdit}><Edit3 size={17} /> Edit Profile</button></div>
          <span className="profile-bio">{profile?.bio || "No bio yet. Tell people a little about yourself."}</span>
        </div>
      </div>
      <div className="profile-stats modern-profile-stats"><div><strong>{followers.length}</strong><span>Followers</span></div><div><strong>FreeText</strong><span>Community</span></div></div>
      <div className="profile-followers-panel">
        <div className="profile-followers-heading"><div><h2><Users size={19} /> Followers</h2><p>People who follow @{username}</p></div><span>{followers.length}</span></div>
        {followersLoading ? <div className="profile-followers-empty">Loading followers…</div> : followers.length === 0 ? <div className="profile-followers-empty"><UserPlus size={20} /><span>No followers yet. Your first connection can start here.</span></div> : <div className="profile-followers-list">{followers.map(f => <div className="profile-follower-row" key={f.id}><img src={f.avatar_url || `https://i.pravatar.cc/80?u=${f.id}`} alt="" /><div><strong>{f.full_name || f.username || "FreeText user"} {f.is_verified && <ShieldCheck size={14} />}</strong><span>@{f.username || f.id.slice(0, 8)}</span></div></div>)}</div>}
      </div>
      <div style={{ padding: "0 28px 24px" }}>
        <button type="button" onClick={handleLogout} aria-label="Log out of FreeText" style={{ width: "100%", minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, background: "#f3f4f6", color: "#dc2626", fontWeight: 700 }}><LogOut size={18} /> Log out</button>
      </div>
    </div>
  </section>;
}
