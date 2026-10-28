import { useEffect, useMemo, useState } from "react";
import { Heart, MessageCircle, Play, Send, Volume2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export type ReelItem = { id: string; title: string; creator: string; category: string; mediaUrl: string; poster?: string; likes?: number; comments?: number };
type ReelsFeedProps = { reels?: ReelItem[]; onOpen?: (reel: ReelItem) => void };
const categories = ["For You", "Trending", "Music", "Comedy", "Sports", "News", "Learning", "Gaming"];

export default function ReelsFeed({ reels, onOpen }: ReelsFeedProps) {
  const [category, setCategory] = useState("For You");
  const [muted, setMuted] = useState(true);
  const [remoteReels, setRemoteReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(!reels);

  useEffect(() => {
    if (reels) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("posts").select("id,caption,video_url,thumbnail_url,profiles!posts_author_id_fkey(full_name,username),reel_likes(count)").eq("content_type", "reel").order("created_at", { ascending: false }).limit(30);
      if (!active) return;
      setRemoteReels((data || []).filter((p: any) => p.video_url).map((p: any) => ({ id: p.id, title: p.caption || "FreeText Reel", creator: p.profiles?.username || p.profiles?.full_name || "creator", category: "For You", mediaUrl: p.video_url, poster: p.thumbnail_url || undefined, likes: p.reel_likes?.[0]?.count || 0 })));
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [reels]);

  const source = reels ?? remoteReels;
  const visible = useMemo(() => category === "For You" ? source : source.filter(r => r.category === category), [category, source]);

  return <section className="reels-feed" aria-label="FreeText Reels">
    <div className="reels-heading"><div><h2>Reels</h2><p>Discover short videos from across FreeText</p></div><button className="reels-see-all" onClick={() => setCategory("Trending")}>See all</button></div>
    <div className="reels-categories" role="tablist" aria-label="Reel categories">{categories.map(item => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)} role="tab" aria-selected={category === item}>{item}</button>)}</div>
    {loading ? <p>Loading Reels…</p> : visible.length === 0 ? <div className="page-section"><p>No Reels have been published yet.</p><small>Create a video Reel to start the feed.</small></div> : <div className="reels-rail">{visible.map(reel => <article className="reel-card" key={reel.id} onClick={() => onOpen?.(reel)}>
      <video src={reel.mediaUrl} poster={reel.poster} muted={muted} loop playsInline preload="metadata" onMouseEnter={e => void e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
      <div className="reel-shade" /><div className="reel-top"><span>{reel.category}</span><button onClick={e => { e.stopPropagation(); setMuted(v => !v); }} aria-label={muted ? "Unmute reels" : "Mute reels"}><Volume2 size={16}/></button></div>
      <div className="reel-play"><Play size={20} fill="currentColor" /></div><div className="reel-info"><strong>{reel.title}</strong><span>@{reel.creator}</span><div className="reel-actions"><span><Heart size={15}/> {reel.likes ?? 0}</span><span><MessageCircle size={15}/> {reel.comments ?? 0}</span><Send size={15}/></div></div>
    </article>)}</div>}
  </section>;
}
