import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

type CallRow = { id: string; caller_id: string; callee_id: string; call_type: "voice" | "video"; status: string };
type RingKind = "ring" | "ringback";

function playTone(kind: RingKind) {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(kind === "ring" ? 880 : 660, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.4);
    osc.addEventListener("ended", () => void ctx.close());
  } catch {
    // Mobile browsers may block audio until the user interacts with the page.
  }
}

function notifyCall(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try { new Notification(title, { body, tag: "freetext-call", requireInteraction: true }); } catch { /* unsupported on some mobile browsers */ }
}

export default function PresenceManager() {
  const userIdRef = useRef<string | null>(null);
  const activeCallsRef = useRef(new Map<string, RingKind>());
  const ringTimerRef = useRef<number | null>(null);
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const markOnline = async (online: boolean) => {
      const userId = userIdRef.current;
      if (!userId) return;
      await supabase.from("profiles").update({ is_online: online, last_seen_at: new Date().toISOString() }).eq("id", userId);
    };
    const unlockAudio = () => { audioUnlockedRef.current = true; };
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    const setup = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;
      userIdRef.current = data.user.id;
      await markOnline(true);

      const { data: ringing } = await supabase.from("call_sessions").select("*").or(`caller_id.eq.${data.user.id},callee_id.eq.${data.user.id}`).eq("status", "ringing").order("created_at", { ascending: false }).limit(5);
      (ringing || []).forEach((row: CallRow) => activeCallsRef.current.set(row.id, row.caller_id === data.user.id ? "ringback" : "ring"));

      const channel = supabase.channel(`freetext-presence-calls-${data.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions", filter: `callee_id=eq.${data.user.id}` }, async payload => {
          const row = payload.new as CallRow;
          if (row.status !== "ringing") return;
          activeCallsRef.current.set(row.id, "ring");
          playTone("ring");
          if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission().catch(() => undefined);
          notifyCall(`Incoming ${row.call_type} call`, "Someone is calling you on FreeText.");
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions", filter: `caller_id=eq.${data.user.id}` }, payload => {
          const row = payload.new as CallRow;
          if (row.status !== "ringing") return;
          activeCallsRef.current.set(row.id, "ringback");
          playTone("ringback");
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_sessions" }, payload => {
          const row = payload.new as CallRow;
          if (!activeCallsRef.current.has(row.id)) return;
          if (["accepted", "declined", "ended", "missed"].includes(row.status)) activeCallsRef.current.delete(row.id);
        })
        .subscribe();

      const heartbeat = window.setInterval(() => {
        if (document.visibilityState === "visible") void markOnline(true);
      }, 30000);

      ringTimerRef.current = window.setInterval(() => {
        if (!audioUnlockedRef.current) return;
        activeCallsRef.current.forEach(kind => playTone(kind));
      }, 2200);

      const goOffline = () => { void markOnline(false); };
      const onVisibility = () => { if (document.visibilityState === "hidden") goOffline(); else void markOnline(true); };
      window.addEventListener("pagehide", goOffline);
      document.addEventListener("visibilitychange", onVisibility);

      return () => {
        window.clearInterval(heartbeat);
        if (ringTimerRef.current) window.clearInterval(ringTimerRef.current);
        window.removeEventListener("pagehide", goOffline);
        document.removeEventListener("visibilitychange", onVisibility);
        supabase.removeChannel(channel);
        void markOnline(false);
      };
    };

    let cleanup: (() => void) | undefined;
    void setup().then(value => { cleanup = value; });
    return () => {
      mounted = false;
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      cleanup?.();
    };
  }, []);

  return null;
}
