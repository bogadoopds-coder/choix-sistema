const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function getDb() {
  if (!getApps().length) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(cred) });
  }
  return getFirestore();
}

const SYSTEM = `Sos un analista financiero y de control de obra especializado en construccion en Argentina (obras publicas y privadas, presupuestos en pesos, costos de materiales y mano de obra, plazos e incidencias).

Recibiras datos de una obra: proyecto (identificacion), lista de items presupuestarios con cantidades y consumos, y un porcentaje de ICC aplicado al contexto del presupuesto.

Tu tarea es redactar un analisis claro en espanol argentino que cubra obligatoriamente:

1) Total presupuestado vs total consumido (cantPresup x precio por item vs consumidoReal x precio, criterio coherente con los datos).
2) Items en semaforo rojo: consumidoReal / cantPresup > 0,8 (con cantPresup > 0). Lista los mas relevantes con codigo y descripcion.
3) Items en semaforo amarillo: entre 0,5 y 0,8.
4) Desvio porcentual general de la obra (explica el criterio).
5) Tres recomendaciones concretas y priorizadas.

Se preciso con numeros cuando los datos lo permitan. Si falta informacion, indica la limitacion sin inventar cifras. No uses markdown ni tablas complejas; texto corrido con parrafos o vinetas simples.`;

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

  const { orgId, jobId, proyecto, items, iccPct } = payload;
  if (!orgId || !jobId) {
    return { statusCode: 400, body: "Faltan orgId o jobId" };
  }

  const db = getDb();
  const jobRef = db.doc("orgs/" + orgId + "/jobs/" + jobId);

  try {
    await jobRef.set({
      tipo: "analizar_presupuesto",
      estado: "procesando",
      obra: proyecto && proyecto.nombre ? proyecto.nombre : "",
      creadoEn: new Date().toISOString(),
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

    const userContent = "Datos para el analisis (JSON):\n\n" +
      JSON.stringify({ proyecto, items, iccPct }, null, 2) +
      "\n\nRedacta el analisis completo segun las instrucciones del sistema.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: SYSTEM,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error("API Anthropic " + response.status + ": " + raw.slice(0, 300));
    }

    const data = JSON.parse(raw);
    const analysis = (data.content || [])
      .filter((b) => b && b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    await jobRef.set({
      estado: "listo",
      resultado: analysis || "(sin respuesta)",
      terminadoEn: new Date().toISOString(),
    }, { merge: true });

    return { statusCode: 200, body: "ok" };
  } catch (error) {
    console.error("agent-presupuesto-background:", error.message);
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
