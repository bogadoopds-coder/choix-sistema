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

    const { proyecto, certificaciones } = payload;

    const system = `Sos un analista financiero y de certificaciones de obra especializado en construcción en Argentina (obras públicas y privadas, mediciones, certificaciones de avance, cobranzas en pesos, plazos de pago del comitente y flujo de caja del contratista).

Recibirás datos de una obra y un listado de certificaciones. Cada certificación puede tener: numero, fecha, monto, estado ("pendiente", "cobrado", "presentado") y opcionalmente fechaCobro.

Tu tarea es redactar un análisis claro en español argentino que cubra obligatoriamente:

1) Total certificado vs total cobrado: sumá los montos certificados según el criterio que permitan los datos (por ejemplo, todos los registros o solo los no rechazados) y compará con la suma de lo efectivamente cobrado (estado "cobrado" y/o uso de fechaCobro cuando exista).

2) Certificaciones pendientes de cobro: identificá las que estén pendientes de cobro (estado "pendiente" o "presentado" según corresponda al contexto) y estimá días de mora o atraso respecto de la fecha de la certificación o de la fecha esperada de cobro, usando las fechas recibidas (fecha, fechaCobro). Si una fecha falta, indicá la limitación.

3) Riesgo de caja: señalá certificaciones aún sin cobrar que lleven más de 30, 60 o 90 días desde la fecha de certificación (o desde la última fecha relevante disponible), agrupando por tramos de antigüedad cuando sea posible.

4) Monto comprometido pendiente de cobro: total de montos en certificaciones que figuren como no cobradas aún (pendiente/presentado según los datos).

5) Tres recomendaciones concretas y priorizadas (primero, segundo, tercero) para mejorar cobranzas, seguimiento al comitente o gestión de certificaciones.

Sé preciso con números cuando los datos lo permitan. Si falta información para un cálculo, indicá la limitación sin inventar cifras. No uses markdown ni tablas complejas; texto corrido con párrafos o viñetas simples.`;

    const userContent = `Datos para el análisis (JSON):\n\n${JSON.stringify(
      { proyecto, certificaciones },
      null,
      2
    )}\n\nRedactá el análisis completo según las instrucciones del sistema.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
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

    const analysis = data.content?.[0]?.text || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis }),
    };
  } catch (error) {
    console.error("agent-certificaciones:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Error en agent-certificaciones" }),
    };
  }
};
