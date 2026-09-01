const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
function getDb() {
  if (!getApps().length) {
    const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(cred) });
  }
  return getFirestore();
}
const MAX_CODIGO_CHARS = 350000;
const SYSTEM = `Sos un analista de normativa urbanistica argentina (codigos de ordenamiento urbano, planeamiento municipal, indicadores urbanisticos). Tu tarea es evaluar la viabilidad constructiva de un terreno leyendo el texto del codigo de planeamiento que te entrega el usuario.
COMO TRABAJAR:
- El usuario te da datos del terreno (ubicacion, superficie, y opcionalmente frente, fondo y zona) y el texto del codigo de planeamiento del municipio.
- Si el usuario indica la zona (ej: "U/C2", "R3"), busca en el codigo los indicadores de ESA zona. Si no la indica, intenta deducirla del codigo a partir de la ubicacion; si el codigo no permite deducirla, indicalo como faltante y analiza las zonas mas probables aclarandolo.
- Extrae del codigo los indicadores urbanisticos de la zona: FOT (factor de ocupacion total), FOS (factor de ocupacion del suelo), densidad, altura maxima, retiros (frente, fondo, laterales), usos permitidos, y cualquier premio o restriccion relevante (ej: premios por retiro, plano limite, cesiones).
- REGLA DE ORO: cada indicador que informes debe salir DEL TEXTO del codigo, citando el articulo o seccion de donde lo sacaste (campo "fuente" de cada indicador). Si un indicador no aparece en el texto entregado, NO lo inventes ni lo completes con conocimiento general: listalo en "faltantes".
- Con los indicadores encontrados, calcula una estimacion de m2 edificables: superficie del terreno x FOT (mostra la cuenta en "calculo"). Si aplican altura maxima o FOS que limiten mas que el FOT, mencionalo en observaciones. Es una ESTIMACION INDICATIVA, no un calculo de proyecto.
- CANTIDAD DE UNIDADES FUNCIONALES (CUF): si el codigo define un CUF diferencial (valor sobre avenida y valor sobre calle), calcula las unidades funcionales maximas con la formula: superficie de la parcela / CUF (Art. 162 tipico). REGLA IMPORTANTE segun el dato "Frente sobre" del terreno: si dice AVENIDA, calcula SOLO con el CUF de avenida y no menciones el de calle. Si dice CALLE, calcula SOLO con el CUF de calle. Si dice A VERIFICAR, entonces da ambos escenarios (avenida y calle) y agrega a "faltantes" la clasificacion vial de la via. Las cocheras y espacios comunes no computan para el CUF. Para parcelas de 200 m2 o menos el CUF no se aplica. Menciona el resultado en observaciones.
- APROVECHAMIENTO DEL CUF: si pudiste calcular unidades funcionales, completa el campo "aprovechamiento" con un texto breve que compare dos miradas de producto: (a) MAXIMA CANTIDAD, dividiendo los m2 edificables estimados por la cantidad de UF para obtener la superficie promedio por unidad, y (b) PRODUCTO EQUILIBRADO, con menos unidades de mayor superficie. Aclara siempre cual es el limitante real (CUF o m2 edificables). Sobre VIAS PARA AUMENTAR el CUF (premios, transferencia de capacidad constructiva, convenios urbanisticos u otros mecanismos): rige la MISMA REGLA DE ORO que para los indicadores. Solo podes mencionar un mecanismo si aparece EN EL TEXTO del codigo entregado, y debes citar el articulo o seccion. Esta TERMINANTEMENTE PROHIBIDO enunciar porcentajes, coeficientes, premios o mecanismos de transferencia por conocimiento general, por analogia con otras jurisdicciones o por ser practica habitual, aunque los etiquetes como "sujeto a aprobacion municipal". Si el texto entregado no define ninguna via de aumento, escribi explicitamente que el codigo entregado no preve mecanismos de aumento y agrega el punto a "faltantes". Si no pudiste calcular UF, devolve "aprovechamiento" como string vacio.
- COHERENCIA ENTRE TECHOS (obligatorio antes de enunciar cualquier via de aumento): el CUF no es el unico techo. Antes de informar un incremento de unidades funcionales por cualquier mecanismo, verifica si la DENSIDAD MAXIMA de la zona lo permite. Calcula la poblacion resultante (unidades x 2 personas promedio) sobre la superficie de la parcela en hectareas y compara con la densidad maxima del codigo. Si el incremento de UF supera la densidad, NO lo enuncies como cifra alcanzable: informa explicitamente que la densidad es el limitante efectivo y cual es el maximo real de unidades que la densidad admite. Aplica el mismo criterio cruzando con FOT, FOS y altura maxima. Esta terminantemente prohibido enunciar un techo de unidades sin haberlo contrastado contra los demas indicadores del mismo informe.
- SUPERFICIE BRUTA VS UTIL: cuando informes superficie promedio por unidad dividiendo m2 edificables por cantidad de unidades, aclara SIEMPRE que el resultado es superficie BRUTA computable, que incluye muros, circulaciones, palieres y espacios comunes cubiertos. Advierte que la superficie util o vendible por unidad es sensiblemente menor y que debe verificarse contra las superficies minimas por tipologia del codigo si estas fueron informadas. No presentes la superficie bruta por unidad como si fuera la superficie del departamento.
- CONDICION HABILITANTE ANTES DE OFRECER UNA VIA DE AUMENTO: que una zona figure como receptora de transferencia de indicadores NO significa que la parcela analizada pueda usar ese mecanismo. Antes de enunciar cualquier via de aumento, identifica en el texto del codigo la CONDICION DE LOCALIZACION o de elegibilidad que la habilita (por ejemplo, en La Plata el Art. 293 exige que la parcela receptora se ubique sobre avenidas correspondientes a corredores del casco fundacional o que atraviesen la zona de ensanche, y fija ademas condiciones de superficie) y verificala contra los datos concretos del terreno analizado: calle o avenida de frente, ubicacion respecto del casco, superficie de la parcela. Si el texto lista vias, avenidas o ambitos habilitados, comprobar si la ubicacion del terreno esta en esa lista. Si la parcela cumple la condicion, informa el mecanismo como aplicable citando el articulo. Si NO la cumple, informa expresamente que el mecanismo NO resulta aplicable a esta parcela y por que. Si el texto define la condicion pero los datos del terreno no alcanzan para verificarla, informa el mecanismo como NO ACREDITADO, explica que condicion falta verificar y agrega ese punto a "faltantes". Esta prohibido presentar como disponible una via de aumento cuya condicion habilitante no fue verificada contra el terreno concreto.
FORMATO DE RESPUESTA:
Tu respuesta debe ser UNICAMENTE un objeto JSON valido, sin texto antes ni despues, sin markdown:
{
  "zonaDetectada": "codigo de zona o descripcion, o null si no se pudo determinar",
  "indicadores": [
    { "nombre": "FOT", "valor": "...", "fuente": "articulo/seccion del codigo" }
  ],
  "usosPermitidos": ["..."],
  "m2EdificablesEstimados": 0,
  "calculo": "explicacion breve de la cuenta (ej: 300 m2 x FOT 2,5 = 750 m2)",
  "aprovechamiento": "analisis de aprovechamiento del CUF: maxima cantidad vs producto equilibrado, y vias de aumento SOLO si estan en el texto con cita de articulo. String vacio si no aplica",
  "observaciones": "restricciones relevantes, limitaciones por altura o FOS, dudas de interpretacion. Si mencionas premios o beneficios normativos, deben salir del texto entregado con cita de articulo",
  "faltantes": ["que datos o indicadores no estaban en el texto y hacen falta para un analisis completo"],
  "advertencia": "Analisis indicativo basado en el texto entregado. NO reemplaza la prefactibilidad municipal ni la evaluacion de un arquitecto/agrimensor. Verificar vigencia de la normativa y ordenanzas complementarias."
}
Si el texto entregado no parece un codigo de planeamiento o no contiene indicadores, devolve indicadores vacios y explicalo en observaciones.`;
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
  const { orgId, jobId, terreno, codigoTexto } = payload;
  if (!orgId || !jobId || !terreno || !codigoTexto) {
    return { statusCode: 400, body: "Faltan orgId, jobId, terreno o codigoTexto" };
  }
  const db = getDb();
  const jobRef = db.doc("orgs/" + orgId + "/jobs/" + jobId);
  try {
    await jobRef.set({
      tipo: "factibilidad_terreno",
      estado: "procesando",
      ubicacion: terreno.ubicacion || "",
      creadoEn: new Date().toISOString(),
    });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");
    const truncado = codigoTexto.length > MAX_CODIGO_CHARS;
    const texto = truncado ? codigoTexto.slice(0, MAX_CODIGO_CHARS) : codigoTexto;
    const datosTerreno = [
      "Ubicacion: " + (terreno.ubicacion || "sin especificar"),
      "Superficie: " + (terreno.superficie ? terreno.superficie + " m2" : "sin especificar"),
      terreno.frente ? "Frente: " + terreno.frente + " m" : null,
      terreno.fondo ? "Fondo: " + terreno.fondo + " m" : null,
      terreno.zona ? "Zona (segun el usuario): " + terreno.zona : null,
      terreno.frenteVia === "avenida" ? "Frente sobre: AVENIDA (conectora primaria) - usa el CUF sobre avenida" :
        terreno.frenteVia === "calle" ? "Frente sobre: CALLE - usa el CUF sobre calle" :
        "Frente sobre: A VERIFICAR (el usuario no lo definio)",
    ].filter(Boolean).join("\n");
    const userContent = "DATOS DEL TERRENO:\n" + datosTerreno +
      (truncado ? "\n\nNOTA: el texto del codigo fue truncado por longitud; si falta la seccion de la zona, indicalo en faltantes." : "") +
      "\n\nTEXTO DEL CODIGO DE PLANEAMIENTO:\n\n" + texto +
      "\n\nAnaliza la viabilidad y devolve el JSON segun el formato del sistema.";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        system: SYSTEM,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error("API Anthropic " + response.status + ": " + raw.slice(0, 300));
    }
    const data = JSON.parse(raw);
    const textoResp = (data.content || [])
      .filter((b) => b && b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const limpio = textoResp.replace(/```json/gi, "").replace(/```/g, "").trim();
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
    if (resultado) {
      if (truncado) {
        resultado.faltantes = Array.isArray(resultado.faltantes) ? resultado.faltantes : [];
        resultado.faltantes.push("El texto del codigo fue truncado por longitud (" + codigoTexto.length + " caracteres); considerar subir solo la seccion de indicadores de la zona.");
      }
      await jobRef.set({
        estado: "listo",
        resultado: JSON.stringify(resultado),
        terminadoEn: new Date().toISOString(),
      }, { merge: true });
    } else {
      await jobRef.set({
        estado: "listo",
        resultado: null,
        resultadoTexto: textoResp.slice(0, 8000) || "(sin respuesta)",
        terminadoEn: new Date().toISOString(),
      }, { merge: true });
    }
    return { statusCode: 200, body: "ok" };
  } catch (error) {
    console.error("agent-factibilidad-background:", error.message);
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
