// netlify/functions/agent-pliegos-ia.js
//
// Procesa UN fragmento (chunk) de texto de pliego y devuelve el texto crudo
// del modelo. Réplica del comportamiento del browser antes del Sprint 0,
// pero con la API key del lado servidor.
//
// Entrada (POST):  { chunk: "<fragmento de texto>" }
// Salida (200):    { text }

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const json = (statusCode, obj) => ({
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  });

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return json(500, { error: "Falta ANTHROPIC_API_KEY" });

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_) {
      return json(400, { error: "Cuerpo JSON inválido" });
    }

    const chunk = typeof payload.chunk === "string" ? payload.chunk : "";
    if (!chunk) return json(400, { error: "Sin fragmento para procesar" });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system:
          "Sos un experto en presupuestación de obra pública argentina. Respondés SOLO con JSON válido, sin markdown ni texto adicional.",
        messages: [
          {
            role: "user",
            content: `Extraé todos los ítems de este fragmento de cómputo y presupuesto provincial argentino. 
Devolvé ÚNICAMENTE un JSON válido sin texto adicional, con esta estructura:
{"items":[{"rubroId":"1","rubroNombre":"TRABAJOS PREPARATORIOS","codigo":"1.2","descripcion":"Cartel de obra","unidad":"m2","cantidad":12,"precioUnitario":107414.92}]}

Reglas:
- codigo siempre "rubro.item" ej: "1.2", "3.5"  
- números en formato JS (punto decimal, sin puntos de miles)
- ignorá totales de rubro, porcentajes y honorarios
- si el ítem tiene número suelto dentro de un rubro, inferí el rubro del contexto

Fragmento:
${chunk}`,
          },
        ],
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      return json(502, { error: "Error de API Anthropic", detail: raw.slice(0, 400) });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return json(502, { error: "Respuesta inválida de la API" });
    }

    const text = data.content?.[0]?.text || "";
    return json(200, { text });
  } catch (error) {
    console.error("agent-pliegos-ia:", error.message);
    return json(500, { error: error.message || "Error en agent-pliegos-ia" });
  }
};
