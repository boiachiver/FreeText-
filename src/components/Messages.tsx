import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Mic, MicOff, Phone, PhoneOff, Search, UserPlus, Video, VideoOff, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Person = { id: string; name: string; username: string; avatar: string };
export type Conversation = Person & { lastMessage?: string; lastTime?: string; unread?: number; online?: boolean };
type MessagesProps = { people?: Conversation[]; onOpenChat: (person: Person) => void; onCall?: (person: Person, video: boolean) => void };
type Signal = { callId: string; from: string; to: string; type: string; video?: boolean; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
type ActiveCall = { person: Person; video: boolean; incoming: boolean; connected: boolean; callId: string };
const AI_ID = "boi-achiever-ai";
const AI_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%230b1020'/%3E%3Ccircle cx='60' cy='60' r='46' fill='%236d5dfc'/%3E%3C/svg%3E";
const rtcConfig: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] };

export default function Messages({ people = [], onOpenChat, onCall }: MessagesProps) {
  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followBusy, setFollowBusy] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<Signal | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const mySignalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const incomingRef = useRef<Signal | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { callRef.current = call; }, [call]);
  useEffect(() => { incomingRef.current = incomingOffer; }, [incomingOffer]);

  const aiContact: Conversation = { id: AI_ID, name: "Boi Achiever AI", username: AI_ID, avatar: AI_AVATAR, lastMessage: "Your personal FreeText assistant", online: true };
  const realPeople = useMemo(() => people.filter(person => person.id !== AI_ID), [people]);
  const allPeople = [aiContact, ...realPeople];
  const filteredPeople = allPeople.filter(person => `${person.name} ${person.username}`.toLowerCase().includes(search.toLowerCase()));
  const suggestions = useMemo(() => realPeople.filter(person => !following.has(person.id)).slice(0, 8), [realPeople, following]);
  const personForId = (id: string): Person => people.find(p => p.id === id) || { id, name: "FreeText user", username: id.slice(0, 8), avatar: "https://i.pravatar.cc/150?u=" + id };

  const sendSignal = async (targetId: string, signal: Signal) => {
    const channel = supabase.channel(`freetext:call:${targetId}`, { config: { private: true } });
    const result = await channel.httpSend("call-signal", signal);
    if (result?.error) console.error("Call signaling error:", result.error);
    await supabase.removeChannel(channel);
  };

  const stopCall = async (notify = true) => {
    const active = callRef.current;
    if (notify && active && currentUserId) await sendSignal(active.person.id, { callId: active.callId, from: currentUserId, to: active.person.id, type: "hangup" });
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIncomingOffer(null);
    setCall(null);
    setMuted(false);
    setCameraOff(false);
  };

  const startMedia = async (video: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Your browser does not support camera or microphone calls.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;
    if (localVideoRef.current) { localVideoRef.current.srcObject = stream; await localVideoRef.current.play().catch(() => undefined); }
    return stream;
  };

  const makePeer = (remoteId: string, video: boolean, callId: string) => {
    const peer = new RTCPeerConnection(rtcConfig);
    peerRef.current = peer;
    peer.onicecandidate = event => { if (event.candidate && currentUserId) void sendSignal(remoteId, { callId, from: currentUserId, to: remoteId, type: "ice", candidate: event.candidate.toJSON() }); };
    peer.ontrack = event => {
      const [stream] = event.streams;
      if (stream) {
        remoteStreamRef.current = stream;
        if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = stream; void remoteVideoRef.current.play().catch(() => undefined); }
      }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setCall(current => current ? { ...current, connected: true } : current);
      if (["failed", "closed"].includes(peer.connectionState)) void stopCall(false);
    };
    if (!video) setCameraOff(true);
    return peer;
  };

  const startCall = async (person: Person, video: boolean) => {
    if (!currentUserId || callRef.current) return;
    const callId = crypto.randomUUID();
    try {
      setCall({ person, video, incoming: false, connected: false, callId });
      await startMedia(video);
      const peer = makePeer(person.id, video, callId);
      localStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current!));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal(person.id, { callId, from: currentUserId, to: person.id, type: "offer", video, sdp: offer });
      onCall?.(person, video);
    } catch (error) {
      console.error(error);
      await stopCall(false);
      alert(error instanceof Error ? error.message : "Unable to start the call. Check camera and microphone permissions.");
    }
  };

  const acceptCall = async () => {
    const offer = incomingRef.current;
    if (!offer || !currentUserId) return;
    const person = personForId(offer.from);
    try {
      setCall({ person, video: !!offer.video, incoming: true, connected: false, callId: offer.callId });
      setIncomingOffer(null);
      await startMedia(!!offer.video);
      const peer = makePeer(person.id, !!offer.video, offer.callId);
      localStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current!));
      await peer.setRemoteDescription(offer.sdp!);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendSignal(person.id, { callId: offer.callId, from: currentUserId, to: person.id, type: "answer", video: offer.video, sdp: answer });
    } catch (error) {
      console.error(error);
      await stopCall(false);
      alert(error instanceof Error ? error.message : "Unable to accept the call.");
    }
  };

  useEffect(() => {
    let active = true;
    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      setCurrentUserId(data.user.id);
      const channel = supabase.channel(`freetext:call:${data.user.id}`, { config: { private: true } });
      mySignalChannelRef.current = channel;
      channel.on("broadcast", { event: "call-signal" }, async ({ payload }) => {
        const signal = payload as Signal;
        if (!signal?.from || signal.to !== data.user.id) return;
        if (signal.type === "offer") {
          if (callRef.current) { await sendSignal(signal.from, { callId: signal.callId, from: data.user.id, to: signal.from, type: "busy" }); return; }
          setIncomingOffer(signal);
          setCall({ person: personForId(signal.from), video: !!signal.video, incoming: true, connected: false, callId: signal.callId });
          return;
        }
        const activeCall = callRef.current;
        if (!activeCall || signal.callId !== activeCall.callId) return;
        if (signal.type === "answer" && peerRef.current) {
          await peerRef.current.setRemoteDescription(signal.sdp!);
          setCall(current => current ? { ...current, connected: true } : current);
        } else if (signal.type === "ice" && signal.candidate && peerRef.current) {
          try { await peerRef.current.addIceCandidate(signal.candidate); } catch (error) { console.warn("Unable to add ICE candidate", error); }
        } else if (signal.type === "hangup" || signal.type === "busy") {
          await stopCall(false);
        }
      }).subscribe((status, error) => { if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.error("Call signaling channel:", status, error); });
    };
    void setup();
    return () => { active = false; if (mySignalChannelRef.current) supabase.removeChannel(mySignalChannelRef.current); void stopCall(false); };
  }, [people]);

  useEffect(() => {
    let active = true;
    const loadFollowing = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !active) return;
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", auth.user.id);
      if (active) setFollowing(new Set((data || []).map((row: any) => row.following_id)));
    };
    loadFollowing();
    return () => { active = false; };
  }, [people]);

  useEffect(() => {
    const raw = localStorage.getItem("freetext_pending_chat");
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as { username?: string };
      const match = people.find(person => person.username.toLowerCase() === String(pending.username || "").toLowerCase());
      if (match) { localStorage.removeItem("freetext_pending_chat"); onOpenChat(match); }
    } catch { localStorage.removeItem("freetext_pending_chat"); }
  }, [people, onOpenChat]);

  const connect = async (person: Person) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || auth.user.id === person.id || followBusy) return;
    setFollowBusy(person.id);
    const { error } = await supabase.from("follows").upsert({ follower_id: auth.user.id, following_id: person.id }, { onConflict: "follower_id,following_id" });
    if (!error) setFollowing(prev => new Set(prev).add(person.id)); else console.error("Unable to connect with user:", error);
    setFollowBusy(null);
  };

  const startNewMessage = () => searchRef.current?.focus();
  const clearSearch = () => setSearch("");
  const toggleMute = () => { const stream = localStreamRef.current; stream?.getAudioTracks().forEach(track => { track.enabled = muted; }); setMuted(value => !value); };
  const toggleCamera = () => { const stream = localStreamRef.current; stream?.getVideoTracks().forEach(track => { track.enabled = cameraOff; }); setCameraOff(value => !value); };

  return <section className="page-section">
    <div className="messages-whatsapp">
      <div className="messages-top"><div><h1>Messages</h1><p>Find people and stay connected</p></div><button className="new-message-button" aria-label="New message" onClick={startNewMessage}><MessageCircle size={21} /></button></div>
      <div className="message-search whatsapp-search"><Search size={18} /><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people or username" aria-label="Search people" />{search && <button type="button" className="search-clear" aria-label="Clear search" onClick={clearSearch}><X size={15} /></button>}</div>
      {!search && suggestions.length > 0 && <div className="people-you-may-know"><div className="people-section-heading"><div><h2>People you may know</h2><p>Connect with people already on FreeText</p></div><UserPlus size={20} /></div><div className="people-suggestions">{suggestions.map(person => <div className="people-suggestion-card" key={person.id}><button className="people-person-button" onClick={() => onOpenChat(person)} aria-label={`Open ${person.name}'s profile`}><img src={person.avatar} alt={person.name} className="avatar" /><span><strong>{person.name}</strong><small>@{person.username}</small></span></button><button className="connect-button" onClick={() => connect(person)} disabled={followBusy === person.id} aria-label={`Connect with ${person.name}`}>{followBusy === person.id ? "..." : <><UserPlus size={15} /> Connect</>}</button></div>)}</div></div>}
      <div className="conversation-list">
        {filteredPeople.length === 0 && <div className="no-conversations"><MessageCircle size={38} /><h3>No people found</h3><p>Try another name or username.</p></div>}
        {filteredPeople.map(person => { const isAI = person.id === AI_ID; return <div className={`conversation-row${isAI ? " boi-ai-row" : ""}`} key={person.username}><button className="conversation-main" onClick={() => onOpenChat(person)}><div className="conversation-avatar">{isAI ? <div className="boi-ai-avatar"><img src={person.avatar} alt="Boi Achiever AI" /></div> : <img src={person.avatar} alt={person.name} className="avatar" style={{ width: 58, height: 58 }} />}{person.online && <span className="online-dot" />}</div><div className="conversation-content"><div className="conversation-name"><strong>{person.name}</strong>{isAI && <span className="boi-ai-badge"><Bot size={12} /> AI</span>}{person.lastTime && <span className="conversation-time">{person.lastTime}</span>}</div><div className="conversation-preview"><span>{person.lastMessage || "Tap to start a conversation"}</span>{person.unread ? <b className="unread-badge">{person.unread}</b> : null}</div></div></button>{!isAI && <div className="conversation-actions"><button aria-label={`Audio call ${person.name}`} onClick={() => startCall(person, false)}><Phone size={18} /></button><button aria-label={`Video call ${person.name}`} onClick={() => startCall(person, true)}><Video size={19} /></button></div>}</div>; })}
      </div>
    </div>
    {call && <div className="freetext-call-backdrop" role="dialog" aria-modal="true" aria-label={`${call.video ? "Video" : "Voice"} call with ${call.person.name}`}><div className={`freetext-call-card ${call.video ? "is-video" : "is-audio"}`}>
      {call.video ? <div className="freetext-call-videos"><video ref={remoteVideoRef} className="freetext-remote-video" autoPlay playsInline /><video ref={localVideoRef} className="freetext-local-video" autoPlay muted playsInline /></div> : <div className="freetext-audio-avatar"><img src={call.person.avatar} alt={call.person.name} /><span>{call.connected ? "Connected" : call.incoming ? "Incoming voice call" : "Calling..."}</span></div>}
      <div className="freetext-call-header"><strong>{call.person.name}</strong><span>{call.video ? "Video call" : "Voice call"} · {call.connected ? "Connected" : call.incoming ? "Incoming" : "Connecting"}</span></div>
      <div className="freetext-call-controls">{call.incoming && incomingOffer ? <><button className="freetext-call-accept" onClick={acceptCall} aria-label="Accept call"><Phone size={21} /></button><button className="freetext-call-decline" onClick={() => stopCall(false)} aria-label="Decline call"><PhoneOff size={21} /></button></> : <><button onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</button>{call.video && <button onClick={toggleCamera} aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}>{cameraOff ? <VideoOff size={20} /> : <Video size={20} />}</button>}<button className="freetext-call-decline" onClick={() => stopCall()} aria-label="End call"><PhoneOff size={21} /></button></>}</div>
      <small className="freetext-call-note">Calls use your device microphone and camera. Allow browser permissions when asked.</small>
    </div></div>}
  </section>;
}
