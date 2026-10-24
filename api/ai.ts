export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], webSearch = true } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Boi Achiver AI is not configured yet. Add OPENAI_API_KEY to the Vercel environment variables.",
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Please send at least one message." });
    }

    const recentMessages = messages.slice(-20).map((message: any) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: String(message?.content || ""),
    }));

    const prompt = recentMessages
      .map((message: any) => `${message.role === "assistant" ? "Boi Achiver AI" : "User"}: ${message.content}`)
      .join("\n\n");

    const body: any = {
      model: "gpt-5.5",
      input: prompt,
      instructions:
        "You are Boi Achiver AI, the AI assistant inside FreeText. " +
        "Be helpful, accurate, clear, and concise. " +
        "When web search is enabled, use it for current facts, news, prices, weather, schedules, recent events, or anything that may have changed. " +
        "Never claim to have searched the web if you did not. " +
        "When you use web sources, cite important claims with the source citations provided by the API.",
    };

    if (webSearch) {
      body.tools = [{ type: "web_search" }];
      body.include = ["web_search_call.action.sources"];
      body.tool_choice = "auto";
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(response.status >= 400 && response.status < 600 ? response.status : 500).json({
        error: data?.error?.message || "OpenAI could not generate a response.",
      });
    }

    const sources = (data?.output || [])
      .filter((item: any) => item?.type === "web_search_call")
      .flatMap((item: any) => item?.action?.sources || [])
      .map((source: any) => ({
        title: source?.title || "Web source",
        url: source?.url,
      }))
      .filter((source: any) => source.url)
      .filter((source: any, index: number, all: any[]) =>
        all.findIndex((item: any) => item.url === source.url) === index
      )
      .slice(0, 8);

    return res.status(200).json({
      text: data?.output_text || "I couldn't generate a response.",
      sources,
    });
  } catch (error: any) {
    console.error("Boi Achiver AI error:", error);
    return res.status(500).json({
      error: error?.message || "Boi Achiver AI could not connect to OpenAI. Please try again.",
    });
  }
}
