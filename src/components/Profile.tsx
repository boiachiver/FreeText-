import { Camera, Edit3 } from "lucide-react";

type ProfileProps = {
  userName: string;
  username: string;
  bio: string;
  profileAvatar: string;
  coverPhoto: string;
  postsCount: number;
  onEditProfile: () => void;
  onChangeCover: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

function Avatar({
  src,
  size = 96,
}: {
  src: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt="Profile"
      className="avatar profile-avatar-image"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

export default function Profile({
  userName,
  username,
  bio,
  profileAvatar,
  coverPhoto,
  postsCount,
  onEditProfile,
  onChangeCover,
}: ProfileProps) {
  return (
    <section className="page-section">

      <div className="profile-card modern-profile">

        <div
          className="profile-cover modern-cover"
          style={{
            backgroundImage: `url(${coverPhoto})`,
          }}
        >
          <label className="cover-camera">
            <Camera size={19} />
            <span>Change cover</span>

            <input
              type="file"
              accept="image/*"
              onChange={onChangeCover}
              hidden
            />
          </label>
        </div>

        <div className="profile-main modern-profile-main">

          <div className="profile-avatar-wrapper">
            <Avatar
              src={profileAvatar}
              size={110}
            />
          </div>

          <div className="profile-details">
            <div className="profile-name-row">
              <div>
                <h1>{userName}</h1>
                <p>@{username}</p>
              </div>

              <button
                className="edit-profile modern-edit-button"
                onClick={onEditProfile}
              >
                <Edit3 size={17} />
                Edit Profile
              </button>
            </div>

            <span className="profile-bio">
              {bio}
            </span>
          </div>

        </div>

        <div className="profile-stats modern-profile-stats">

          <div>
            <strong>{postsCount}</strong>
            <span>Posts</span>
          </div>

          <div>
            <strong>1.2K</strong>
            <span>Followers</span>
          </div>

          <div>
            <strong>348</strong>
            <span>Following</span>
          </div>

        </div>

      </div>

    </section>
  );
}
