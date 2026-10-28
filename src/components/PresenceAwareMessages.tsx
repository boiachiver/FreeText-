import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import MessagesProduction from "./MessagesProduction";
import { supabase } from "../lib/supabase";

type Props = ComponentProps<typeof MessagesProduction>;
type Presence = { id: string; is_online: boolean; last_seen_at: string | null };
type RingState = { callId: string; mode: "incoming" | "outgoing"; name: string } | null;

const ONLINE_WINDOW_MS = 75_000;

function formatLastSeen(value: string | null) {
  if (!value) return "Last seen recently";
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  if (diff < 60_000) return "Last seen just now";
  if (diff < 60 * 60_000) return `Last seen ${Math.floor(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60_000) return `Last seen ${Math.floor(diff / (60 * 60_000))}h ago`;
  return `Last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function RingTone({ ring }: { ring: RingState }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ring) return;
    let stopped = false;
    const playBeep = () => {
      if (stopped) return;
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;
        const ctx = audioContextRef.current || new AudioContextCtor();
        audioContextRef.current = ctx;
        void ctx.resume().catch(() => undefined);
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(ring.mode === "incoming" ? 880 : 620, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.45);
      } catch {
        // Browser autoplay policy may block sound until the user interacts with the page.
      }
    };
    playBeep();
    timerRef.current = window.setInterval(playBeep, 1300);
    return () => {
      stopped = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      void audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, [ring]);

  return null;
}

export default function PresenceAwareMessages({ people = [], ...rest }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [ring, setRing] = useState<RingState>(null);
  const notificationCallRef = useRef<string | null>(null);
  const peopleKey = useMemo(() => people.map(p => p.id).sort().join(","), [people]);

  const markOnline = async (userId: string) => {
    await supabase.from("profiles").update({ is_online: true, last_seen_at: new Date().toISOString() }).eq("id", userId);
  };

  const markOffline = async (userId: string) => {
    await supabase.from("profiles").update({ is_online: false, last_seen_at: new Date().toISOString() }).eq("id", userId);
  };

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) setCurrentUserId(data.user.id);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const heartbeat = () => {
      if (document.visibilityState === "visible") void markOnline(currentUserId);
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") heartbeat();
      else void markOffline(currentUserId);
    };
    const onFocus = () => heartbeat();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      void markOffline(currentUserId);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!peopleKey) return;
    const ids = people.map(p => p.id);
    void supabase.from("profiles").select("id,is_online,last_seen_at").in("id", ids).then(({ data }) => {
      const next: Record<string, Presence> = {};
      (data || []).forEach((row: Presence) => {
        const fresh = row.is_online && row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() < ONLINE_WINDOW_MS;
        next[row.id] = { ...row, is_online: Boolean(fresh) };
      });
      setPresence(next);
    });
    const channel = supabase.channel(`freetext-presence-${currentUserId || "guest"}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, payload => {
      const row = payload.new as Presence;
      if (ids.includes(row.id)) {
        const fresh = row.is_online && row.last_seen_at && Date.now() - new Date(row.last_seen_at).getTime() < ONLINE_WINDOW_MS;
        setPresence(prev => ({ ...prev, [row.id]: { ...row, is_online: Boolean(fresh) } }));
      }
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [peopleKey, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const updateRing = (row: any) => {
      if (!row || ![row.caller_id, row.callee_id].includes(currentUserId)) return;
      if (row.status !== "ringing") {
        setRing(current => current?.callId === row.id ? null : current);
        return;
      }
      const incoming = row.callee_id === currentUserId;
      const person = people.find(p => p.id === (incoming ? row.caller_id : row.callee_id));
      setRing({ callId: row.id, mode: incoming ? "incoming" : "outgoing", name: person?.name || "FreeText user" });
      if (incoming && notificationCallRef.current !== row.id) {
        notificationCallRef.current = row.id;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Incoming FreeText call", { body: `${person?.name || "Someone"} is calling you`, tag: `freetext-call-${row.id}` });
        } else if ("Notification" in window && Notification.permission === "default") {
          void Notification.requestPermission().catch(() => undefined);
        }
      }
    };
    const channel = supabase.channel(`freetext-call-ringer-${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions" }, payload => updateRing(payload.new))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_sessions" }, payload => updateRing(payload.new))
      .subscribe();
    void supabase.from("call_sessions").select("*").or(`caller_id.eq.${currentUserId},callee_id.eq.${currentUserId}`).eq("status", "ringing").order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => { if (data) updateRing(data); });
    return () => { void supabase.removeChannel(channel); setRing(null); };
  }, [currentUserId, peopleKey]);

  const enrichedPeople = useMemo(() => people.map(person => {
    const p = presence[person.id];
    if (!p) return person;
    const status = p.is_online ? "Active now" : formatLastSeen(p.last_seen_at);
    return { ...person, online: p.is_online, lastMessage: person.lastMessage || status };
  }), [people, presence]);

  return <>
    <MessagesProduction {...rest} people={enrichedPeople} />
    <RingTone ring={ring} />
  </>;
}
