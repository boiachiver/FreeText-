import { Camera, Image as ImageIcon, X } from "lucide-react";

type CreatePostProps = {
  userName: string;
  profileAvatar: string;
  caption: string;
  image: string;
  onCaptionChange: (value: string) => void;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onPublish: () => void;
  onClose: () => void;
};

export default function CreatePost({
  userName,
  profileAvatar,
  caption,
  image,
  onCaptionChange,
  onImageChange,
  onRemoveImage,
  onPublish,
  onClose,
}: CreatePostProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="create-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Create post</h2>

          <button onClick={onClose} aria-label="Close">
            <X size={21} />
          </button>
        </div>

        <div className="create-user">
          <img
            src={profileAvatar}
            alt={userName}
            className="avatar"
            style={{
              width: 45,
              height: 45,
            }}
          />

          <div>
            <strong>{userName}</strong>
            <span>Public post</span>
          </div>
        </div>

        <textarea
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder="What's on your mind?"
          rows={5}
        />

        {image && (
          <div className="upload-preview">
            <img src={image} alt="Preview" />

            <button onClick={onRemoveImage}>
              <X size={18} />
            </button>
          </div>
        )}

        <div className="upload-options">
          <label>
            <ImageIcon size={21} />
            Photo

            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              hidden
            />
          </label>

          <label>
            <Camera size={21} />
            Camera

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onImageChange}
              hidden
            />
          </label>
        </div>

        <button
          className="publish-button"
          onClick={onPublish}
        >
          Publish
        </button>
      </div>
    </div>
  );
}
