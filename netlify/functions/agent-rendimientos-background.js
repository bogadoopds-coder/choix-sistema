const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function getDb() {
  if (!getApps().length) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(cred) });
  }
  return getFirestore();
}

const BATCH_SIZE = 25;

const SYSTEM = `Sos un experto en construccion argentina con dominio del libro de Chandias y convenio UOCRA. Tu tarea es estimar rendimientos de mano de obra SEPARADOS del precio del material/equipo.
IMPORTANTE: El precio unitario de cada item es SOLO el costo del material o equipo. La mano de obra es ADICIONAL y debe estimarse por separado en horas de oficial y ayudante por unidad.
Estima rendimientos para TODOS los rubros sin excepcion. Para los rubros que ya conoces (hormigon, mamposteria, revoques, pisos, cubiertas, carpinterias) usa los valores de Chandias. Para pinturas, instalaciones (electrica, sanitaria, incendio), electromecanica, cristales, limpieza y varios, usa rendimientos estandar de obra argentina en horas de oficial y ayudante por unidad.
Devolve SOLO JSON valido:
{ "rendimientos": [ { "codigo": "...", "desc": "...", "oficial_h": 0, "ayudante_h": 0, "tipo": "...", "fuente": "..." } ] }
Sin texto adicional, sin markdown.`;

function extractJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*[\r\n]*/, "").trim();
    s = s.replace(/\s*```\s*$/, "").trim();
  }
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (_) {}
  try { return JSON.parse(s.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1")); } catch (_) {}
  return null;
}

async function llamarClaude(apiKey, items) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(items) }],
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("API " + response.status + ": " + raw.slice(0, 200));
  const data = JSON.parse(raw);
  return (data.content || [])
    .filter((b) => b && b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    return { statusCode: 400, body: "JSON invalido" };
  }

  const { orgId, jobId, items } = payload;
  if (!orgId || !jobId || !Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, body: "Faltan orgId, jobId o items" };
  }

  const db = getDb();
  const jobRef = db.doc("orgs/" + orgId + "/jobs/" + jobId);

  try {
    const tandas = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      tandas.push(items.slice(i, i + BATCH_SIZE));
    }

    await jobRef.set({
      tipo: "sugerir_rendimientos",
      estado: "procesando",
      tandasTotal: tandas.length,
      tandasListas: 0,
      creadoEn: new Date().toISOString(),
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

    const rendimientos = [];
    const fallidas = [];
    for (let i = 0; i < tandas.length; i++) {
      let ok = false;
      for (let intento = 1; intento <= 2 && !ok; intento++) {
        try {
          const txt = await llamarClaude(apiKey, tandas[i]);
          const parsed = extractJson(txt);
          if (parsed && Array.isArray(parsed.rendimientos)) {
            rendimientos.push(...parsed.rendimientos);
            ok = true;
          } else {
            console.error("rendimientos tanda", i + 1, "intento", intento, "JSON invalido. Inicio:", String(txt || "").slice(0, 200));
          }
        } catch (e) {
          console.error("rendimientos tanda", i + 1, "intento", intento, "fallo:", e.message);
        }
      }
      if (!ok) fallidas.push(i + 1);
      await jobRef.set({ tandasListas: i + 1 }, { merge: true });
    }

    await jobRef.set({
      estado: "listo",
      resultado: JSON.stringify({ rendimientos }),
      tandasFallidas: fallidas,
      terminadoEn: new Date().toISOString(),
    }, { merge: true });

    return { statusCode: 200, body: "ok" };
  } catch (error) {
    console.error("agent-rendimientos-background:", error.message);
    try {
      await jobRef.set({
        estado: "error",
        detalle: String(error.message || error).slice(0, 500),
        terminadoEn: new Date().toISOString(),
      }, { merge: true });
    } catch (_) {}
    return { statusCode: 500, body: "error" };
  }
};
