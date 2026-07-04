const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

function getDb() {
  if (!getApps().length) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(cred) });
  }
  return getFirestore();
}

const CHUNK_SIZE = 12000;
const MAX_CHUNKS = 25;

function trocearTexto(texto) {
  const chunks = [];
  let resto = String(texto || "");
  while (resto.length > 0 && chunks.length < MAX_CHUNKS) {
    if (resto.length <= CHUNK_SIZE) {
      chunks.push(resto);
      break;
    }
    let corte = resto.lastIndexOf("\n", CHUNK_SIZE);
    if (corte < CHUNK_SIZE * 0.5) corte = CHUNK_SIZE;
    chunks.push(resto.slice(0, corte));
    resto = resto.slice(corte);
  }
  return chunks;
}

function extractAndParseJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*[\r\n]*/, "").trim();
    s = s.replace(/\s*```\s*$/, "").trim();
  }
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  let jsonStr = s.slice(a, b + 1);
  try { return JSON.parse(jsonStr); } catch (_) {}
  try { return JSON.parse(jsonStr.replace(/,\s*([}\]])/g, "$1")); } catch (_) {}
  return null;
}

function armarPrompt(chunkText, chunkInfo, obra, chandias) {
  const prefix = "Sos un ingeniero de obra argentino. Analiza el siguiente documento de proyecto/computo de obra y extrae los rubros e items con cantidades.\n" +
    (chunkInfo ? "(Fragmento " + chunkInfo + " del documento.)\n" : "") +
    "OBRA: " + (obra.nombre || "") + " (" + (obra.codigo || "") + ")\n" +
    "CLIENTE: " + (obra.cliente || "") + "\n" +
    "DESCRIPCION / DOCUMENTO:\n";
  const suffix = "\n" +
    "PRECIOS - regla de oro: si el documento trae precio unitario para el item, EXTRAELO TAL CUAL aparece, sin recalcularlo ni actualizarlo (numeros en formato argentino: punto de miles y coma decimal; \"12.647,54\" significa 12647.54). El campo p es SIEMPRE el precio UNITARIO del item, NUNCA el precio total del item ni del rubro. Solo si el documento NO trae precio para ese item, estimalo en ARS actuales usando los rendimientos del Chandias (abajo): materiales + mano de obra, precios de mercado argentino. Nunca dejes precio en 0.\n" +
    (chandias || "") + "\n" +
    "Responde UNICAMENTE con un unico objeto JSON valido. No incluyas texto antes ni despues, ni backticks ni explicaciones.\n" +
    'Formato compacto (claves cortas): n=numero, d=descripcion, u=unidad, c=cantidad, p=precio_unitario.\n' +
    '{"obra":"nombre breve","rubros":[{"nombre":"Rubro","items":[{"n":"1.1","d":"Descripcion del item","u":"m2","c":100,"p":5500}]}]}\n' +
    "IMPORTANTE: Extraer TODOS los items del texto, no solo los primeros. Si el texto tiene 100 items, devolver los 100. Usar formato JSON compacto sin espacios extras.\n" +
    "IMPORTANTE: Extrae TODOS los items individuales del documento, tal como aparecen. NO resumas ni agrupes multiples items en uno solo. Cada linea del documento que tenga descripcion + unidad + cantidad debe ser un item separado.\n" +
    'Si un item es una tarea compuesta (ej: "Contrapiso armado esp 12cm", "Revoque interior completo"), extraelo TAL CUAL aparece con su descripcion, unidad y cantidad originales.\n' +
    "NO agrupes rubros enteros en un solo item generico. Por ejemplo, si el documento tiene 20 items de instalacion electrica, extrae los 20 items individuales, NO un solo item generico.\n" +
    "Maximo 50 items POR FRAGMENTO. Si hay mas, prioriza los de mayor monto.\n" +
    "Reglas:\n" +
    "- obra: string. rubros: array con \"nombre\" e \"items\".\n" +
    "- Cada item: n (numero), d (descripcion), u (unidad), c (cantidad), p (precio ARS). Opcional: observaciones.\n" +
    "- Agrupa por rubros logicos. Entre 1 y 15 rubros. Respuesta: solo el JSON, nada mas.";
  return prefix + chunkText + suffix;
}

async function llamarClaude(apiKey, content) {
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
      messages: [{ role: "user", content }],
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

  const { orgId, jobId, obra, texto, chandias } = payload;
  if (!orgId || !jobId || !texto) {
    return { statusCode: 400, body: "Faltan orgId, jobId o texto" };
  }

  const db = getDb();
  const jobRef = db.doc("orgs/" + orgId + "/jobs/" + jobId);

  try {
    const chunks = trocearTexto(texto);
    await jobRef.set({
      tipo: "leer_proyecto",
      estado: "procesando",
      obra: (obra && obra.nombre) || "",
      chunksTotal: chunks.length,
      chunksListos: 0,
      creadoEn: new Date().toISOString(),
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

    const parciales = [];
    const fallidos = [];
    for (let i = 0; i < chunks.length; i++) {
      const info = chunks.length > 1 ? (i + 1) + " de " + chunks.length : "";
      const prompt = armarPrompt(chunks[i], info, obra || {}, chandias);
      let ok = false;
      for (let intento = 1; intento <= 2 && !ok; intento++) {
        try {
          const txt = await llamarClaude(apiKey, prompt);
          const parsed = extractAndParseJson(txt);
          if (parsed && Array.isArray(parsed.rubros)) {
            parciales.push(parsed);
            ok = true;
          } else {
            console.error("leer-proyecto chunk", i + 1, "intento", intento, "JSON invalido. Inicio respuesta:", String(txt || "").slice(0, 300));
          }
        } catch (e) {
          console.error("leer-proyecto chunk", i + 1, "intento", intento, "fallo:", e.message);
        }
      }
      if (!ok) fallidos.push(i + 1);
      await jobRef.set({ chunksListos: i + 1 }, { merge: true });
    }

    await jobRef.set({
      estado: "listo",
      parciales: JSON.stringify(parciales),
      chunksFallidos: fallidos,
      terminadoEn: new Date().toISOString(),
    }, { merge: true });

    return { statusCode: 200, body: "ok" };
  } catch (error) {
    console.error("leer-proyecto-background:", error.message);
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
