function extractAssistantText(data) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * POST body JSON:
 * {
 *   "proyectos": [
 *     {
 *       "id", "nombre", "codigo", "cliente", "iccPct",
 *       "items": [{ "codigo", "desc", "um", "cantPresup", "consumidoReal", "precioCustom", "precioBase" }],
 *       "certificaciones": [{ "numero", "periodo", "fecha", "estado", "totalPeriodo", "totalAcumulado" }],
 *       "reqs": [{ "id", "numero", "fecha", "jefeObra", "estado", "observaciones",
 *                  "items": [{ "codigo", "desc", "um", "cantSolicitada", "urgencia" }] }]
 *     }
 *   ]
 * }
 * Arrays opcionales pueden omitirse o ir vacíos.
 */
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

    const { proyectos } = payload;
    if (!Array.isArray(proyectos)) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "proyectos debe ser un array" }),
      };
    }

    const system = `Sos el supervisor financiero ejecutivo del grupo Choix (constructora Argentina). Tu rol es cruzar información de TODAS las obras a la vez: presupuesto (ítems con cantidades y consumos), certificaciones de avance (montos por período y estado) y requerimientos de compra / REQs (solicitudes de campo con urgencia).

Contexto: construcción en Argentina, pesos, ICC por obra cuando figure, horizonte 2025–2026. No tenés acceso a internet; trabajás solo con el JSON que recibís.

Redactá un informe ejecutivo en español argentino, claro para dirección y gerencia de obra. Incluí obligatoriamente:

1) Panorama del portafolio: cuántas obras, montos presupuestados agregados vs consumo económico estimado (usá precioCustom o precioBase según cada ítem y aplicá ICC de la obra cuando calcules montos).

2) Por obra (resumido): salud financiera relativa (consumo vs presupuesto, certificaciones vs presupuesto si los datos alcanzan), riesgos destacados.

3) Certificaciones: lectura transversal — obras con mayor avance certificado vs presupuesto, posibles cuellos de cobro o retraso si se infiere de estados/fechas.

4) Compras / REQs: prioridades entre obras (urgencias críticas, pendientes de aprobación, excepciones fuera de presupuesto si se deduce de los ítems del REQ).

5) Riesgos cruzados: concentración de riesgo en una obra, rubros o proveedores implícitos.

6) Tres decisiones o acciones priorizadas para la próxima semana (nivel directorio).

Sé numérico cuando los datos lo permitan; si falta un campo, indicá la limitación. No uses markdown complejo ni tablas HTML; podés usar viñetas y párrafos. No devuelvas JSON ni código; solo texto corrido del informe.`;

    const userContent = `Datos consolidados de todas las obras (JSON). Generá el informe ejecutivo del supervisor:\n\n${JSON.stringify(
      { proyectos },
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
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
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
          detail: textoRespuesta.slice(0, 400),
        }),
      };
    }

    const analysis = extractAssistantText(data) || data.content?.[0]?.text || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis }),
    };
  } catch (error) {
    console.error("agent-supervisor:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Error en agent-supervisor" }),
    };
  }
};
