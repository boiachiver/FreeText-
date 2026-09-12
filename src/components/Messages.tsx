import {
  MessageCircle,
  Phone,
  Search,
  Video,
} from "lucide-react";

type Person = {
  name: string;
  username: string;
  avatar: string;
};

type MessagesProps = {
  people: Person[];
  onOpenChat: (person: Person) => void;
};

export default function Messages({
  people,
  onOpenChat,
}: MessagesProps) {
  return (
    <section className="page-section">

      <div className="page-heading">
        <div>
          <h1>Messages</h1>
          <p>Chat with people you connect with.</p>
        </div>
      </div>

      <div className="messages-card">

        <div className="message-search">
          <Search size={18} />

          <input
            placeholder="Search messages"
            type="text"
          />
        </div>

        {people.map((person) => (
          <div
            className="message-row"
            key={person.username}
          >
            <button
              className="message-person"
              onClick={() => onOpenChat(person)}
            >
              <img
                src={person.avatar}
                alt={person.name}
                className="avatar"
                style={{
                  width: 50,
                  height: 50,
                }}
              />

              <div>
                <strong>{person.name}</strong>

                <span>
                  Tap to start a conversation
                </span>
              </div>
            </button>

            <div className="message-call-actions">

              <button
                aria-label={`Audio call ${person.name}`}
                title="Audio call"
              >
                <Phone size={18} />
              </button>

              <button
                aria-label={`Video call ${person.name}`}
                title="Video call"
              >
                <Video size={19} />
              </button>

              <button
                onClick={() => onOpenChat(person)}
                aria-label={`Message ${person.name}`}
                title="Message"
              >
                <MessageCircle size={19} />
              </button>

            </div>
          </div>
        ))}

      </div>

    </section>
  );
}
