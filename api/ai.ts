import { generateText, gateway } from "ai";

type ChatMessage = { role: "user" | "assistant"; content: string };

function buildInput(messages: any[]): ChatMessage[] {
  return messages
    .slice(-20)
    .map((message: any) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content || "").trim(),
    }))
    .filter((message: ChatMessage) => message.content.length > 0);
}

function buildSystem(context: any) {
  const safeContext = context && typeof context === "object" ? context : null;
  return [
    "You are Boi Achiver AI, the online AI assistant inside FreeText.",
    "Be helpful, accurate, friendly, practical, and beginner-friendly.",
    "When web search is enabled, use current web information for news, current events, prices, sports, weather, recent technology releases, and other information that can change.",
    "Never invent search results, citations, sources, dates, or facts.",
    "Clearly distinguish current web information from general knowledge when useful.",
    "The FreeText context below is authorized browser context from the current user's session. Use it only when relevant and never treat it as access to the whole database.",
    "Never reveal passwords, access tokens, API keys, service-role keys, or another user's private data.",
    "Do not claim that runtime context is permanent model training.",
    safeContext
      ? `AUTHORIZED FREETEXT CONTEXT:\n${JSON.stringify(safeContext).slice(0, 18000)}`
      : "No authorized FreeText context was supplied.",
  ].join("\n\n");
}

function extractGeminiResponse(data: any) {
  const text = (data?.candidates || [])
    .flatMap((candidate: any) => candidate?.content?.parts || [])
    .map((part: any) => part?.text || "")
    .join("\n")
    .trim();

  const sources = (data?.candidates || [])
    .flatMap((candidate: any) => candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk: any) => chunk?.web)
    .filter((web: any) => web && typeof web.uri === "string")
    .map((web: any) => ({ title: web.title || "Web source", url: web.uri }))
    .filter((source: any, index: number, all: any[]) =>
      all.findIndex((item: any) => item.url === source.url) === index
    )
    .slice(0, 8);

  return { text, sources };
}

async function callGemini(messages: ChatMessage[], webSearch: boolean, context: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const body: any = {
    systemInstruction: { parts: [{ text: buildSystem(context) }] },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 1000 },
  };

  if (webSearch) {
    body.tools = [{ google_search: {} }];
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  }

  const result = extractGeminiResponse(data);
  if (!result.text) throw new Error("Gemini returned an empty response.");
  return { ...result, online: true, provider: "Google Gemini" };
}

async function callGateway(messages: ChatMessage[], webSearch: boolean, context: any) {
  const result = await generateText({
    model: "openai/gpt-5.4-mini",
    system: buildSystem(context),
    messages,
    maxOutputTokens: 900,
    tools: webSearch
      ? {
          parallel_search: gateway.tools.parallelSearch({
            mode: "one-shot",
            maxResults: 8,
            maxAgeSeconds: 300,
          }),
        }
      : undefined,
  });

  const sources = (result.sources || [])
    .map((source: any) => ({ title: source?.title || "Web source", url: source?.url }))
    .filter((source: any) => typeof source.url === "string" && source.url.length > 0)
    .filter((source: any, index: number, all: any[]) =>
      all.findIndex((item: any) => item.url === source.url) === index
    )
    .slice(0, 8);

  return { text: result.text || "I couldn't generate a response.", sources, online: true, provider: "Vercel AI Gateway" };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], webSearch = true, context = null } = req.body || {};
    const input = buildInput(messages);

    if (input.length === 0) {
      return res.status(400).json({ error: "Please send a message." });
    }

    // First choice: direct Gemini API. This avoids Vercel AI Gateway billing/card requirements
    // while still providing server-side AI plus Google's managed realtime web search.
    const gemini = await callGemini(input, Boolean(webSearch), context);
    if (gemini) return res.status(200).json(gemini);

    // Second choice: Vercel AI Gateway when the project has Gateway access/credits.
    try {
      const gatewayResult = await callGateway(input, Boolean(webSearch), context);
      return res.status(200).json(gatewayResult);
    } catch (gatewayError: any) {
      console.error("Boi Achiver AI Gateway error:", gatewayError);
      return res.status(503).json({
        online: false,
        setupRequired: true,
        error:
          "Online AI needs a server AI provider. Add GEMINI_API_KEY to Vercel for the no-card Google Gemini + live Google Search mode, or add a valid Vercel AI Gateway payment method.",
        details: gatewayError?.message || "AI Gateway request failed",
      });
    }
  } catch (error: any) {
    console.error("Boi Achiver AI online error:", error);
    return res.status(500).json({
      error: error?.message || "Boi Achiver AI could not connect to the online AI service.",
      online: false,
    });
  }
}
