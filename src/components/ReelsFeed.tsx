import { useMemo, useState } from "react";
import { Heart, MessageCircle, Play, Send, Volume2 } from "lucide-react";

export type ReelItem = {
  id: string;
  title: string;
  creator: string;
  category: string;
  mediaUrl: string;
  poster?: string;
  likes?: number;
  comments?: number;
};

type ReelsFeedProps = {
  reels?: ReelItem[];
  onOpen?: (reel: ReelItem) => void;
};

const categories = ["For You", "Trending", "Music", "Comedy", "Sports", "News", "Learning", "Gaming"];

const fallbackReels: ReelItem[] = [
  { id: "reel-1", title: "Music & culture", creator: "FreeText", category: "Music", mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { id: "reel-2", title: "Learn something new", creator: "FreeText", category: "Learning", mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { id: "reel-3", title: "Trending now", creator: "FreeText", category: "Trending", mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
  { id: "reel-4", title: "Good vibes", creator: "FreeText", category: "For You", mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
];

export default function ReelsFeed({ reels = fallbackReels, onOpen }: ReelsFeedProps) {
  const [category, setCategory] = useState("For You");
  const [muted, setMuted] = useState(true);
  const visible = useMemo(() => category === "For You" ? reels : reels.filter(r => r.category === category), [category, reels]);

  return <section className="reels-feed" aria-label="FreeText Reels">
    <div className="reels-heading"><div><h2>Reels</h2><p>Discover short videos from across FreeText</p></div><button className="reels-see-all" onClick={() => setCategory("Trending")}>See all</button></div>
    <div className="reels-categories" role="tablist" aria-label="Reel categories">
      {categories.map(item => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} role="tab" aria-selected={category === item}>{item}</button>)}
    </div>
    <div className="reels-rail">
      {visible.map(reel => <article className="reel-card" key={reel.id} onClick={() => onOpen?.(reel)}>
        <video src={reel.mediaUrl} poster={reel.poster} muted={muted} loop playsInline preload="metadata" onMouseEnter={e => void e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
        <div className="reel-shade" />
        <div className="reel-top"><span>{reel.category}</span><button onClick={e => { e.stopPropagation(); setMuted(v => !v); }} aria-label={muted ? "Unmute reels" : "Mute reels"}><Volume2 size={16}/></button></div>
        <div className="reel-play"><Play size={20} fill="currentColor" /></div>
        <div className="reel-info"><strong>{reel.title}</strong><span>@{reel.creator}</span><div className="reel-actions"><span><Heart size={15}/> {reel.likes ?? 0}</span><span><MessageCircle size={15}/> {reel.comments ?? 0}</span><Send size={15}/></div></div>
      </article>)}
    </div>
  </section>;
}
