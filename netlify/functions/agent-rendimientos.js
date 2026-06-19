const SUGERIR_RENDIMIENTOS_SYSTEM = `Sos un experto en construcción argentina con dominio del libro de Chandías y convenio UOCRA. Tu tarea es estimar rendimientos de mano de obra SEPARADOS del precio del material/equipo.
IMPORTANTE: El precio unitario de cada ítem es SOLO el costo del material o equipo. La mano de obra es ADICIONAL y debe estimarse por separado en horas de oficial y ayudante por unidad.
Estimá rendimientos para TODOS los rubros sin excepción. Para los rubros que ya conocés (hormigón, mampostería, revoques, pisos, cubiertas, carpinterías) usá los valores de Chandías. Para pinturas, instalaciones (eléctrica, sanitaria, incendio), electromecánica, cristales, limpieza y varios, usá rendimientos estándar de obra argentina en horas de oficial y ayudante por unidad.
Devolvé SOLO JSON válido:
{ rendimientos: [ { codigo, desc, oficial_h, ayudante_h, tipo, fuente } ] }
Sin texto adicional, sin markdown.`;
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const json = (s, o) => ({ statusCode: s, headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return json(500, { error: "Falta ANTHROPIC_API_KEY" });
    let payload;
    try { payload = JSON.parse(event.body || "{}"); } catch (_) { return json(400, { error: "Cuerpo JSON inválido" }); }
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) return json(400, { error: "Sin ítems para procesar" });
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, system: SUGERIR_RENDIMIENTOS_SYSTEM, messages: [{ role: "user", content: JSON.stringify(items) }] }),
    });
    const raw = await response.text();
    if (!response.ok) return json(502, { error: "Error de API Anthropic", detail: raw.slice(0, 400) });
    let data;
    try { data = JSON.parse(raw); } catch (_) { return json(502, { error: "Respuesta inválida de la API" }); }
    return json(200, { text: data.content?.[0]?.text || "" });
  } catch (error) {
    console.error("agent-rendimientos:", error.message);
    return json(500, { error: error.message || "Error en agent-rendimientos" });
  }
};
