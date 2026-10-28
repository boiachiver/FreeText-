import PresenceAwareMessages from "./PresenceAwareMessages";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof PresenceAwareMessages> & {
  onCall?: (person: { id: string; name: string; username: string; avatar: string }, video: boolean) => void;
};

// PresenceAwareMessages now owns production WebRTC calls, ringing tones,
// incoming-call notifications, online status and last-seen display.
// The legacy App onCall callback is intentionally ignored so it cannot show
// the old "requires a WebRTC signaling service" alert.
export default function Messages({ onCall: _onCall, ...props }: Props) {
  return <PresenceAwareMessages {...props} />;
}

export type { Conversation } from "./MessagesProduction";
