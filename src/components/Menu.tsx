import { Bell, Bookmark, ChevronDown, ChevronRight, HelpCircle, LogOut, Moon, Settings, Shield, User, Users, Video } from "lucide-react";

type MenuProps = {
  profile: any;
  avatar: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onProfile: () => void;
  onMessages: () => void;
  onReels: () => void;
  onNotifications: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
};

function MenuTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className="menu-tile" onClick={onClick}><span className="menu-tile-icon">{icon}</span><span>{label}</span></button>;
}

export default function Menu({ profile, avatar, darkMode, onToggleDarkMode, onProfile, onMessages, onReels, onNotifications, onLogout, isAdmin }: MenuProps) {
  const name = profile?.full_name || profile?.username || "FreeText user";
  const username = profile?.username ? `@${profile.username}` : "View your profile";

  return <section className="menu-page" aria-label="FreeText menu">
    <div className="menu-header"><button className="menu-back" onClick={onProfile} aria-label="Back to profile">‹</button><h1>Menu</h1></div>

    <button className="menu-profile-card" onClick={onProfile}>
      <img src={avatar} alt={name} className="avatar" />
      <span><strong>{name}</strong><small>{username}</small></span>
      <ChevronDown size={22} />
    </button>

    <div className="menu-grid">
      <MenuTile icon={<Users size={24} />} label="Friends" onClick={onProfile} />
      <MenuTile icon={<MessageCircleIcon />} label="Messages" onClick={onMessages} />
      <MenuTile icon={<Video size={24} />} label="Reels" onClick={onReels} />
      <MenuTile icon={<Bookmark size={24} />} label="Saved" onClick={() => window.alert("Saved posts will appear here.")} />
      <MenuTile icon={<Bell size={24} />} label="Notifications" onClick={onNotifications} />
      <MenuTile icon={<User size={24} />} label="Profile" onClick={onProfile} />
      {isAdmin && <MenuTile icon={<Shield size={24} />} label="Admin" onClick={() => window.location.assign("/admin")} />}
    </div>

    <div className="menu-settings-list">
      <button onClick={onToggleDarkMode}><span><Moon size={21} /> Appearance</span><small>{darkMode ? "Dark mode" : "Light mode"}</small><ChevronRight size={20} /></button>
      <button onClick={() => window.alert("FreeText settings are coming here.")}><span><Settings size={21} /> Settings & privacy</span><ChevronRight size={20} /></button>
      <button onClick={() => window.alert("FreeText Help & Support") }><span><HelpCircle size={21} /> Help & support</span><ChevronRight size={20} /></button>
    </div>

    <button className="menu-logout" onClick={onLogout}><LogOut size={21} /> Log out</button>
  </section>;
}

function MessageCircleIcon() {
  return <MessageCircleFallback />;
}

function MessageCircleFallback() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.5-.8L4 20l1.8-4.4A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>;
}
