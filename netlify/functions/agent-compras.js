function extractAssistantText(data) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Falta ANTHROPIC_API_KEY" }),
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Cuerpo JSON inválido" }),
      };
    }

    const { proyecto, items, reqs } = payload;

    const system = `Sos un experto en compras y abastecimiento para obra de construcción en Argentina (materiales, corralones, ferreterías, plazos, presupuesto de obra y requerimientos de campo).

No tenés acceso a internet: analizá únicamente los datos JSON que recibís en el mensaje del usuario.

Para precios de mercado, estimá valores en pesos argentinos coherente con tu conocimiento de materiales de construcción en Argentina en el contexto 2025–2026 (inflación, corralón, ferretería, hormigón, acero, mampostería, etc.). Indicá en el campo "fuente" de cada validación que se trata de una estimación aproximada del modelo, no de una cotización en tiempo real.

Tu tarea es analizar los datos recibidos y devolver EXCLUSIVamente un único objeto JSON válido (sin markdown, sin bloques de código, sin texto antes ni después) con esta estructura exacta de claves:

{
  "reqs": [
    {
      "numero": 1,
      "jefeObra": "string",
      "urgencia": "alta|media|baja",
      "itemsEnPresupuesto": ["códigos o identificadores"],
      "itemsExcepcion": ["descripciones fuera de presupuesto"],
      "montoEstimado": 0
    }
  ],
  "validacionPrecios": [
    {
      "codigo": "string",
      "desc": "string",
      "um": "string",
      "precioActual": 0,
      "precioMercado": 0,
      "fuente": "string (ej. estimación aproximada ARS 2025–2026)",
      "diferenciaPct": 0,
      "recomendacion": "string"
    }
  ],
  "faltantes": [
    {
      "codigo": "string",
      "desc": "string",
      "um": "string",
      "cantFaltante": 0,
      "montoEstimado": 0,
      "criticidad": "rojo|amarillo|verde"
    }
  ],
  "ordenesCompra": [
    {
      "proveedor": "string",
      "items": ["descripciones cortas"],
      "montoTotal": 0
    }
  ],
  "proyeccion": {
    "montoRestante": 0,
    "alcanzaPresupuesto": true,
    "alertas": ["strings"]
  },
  "resumen": "texto con conclusiones generales"
}

Instrucciones de análisis:

A) REQUERIMIENTOS: Analizá los REQs (array reqs) atendiendo al jefe de obra y estado. Cruzá con el presupuesto (items). Identificá ítems solicitados que estén en presupuesto vs excepciones. Priorizá por urgencia de cada línea y del requerimiento.

B) VALIDACIÓN DE PRECIOS: Para ítems relevantes de los REQs, estimá precio de mercado argentino (2025–2026) con tu conocimiento; aclarar que son estimaciones aproximadas. Compará con el precio del presupuesto (precioCustom o precioBase según datos). En "fuente" usá texto como "Estimación modelo (ARS, obra Argentina 2025–2026)". Completá validacionPrecios con diferenciaPct razonable.

C) ANÁLISIS DE FALTANTES: Cruzá consumidoReal vs cantPresup por ítem del presupuesto. Detectá materiales que aún faltan comprar más allá de lo cubierto por REQs. Priorizá criticidad: rojo si consumidoReal/cantPresup > 0.8 (cantPresup > 0), amarillo entre 0.5 y 0.8, verde si aplica.

D) ÓRDENES DE COMPRA: Sugerí agrupación por proveedor o rubro (texto razonable para Argentina). Borradores de OC priorizando REQs urgentes y faltantes críticos.

E) PROYECCIÓN: Estimá monto restante para completar la obra usando las mismas estimaciones de mercado (aproximadas), si alcanza el presupuesto global, y lista de alertas.

Usá números coherentes con los datos de entrada; si faltan datos, usá 0 o arrays vacíos y explicá en resumen. El JSON debe ser parseable por JSON.parse sin comentarios ni trailing commas.`;

    const userContent = `Datos de entrada (JSON). Respondé solo con el objeto JSON final:\n\n${JSON.stringify(
      { proyecto, items, reqs },
      null,
      2
    )}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const textoRespuesta = await response.text();
    let data;
    try {
      data = JSON.parse(textoRespuesta);
    } catch (_) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Respuesta inválida de la API" }),
      };
    }

    if (!response.ok) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Error de API Anthropic",
          detail: textoRespuesta.slice(0, 500),
        }),
      };
    }

    const rawText = extractAssistantText(data);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No se encontró JSON en la respuesta", raw: rawText.slice(0, 800) }),
      };
    }

    let resultado;
    try {
      resultado = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "JSON de análisis inválido", detail: e.message }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(resultado),
    };
  } catch (error) {
    console.error("agent-compras:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Error en agent-compras" }),
    };
  }
};
