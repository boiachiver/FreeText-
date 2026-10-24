export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages = [], webSearch = true } = req.body || {};
    const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

    if (!token) {
      return res.status(500).json({ error: "Boi Achiver AI is not configured on this deployment yet." });
    }

    const input = Array.isArray(messages) ? messages.slice(-20) : [];
    const requestBody: any = {
      model: "openai/gpt-5.4-mini",
      input,
      max_output_tokens: 2000,
    };

    if (webSearch) {
      requestBody.tools = [{ type: "web_search", search_context_size: "low" }];
    }

    const response = await fetch("https://ai-gateway.vercel.sh/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "AI request failed" });
    }

    const text = data?.output_text || (data?.output || [])
      .flatMap((item: any) => item?.content || [])
      .map((item: any) => item?.text || "")
      .join("");

    const sources = (data?.output || [])
      .flatMap((item: any) => item?.content || [])
      .filter((item: any) => item?.sources)
      .flatMap((item: any) => item.sources)
      .slice(0, 8);

    return res.status(200).json({ text, sources });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Unexpected server error" });
  }
}
