import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";

type Post = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  time: string;
};

type PostCardProps = {
  post: Post;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
};

function Avatar({
  src,
  size = 44,
}: {
  src: string;
  size?: number;
}) {
  return (
    <img
      src={src}
      alt="avatar"
      className="avatar"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

export default function PostCard({
  post,
  onLike,
  onSave,
}: PostCardProps) {
  return (
    <article className="post-card">

      <div className="post-header">
        <div className="user-info">
          <Avatar src={post.avatar} size={44} />

          <div>
            <strong>{post.name}</strong>

            <span>
              @{post.username} · {post.time}
            </span>
          </div>
        </div>

        <button className="more-button">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <p className="post-caption">
        {post.caption}
      </p>

      <img
        className="post-image"
        src={post.image}
        alt={post.caption}
      />

      <div className="post-stats">
        <span>{post.likes} likes</span>
        <span>{post.comments} comments</span>
      </div>

      <div className="post-actions">

        <button
          className={post.liked ? "liked" : ""}
          onClick={() => onLike(post.id)}
        >
          <Heart
            size={21}
            fill={post.liked ? "currentColor" : "none"}
          />
          Like
        </button>

        <button>
          <MessageCircle size={21} />
          Comment
        </button>

        <button>
          <Send size={21} />
          Share
        </button>

        <button
          className={post.saved ? "saved" : ""}
          onClick={() => onSave(post.id)}
          aria-label="Save post"
        >
          <Bookmark
            size={21}
            fill={post.saved ? "currentColor" : "none"}
          />
        </button>

      </div>

    </article>
  );
}
