export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], webSearch = true } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5.5";

    if (!apiKey) {
      console.error("Boi Achiver AI: OPENAI_API_KEY is missing from the runtime environment.");
      return res.status(500).json({
        error: "Boi Achiver AI is not configured on this deployment. OPENAI_API_KEY is missing from the server environment.",
      });
    }

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

    const body: any = {
      model,
      input,
      instructions:
        "You are Boi Achiver AI, the AI assistant inside FreeText. " +
        "Be helpful, accurate, friendly, and clear. " +
        "Keep answers reasonably concise unless the user asks for detail. " +
        "Do not invent facts, sources, links, or search results. " +
        "When web search is available and enabled, use it for current facts, news, prices, weather, schedules, recent events, or information that may have changed. " +
        "When you use web sources, make the answer clear about which claims are based on current web information.",
    };

    if (webSearch === true) {
      body.tools = [{ type: "web_search" }];
      body.tool_choice = "auto";
      body.include = ["web_search_call.action.sources"];
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
      console.error("OpenAI API error:", {
        status: response.status,
        error: data?.error?.message || data?.error || data,
      });

      return res.status(response.status >= 400 && response.status < 600 ? response.status : 500).json({
        error:
          data?.error?.message ||
          `OpenAI request failed with HTTP ${response.status}.`,
      });
    }

    const sources = (data?.output || [])
      .filter((item: any) => item?.type === "web_search_call")
      .flatMap((item: any) => item?.action?.sources || [])
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
