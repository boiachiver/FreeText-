import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Camera, CameraOff, MessageCircle, Mic, MicOff, Phone, PhoneOff, Search, UserPlus, Video, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Person = { id: string; name: string; username: string; avatar: string };
export type Conversation = Person & { lastMessage?: string; lastTime?: string; unread?: number; online?: boolean };
type Props = { people?: Conversation[]; onOpenChat: (person: Person) => void };
type CallSession = { id: string; caller_id: string; callee_id: string; call_type: "voice" | "video"; status: string };
type SignalRow = { id: string; call_id: string; sender_id: string; signal_type: "offer" | "answer" | "ice" | "hangup" | "reject"; payload: any };
const AI_ID = "boi-achiever-ai";
const AI_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%230b1020'/%3E%3Ccircle cx='60' cy='60' r='46' fill='%236d5dfc'/%3E%3C/svg%3E";
const RTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] };

export default function MessagesProduction({ people = [], onOpenChat }: Props) {
  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [call, setCall] = useState<CallSession | null>(null);
  const [incoming, setIncoming] = useState<CallSession | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callError, setCallError] = useState("");
  const [connected, setConnected] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const incomingRef = useRef<CallSession | null>(null);
  const callRef = useRef<CallSession | null>(null);

  const aiContact: Conversation = { id: AI_ID, name: "Boi Achiever AI", username: AI_ID, avatar: AI_AVATAR, lastMessage: "Your personal FreeText assistant", online: true };
  const realPeople = useMemo(() => people.filter(p => p.id !== AI_ID), [people]);
  const allPeople = [aiContact, ...realPeople];
  const filteredPeople = allPeople.filter(p => `${p.name} ${p.username}`.toLowerCase().includes(search.toLowerCase()));
  const suggestions = useMemo(() => realPeople.filter(p => !following.has(p.id)).slice(0, 6), [realPeople, following]);
  const personForId = (id: string): Person => people.find(p => p.id === id) || { id, name: "FreeText user", username: id.slice(0, 8), avatar: `https://i.pravatar.cc/150?u=${id}` };

  useEffect(() => { callRef.current = call; }, [call]);
  useEffect(() => { incomingRef.current = incoming; }, [incoming]);

  const insertSignal = async (callId: string, signal_type: SignalRow["signal_type"], payload: any) => {
    if (!currentUserId) return;
    const { error } = await supabase.from("call_signals").insert({ call_id: callId, sender_id: currentUserId, signal_type, payload });
    if (error) throw error;
  };

  const cleanupPeer = () => {
    peerRef.current?.close(); peerRef.current = null;
    localStreamRef.current?.getTracks().forEach(track => track.stop()); localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setMuted(false); setCameraOff(false); setConnected(false);
  };

  const endCall = async (status: "ended" | "declined" = "ended", signalType: "hangup" | "reject" = "hangup") => {
    const active = callRef.current || incomingRef.current;
    if (!active || !currentUserId) { cleanupPeer(); setCall(null); setIncoming(null); return; }
    try { await insertSignal(active.id, signalType, {}); } catch (e) { console.warn(e); }
    await supabase.from("call_sessions").update({ status, ended_at: new Date().toISOString() }).eq("id", active.id);
    cleanupPeer(); setCall(null); setIncoming(null);
  };

  const ensureMedia = async (video: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera and microphone calls are not supported by this browser.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;
    if (localVideoRef.current) { localVideoRef.current.srcObject = stream; await localVideoRef.current.play().catch(() => undefined); }
    return stream;
  };

  const createPeer = (remoteId: string, callId: string, video: boolean) => {
    const peer = new RTCPeerConnection(RTC_CONFIG);
    peerRef.current = peer;
    peer.onicecandidate = event => { if (event.candidate) void insertSignal(callId, "ice", event.candidate.toJSON()); };
    peer.ontrack = event => {
      const stream = event.streams[0];
      if (stream) { remoteStreamRef.current = stream; if (remoteVideoRef.current) { remoteVideoRef.current.srcObject = stream; void remoteVideoRef.current.play().catch(() => undefined); } }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setConnected(true);
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) setConnected(false);
    };
    if (!video) setCameraOff(true);
    return peer;
  };

  const startCall = async (person: Person, video: boolean) => {
    if (!currentUserId || callRef.current || incomingRef.current) return;
    setCallError("");
    try {
      const { data, error } = await supabase.from("call_sessions").insert({ caller_id: currentUserId, callee_id: person.id, call_type: video ? "video" : "voice", status: "ringing" }).select("*").single();
      if (error || !data) throw error || new Error("Could not create call session.");
      const session = data as CallSession;
      setCall(session);
      await ensureMedia(video);
      const peer = createPeer(person.id, session.id, video);
      localStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current!));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await insertSignal(session.id, "offer", { sdp: offer, video });
    } catch (e: any) { setCallError(e?.message || "Unable to start the call."); await endCall(); }
  };

  const acceptIncoming = async () => {
    const session = incomingRef.current;
    if (!session || !currentUserId) return;
    setCallError("");
    try {
      setCall(session); setIncoming(null);
      await supabase.from("call_sessions").update({ status: "accepted", answered_at: new Date().toISOString() }).eq("id", session.id);
      const { data: offerRow, error } = await supabase.from("call_signals").select("*").eq("call_id", session.id).eq("signal_type", "offer").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error || !offerRow) throw error || new Error("The caller offer was not available.");
      await ensureMedia(session.call_type === "video");
      const peer = createPeer(session.caller_id, session.id, session.call_type === "video");
      localStreamRef.current?.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current!));
      await peer.setRemoteDescription(offerRow.payload.sdp);
      const answer = await peer.createAnswer(); await peer.setLocalDescription(answer);
      await insertSignal(session.id, "answer", { sdp: answer });
    } catch (e: any) { setCallError(e?.message || "Unable to accept the call."); await endCall("ended"); }
  };

  useEffect(() => {
    let active = true;
    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      setCurrentUserId(data.user.id);
      const { data: ringing } = await supabase.from("call_sessions").select("*").eq("callee_id", data.user.id).eq("status", "ringing").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (ringing && active) setIncoming(ringing as CallSession);
      const channel = supabase.channel(`freetext-call-signals-${data.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions", filter: `callee_id=eq.${data.user.id}` }, payload => { const row = payload.new as CallSession; if (row.status === "ringing" && active && !callRef.current) setIncoming(row); })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals" }, async payload => {
          const row = payload.new as SignalRow;
          const current = callRef.current;
          if (!current || row.call_id !== current.id || row.sender_id === data.user.id) return;
          if (row.signal_type === "answer" && peerRef.current) { await peerRef.current.setRemoteDescription(row.payload.sdp); setConnected(true); }
          else if (row.signal_type === "ice" && peerRef.current && row.payload) { try { await peerRef.current.addIceCandidate(row.payload); } catch (e) { console.warn(e); } }
          else if (row.signal_type === "hangup" || row.signal_type === "reject") { cleanupPeer(); setCall(null); setIncoming(null); }
        })
        .subscribe();
      signalChannelRef.current = channel;
    };
    void setup();
    return () => { active = false; if (signalChannelRef.current) supabase.removeChannel(signalChannelRef.current); cleanupPeer(); };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => { if (!currentUserId) return; const { data } = await supabase.from("follows").select("following_id").eq("follower_id", currentUserId); if (active) setFollowing(new Set((data || []).map((r: any) => r.following_id))); };
    void load(); return () => { active = false; };
  }, [currentUserId]);

  const connect = async (person: Person) => { if (!currentUserId || currentUserId === person.id) return; const { error } = await supabase.from("follows").upsert({ follower_id: currentUserId, following_id: person.id }, { onConflict: "follower_id,following_id" }); if (!error) setFollowing(prev => new Set(prev).add(person.id)); };
  const toggleMute = () => { const next = !muted; localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !next); setMuted(next); };
  const toggleCamera = () => { const next = !cameraOff; localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !next); setCameraOff(next); };
  const callPerson = call ? personForId(call.callee_id === currentUserId ? call.caller_id : call.callee_id) : null;
  const incomingPerson = incoming ? personForId(incoming.caller_id) : null;

  return <section className="page-section">
    <div className="messages-whatsapp">
      <div className="messages-top"><div><h1>Messages & Calls</h1><p>Private conversations with secure voice and video calling</p></div><button className="new-message-button" aria-label="Search people"><MessageCircle size={21}/></button></div>
      <div className="message-search whatsapp-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people or username" aria-label="Search people"/>{search&&<button type="button" className="search-clear" onClick={()=>setSearch("")}><X size={15}/></button>}</div>
      {!search && suggestions.length > 0 && <div className="people-you-may-know"><div className="people-section-heading"><div><h2>People you may know</h2><p>Connect with people already on FreeText</p></div><UserPlus size={20}/></div><div className="people-suggestions">{suggestions.map(p=><div className="people-suggestion-card" key={p.id}><button className="people-person-button" onClick={()=>onOpenChat(p)}><img src={p.avatar} alt={p.name} className="avatar"/><span><strong>{p.name}</strong><small>@{p.username}</small></span></button><button className="connect-button" onClick={()=>connect(p)}><UserPlus size={15}/> Connect</button></div>)}</div></div>}
      <div className="conversation-list">{filteredPeople.length===0&&<div className="no-conversations"><MessageCircle size={38}/><h3>No people found</h3><p>Try another name or username.</p></div>}{filteredPeople.map(person=>{const isAI=person.id===AI_ID;return <div className="conversation-row" key={person.id}><button className="conversation-main" onClick={()=>onOpenChat(person)}><div className="conversation-avatar">{isAI?<div className="boi-ai-avatar"><img src={person.avatar} alt="Boi Achiever AI"/></div>:<img src={person.avatar} alt={person.name} className="avatar" style={{width:58,height:58}}/>}{person.online&&<span className="online-dot"/>}</div><div className="conversation-content"><div className="conversation-name"><strong>{person.name}</strong>{isAI&&<span className="boi-ai-badge"><Bot size={12}/> AI</span>}{person.lastTime&&<span className="conversation-time">{person.lastTime}</span>}</div><div className="conversation-preview">{person.lastMessage||"Tap to start a conversation"}</div></div></button>{!isAI&&<div className="conversation-actions"><button aria-label={`Voice call ${person.name}`} onClick={()=>void startCall(person,false)}><Phone size={18}/></button><button aria-label={`Video call ${person.name}`} onClick={()=>void startCall(person,true)}><Video size={19}/></button></div>}</div>})}</div>
    </div>
    {call&&callPerson&&<div className="freetext-call-backdrop" role="dialog" aria-modal="true"><div className={`freetext-call-card ${call.call_type==='video'?"is-video":"is-audio"}`}>{call.call_type==='video'?<div className="freetext-call-videos"><video ref={remoteVideoRef} className="freetext-remote-video" autoPlay playsInline/><video ref={localVideoRef} className="freetext-local-video" autoPlay muted playsInline/></div>:<div className="freetext-audio-avatar"><img src={callPerson.avatar} alt={callPerson.name}/><span>{connected?"Connected":"Calling…"}</span></div>}<div className="freetext-call-header"><strong>{callPerson.name}</strong><span>{call.call_type==='video'?"Video call":"Voice call"} · {connected?"Connected":"Connecting"}</span></div>{callError&&<div className="auth-error">{callError}</div>}<div className="freetext-call-controls"><button onClick={toggleMute} aria-label={muted?"Unmute":"Mute"}>{muted?<MicOff size={20}/>:<Mic size={20}/>}</button>{call.call_type==='video'&&<button onClick={toggleCamera} aria-label={cameraOff?"Turn camera on":"Turn camera off"}>{cameraOff?<CameraOff size={20}/>:<Camera size={20}/>}</button>}<button className="freetext-call-decline" onClick={()=>void endCall()} aria-label="End call"><PhoneOff size={21}/></button></div><small className="freetext-call-note">WebRTC media is peer-to-peer. FreeText stores only call signaling and status.</small></div></div>}
    {incoming&&!call&&incomingPerson&&<div className="freetext-call-backdrop" role="dialog" aria-modal="true"><div className="freetext-call-card is-audio"><div className="freetext-audio-avatar"><img src={incomingPerson.avatar} alt={incomingPerson.name}/><span>Incoming {incoming.call_type} call</span></div><div className="freetext-call-header"><strong>{incomingPerson.name}</strong><span>@{incomingPerson.username}</span></div><div className="freetext-call-controls"><button className="freetext-call-accept" onClick={()=>void acceptIncoming()} aria-label="Accept call"><Phone size={21}/></button><button className="freetext-call-decline" onClick={()=>void endCall("declined","reject")} aria-label="Decline call"><PhoneOff size={21}/></button></div></div></div>}
  </section>;
}
