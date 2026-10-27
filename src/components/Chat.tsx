import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Code2, Drama, Film, Image as ImageIcon, Lightbulb, Lock, MessageCircle, Music2, Paperclip, Plus, Send, Sparkles, Video, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { decryptMessage, encryptForConversation, ensureIdentity, isEncryptedMessage } from "../lib/e2ee";
import { createMessageMediaUrl, removeMessageMedia, uploadMessageMedia } from "../lib/messageMedia";

type Person = { id?: string; name: string; username: string; avatar: string };
type Message = { id: string; text: string; sender: "me" | "them"; time: string; attachmentUrl?: string; attachmentName?: string; attachmentMime?: string; attachmentSize?: number };
type ChatProps = { person: Person; messages: Message[]; onSendMessage: (text: string) => void; onBack: () => void };
type DbMessage = { id: string; body: string | null; ciphertext: string | null; iv: string | null; encrypted_keys: Record<string, string> | null; sender_id: string; created_at: string; message_type?: string; attachment_path?: string | null; attachment_name?: string | null; attachment_mime?: string | null; attachment_size?: number | null };

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

export default function Chat({ person, messages: initialMessages, onSendMessage, onBack }: ChatProps) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [aiTool, setAiTool] = useState("chat");
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>(initialMessages);
  const [aiBusy, setAiBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [secureReady, setSecureReady] = useState(false);
  const [secureError, setSecureError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAI = person.id === AI_ID || person.username === AI_ID;
  const activeTool = useMemo(() => tools.find(t => t.id === aiTool) || tools[0], [aiTool]);

  const chooseTool = (id: string) => { setAiTool(id); const tool = tools.find(t => t.id === id); if (tool && !text.trim()) setText(tool.prompt + " for me"); };
  const clearAI = () => { setAiMessages([]); setText(""); };

  useEffect(() => {
    if (isAI) return;
    let active = true;
    const setup = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId || !person.id) return;
      try {
        await ensureIdentity(userId);
        const { data: mine, error: mineError } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", userId);
        if (mineError) throw mineError;
        const ids = (mine || []).map((row: any) => row.conversation_id);
        let found: string | null = null;
        if (ids.length) {
          const { data: other, error } = await supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids).eq("user_id", person.id);
          if (error) throw error;
          found = other?.[0]?.conversation_id || null;
        }
        if (!found) {
          const created = await supabase.from("conversations").insert({ created_by: userId }).select("id").single();
          if (created.error || !created.data) throw created.error || new Error("Could not create conversation");
          found = created.data.id;
          const { error } = await supabase.from("conversation_members").insert([{ conversation_id: found, user_id: userId }, { conversation_id: found, user_id: person.id }]);
          if (error) throw error;
        }
        if (active) { setConversationId(found); setSecureReady(true); }
      } catch (error: any) { if (active) setSecureError(error?.message || "Secure messaging could not be initialized."); }
    };
    void setup();
    return () => { active = false; };
  }, [isAI, person.id]);

  useEffect(() => {
    if (isAI || !conversationId) return;
    let active = true;
    const loadChat = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const { data, error } = await supabase.from("messages").select("id,body,ciphertext,iv,encrypted_keys,sender_id,created_at,message_type,attachment_path,attachment_name,attachment_mime,attachment_size").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (error) { if (active) setSecureError(error.message); return; }
      const rows = (data || []) as DbMessage[];
      const decrypted = await Promise.all(rows.map(async message => {
        let content = "";
        if (isEncryptedMessage(message)) {
          try { content = await decryptMessage(userId, { ciphertext: message.ciphertext!, iv: message.iv!, encrypted_keys: message.encrypted_keys! }); }
          catch { content = "🔒 Unable to decrypt this message on this device."; }
        } else if (message.body) content = message.body;
        let attachmentUrl = "";
        if (message.attachment_path) {
          try { attachmentUrl = await createMessageMediaUrl(message.attachment_path); } catch { attachmentUrl = ""; }
        }
        return { id: message.id, text: content, sender: message.sender_id === userId ? "me" as const : "them" as const, time: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), attachmentUrl: attachmentUrl || undefined, attachmentName: message.attachment_name || undefined, attachmentMime: message.attachment_mime || undefined, attachmentSize: message.attachment_size || undefined };
      }));
      if (active) setChatMessages(decrypted);
    };
    void loadChat();
    const channel = supabase.channel(`freetext-e2ee-chat-${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, () => { void loadChat(); }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [isAI, conversationId]);

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) { setSecureError("Choose a picture or video."); return; }
    if (file.size > 50 * 1024 * 1024) { setSecureError("Pictures and videos must be 50 MB or smaller."); return; }
    setSecureError(""); setPendingFile(file);
  };

  const sendSecureMessage = async () => {
    const clean = text.trim();
    if ((!clean && !pendingFile) || chatBusy || !conversationId || !secureReady) return;
    setChatBusy(true); setSecureError("");
    const file = pendingFile;
    const caption = clean;
    setText(""); setPendingFile(null);
    let messageId = crypto.randomUUID();
    let attachmentPath: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("You are not signed in.");
      if (file) attachmentPath = await uploadMessageMedia({ file, userId, conversationId, messageId });
      let encrypted: { ciphertext: string; iv: string; encrypted_keys: Record<string, string> } | null = null;
      if (caption) encrypted = await encryptForConversation(userId, conversationId, caption);
      const messageType = file?.type.startsWith("video/") ? "video" : file ? "image" : "text";
      const { error } = await supabase.from("messages").insert({ id: messageId, conversation_id: conversationId, sender_id: userId, body: null, ciphertext: encrypted?.ciphertext || null, iv: encrypted?.iv || null, encrypted_keys: encrypted?.encrypted_keys || null, message_type: messageType, attachment_path: attachmentPath, attachment_name: file?.name || null, attachment_mime: file?.type || null, attachment_size: file?.size || null });
      if (error) throw error;
    } catch (error: any) {
      if (attachmentPath) await removeMessageMedia(attachmentPath);
      setText(caption); setPendingFile(file);
      setSecureError(error?.message || "The message could not be sent.");
    } finally { setChatBusy(false); }
  };

  const sendAI = async () => {
    const clean = text.trim(); if (!clean || aiBusy) return;
    setText(""); const userMessage: Message = { id: crypto.randomUUID(), text: clean, sender: "me", time: now() }; setAiMessages(current => [...current, userMessage]); setAiBusy(true);
    try {
      const hf: any = await import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0/+esm");
      const model = "onnx-community/Qwen2.5-0.5B-Instruct"; let generator: any;
      try { generator = await hf.pipeline("text-generation", model, { device: "webgpu", dtype: "q4f16" }); } catch { generator = await hf.pipeline("text-generation", model, { device: "wasm", dtype: "q4" }); }
      const recent = [...aiMessages, userMessage].slice(-8).map(m => `${m.sender === "me" ? "User" : "Boi Achiver AI"}: ${m.text}`).join("\n");
      const prompt = `You are Boi Achiver AI inside FreeText. Mode: ${activeTool.label}. ${activeTool.prompt}. Be helpful, natural, concise and beginner-friendly. Never claim you performed an action you cannot perform.\n\nConversation:\n${recent}\n\nBoi Achiver AI:`;
      const result: any = await generator(prompt, { max_new_tokens: 220, temperature: 0.7, do_sample: true, return_full_text: false });
      const raw = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
      setAiMessages(current => [...current, { id: crypto.randomUUID(), text: String(raw || "I’m here. Tell me what you need help with.").trim(), sender: "them", time: now() }]);
    } catch (error) { console.error(error); setAiMessages(current => [...current, { id: crypto.randomUUID(), text: "The free AI model could not start on this device. Please try again.", sender: "them", time: now() }]); }
    finally { setAiBusy(false); }
  };

  const send = () => { if (isAI) void sendAI(); else void sendSecureMessage(); };
  const keyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  if (!isAI) return <section className="chat-page"><div className="chat-card">
    <header className="chat-header"><button className="chat-back" onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><img src={person.avatar} alt={person.name} className="avatar" style={{width:42,height:42}}/><div className="chat-person"><strong>{person.name}</strong><span><Lock size={11} style={{verticalAlign:"-2px",marginRight:4}}/>End-to-end encrypted</span></div></header>
    <div className="chat-messages">
      {chatMessages.length===0 ? <div className="empty-state">{secureError || "Messages are protected with end-to-end encryption."}</div> : chatMessages.map(m => <div key={m.id} className={`message-row ${m.sender==='me'?'mine':''}`}><div className="message-bubble">
        {m.attachmentUrl && (m.attachmentMime?.startsWith("video/") ? <video src={m.attachmentUrl} controls playsInline preload="metadata" style={{display:"block",maxWidth:"260px",maxHeight:"360px",borderRadius:12,marginBottom:m.text?8:0}} /> : <a href={m.attachmentUrl} target="_blank" rel="noreferrer"><img src={m.attachmentUrl} alt={m.attachmentName || "Message picture"} style={{display:"block",maxWidth:"260px",maxHeight:"360px",objectFit:"cover",borderRadius:12,marginBottom:m.text?8:0}} /></a>)}
        {m.text && <span>{m.text}</span>}<small>{m.time}</small>
      </div></div>)}
    </div>
    {secureError && <div style={{padding:"6px 14px",fontSize:11,color:"#b91c1c"}}>{secureError}</div>}
    {pendingFile && <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",fontSize:12,borderTop:"1px solid #eee"}}><Paperclip size={15}/><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pendingFile.name}</span><button onClick={()=>setPendingFile(null)} aria-label="Remove attachment" style={{border:0,background:"transparent"}}><X size={16}/></button></div>}
    <div className="chat-input"><input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={e=>{chooseFile(e.target.files?.[0]); e.currentTarget.value=""}} style={{display:"none"}}/><button onClick={()=>fileInputRef.current?.click()} disabled={!secureReady||chatBusy} aria-label="Attach picture or video" style={{border:0,background:"transparent"}}><Paperclip size={19}/></button><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={keyDown} placeholder={secureReady ? `Message ${person.name} securely…` : "Setting up secure messaging…"} disabled={!secureReady||chatBusy}/><button onClick={send} disabled={(!text.trim()&&!pendingFile)||!secureReady||chatBusy} aria-label="Send"><Send size={18}/></button></div>
  </div></section>;

  return <section className="chat-page boi-ai-native-page"><style>{`.boi-ai-native{display:flex;flex-direction:column;min-height:calc(100vh - 125px);background:#fff;color:#111827;overflow:hidden}html.dark .boi-ai-native{background:#0b0d10;color:#f5f7fa}.boi-ai-native-header{display:flex;align-items:center;gap:11px;padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#fffffff5}.boi-ai-native-header .chat-person{flex:1}.boi-ai-native-header .chat-person strong{display:block;font-size:15px}.boi-ai-native-header .chat-person span{font-size:11px;color:#6b7280}.boi-ai-green{width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;margin-right:5px}.boi-ai-native-body{display:grid;grid-template-columns:170px minmax(0,1fr);flex:1;min-height:0}.boi-ai-sidebar{padding:10px;border-right:1px solid #e5e7eb;background:#fafafa}.boi-ai-sidebar-title{padding:8px;color:#6b7280;font-size:11px;font-weight:800;text-transform:uppercase}.boi-ai-sidebar button{width:100%;display:flex;align-items:center;gap:9px;padding:10px;border:0;border-radius:10px;background:transparent;color:#6b7280;text-align:left;font-size:12px}.boi-ai-sidebar button.active{background:#eef2ff;color:#4f46e5;font-weight:700}.boi-ai-conversation{display:flex;flex-direction:column;min-width:0;min-height:0}.boi-ai-chat-scroll{flex:1;overflow-y:auto;padding:24px clamp(12px,5vw,70px) 28px}.boi-ai-welcome{text-align:center;max-width:620px;margin:9vh auto 32px}.boi-ai-welcome img{width:56px;height:56px;border-radius:50%}.boi-ai-welcome h2{font-size:24px;margin:14px 0 7px}.boi-ai-welcome p{margin:0;color:#6b7280;font-size:13px}.boi-ai-suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:22px}.boi-ai-suggestions button{padding:12px;text-align:left;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:#374151}.boi-ai-row{display:flex;margin:15px 0}.boi-ai-row.mine{justify-content:flex-end}.boi-ai-bubble{max-width:min(720px,90%);padding:11px 14px;border-radius:17px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.boi-ai-bubble.them{background:#f1f3f5;border-bottom-left-radius:5px}.boi-ai-bubble.mine{background:#4f46e5;color:#fff;border-bottom-right-radius:5px}.boi-ai-composer{padding:10px 12px;border-top:1px solid #e5e7eb;background:#fff}.boi-ai-composer-inner{display:flex;gap:8px;max-width:900px;margin:auto;border:1px solid #d1d5db;border-radius:22px;padding:6px 7px 6px 15px}.boi-ai-composer input{flex:1;border:0;outline:0;background:transparent;padding:8px 0;color:inherit}.boi-ai-composer button{width:38px;height:38px;border:0;border-radius:50%;display:grid;place-items:center;background:#111827;color:#fff}.boi-ai-disclaimer{text-align:center;font-size:9px;color:#9ca3af;margin:5px 0 0}@media(max-width:650px){.boi-ai-native-body{grid-template-columns:1fr}.boi-ai-sidebar{display:flex;gap:5px;overflow-x:auto;padding:8px;border-right:0;border-bottom:1px solid #e5e7eb}.boi-ai-sidebar-title{display:none}.boi-ai-sidebar button{width:auto;min-width:max-content}.boi-ai-suggestions{grid-template-columns:1fr}}`}</style>
    <div className="chat-card boi-ai-native"><header className="boi-ai-native-header"><button className="chat-back" onClick={onBack} aria-label="Back"><ArrowLeft size={21}/></button><img src={AI_AVATAR} alt="Boi Achiver AI" className="avatar" style={{width:42,height:42}}/><div className="chat-person"><strong>Boi Achiver AI</strong><span><i className="boi-ai-green"/>Online • Free AI</span></div><button className="chat-header-action" onClick={clearAI} aria-label="New AI chat"><Plus size={19}/></button><button className="chat-header-action" onClick={clearAI} aria-label="Clear AI chat"><X size={18}/></button></header>
      <div className="boi-ai-native-body"><aside className="boi-ai-sidebar"><div className="boi-ai-sidebar-title">Assist</div>{tools.map(tool=>{const Icon=tool.icon;return <button key={tool.id} className={aiTool===tool.id?'active':''} onClick={()=>chooseTool(tool.id)}><Icon size={16}/><span>{tool.label}</span></button>})}</aside><main className="boi-ai-conversation"><div className="boi-ai-chat-scroll">{aiMessages.length===0&&<div className="boi-ai-welcome"><img src={AI_AVATAR} alt="Boi Achiver AI"/><h2>How can I help you?</h2><p>Current mode: {activeTool.label}. Ask Boi Achiver AI anything.</p><div className="boi-ai-suggestions">{tools.slice(0,4).map(tool=><button key={tool.id} onClick={()=>chooseTool(tool.id)}>{tool.prompt}</button>)}</div></div>}{aiMessages.map(m=><div key={m.id} className={`boi-ai-row ${m.sender==='me'?'mine':''}`}><div className={`boi-ai-bubble ${m.sender==='me'?'mine':'them'}`}>{m.text}</div></div>)}{aiBusy&&<div className="boi-ai-row"><div className="boi-ai-bubble them">Thinking…</div></div>}</div><div className="boi-ai-composer"><div className="boi-ai-composer-inner"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={keyDown} placeholder={`${activeTool.label}: type your message…`}/><button onClick={send} disabled={!text.trim()||aiBusy}><Send size={18}/></button></div><div className="boi-ai-disclaimer">Boi Achiver AI can make mistakes. Check important information.</div></div></main></div>
    </div>
  </section>;
}
