import { supabase } from "./supabase";

export type CallSignalType = "offer" | "answer" | "ice" | "hangup" | "ringing" | "accepted" | "rejected";
export type CallSignal = { id?: string; call_id: string; sender_id: string; recipient_id: string; signal_type: CallSignalType; payload: Record<string, unknown> };

export async function sendCallSignal(signal: CallSignal) {
  const { error } = await supabase.from("call_signals").insert({ ...signal });
  if (error) throw error;
}

export function subscribeToCallSignals(userId: string, onSignal: (signal: CallSignal) => void) {
  const channel = supabase.channel(`freetext-call-signals-${userId}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `recipient_id=eq.${userId}` }, payload => onSignal(payload.new as CallSignal))
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function createPeerConnection(send: (type: CallSignalType, payload: Record<string, unknown>) => Promise<void>) {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] });
  peer.onicecandidate = event => { if (event.candidate) void send("ice", { candidate: event.candidate.toJSON() }); };
  return peer;
}
