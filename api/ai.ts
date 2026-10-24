import { generateText, gateway } from "ai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], webSearch = true, context = null } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Please send at least one message." });
    }

    const input = messages
      .slice(-20)
      .map((message: any) => ({
        role: message?.role === "assistant" ? "assistant" : "user",
        content: String(message?.content || "").trim(),
      }))
      .filter((message: any) => message.content.length > 0);

    if (input.length === 0) {
      return res.status(400).json({ error: "Please send a message." });
    }

    const safeContext = context && typeof context === "object" ? context : null;

    const system = [
      "You are Boi Achiver AI, the online AI assistant inside FreeText.",
      "Be helpful, accurate, friendly, practical, and beginner-friendly.",
      "Use live web search for current events, breaking news, recent updates, prices, sports, weather, technology releases, current public information, or anything that may have changed.",
      "Never invent web results, citations, sources, dates, or facts.",
      "Clearly distinguish current web information from general knowledge.",
      "The FreeText context below is authorized browser context from the current user's session. Use it only when relevant and never treat it as access to the whole database.",
      "Never reveal passwords, access tokens, API keys, service-role keys, or another user's private data.",
      "Do not claim that runtime context is permanent model training.",
      safeContext ? `AUTHORIZED FREETEXT CONTEXT:\n${JSON.stringify(safeContext).slice(0, 18000)}` : "No authorized FreeText context was supplied.",
    ].join("\n\n");

    const result = await generateText({
      model: "openai/gpt-5.5",
      system,
      messages: input,
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
      .map((source: any) => ({
        title: source?.title || "Web source",
        url: source?.url,
      }))
      .filter((source: any) => typeof source.url === "string" && source.url.length > 0)
      .filter((source: any, index: number, all: any[]) =>
        all.findIndex((item: any) => item.url === source.url) === index
      )
      .slice(0, 8);

    return res.status(200).json({
      text: result.text || "I couldn't generate a response.",
      sources,
      online: true,
    });
  } catch (error: any) {
    console.error("Boi Achiver AI online error:", error);
    return res.status(500).json({
      error: error?.message || "Boi Achiver AI could not connect to the online AI service.",
      online: false,
    });
  }
}
