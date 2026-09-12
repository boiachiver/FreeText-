import { Bell, MessageCircle, Moon, Plus, Search, Sun } from "lucide-react";

type NavbarProps = {
  search: string;
  setSearch: (value: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  openCreate: () => void;
  openNotifications: () => void;
  openProfile: () => void;
  profileAvatar: string;
};

function Avatar({
  src,
  size = 36,
}: {
  src: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt="Profile"
      className="avatar"
      style={{ width: size, height: size }}
    />
  );
}

export default function Navbar({
  search,
  setSearch,
  darkMode,
  toggleDarkMode,
  openCreate,
  openNotifications,
  openProfile,
  profileAvatar,
}: NavbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">

        <button className="brand" onClick={openProfile}>
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
            className="icon-button modern-create"
            onClick={openCreate}
            aria-label="Create post"
          >
            <Plus size={21} />
          </button>

          <button
            className="icon-button theme-toggle"
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            className="icon-button"
            onClick={openNotifications}
            aria-label="Notifications"
          >
            <Bell size={21} />
          </button>

          <button
            className="profile-mini"
            onClick={openProfile}
            aria-label="Open profile"
          >
            <Avatar src={profileAvatar} size={36} />
          </button>

        </div>

      </div>
    </header>
  );
}
