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
    "You are Boi Achiver AI, the official AI DM/chat assistant inside FreeText.",
    "Be helpful, accurate, friendly, practical, concise when appropriate, and beginner-friendly.",
    "You are a conversational assistant, so remember the conversation supplied in the current request and answer naturally like a direct message chat.",
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
      url: annotation?.uri,
    }))
    .filter((source: any) => typeof source.url === "string" && source.url.length > 0)
    .filter((source: any, index: number, all: any[]) =>
      all.findIndex((item: any) => item.url === source.url) === index
    )
    .slice(0, 8);

  return { text, sources };
}

async function callGemini(messages: ChatMessage[], webSearch: boolean, context: any) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const transcript = messages
    .map((message) => `${message.role === "assistant" ? "Boi Achiver AI" : "User"}: ${message.content}`)
    .join("\n\n");

  const input = `${buildSystem(context)}\n\nCURRENT AI DM CONVERSATION:\n${transcript}`;

  const body: any = {
    model: "gemini-flash-latest",
    input,
    generation_config: {
      max_output_tokens: 1200,
      thinking_level: "low",
    },
    store: false,
  };

  if (webSearch) {
    body.tools = [{ type: "google_search" }];
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
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

  const result = extractInteraction(data);
  if (!result.text) throw new Error("Gemini returned an empty response.");
  return {
    ...result,
    online: true,
    provider: "Google Gemini Interactions",
    model: data?.model || "gemini-flash-latest",
  };
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

    // Primary provider: Google's current Interactions API with optional live Google Search.
    const gemini = await callGemini(input, Boolean(webSearch), context);
    if (gemini) return res.status(200).json(gemini);

    // Fallback provider if Gemini is not configured.
    try {
      const gatewayResult = await callGateway(input, Boolean(webSearch), context);
      return res.status(200).json(gatewayResult);
    } catch (gatewayError: any) {
      console.error("Boi Achiver AI Gateway error:", gatewayError);
      return res.status(503).json({
        online: false,
        setupRequired: true,
        error:
          "Online AI needs a server AI provider. Add GEMINI_API_KEY to Vercel Production for Google Gemini + live Google Search, or configure Vercel AI Gateway.",
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
