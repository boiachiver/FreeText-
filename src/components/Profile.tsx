import { Edit3, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

type ProfileProps = { profile: any; onEdit: () => void; onLogout?: () => void };

export default function Profile({ profile, onEdit, onLogout }: ProfileProps) {
  const name = profile?.full_name || profile?.username || "FreeText user";
  const username = profile?.username || "user";
  const avatar = profile?.avatar_url || "https://i.pravatar.cc/150?u=" + (profile?.id || "freetext");
  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
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
      <div className="profile-stats modern-profile-stats"><div><strong>FreeText</strong><span>Community member</span></div></div>
      <div style={{ padding: "0 28px 24px" }}>
        <button type="button" onClick={handleLogout} aria-label="Log out of FreeText" style={{ width: "100%", minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, background: "#f3f4f6", color: "#dc2626", fontWeight: 700 }}>
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </div>
  </section>;
}
