const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
function getDb() {
  if (!getApps().length) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(cred) });
  }
  return getFirestore();
}
const SYSTEM = `Sos un analista de mercado inmobiliario argentino. Tu tarea es buscar en la web precios de venta de propiedades comparables para una zona que te indica el usuario (puede ser cualquier ubicacion de Argentina: esquina, barrio o ciudad).
COMO BUSCAR:
- Usa la herramienta de busqueda web. Prioriza portales inmobiliarios argentinos: Argenprop, Zonaprop, Inmobusqueda, MercadoLibre Inmuebles, Remax. Si encontras datos utiles en otros portales o inmobiliarias locales de la zona, tambien sirven.
- Busca avisos de VENTA que coincidan con los parametros (tipologias, estado, rango de m2) dentro del radio pedido. Si en el radio exacto hay pocos resultados, amplia gradualmente y aclaralo en cada comparable (campo "zona").
- Si el usuario indica una antiguedad maxima de publicacion, priorizala: descarta avisos cuya fecha visible sea mas vieja que ese limite. Muchos portales no muestran fecha de publicacion; si un aviso no tiene fecha visible pero es relevante, podes incluirlo agregando "(sin fecha visible)" en el campo "zona". NUNCA inventes fechas de publicacion.
- De cada aviso util extrae: direccion o zona aproximada, tipologia, m2, precio publicado, moneda, y la URL de la fuente. Calcula precioM2 = precio / m2 cuando ambos datos esten.
- REGLA DE ORO: ningun comparable sin URL de fuente. Si no podes citar de donde salio, no lo incluyas. No inventes avisos ni precios. Si un portal no arroja resultados, seguí con otros.
- Los precios de portales son PRECIOS DE PUBLICACION (lo que se pide), no precios de cierre. Esto va aclarado en el resumen.
FORMATO DE RESPUESTA:
DETECCION DE ATIPICOS: antes de calcular el resumen, marca "atipico": true a los comparables que distorsionan la muestra, con el motivo en "motivoAtipico". Son atipicos: superficies incoherentes con la tipologia (un 2 ambientes de 15 o 16 m2, o superficies absurdas para el tipo); precioM2 que se desvia groseramente del resto (mas del doble o menos de la mitad de la mediana de los demas); o propiedades que no son comparables (cocheras, lotes, locales colados). El resumen (min, mediana, max, muestras) se calcula SOLO con los NO atipicos, para que la mediana sea representativa. En "observaciones" aclara cuantos se marcaron atipicos y por que. Igual devolve TODOS los comparables (los atipicos marcados).
Tu respuesta final debe ser UNICAMENTE un objeto JSON valido, sin texto antes ni despues, sin markdown, con esta estructura exacta:
{
  "comparables": [
    { "zona": "...", "tipologia": "...", "m2": 0, "precio": 0, "moneda": "USD", "precioM2": 0, "estado": "pozo|estrenar|usado|sd", "fuente": "https://...", "desarrolladora": "", "atipico": false, "motivoAtipico": "" }
  ],
  "resumen": {
    "muestras": 0,
    "precioM2Min": 0,
    "precioM2Mediana": 0,
    "precioM2Max": 0,
    "observaciones": "sintesis breve del mercado de la zona: que se encontro, en que portales, si hubo que ampliar el radio, dispersion de precios",
    "advertencia": "Precios de publicacion (valores pedidos), no de cierre. Los valores de cierre suelen ser 5-15% menores."
  }
}
Si directamente no encontras comparables, devolve comparables como lista vacia y explica en observaciones que se busco y por que no hubo resultados.`;
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
  const { orgId, jobId, modo, ubicacion, radio, tipologias, estadoUnidad, m2Min, m2Max, antiguedad, desarrolladoras, localidad } = payload;
  if (!orgId || !jobId) {
    return { statusCode: 400, body: "Faltan orgId o jobId" };
  }
  if (modo === "desarrolladora") {
    if (!desarrolladoras || !localidad) {
      return { statusCode: 400, body: "Faltan desarrolladoras o localidad" };
    }
  } else if (!ubicacion) {
    return { statusCode: 400, body: "Faltan orgId, jobId o ubicacion" };
  }
  const db = getDb();
  const jobRef = db.doc("orgs/" + orgId + "/jobs/" + jobId);
  try {
    await jobRef.set({
      tipo: "estudio_mercado",
      estado: "procesando",
      ubicacion: modo === "desarrolladora" ? (localidad || ubicacion || "") : ubicacion,
      creadoEn: new Date().toISOString(),
    });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");
    const criterios = [
      "Ubicacion: " + ubicacion,
      "Radio de busqueda: " + (radio || "hasta 10 cuadras / barrio"),
      "Tipologias: " + (Array.isArray(tipologias) && tipologias.length ? tipologias.join(", ") : "todas"),
      "Estado: " + (estadoUnidad || "todos (pozo, a estrenar, usado)"),
      m2Min || m2Max ? "Rango de m2: " + (m2Min || "sin minimo") + " a " + (m2Max || "sin maximo") : null,
      antiguedad ? "Antiguedad maxima de publicacion: " + ({ "1m": "1 mes", "2m": "2 meses", "3m": "3 meses" }[antiguedad] || antiguedad) : null,
    ].filter(Boolean).join("\n");
    const userContent = "Necesito un estudio de mercado de precios de VENTA con estos criterios:\n\n" +
      criterios +
      (modo === "desarrolladora"
        ? "MODO POR DESARROLLADORA: busca especificamente los emprendimientos de venta de esta(s) desarrolladora(s): \"" + (desarrolladoras || "") + "\" en la localidad/zona: \"" + (localidad || ubicacion || "") + "\". Traé sus unidades en venta con precio y m2, completando el campo desarrolladora en cada comparable. El objetivo es comparar contra proyectos de esa desarrolladora. Busca en Argenprop, Zonaprop, Inmobusqueda, MercadoLibre Inmuebles y las webs propias de las desarrolladoras. Devolve el JSON segun el formato del sistema."
        : "Busca en la web (prioridad: Argenprop, Zonaprop, Inmobusqueda, MercadoLibre Inmuebles) y devolve el JSON segun el formato del sistema.");
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
        messages: [{ role: "user", content: userContent }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
      }),
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error("API Anthropic " + response.status + ": " + raw.slice(0, 300));
    }
    const data = JSON.parse(raw);
    const texto = (data.content || [])
      .filter((b) => b && b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    // El modelo debe responder JSON puro; limpiamos fences por las dudas
    const limpio = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
    const inicio = limpio.indexOf("{");
    const fin = limpio.lastIndexOf("}");
    let resultado = null;
    if (inicio !== -1 && fin > inicio) {
      try {
        resultado = JSON.parse(limpio.slice(inicio, fin + 1));
      } catch (_) {
        resultado = null;
      }
    }
    if (resultado && Array.isArray(resultado.comparables)) {
      // Higiene: sin fuente no entra (regla de oro tambien del lado del codigo)
      resultado.comparables = resultado.comparables.filter(
        (c) => c && typeof c.fuente === "string" && c.fuente.startsWith("http")
      );
      await jobRef.set({
        estado: "listo",
        resultado: JSON.stringify(resultado),
        terminadoEn: new Date().toISOString(),
      }, { merge: true });
    } else {
      // Fallback: no se pudo parsear JSON; guardamos el texto crudo
      await jobRef.set({
        estado: "listo",
        resultado: null,
        resultadoTexto: texto.slice(0, 8000) || "(sin respuesta)",
        terminadoEn: new Date().toISOString(),
      }, { merge: true });
    }
    return { statusCode: 200, body: "ok" };
  } catch (error) {
    console.error("agent-mercado-background:", error.message);
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
