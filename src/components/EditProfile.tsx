import { Camera, X } from "lucide-react";

type EditProfileProps = {
  editName: string;
  editUsername: string;
  editBio: string;
  editAvatar: string;
  onNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function EditProfile({
  editName,
  editUsername,
  editBio,
  editAvatar,
  onNameChange,
  onUsernameChange,
  onBioChange,
  onAvatarChange,
  onSave,
  onClose,
}: EditProfileProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="create-modal modern-edit-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Edit Profile</h2>

          <button onClick={onClose} aria-label="Close">
            <X size={21} />
          </button>
        </div>

        <div className="edit-profile-preview">
          <img
            src={editAvatar}
            alt="Profile preview"
            className="avatar"
          />
        </div>

        <label className="upload-options profile-photo-button">
          <Camera size={20} />
          Change Profile Photo

          <input
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            hidden
          />
        </label>

        <label className="profile-edit-label">
          Name
        </label>

        <input
          value={editName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Your name"
        />

        <label className="profile-edit-label">
          Username
        </label>

        <input
          value={editUsername}
          onChange={(event) =>
            onUsernameChange(event.target.value)
          }
          placeholder="Username"
        />

        <label className="profile-edit-label">
          Bio
        </label>

        <textarea
          value={editBio}
          onChange={(event) => onBioChange(event.target.value)}
          placeholder="Tell people about yourself"
          rows={4}
        />

        <button
          className="publish-button modern-save-button"
          onClick={onSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
