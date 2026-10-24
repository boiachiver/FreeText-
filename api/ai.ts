import { generateText, gateway, stepCountIs } from "ai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], webSearch = true } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Please send at least one message." });
    }

    // Keep the browser payload small while preserving the conversation.
    const recentMessages = messages.slice(-20).map((message: any) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content || ""),
    }));

    const prompt = recentMessages
      .map((message: any) => `${message.role === "assistant" ? "Boi Achiver AI" : "User"}: ${message.content}`)
      .join("\n\n");

    const tools = webSearch
      ? {
          web_search: gateway.tools.perplexitySearch({}),
        }
      : undefined;

    // The Vercel AI SDK handles AI Gateway authentication automatically on
    // Vercel deployments, including OIDC, so the browser never receives a key.
    const result = await generateText({
      model: "openai/gpt-5.4-mini",
      system:
        "You are Boi Achiver AI, a helpful, accurate assistant. " +
        "When web search is enabled, use it for current facts, news, prices, " +
        "weather, schedules, current time, recent events, or anything that may have changed. " +
        "Never pretend you searched the web when you did not. Give concise answers unless the user asks for detail.",
      prompt,
      tools,
      stopWhen: stepCountIs(5),
    });

    const sources = (result.toolResults || [])
      .flatMap((toolResult: any) => {
        const value = toolResult?.result;
        if (Array.isArray(value)) return value;
        if (Array.isArray(value?.results)) return value.results;
        return [];
      })
      .map((source: any) => ({
        title: source?.title || source?.name || "Web source",
        url: source?.url || source?.link,
      }))
      .filter((source: any) => source.url)
      .slice(0, 8);

    return res.status(200).json({
      text: result.text || "I couldn't generate a response.",
      sources,
    });
  } catch (error: any) {
    console.error("Boi Achiver AI error:", error);
    return res.status(500).json({
      error:
        error?.message ||
        "Boi Achiver AI could not connect to the AI service. Please try again.",
    });
  }
}
