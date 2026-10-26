import { useMemo, useState } from "react";
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
  Plus,
} from "lucide-react";

type Person = { id?: string; name: string; username: string; avatar: string };
type Message = { id: string; text: string; sender: "me" | "them"; time: string };
type ChatProps = { person: Person; messages: Message[]; onSendMessage: (text: string) => void; onBack: () => void };

const AI_ID = "boi-achiever-ai";
const AI_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%236d5dfc'/%3E%3Cstop offset='1' stop-color='%2300d4ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='60' fill='%230b1020'/%3E%3Ccircle cx='60' cy='60' r='46' fill='url(%23g)'/%3E%3Cpath d='M39 51c0-8 7-15 15-15h13c8 0 14 7 14 15v18c0 8-6 15-14 15H55c-8 0-16-7-16-15z' fill='white' opacity='.96'/%3E%3Ccircle cx='52' cy='60' r='4' fill='%236d5dfc'/%3E%3Ccircle cx='69' cy='60' r='4' fill='%2300a9d6'/%3E%3Cpath d='M50 71c6 5 14 5 20 0' fill='none' stroke='%236d5dfc' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E";

const tools = [
  { id: "chat", label: "Chat", icon: MessageCircle, prompt: "Ask me anything" },
  { id: "knowledge", label: "Knowledge", icon: Sparkles, prompt: "Explain a topic clearly" },
  { id: "code", label: "Code", icon: Code2, prompt: "Write or fix code" },
  { id: "video", label: "Video", icon: Video, prompt: "Create a video idea" },
  { id: "music", label: "Music", icon: Music2, prompt: "Create a song or music idea" },
  { id: "drama", label: "Drama", icon: Drama, prompt: "Create a drama or story" },
  { id: "ideas", label: "Ideas", icon: Lightbulb, prompt: "Give me creative ideas" },
  { id: "learn", label: "Learn", icon: BookOpen, prompt: "Teach me step by step" },
];

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildPrompt(tool: string, text: string) {
  const instruction = tools.find(t => t.id === tool)?.prompt || "Help me";
  return `You are Boi Achiver AI, a friendly personal assistant inside the FreeText app. ${instruction}. Be natural, useful, concise, and beginner-friendly. Never claim to have performed actions you cannot perform. User message: ${text}`;
}

export default function Chat({ person, messages, onSendMessage, onBack }: ChatProps) {
  const [text, setText] = useState("");
  const [aiTool, setAiTool] = useState("chat");
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const isAI = person.id === AI_ID || person.username === AI_ID;
  const activeTool = useMemo(() => tools.find(tool => tool.id === aiTool) || tools[0], [aiTool]);

  const sendMessage = async () => {
    const cleanText = text.trim();
    if (!cleanText || aiBusy) return;
    setText("");

    if (!isAI) {
      onSendMessage(cleanText);
      return;
    }

    const userMessage: Message = { id: crypto.randomUUID(), text: cleanText, sender: "me", time: now() };
    setAiMessages(current => [...current, userMessage]);
    setAiBusy(true);

    try {
      // Free, browser-based AI. No API key and no separate browser page.
      const moduleName = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0/+esm";
      const hf: any = await import(/* @vite-ignore */ moduleName);
      const model = "onnx-community/Qwen2.5-0.5B-Instruct";
      let generator: any;
      try {
        generator = await hf.pipeline("text-generation", model, { device: "webgpu", dtype: "q4f16" });
      } catch {
        generator = await hf.pipeline("text-generation", model, { device: "wasm", dtype: "q4" });
      }

      const recent = [...aiMessages, userMessage].slice(-8).map(m => `${m.sender === "me" ? "User" : "Boi Achiver AI"}: ${m.text}`).join("\n");
      const result: any = await generator(`${buildPrompt(aiTool, cleanText)}\n\nConversation:\n${recent}\n\nBoi Achiver AI:`, { max_new_tokens: 220, temperature: 0.7, do_sample: true, return_full_text: false });
      const output = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
      const reply = String(output || "I’m here. Tell me what you need help with.").trim();
      setAiMessages(current => [...current, { id: crypto.randomUUID(), text: reply, sender: "them", time: now() }]);
    } catch (error) {
      console.error(error);
      setAiMessages(current => [...current, { id: crypto.randomUUID(), text: "I couldn't start the free AI model on this device yet. Try again, or ask me something simpler.", sender: "them", time: now() }]);
    } finally {
      setAiBusy(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (isAI) {
    const displayMessages = aiMessages;
    return <section className="chat-page boi-ai-native-page">
      <style>{`
        .boi-ai-native{display:flex;flex-direction:column;min-height:calc(100vh - 125px);background:#fff;color:#111827;overflow:hidden}
        html.dark .boi-ai-native{background:#0b0d10;color:#f5f7fa}
        .boi-ai-native-header{display:flex;align-items:center;gap:11px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);position:sticky;top:0;z-index:4}
        html.dark .boi-ai-native-header{background:rgba(11,13,16,.96);border-color:#24282f}
        .boi-ai-native-header .chat-person{flex:1;min-width:0}.boi-ai-native-header .chat-person strong{display:block;font-size:15px}.boi-ai-native-header .chat-person span{display:flex;align-items:center;gap:5px;font-size:11px;color:#6b7280;margin-top:2px}
        .boi-ai-green{width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block}
        .boi-ai-native-body{display:grid;grid-template-columns:170px minmax(0,1fr);flex:1;min-height:0}
        .boi-ai-sidebar{padding:10px;border-right:1px solid #e5e7eb;background:#fafafa}.boi-ai-sidebar-title{padding:8px 9px;color:#6b7280;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px}
        html.dark .boi-ai-sidebar{background:#111418;border-color:#24282f}.boi-ai-sidebar button{width:100%;display:flex;align-items:center;gap:9px;padding:10px;border:0;border-radius:10px;background:transparent;color:#6b7280;text-align:left;font-size:12px}.boi-ai-sidebar button.active{background:#eef2ff;color:#4f46e5;font-weight:700}.boi-ai-sidebar button:hover{background:#f0f1f3}html.dark .boi-ai-sidebar button{color:#9ca3af}html.dark .boi-ai-sidebar button.active{background:#1d1b35;color:#a5b4fc}html.dark .boi-ai-sidebar button:hover{background:#1a1e24}
        .boi-ai-conversation{display:flex;flex-direction:column;min-width:0;min-height:0;background:#fff}.boi-ai-chat-scroll{flex:1;overflow-y:auto;padding:24px clamp(16px,5vw,70px) 28px;scroll-behavior:smooth}.boi-ai-welcome{text-align:center;max-width:620px;margin:9vh auto 32px}.boi-ai-welcome img{width:56px;height:56px;border-radius:50%;box-shadow:0 8px 30px #4f46e526}.boi-ai-welcome h2{font-size:24px;margin:14px 0 7px}.boi-ai-welcome p{margin:0;color:#6b7280;font-size:13px}.boi-ai-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:22px}.boi-ai-suggestions button{padding:12px;text-align:left;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:#374151}.boi-ai-suggestions button:hover{background:#f8fafc}html.dark .boi-ai-suggestions button{background:#12161b;border-color:#292e36;color:#d1d5db}
        .boi-ai-row{display:flex;gap:10px;margin:15px 0;align-items:flex-end}.boi-ai-row.mine{justify-content:flex-end}.boi-ai-bubble{max-width:min(720px,85%);padding:11px 14px;border-radius:17px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.boi-ai-bubble.them{background:#f1f3f5;color:#111827;border-bottom-left-radius:5px}.boi-ai-bubble.mine{background:#4f46e5;color:white;border-bottom-right-radius:5px}html.dark .boi-ai-bubble.them{background:#1a1f26;color:#f3f4f6}.boi-ai-typing{display:flex;gap:4px;padding:4px}.boi-ai-typing i{width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:boiPulse 1s infinite}.boi-ai-typing i:nth-child(2){animation-delay:.15s}.boi-ai-typing i:nth-child(3){animation-delay:.3s}@keyframes boiPulse{50%{opacity:.25;transform:translateY(-2px)}}
        .boi-ai-composer{padding:10px clamp(12px,4vw,60px) calc(12px + env(safe-area-inset-bottom));border-top:1px solid #e5e7eb;background:#fff}.boi-ai-composer-inner{display:flex;align-items:flex-end;gap:8px;max-width:900px;margin:auto;border:1px solid #d1d5db;border-radius:22px;padding:6px 7px 6px 15px;background:#fff;box-shadow:0 2px 10px #0000000a}.boi-ai-composer input{flex:1;border:0;outline:0;background:transparent;min-width:0;padding:8px 0;font-size:14px;color:inherit}.boi-ai-composer button{width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:#111827;color:#fff}.boi-ai-composer button:disabled{opacity:.45}.boi-ai-disclaimer{text-align:center;font-size:9px;color:#9ca3af;margin:6px 0 0}
        html.dark .boi-ai-composer{background:#0b0d10;border-color:#24282f}.boi-ai-composer-inner{background:transparent}html.dark .boi-ai-composer-inner{border-color:#353a43}
        @media(max-width:650px){.boi-ai-native-body{grid-template-columns:1fr}.boi-ai-sidebar{display:flex;gap:5px;overflow-x:auto;padding:8px;border-right:0;border-bottom:1px solid #e5e7eb}.boi-ai-sidebar-title{display:none}.boi-ai-sidebar button{width:auto;min-width:max-content;padding:8px 10px}.boi-ai-sidebar button span{display:inline}.boi-ai-chat-scroll{padding:16px 12px 20px}.boi-ai-welcome{margin:6vh auto 22px}.boi-ai-suggestions{grid-template-columns:1fr}.boi-ai-bubble{max-width:91%}}
      `}</style>
      <div className="chat-card boi-ai-native">
        <header className="boi-ai-native-header">
          <button className="chat-back" onClick={onBack} aria-label="Back to Messages"><ArrowLeft size={21} /></button>
          <img src={AI_AVATAR} alt="Boi Achiver AI" className="avatar" style={{ width: 42, height: 42 }} />
          <div className="chat-person"><strong>Boi Achiver AI</strong><span><i className="boi-ai-green" /> Online • Free AI</span></div>
          <button className="chat-header-action" aria-label="New AI chat" onClick={() => setAiMessages([])}><Plus size={19} /></button>
          <button className="chat-header-action" aria-label="More options"><MoreVertical size={19} /></button>
        </header>
        <div className="boi-ai-native-body">
          <aside className="boi-ai-sidebar" aria-label="Boi Achiver AI tools"><div className="boi-ai-sidebar-title">Assist</div>{tools.map(tool => { const Icon = tool.icon; return <button key={tool.id} className={aiTool === tool.id ? "active" : ""} onClick={() => setAiTool(tool.id)}><Icon size={16} /><span>{tool.label}</span></button>; })}</aside>
          <main className="boi-ai-conversation">
            <div className="boi-ai-chat-scroll">
              {displayMessages.length === 0 && <div className="boi-ai-welcome"><img src={AI_AVATAR} alt="Boi Achiver AI" /><h2>How can I help you?</h2><p>Ask Boi Achiver AI anything. Your assistant stays inside FreeText.</p><div className="boi-ai-suggestions">{tools.slice(0,4).map(tool => <button key={tool.id} onClick={() => { setAiTool(tool.id); setText(tool.prompt + " for me"); }}>{tool.prompt}</button>)}</div></div>}
              {displayMessages.map(message => <div key={message.id} className={`boi-ai-row ${message.sender === "me" ? "mine" : ""}`}><div className={`boi-ai-bubble ${message.sender === "me" ? "mine" : "them"}`}>{message.text}</div></div>)}
              {aiBusy && <div className="boi-ai-row"><div className="boi-ai-bubble them"><div className="boi-ai-typing"><i/><i/><i/></div></div></div>}
            </div>
            <div className="boi-ai-composer"><div className="boi-ai-composer-inner"><input value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message Boi Achiver AI..." disabled={aiBusy} /><button onClick={sendMessage} disabled={!text.trim() || aiBusy} aria-label="Send"><Send size={18}/></button></div><div className="boi-ai-disclaimer">Boi Achiver AI can make mistakes. Check important information.</div></div>
          </main>
        </div>
      </div>
    </section>;
  }

  return <section className="chat-page"><div className="chat-card"><header className="chat-header"><button className="chat-back" onClick={onBack} aria-label="Back"><ArrowLeft size={21} /></button><img src={person.avatar} alt={person.name} className="avatar" style={{ width: 44, height: 44 }} /><div className="chat-person"><strong>{person.name}</strong><span>@{person.username}</span></div><div className="chat-header-actions"><button aria-label="Audio call" title="Audio call" onClick={() => alert("Audio calling will be added next.")}><Phone size={19} /></button><button aria-label="Video call" title="Video call" onClick={() => alert("Video calling will be added next.")}><Video size={20} /></button><button aria-label="More options" title="More options"><MoreVertical size={20} /></button></div></header><div className="chat-messages">{messages.length === 0 && <div className="chat-empty"><img src={person.avatar} alt={person.name} className="avatar" style={{ width: 70, height: 70 }} /><h2>{person.name}</h2><p>Start a conversation with @{person.username}</p></div>}{messages.map(message => <div key={message.id} className={message.sender === "me" ? "message-bubble-row mine" : "message-bubble-row"}><div className={message.sender === "me" ? "message-bubble mine" : "message-bubble"}><p>{message.text}</p><span>{message.time}</span></div></div>)}</div><div className="chat-input-area"><input type="text" value={text} onChange={event => setText(event.target.value)} onKeyDown={handleKeyDown} placeholder="Write a message..." /><button className="chat-send" onClick={sendMessage} aria-label="Send message"><Send size={19} /></button></div></div></section>;
}
