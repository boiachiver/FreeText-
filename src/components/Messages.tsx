import MessagesProduction, { type Conversation } from "./MessagesProduction";

type Person = { id: string; name: string; username: string; avatar: string };
type Props = {
  people?: Conversation[];
  onOpenChat: (person: Person) => void;
  onCall?: (person: Person, video: boolean) => void;
};

// Keep the App API stable while using the production messaging/calling surface.
// Calls are handled by MessagesProduction itself; the legacy alert callback is intentionally ignored.
export default function Messages({ people, onOpenChat }: Props) {
  return <MessagesProduction people={people} onOpenChat={onOpenChat} />;
}

export type { Conversation } from "./MessagesProduction";
