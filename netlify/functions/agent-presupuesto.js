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

    const { proyecto, items, iccPct } = payload;

    const system = `Sos un analista financiero y de control de obra especializado en construcción en Argentina (obras públicas y privadas, presupuestos en pesos, costos de materiales y mano de obra, plazos e incidencias).

Recibirás datos de una obra: proyecto (identificación), lista de ítems presupuestarios con cantidades y consumos, y un porcentaje de ICC (índice de costos de construcción) aplicado al contexto del presupuesto.

Tu tarea es redactar un análisis claro en español argentino que cubra obligatoriamente:

1) Total presupuestado vs total consumido: compará el monto total presupuestado (suma de cantPresup × precioFinal por ítem, o el criterio que indiquen los datos) frente al valor económico asociado al consumo real acumulado (usá consumidoReal y precioFinal de forma coherente con los datos recibidos).

2) Ítems en “semáforo rojo”: aquellos donde el consumo respecto de lo presupuestado en cantidad supere el 80% (es decir, consumidoReal / cantPresup > 0,8 cuando cantPresup > 0). Listá los más relevantes con código y descripción.

3) Ítems en “semáforo amarillo”: consumido entre el 50% y el 80% del presupuestado en cantidad (0,5 < consumidoReal / cantPresup ≤ 0,8, con cantPresup > 0).

4) Desvío porcentual general de la obra: estimá un indicador global de desvío entre lo ejecutado/consumido y lo planificado (explicá brevemente el criterio numérico que usaste).

5) Tres recomendaciones concretas y priorizadas (qué hacer primero, segundo y tercero) para mejorar el control de costos o el replanteo de partidas.

Sé preciso con números cuando los datos lo permitan. Si falta información para un cálculo, indicá la limitación sin inventar cifras. No uses markdown ni tablas complejas; texto corrido con párrafos o viñetas simples.`;

    const userContent = `Datos para el análisis (JSON):\n\n${JSON.stringify(
      { proyecto, items, iccPct },
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
    console.error("agent-presupuesto:", error.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Error en agent-presupuesto" }),
    };
  }
};
