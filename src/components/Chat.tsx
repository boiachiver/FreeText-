import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Code2, Drama, Lightbulb, MessageCircle, MoreVertical, Music2, Plus, Send, Sparkles, Video, X } from "lucide-react";

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

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Chat({ person, messages, onSendMessage, onBack }: ChatProps) {
  const [text, setText] = useState("");
  const [aiTool, setAiTool] = useState("chat");
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const isAI = person.id === AI_ID || person.username === AI_ID;
  const activeTool = useMemo(() => tools.find(t => t.id === aiTool) || tools[0], [aiTool]);

  const chooseTool = (id: string) => {
    setAiTool(id);
    const tool = tools.find(t => t.id === id);
    if (tool && !text.trim()) setText(tool.prompt + " for me");
  };

  const clearAI = () => { setAiMessages([]); setText(""); };

  const sendAI = async () => {
    const clean = text.trim();
    if (!clean || aiBusy) return;
    setText("");
    const userMessage: Message = { id: crypto.randomUUID(), text: clean, sender: "me", time: now() };
    setAiMessages(current => [...current, userMessage]);
    setAiBusy(true);
    try {
      const hf: any = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0/+esm");
      const model = "onnx-community/Qwen2.5-0.5B-Instruct";
      let generator: any;
      try { generator = await hf.pipeline("text-generation", model, { device: "webgpu", dtype: "q4f16" }); }
      catch { generator = await hf.pipeline("text-generation", model, { device: "wasm", dtype: "q4" }); }
      const recent = [...aiMessages, userMessage].slice(-8).map(m => `${m.sender === "me" ? "User" : "Boi Achiver AI"}: ${m.text}`).join("\n");
      const prompt = `You are Boi Achiver AI inside FreeText. Mode: ${activeTool.label}. ${activeTool.prompt}. Be helpful, natural, concise and beginner-friendly. Never claim you performed an action you cannot perform.\n\nConversation:\n${recent}\n\nBoi Achiver AI:`;
      const result: any = await generator(prompt, { max_new_tokens: 220, temperature: 0.7, do_sample: true, return_full_text: false });
      const raw = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
      const reply = String(raw || "I’m here. Tell me what you need help with.").trim();
      setAiMessages(current => [...current, { id: crypto.randomUUID(), text: reply, sender: "them", time: now() }]);
    } catch (error) {
      console.error(error);
      setAiMessages(current => [...current, { id: crypto.randomUUID(), text: "The free AI model could not start on this device. Please try again.", sender: "them", time: now() }]);
    } finally { setAiBusy(false); }
  };

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    if (isAI) void sendAI(); else { onSendMessage(clean); setText(""); }
  };

  const keyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  if (!isAI) return <section className="chat-page"><div className="chat-card">
    <header className="chat-header"><button className="chat-back" onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><img src={person.avatar} alt={person.name} className="avatar" style={{width:42,height:42}}/><div className="chat-person"><strong>{person.name}</strong><span>@{person.username}</span></div></header>
    <div className="chat-messages">{messages.length===0 ? <div className="empty-state">Start the conversation with {person.name}.</div> : messages.map(m => <div key={m.id} className={`message-row ${m.sender==='me'?'mine':''}`}><div className="message-bubble">{m.text}<small>{m.time}</small></div></div>)}</div>
    <div className="chat-input"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={keyDown} placeholder={`Message ${person.name}…`}/><button onClick={send} disabled={!text.trim()} aria-label="Send"><Send size={18}/></button></div>
  </div></section>;

  return <section className="chat-page boi-ai-native-page">
    <style>{`.boi-ai-native{display:flex;flex-direction:column;min-height:calc(100vh - 125px);background:#fff;color:#111827;overflow:hidden}html.dark .boi-ai-native{background:#0b0d10;color:#f5f7fa}.boi-ai-native-header{display:flex;align-items:center;gap:11px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fffffff5;position:sticky;top:0;z-index:4}html.dark .boi-ai-native-header{background:#0b0d10f5;border-color:#24282f}.boi-ai-native-header .chat-person{flex:1;min-width:0}.boi-ai-native-header .chat-person strong{display:block;font-size:15px}.boi-ai-native-header .chat-person span{font-size:11px;color:#6b7280}.boi-ai-green{width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;margin-right:5px}.boi-ai-native-body{display:grid;grid-template-columns:170px minmax(0,1fr);flex:1;min-height:0}.boi-ai-sidebar{padding:10px;border-right:1px solid #e5e7eb;background:#fafafa}.boi-ai-sidebar-title{padding:8px 9px;color:#6b7280;font-size:11px;font-weight:800;text-transform:uppercase}.boi-ai-sidebar button{width:100%;display:flex;align-items:center;gap:9px;padding:10px;border:0;border-radius:10px;background:transparent;color:#6b7280;text-align:left;font-size:12px}.boi-ai-sidebar button.active{background:#eef2ff;color:#4f46e5;font-weight:700}.boi-ai-sidebar button:hover{background:#f0f1f3}html.dark .boi-ai-sidebar{background:#111418;border-color:#24282f}html.dark .boi-ai-sidebar button{color:#9ca3af}html.dark .boi-ai-sidebar button.active{background:#1d1b35;color:#a5b4fc}.boi-ai-conversation{display:flex;flex-direction:column;min-width:0;min-height:0}.boi-ai-chat-scroll{flex:1;overflow-y:auto;padding:24px clamp(12px,5vw,70px) 28px}.boi-ai-welcome{text-align:center;max-width:620px;margin:9vh auto 32px}.boi-ai-welcome img{width:56px;height:56px;border-radius:50%}.boi-ai-welcome h2{font-size:24px;margin:14px 0 7px}.boi-ai-welcome p{margin:0;color:#6b7280;font-size:13px}.boi-ai-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:22px}.boi-ai-suggestions button{padding:12px;text-align:left;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:#374151}.boi-ai-row{display:flex;margin:15px 0}.boi-ai-row.mine{justify-content:flex-end}.boi-ai-bubble{max-width:min(720px,90%);padding:11px 14px;border-radius:17px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.boi-ai-bubble.them{background:#f1f3f5;border-bottom-left-radius:5px}.boi-ai-bubble.mine{background:#4f46e5;color:#fff;border-bottom-right-radius:5px}html.dark .boi-ai-bubble.them{background:#1a1f26;color:#f3f4f6}.boi-ai-typing{display:flex;gap:4px}.boi-ai-typing i{width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:p 1s infinite}.boi-ai-typing i:nth-child(2){animation-delay:.15s}.boi-ai-typing i:nth-child(3){animation-delay:.3s}@keyframes p{50%{opacity:.25;transform:translateY(-2px)}}.boi-ai-composer{padding:10px 12px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #e5e7eb;background:#fff}.boi-ai-composer-inner{display:flex;gap:8px;max-width:900px;margin:auto;border:1px solid #d1d5db;border-radius:22px;padding:6px 7px 6px 15px}.boi-ai-composer input{flex:1;border:0;outline:0;background:transparent;padding:8px 0;color:inherit}.boi-ai-composer button{width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:#111827;color:#fff}.boi-ai-composer button:disabled{opacity:.45}html.dark .boi-ai-composer{background:#0b0d10;border-color:#24282f}html.dark .boi-ai-composer-inner{border-color:#353a43}.boi-ai-disclaimer{text-align:center;font-size:9px;color:#9ca3af;margin:5px 0 0}@media(max-width:650px){.boi-ai-native-body{grid-template-columns:1fr}.boi-ai-sidebar{display:flex;gap:5px;overflow-x:auto;padding:8px;border-right:0;border-bottom:1px solid #e5e7eb}.boi-ai-sidebar-title{display:none}.boi-ai-sidebar button{width:auto;min-width:max-content;padding:8px 10px}.boi-ai-chat-scroll{padding:16px 12px 20px}.boi-ai-suggestions{grid-template-columns:1fr}}`}</style>
    <div className="chat-card boi-ai-native">
      <header className="boi-ai-native-header"><button className="chat-back" onClick={onBack} aria-label="Back to Messages"><ArrowLeft size={21}/></button><img src={AI_AVATAR} alt="Boi Achiver AI" className="avatar" style={{width:42,height:42}}/><div className="chat-person"><strong>Boi Achiver AI</strong><span><i className="boi-ai-green"/>Online • Free AI</span></div><button className="chat-header-action" onClick={clearAI} aria-label="New AI chat"><Plus size={19}/></button><button className="chat-header-action" onClick={clearAI} aria-label="Clear AI chat"><X size={18}/></button></header>
      <div className="boi-ai-native-body"><aside className="boi-ai-sidebar"><div className="boi-ai-sidebar-title">Assist</div>{tools.map(tool=>{const Icon=tool.icon;return <button key={tool.id} className={aiTool===tool.id?'active':''} onClick={()=>chooseTool(tool.id)}><Icon size={16}/><span>{tool.label}</span></button>})}</aside>
        <main className="boi-ai-conversation"><div className="boi-ai-chat-scroll">
          {aiMessages.length===0&&<div className="boi-ai-welcome"><img src={AI_AVATAR} alt="Boi Achiver AI"/><h2>How can I help you?</h2><p>Current mode: {activeTool.label}. Ask Boi Achiver AI anything.</p><div className="boi-ai-suggestions">{tools.slice(0,4).map(tool=><button key={tool.id} onClick={()=>chooseTool(tool.id)}>{tool.prompt}</button>)}</div></div>}
          {aiMessages.map(m=><div key={m.id} className={`boi-ai-row ${m.sender==='me'?'mine':''}`}><div className={`boi-ai-bubble ${m.sender==='me'?'mine':'them'}`}>{m.text}</div></div>)}
          {aiBusy&&<div className="boi-ai-row"><div className="boi-ai-bubble them"><div className="boi-ai-typing"><i/><i/><i/></div></div></div>}
        </div><div className="boi-ai-composer"><div className="boi-ai-composer-inner"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={keyDown} placeholder={`${activeTool.label}: type your message…`}/><button onClick={send} disabled={!text.trim()||aiBusy} aria-label="Send"><Send size={18}/></button></div><div className="boi-ai-disclaimer">Boi Achiver AI can make mistakes. Check important information.</div></div></main>
      </div>
    </div>
  </section>;
}
