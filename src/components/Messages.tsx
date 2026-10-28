import { useEffect, useRef } from "react";
import MessagesProduction, { type Conversation } from "./MessagesProduction";

type Person = { id: string; name: string; username: string; avatar: string };
type Props = {
  people?: Conversation[];
  onOpenChat: (person: Person) => void;
  onCall?: (person: Person, video: boolean) => void;
};

function useCallRingtone() {
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const stop = () => {
      activeRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const tone = () => {
      if (!activeRef.current) return;
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;
        const ctx = audioRef.current || new AudioContextCtor();
        audioRef.current = ctx;
        void ctx.resume();
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.setValueAtTime(880, now + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.34);
        timerRef.current = window.setTimeout(tone, 1100);
      } catch {
        // Browser autoplay restrictions can prevent sound; the visual ringing UI remains active.
      }
    };

    const sync = () => {
      const backdrop = document.querySelector(".freetext-call-backdrop");
      const incoming = backdrop?.textContent?.toLowerCase().includes("incoming");
      const connecting = backdrop?.textContent?.toLowerCase().includes("connecting") || backdrop?.textContent?.toLowerCase().includes("calling");
      const shouldRing = Boolean(backdrop && (incoming || connecting));
      if (shouldRing && !activeRef.current) {
        activeRef.current = true;
        tone();
      } else if (!shouldRing) {
        stop();
      }
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    sync();
    return () => {
      stop();
      observer.disconnect();
      void audioRef.current?.close().catch(() => undefined);
      audioRef.current = null;
    };
  }, []);
}

// Production messaging handles WebRTC signaling, calls, presence and chat UI.
export default function Messages({ people, onOpenChat }: Props) {
  useCallRingtone();
  return <MessagesProduction people={people} onOpenChat={onOpenChat} />;
}

export type { Conversation } from "./MessagesProduction";
