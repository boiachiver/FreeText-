import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  Code2,
  Lightbulb,
  MessageCircle,
  MoreVertical,
  Music2,
  Phone,
  Send,
  Sparkles,
  Video,
  BookOpen,
  Drama,
} from "lucide-react";

type Person = { id?: string; name: string; username: string; avatar: string };
type Message = { id: string; text: string; sender: "me" | "them"; time: string };
type ChatProps = { person: Person; messages: Message[]; onSendMessage: (text: string) => void; onBack: () => void };

const AI_ID = "boi-achiever-ai";
const AI_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%236d5dfc'/%3E%3Cstop offset='1' stop-color='%2300d4ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='60' fill='%230b1020'/%3E%3Ccircle cx='60' cy='60' r='46' fill='url(%23g)'/%3E%3Cpath d='M39 51c0-8 7-15 15-15h13c8 0 14 7 14 15v18c0 8-6 15-14 15H55c-8 0-16-7-16-15z' fill='white' opacity='.96'/%3E%3Ccircle cx='52' cy='60' r='4' fill='%236d5dfc'/%3E%3Ccircle cx='69' cy='60' r='4' fill='%2300a9d6'/%3E%3Cpath d='M50 71c6 5 14 5 20 0' fill='none' stroke='%236d5dfc' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E";
const tools = [
  { id: "chat", label: "Chat", icon: MessageCircle, prompt: "Help me with anything" },
  { id: "knowledge", label: "Knowledge", icon: Sparkles, prompt: "Explain this clearly" },
  { id: "code", label: "Code", icon: Code2, prompt: "Help me write or fix code" },
  { id: "video", label: "Video", icon: Video, prompt: "Help me create a video" },
  { id: "music", label: "Music", icon: Music2, prompt: "Help me create music" },
  { id: "drama", label: "Drama", icon: Drama, prompt: "Help me create a drama" },
  { id: "ideas", label: "Ideas", icon: Lightbulb, prompt: "Give me creative ideas" },
  { id: "learn", label: "Learn", icon: BookOpen, prompt: "Teach me step by step" },
];

export default function Chat({ person, messages, onSendMessage, onBack }: ChatProps) {
  const [text, setText] = useState("");
  const [aiTool, setAiTool] = useState("chat");
  const isAI = person.id === AI_ID || person.username === AI_ID;
  const sendMessage = () => { const cleanText = text.trim(); if (!cleanText) return; onSendMessage(cleanText); setText(""); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") { event.preventDefault(); sendMessage(); } };

  if (isAI) {
    const activeTool = tools.find(tool => tool.id === aiTool) || tools[0];
    return <section className="chat-page">
      <style>{`\n.boi-ai-chat-card{overflow:hidden;background:#050816!important;border:1px solid #1d3761!important;color:#f8fbff}.boi-ai-header{background:#071022!important;border-color:#1e3964!important}.boi-ai-header .chat-person span{color:#83a0c9}.boi-ai-live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#53e6a0;box-shadow:0 0 10px #53e6a0;margin-right:5px}.boi-ai-layout{display:grid;grid-template-columns:154px minmax(0,1fr);min-height:calc(100vh - 170px);background:#030711}.boi-ai-tools{padding:12px 9px;border-right:1px solid #1d3761;background:#071022}.boi-ai-tools-title{display:flex;align-items:center;gap:7px;padding:8px 9px 12px;color:#9eb5d7;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px}.boi-ai-tool{width:100%;display:flex;align-items:center;gap:9px;padding:10px 9px;border:1px solid transparent;border-radius:11px;background:transparent;color:#93a6c5;text-align:left;font-size:11px}.boi-ai-tool:hover{background:#0d1b34;color:#fff}.boi-ai-tool.active{background:linear-gradient(135deg,#102d4f,#24134b);border-color:#2d67a0;color:#fff;box-shadow:0 0 18px #2269b51c}.boi-ai-main{min-width:0;display:flex;flex-direction:column}.boi-ai-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #1d3761;background:#071022}.boi-ai-toolbar strong{display:block;font-size:13px}.boi-ai-toolbar span{display:block;color:#7589aa;font-size:9px;margin-top:3px}.boi-ai-free-pill{padding:5px 8px!important;border:1px solid #245f61;border-radius:999px;color:#68e7b0!important;background:#0b2825;font-weight:800}.boi-ai-embed-wrap{flex:1;min-height:650px;background:#030711}.boi-ai-embed{display:block;width:100%;height:100%;min-height:650px;border:0;background:#030711}@media(max-width:650px){.boi-ai-layout{grid-template-columns:72px minmax(0,1fr)}.boi-ai-tools{padding:8px 5px}.boi-ai-tools-title{justify-content:center;padding:8px 0 10px}.boi-ai-tools-title span,.boi-ai-tool span{display:none}.boi-ai-tool{justify-content:center;padding:11px 6px}.boi-ai-embed,.boi-ai-embed-wrap{min-height:calc(100vh - 185px)}}\n`}</style>
      <div className="chat-card boi-ai-chat-card">
        <header className="chat-header boi-ai-header"><button className="chat-back" onClick={onBack} aria-label="Back"><ArrowLeft size={21} /></button><img src={AI_AVATAR} alt="Boi Achiver AI" className="avatar" style={{ width: 44, height: 44 }} /><div className="chat-person"><strong>Boi Achiver AI</strong><span><span className="boi-ai-live-dot" /> Free AI • FreeText</span></div><div className="chat-header-actions"><button aria-label="More options" title="More options"><MoreVertical size={20} /></button></div></header>
        <div className="boi-ai-layout"><aside className="boi-ai-tools" aria-label="AI assistance tools"><div className="boi-ai-tools-title"><Bot size={18} /><span>Assist</span></div>{tools.map(tool => { const Icon = tool.icon; return <button key={tool.id} className={`boi-ai-tool${aiTool === tool.id ? " active" : ""}`} onClick={() => setAiTool(tool.id)} title={tool.label}><Icon size={18} /><span>{tool.label}</span></button>; })}</aside><main className="boi-ai-main"><div className="boi-ai-toolbar"><div><strong>{activeTool.label}</strong><span>{activeTool.prompt}</span></div><span className="boi-ai-free-pill">FREE</span></div><div className="boi-ai-embed-wrap"><iframe title="Boi Achiver AI" src={`/ai.html?tool=${encodeURIComponent(aiTool)}`} className="boi-ai-embed" /></div></main></div>
      </div>
    </section>;
  }

  return <section className="chat-page"><div className="chat-card"><header className="chat-header"><button className="chat-back" onClick={onBack} aria-label="Back"><ArrowLeft size={21} /></button><img src={person.avatar} alt={person.name} className="avatar" style={{ width: 44, height: 44 }} /><div className="chat-person"><strong>{person.name}</strong><span>@{person.username}</span></div><div className="chat-header-actions"><button aria-label="Audio call" title="Audio call" onClick={() => alert("Audio calling will be added next.")}><Phone size={19} /></button><button aria-label="Video call" title="Video call" onClick={() => alert("Video calling will be added next.")}><Video size={20} /></button><button aria-label="More options" title="More options"><MoreVertical size={20} /></button></div></header><div className="chat-messages">{messages.length === 0 && <div className="chat-empty"><img src={person.avatar} alt={person.name} className="avatar" style={{ width: 70, height: 70 }} /><h2>{person.name}</h2><p>Start a conversation with @{person.username}</p></div>}{messages.map(message => <div key={message.id} className={message.sender === "me" ? "message-bubble-row mine" : "message-bubble-row"}><div className={message.sender === "me" ? "message-bubble mine" : "message-bubble"}><p>{message.text}</p><span>{message.time}</span></div></div>)}</div><div className="chat-input-area"><input type="text" value={text} onChange={event => setText(event.target.value)} onKeyDown={handleKeyDown} placeholder="Write a message..." /><button className="chat-send" onClick={sendMessage} aria-label="Send message"><Send size={19} /></button></div></div></section>;
}
