import { useState } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Send,
  Video,
} from "lucide-react";

type Person = {
  name: string;
  username: string;
  avatar: string;
};

type Message = {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
};

type ChatProps = {
  person: Person;
  messages: Message[];
  onSendMessage: (text: string) => void;
  onBack: () => void;
};

export default function Chat({
  person,
  messages,
  onSendMessage,
  onBack,
}: ChatProps) {
  const [text, setText] = useState("");

  const sendMessage = () => {
    const cleanText = text.trim();

    if (!cleanText) return;

    onSendMessage(cleanText);
    setText("");
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <section className="chat-page">

      <div className="chat-card">

        <header className="chat-header">

          <button
            className="chat-back"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeft size={21} />
          </button>

          <img
            src={person.avatar}
            alt={person.name}
            className="avatar"
            style={{
              width: 44,
              height: 44,
            }}
          />

          <div className="chat-person">
            <strong>{person.name}</strong>
            <span>@{person.username}</span>
          </div>

          <div className="chat-header-actions">

            <button
              aria-label="Audio call"
              title="Audio call"
              onClick={() =>
                alert("Audio calling will be added next.")
              }
            >
              <Phone size={19} />
            </button>

            <button
              aria-label="Video call"
              title="Video call"
              onClick={() =>
                alert("Video calling will be added next.")
              }
            >
              <Video size={20} />
            </button>

            <button
              aria-label="More options"
              title="More options"
            >
              <MoreVertical size={20} />
            </button>

          </div>

        </header>

        <div className="chat-messages">

          {messages.length === 0 && (
            <div className="chat-empty">
              <img
                src={person.avatar}
                alt={person.name}
                className="avatar"
                style={{
                  width: 70,
                  height: 70,
                }}
              />

              <h2>{person.name}</h2>

              <p>
                Start a conversation with @{person.username}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.sender === "me"
                  ? "message-bubble-row mine"
                  : "message-bubble-row"
              }
            >
              <div
                className={
                  message.sender === "me"
                    ? "message-bubble mine"
                    : "message-bubble"
                }
              >
                <p>{message.text}</p>
                <span>{message.time}</span>
              </div>
            </div>
          ))}

        </div>

        <div className="chat-input-area">

          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
          />

          <button
            className="chat-send"
            onClick={sendMessage}
            aria-label="Send message"
          >
            <Send size={19} />
          </button>

        </div>

      </div>

    </section>
  );
}
