exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { messages, system, max_tokens } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: (typeof max_tokens === "number" && max_tokens > 0) ? Math.min(max_tokens, 8192) : 1024,
      messages: messages
    };
    if (system) body.system = system;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error("Error en el puente:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error al hablar con Claude" })
    };
  }
};
