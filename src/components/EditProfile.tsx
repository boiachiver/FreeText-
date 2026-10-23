import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type EditProfileProps = { profile: any; onCancel: () => void; onSaved: (profile: any) => void };

export default function EditProfile({ profile, onCancel, onSaved }: EditProfileProps) {
  const [name, setName] = useState(profile?.full_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [cover, setCover] = useState(profile?.cover_url || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const avatarFile = useRef<File | null>(null);
  const coverFile = useRef<File | null>(null);

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>, kind: "avatar" | "cover") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Choose an image smaller than 8MB."); return; }
    if (kind === "avatar") { avatarFile.current = file; setAvatar(URL.createObjectURL(file)); }
    else { coverFile.current = file; setCover(URL.createObjectURL(file)); }
  };

  const uploadImage = async (file: File | null, kind: string, current: string) => {
    if (!file || !profile?.id) return current || null;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/${kind}-${crypto.randomUUID()}.${ext}`;
    const result = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
    if (result.error) throw result.error;
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

  const save = async () => {
    setError("");
    const cleanUsername = username.trim().replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
    if (!name.trim() || cleanUsername.length < 3) { setError("Enter your name and a username with at least 3 characters."); return; }
    if (!profile?.id) { setError("Your profile could not be loaded. Please sign in again."); return; }
    setBusy(true);
    try {
      const avatarUrl = await uploadImage(avatarFile.current, "avatar", avatar);
      const coverUrl = await uploadImage(coverFile.current, "cover", cover);
      const { data: existing, error: lookupError } = await supabase.from("profiles").select("id").eq("username", cleanUsername).neq("id", profile.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) { setError("That username is already taken."); setBusy(false); return; }
      const { data, error: updateError } = await supabase.from("profiles").update({ full_name: name.trim(), username: cleanUsername, bio: bio.trim(), avatar_url: avatarUrl, cover_url: coverUrl, updated_at: new Date().toISOString() }).eq("id", profile.id).select("*").single();
      if (updateError) throw updateError;
      onSaved(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
    } finally { setBusy(false); }
  };

  return <div className="modal-backdrop" onClick={onCancel}><div className="create-modal modern-edit-modal" onClick={e => e.stopPropagation()}>
    <div className="modal-header"><h2>Edit Profile</h2><button onClick={onCancel} aria-label="Close"><X size={21} /></button></div>
    <div className="edit-profile-preview"><img src={avatar || "https://i.pravatar.cc/150?u=freetext"} alt="Profile preview" className="avatar" /></div>
    <label className="upload-options profile-photo-button"><Camera size={20} /> Change profile photo<input type="file" accept="image/*" onChange={e => chooseImage(e, "avatar")} hidden /></label>
    <label className="profile-edit-label">Cover photo</label><input type="file" accept="image/*" onChange={e => chooseImage(e, "cover")} />
    <label className="profile-edit-label">Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
    <label className="profile-edit-label">Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
    <label className="profile-edit-label">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people about yourself" rows={4} />
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="publish-button modern-save-button" onClick={save} disabled={busy}>{busy ? "Saving..." : "Save Changes"}</button>
  </div></div>;
}
