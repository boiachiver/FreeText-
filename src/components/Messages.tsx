import { useRef, useState } from "react";
import { Bot, MessageCircle, Phone, Search, Video, X } from "lucide-react";

type Person = { id: string; name: string; username: string; avatar: string };
export type Conversation = Person & { lastMessage?: string; lastTime?: string; unread?: number; online?: boolean };
type MessagesProps = { people?: Conversation[]; onOpenChat: (person: Person) => void; onCall?: (person: Person, video: boolean) => void };

const AI_ID = "boi-achiever-ai";
const AI_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%236d5dfc'/%3E%3Cstop offset='1' stop-color='%2300d4ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='60' fill='%230b1020'/%3E%3Ccircle cx='60' cy='60' r='46' fill='url(%23g)'/%3E%3Cpath d='M39 51c0-8 7-15 15-15h13c8 0 14 7 14 15v18c0 8-6 15-14 15H55c-8 0-16-7-16-15z' fill='white' opacity='.96'/%3E%3Ccircle cx='52' cy='60' r='4' fill='%236d5dfc'/%3E%3Ccircle cx='69' cy='60' r='4' fill='%2300a9d6'/%3E%3Cpath d='M50 71c6 5 14 5 20 0' fill='none' stroke='%236d5dfc' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E";

export default function Messages({ people = [], onOpenChat, onCall }: MessagesProps) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const aiContact: Conversation = { id: AI_ID, name: "Boi Achiver AI", username: AI_ID, avatar: AI_AVATAR, lastMessage: "Your personal FreeText assistant", online: true };
  const allPeople = [aiContact, ...people.filter(person => person.id !== AI_ID)];
  const filteredPeople = allPeople.filter(person => `${person.name} ${person.username}`.toLowerCase().includes(search.toLowerCase()));

  const startNewMessage = () => searchRef.current?.focus();
  const clearSearch = () => setSearch("");

  return <section className="page-section">
    <div className="messages-whatsapp">
      <div className="messages-top">
        <div><h1>Messages</h1><p>Your conversations</p></div>
        <button className="new-message-button" aria-label="New message" onClick={startNewMessage}><MessageCircle size={21} /></button>
      </div>
      <div className="message-search whatsapp-search">
        <Search size={18} />
        <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search or start new chat" aria-label="Search conversations" />
        {search && <button type="button" className="search-clear" aria-label="Clear search" onClick={clearSearch}><X size={15} /></button>}
      </div>
      <div className="conversation-list">
        {filteredPeople.length === 0 && <div className="no-conversations"><MessageCircle size={38} /><h3>No people found</h3><p>Try another name or username.</p></div>}
        {filteredPeople.map(person => {
          const isAI = person.id === AI_ID;
          return <div className={`conversation-row${isAI ? " boi-ai-row" : ""}`} key={person.username}>
            <button className="conversation-main" onClick={() => onOpenChat(person)}>
              <div className="conversation-avatar">
                {isAI ? <div className="boi-ai-avatar"><img src={person.avatar} alt="Boi Achiver AI" /></div> : <img src={person.avatar} alt={person.name} className="avatar" style={{ width: 58, height: 58 }} />}
                {person.online && <span className="online-dot" />}
              </div>
              <div className="conversation-content">
                <div className="conversation-name"><strong>{person.name}</strong>{isAI && <span className="boi-ai-badge"><Bot size={12} /> AI</span>}{person.lastTime && <span className="conversation-time">{person.lastTime}</span>}</div>
                <div className="conversation-preview"><span>{person.lastMessage || "Tap to start a conversation"}</span>{person.unread ? <b className="unread-badge">{person.unread}</b> : null}</div>
              </div>
            </button>
            {!isAI && <div className="conversation-actions">
              <button aria-label={`Audio call ${person.name}`} onClick={() => onCall?.(person, false)}><Phone size={18} /></button>
              <button aria-label={`Video call ${person.name}`} onClick={() => onCall?.(person, true)}><Video size={19} /></button>
            </div>}
          </div>;
        })}
      </div>
    </div>
  </section>;
}
