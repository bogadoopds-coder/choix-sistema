const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function getDb() {
  if (!getApps().length) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(cred) });
  }
  return getFirestore();
}

const SYSTEM = `Sos un analista de riesgo financiero especializado en desarrollos inmobiliarios privados en Argentina.

Recibiras el arqueo real de UN desarrollo: sus contratos con contratistas (monto y avance de obra), egresos e ingresos separados por moneda (ARS y USD) y por estado fiscal (con factura / sin factura / pendiente), lo pagado y lo que resta a cada contratista, y los egresos por categoria. Puede venir tambien un tipo de cambio de referencia.

Tu tarea es redactar un analisis de RIESGO financiero claro, en espanol argentino, que cubra:

1) Posicion de caja: ingresos vs egresos por moneda. Si hay tipo de cambio, ofreces una lectura consolidada aclarando que es referencial. Si la posicion es negativa, es la primera alerta.
2) Riesgo de descalce/iliquidez: si los compromisos (lo que resta pagar a contratistas segun sus contratos) superan los ingresos disponibles, marcalo como riesgo. Compara el total comprometido pendiente contra el ingreso acumulado.
3) Contratistas: detecta si algun contratista esta SOBREPAGADO respecto de su avance de obra declarado (por ejemplo, pagado 70% de su contrato pero con avance 40%: eso es un adelanto que puede ser riesgo). Sé concreto con nombre y numeros.
4) Ritmo: si el nivel de egresos es alto y el de ingresos es bajo, advierte sobre el flujo. En un desarrollo, un valle de caja negativa antes de las ventas es normal, pero senalalo.
5) Exposicion documental: cuanto del movimiento esta sin factura. NO lo juzgues moralmente ni lo trates como irregularidad: es un dato de control interno del desarrollador. Simplemente informa la proporcion como parte del cuadro de situacion.
6) Un veredicto final claro: la obra esta EN VERDE (sana), EN AMARILLO (atencion) o EN ROJO (riesgo real), con la razon principal en una linea.

Se preciso con numeros. Los montos ARS y USD no se suman entre si salvo que uses el tipo de cambio provisto, y en ese caso aclaralo. Si faltan datos (por ejemplo no hay ingresos cargados), decilo sin inventar. No uses markdown complejo; texto corrido con parrafos o vinetas simples.`;

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

  const { orgId, jobId, desarrollo, arqueo, tc } = payload;
  if (!orgId || !jobId) {
    return { statusCode: 400, body: "Faltan orgId o jobId" };
  }

  const db = getDb();
  const jobRef = db.doc("orgs/" + orgId + "/jobs/" + jobId);

  try {
    await jobRef.set({
      tipo: "analizar_financiero",
      estado: "procesando",
      desarrollo: desarrollo || "",
      creadoEn: new Date().toISOString(),
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

    const userContent = "Arqueo del desarrollo \"" + (desarrollo || "") + "\"" +
      (tc ? " (tipo de cambio de referencia: " + tc + " ARS/USD)" : "") +
      ":\n\n" + JSON.stringify(arqueo, null, 2) +
      "\n\nRedacta el analisis de riesgo completo segun las instrucciones del sistema.";

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
    console.error("agent-financiero-background:", error.message);
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
