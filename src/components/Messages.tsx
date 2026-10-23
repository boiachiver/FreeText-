import { useState } from "react";
import { MessageCircle, Phone, Search, Video } from "lucide-react";

type Person = { name: string; username: string; avatar: string };
export type Conversation = Person & { lastMessage?: string; lastTime?: string; unread?: number; online?: boolean };
type MessagesProps = { people?: Conversation[]; onOpenChat: (person: Person) => void; onCall?: (person: Person, video: boolean) => void };

export default function Messages({ people = [], onOpenChat, onCall }: MessagesProps) {
  const [search, setSearch] = useState("");
  const filteredPeople = people.filter(person => `${person.name} ${person.username}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="page-section"><div className="messages-whatsapp">
    <div className="messages-top"><div><h1>Messages</h1><p>Your conversations</p></div><button className="new-message-button" aria-label="New message"><MessageCircle size={21} /></button></div>
    <div className="message-search whatsapp-search"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search or start new chat" /></div>
    <div className="conversation-list">
      {filteredPeople.length === 0 && <div className="no-conversations"><MessageCircle size={38} /><h3>No people found</h3><p>Search for a user or create your first connection.</p></div>}
      {filteredPeople.map(person => <div className="conversation-row" key={person.username}>
        <button className="conversation-main" onClick={() => onOpenChat(person)}><div className="conversation-avatar"><img src={person.avatar} alt={person.name} className="avatar" style={{ width: 58, height: 58 }} />{person.online && <span className="online-dot" />}</div><div className="conversation-content"><div className="conversation-name"><strong>{person.name}</strong>{person.lastTime && <span className="conversation-time">{person.lastTime}</span>}</div><div className="conversation-preview"><span>{person.lastMessage || "Tap to start a conversation"}</span>{person.unread ? <b className="unread-badge">{person.unread}</b> : null}</div></div></button>
        <div className="conversation-actions"><button aria-label={`Audio call ${person.name}`} onClick={() => onCall?.(person, false)}><Phone size={18} /></button><button aria-label={`Video call ${person.name}`} onClick={() => onCall?.(person, true)}><Video size={19} /></button></div>
      </div>)}
    </div>
  </div></section>;
}
