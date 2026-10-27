import { useRef, useState } from "react";
import { Camera, ImagePlus, UserRound, AtSign, AlignLeft, X, Check, LoaderCircle } from "lucide-react";
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
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>, kind: "avatar" | "cover") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Choose an image smaller than 8MB."); return; }
    setError("");
    const preview = URL.createObjectURL(file);
    if (kind === "avatar") { avatarFile.current = file; setAvatar(preview); }
    else { coverFile.current = file; setCover(preview); }
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
    const cleanName = name.trim();
    const cleanUsername = username.trim().replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
    if (!cleanName) { setError("Please enter your name."); return; }
    if (!/^[a-z0-9._]{3,24}$/.test(cleanUsername)) {
      setError("Username must be 3–24 characters. Use letters, numbers, dots or underscores.");
      return;
    }
    if (!profile?.id) { setError("Your profile could not be loaded. Please sign in again."); return; }
    setBusy(true);
    try {
      const { data: existing, error: lookupError } = await supabase.from("profiles").select("id").eq("username", cleanUsername).neq("id", profile.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) { setError("That username is already taken. Try another one."); return; }
      const avatarUrl = await uploadImage(avatarFile.current, "avatar", avatar);
      const coverUrl = await uploadImage(coverFile.current, "cover", cover);
      const { data, error: updateError } = await supabase.from("profiles").update({
        full_name: cleanName, username: cleanUsername, bio: bio.trim(), avatar_url: avatarUrl,
        cover_url: coverUrl, updated_at: new Date().toISOString()
      }).eq("id", profile.id).select("*").single();
      if (updateError) throw updateError;
      onSaved(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile. Please try again.");
    } finally { setBusy(false); }
  };

  return <div className="modal-backdrop edit-profile-backdrop" onClick={onCancel}>
    <section className="create-modal easy-profile-modal" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={e => e.stopPropagation()}>
      <header className="easy-profile-header">
        <button className="easy-profile-close" onClick={onCancel} aria-label="Close edit profile"><X size={21} /></button>
        <div><p className="easy-profile-eyebrow">MAKE IT YOURS</p><h2 id="edit-profile-title">Edit profile</h2><p className="easy-profile-subtitle">A few simple details help people recognize you.</p></div>
      </header>

      <div className="easy-cover-wrap">
        {cover ? <img className="easy-cover-image" src={cover} alt="Cover preview" /> : <div className="easy-cover-placeholder"><ImagePlus size={25} /><span>Add a cover photo</span></div>}
        <button type="button" className="easy-cover-action" onClick={() => coverInput.current?.click()}><Camera size={16} /> {cover ? "Change cover" : "Add cover"}</button>
        <input ref={coverInput} type="file" accept="image/*" hidden onChange={e => chooseImage(e, "cover")} />
      </div>

      <div className="easy-avatar-row">
        <button type="button" className="easy-avatar-picker" onClick={() => avatarInput.current?.click()} aria-label="Change profile photo">
          {avatar ? <img src={avatar} alt="Profile preview" /> : <span><UserRound size={33} /></span>}
          <i><Camera size={15} /></i>
        </button>
        <input ref={avatarInput} type="file" accept="image/*" hidden onChange={e => chooseImage(e, "avatar")} />
        <div><strong>Your profile photo</strong><p>Choose a clear photo of yourself.</p><button type="button" className="easy-text-button" onClick={() => avatarInput.current?.click()}>Change photo</button></div>
      </div>

      <div className="easy-profile-fields">
        <label className="easy-field"><span><UserRound size={17} /> Your name</span><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={80} /></label>
        <label className="easy-field"><span><AtSign size={17} /> Username</span><div className="easy-username-input"><b>@</b><input autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" value={username} onChange={e => setUsername(e.target.value.replace(/^@/, ""))} placeholder="yourusername" maxLength={24} /></div><small>People can find you with this name. Letters, numbers, dots and underscores.</small></label>
        <label className="easy-field"><span><AlignLeft size={17} /> About you <em>Optional</em></span><textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a little about yourself..." rows={3} maxLength={160} /><small className="easy-bio-count">{bio.length}/160</small></label>
      </div>

      {error && <p className="easy-profile-error" role="alert">{error}</p>}
      <div className="easy-profile-actions">
        <button type="button" className="easy-cancel-button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="easy-save-button" onClick={save} disabled={busy}>{busy ? <><LoaderCircle size={18} className="easy-spin" /> Saving…</> : <><Check size={18} /> Save profile</>}</button>
      </div>
      <p className="easy-profile-footnote">Your profile details can be changed again anytime.</p>
    </section>
  </div>;
}
