declare const process: { env: Record<string, string | undefined> };

type ChatMessage = { role: "user" | "assistant"; content: string };

type AIResult = {
  text: string;
  sources: { title: string; url: string }[];
  online: true;
  liveSearch: true;
  provider: string;
  model: string;
};

function buildInput(messages: any[]): ChatMessage[] {
  return messages
    .slice(-20)
    .map((message: any): ChatMessage => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content || "").trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function buildSystem(context: any) {
  const safeContext = context && typeof context === "object" ? context : null;
  return [
    "You are Boi Achiver AI, the official AI DM/chat assistant inside FreeText.",
    "Be helpful, accurate, friendly, practical, concise when appropriate, and beginner-friendly.",
    "LIVE WEB MODE IS ALWAYS ON. For anything that can change over time—news, current events, prices, sports, weather, technology releases, public information, or today's facts—use Google Search grounding before answering.",
    "Prefer current web sources over memory whenever the user asks for the latest, today, now, recent, current, update, or live information.",
    "Never invent search results, citations, sources, dates, or facts.",
    "The FreeText context below is authorized browser context from the current user's session. Use it only when relevant and never treat it as access to the whole database.",
    "Never reveal passwords, access tokens, API keys, service-role keys, or another user's private data.",
    "Do not claim runtime context is permanent model training.",
    safeContext
      ? `AUTHORIZED FREETEXT CONTEXT:\n${JSON.stringify(safeContext).slice(0, 18000)}`
      : "No authorized FreeText context was supplied.",
  ].join("\n\n");
}

function extractInteraction(data: any) {
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const text = steps
    .filter((step: any) => step?.type === "model_output")
    .flatMap((step: any) => Array.isArray(step?.content) ? step.content : [])
    .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
    .map((item: any) => item.text)
    .join("\n")
    .trim();

  const sources = steps
    .filter((step: any) => step?.type === "model_output")
    .flatMap((step: any) => Array.isArray(step?.content) ? step.content : [])
    .flatMap((item: any) => Array.isArray(item?.annotations) ? item.annotations : [])
    .map((annotation: any) => ({
      title: annotation?.title || "Web source",
      url: annotation?.url || annotation?.uri || "",
    }))
    .filter((source: any) => source.url)
    .filter((source: any, index: number, all: any[]) =>
      all.findIndex((item: any) => item.url === source.url) === index
    )
    .slice(0, 8);

  return { text, sources };
}

async function fetchJson(url: string, apiKey: string, body: any) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiInteractions(messages: ChatMessage[], context: any, apiKey: string): Promise<AIResult> {
  const transcript = messages
    .map((message) => `${message.role === "assistant" ? "Boi Achiver AI" : "User"}: ${message.content}`)
    .join("\n\n");

  const body: any = {
    model: "gemini-3.8-flash",
    input: `${buildSystem(context)}\n\nCURRENT AI DM CONVERSATION:\n${transcript}`,
    store: false,
    tools: [{ type: "google_search" }],
  };

  const data = await fetchJson(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    apiKey,
    body
  );

  const result = extractInteraction(data);
  if (!result.text) throw new Error("Gemini returned an empty response.");

  return {
    ...result,
    online: true,
    liveSearch: true,
    provider: "Google Gemini",
    model: data?.model || "gemini-3.8-flash",
  };
}

function extractGenerateContent(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((part: any) => typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();

  const grounding = data?.candidates?.[0]?.groundingMetadata;
  const sources = (grounding?.groundingChunks || [])
    .map((chunk: any) => chunk?.web)
    .filter((web: any) => web?.uri)
    .map((web: any) => ({ title: web.title || "Web source", url: web.uri }))
    .filter((source: any, index: number, all: any[]) =>
      all.findIndex((item: any) => item.url === source.url) === index
    )
    .slice(0, 8);

  return { text, sources };
}

async function callGeminiGenerateContent(messages: ChatMessage[], context: any, apiKey: string): Promise<AIResult> {
  const contents = messages.map((message): { role: "user" | "model"; parts: { text: string }[] } => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const body: any = {
    systemInstruction: { parts: [{ text: buildSystem(context) }] },
    contents,
    generationConfig: { maxOutputTokens: 1200 },
    tools: [{ googleSearch: {} }],
  };

  const data = await fetchJson(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    apiKey,
    body
  );

  const result = extractGenerateContent(data);
  if (!result.text) throw new Error("Gemini returned an empty response.");

  return {
    ...result,
    online: true,
    liveSearch: true,
    provider: "Google Gemini",
    model: "gemini-2.5-flash",
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], context = null } = req.body || {};
    const input = buildInput(messages);

    if (input.length === 0) {
      return res.status(400).json({ error: "Please send a message." });
    }

    // Keep the existing production secret server-side. The user never needs
    // to paste or expose it in the browser.
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.Gemini_API_Key ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        online: false,
        setupRequired: true,
        error: "Boi Achiver AI is missing its server-side Gemini connection.",
      });
    }

    try {
      return res.status(200).json(await callGeminiInteractions(input, context, apiKey));
    } catch (interactionError: any) {
      console.warn("Gemini live-search connection failed; using Gemini fallback:", interactionError?.message || interactionError);

      try {
        return res.status(200).json(await callGeminiGenerateContent(input, context, apiKey));
      } catch (fallbackError: any) {
        console.error("Boi Achiver AI Gemini fallback error:", fallbackError);
        return res.status(502).json({
          online: false,
          liveSearch: false,
          error: "Boi Achiver AI could not connect to Google Gemini right now.",
          details: fallbackError?.message || interactionError?.message || "Gemini request failed",
        });
      }
    }
  } catch (error: any) {
    console.error("Boi Achiver AI request error:", error);
    return res.status(500).json({
      online: false,
      error: error?.message || "Boi Achiver AI could not connect to the online AI service.",
    });
  }
}
