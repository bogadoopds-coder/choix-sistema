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
- APROVECHAMIENTO DEL CUF: si pudiste calcular unidades funcionales, completa el campo "aprovechamiento" con un texto breve que compare dos miradas de producto: (a) MAXIMA CANTIDAD, dividiendo los m2 edificables estimados por la cantidad de UF para obtener la superficie promedio por unidad, y (b) PRODUCTO EQUILIBRADO, con menos unidades de mayor superficie. Aclara siempre cual es el limitante real (CUF o m2 edificables). Las VIAS PARA AUMENTAR el CUF NO se desarrollan en este campo: van en el campo "premiosYAprovechamientos". Si no pudiste calcular UF, devolve "aprovechamiento" como string vacio.
- COHERENCIA ENTRE TECHOS (obligatorio antes de enunciar cualquier via de aumento): el CUF no es el unico techo. Antes de informar un incremento de unidades funcionales por cualquier mecanismo, verifica si la DENSIDAD MAXIMA de la zona lo permite. Calcula la poblacion resultante (unidades x 2 personas promedio) sobre la superficie de la parcela en hectareas y compara con la densidad maxima del codigo. Si el incremento de UF supera la densidad, NO lo enuncies como cifra alcanzable: informa explicitamente que la densidad es el limitante efectivo y cual es el maximo real de unidades que la densidad admite. Aplica el mismo criterio cruzando con FOT, FOS y altura maxima. Esta terminantemente prohibido enunciar un techo de unidades sin haberlo contrastado contra los demas indicadores del mismo informe.
- LA DENSIDAD SE COMPUTA POR DORMITORIO, NO POR UNIDAD: cuando el codigo entregado establezca el computo de personas por dormitorio (por ejemplo "se computan dos personas por dormitorio", con la regla de que una unidad de un solo ambiente computa como si tuviera un dormitorio), el techo poblacional NO limita la cantidad de unidades funcionales sino la cantidad total de DORMITORIOS del edificio. Procedimiento obligatorio: (1) calcula la poblacion maxima admitida multiplicando la superficie de la parcela en hectareas por la densidad maxima de la zona; (2) divide esa poblacion por la cantidad de personas por dormitorio que fije el codigo, y presenta el resultado como el TECHO DE DORMITORIOS del edificio; (3) recien entonces, para cada tipologia que menciones, multiplica la cantidad de unidades por sus dormitorios y verifica que el total no supere ese techo. Esta terminantemente prohibido asumir que cada unidad funcional equivale a un dormitorio o a una cantidad fija de personas. Cuando propongas escenarios de producto, informa para cada uno la cantidad de unidades, los dormitorios por unidad, el total de dormitorios y si entra o no en el techo; si un escenario no entra, corregilo al maximo de unidades que si entra en lugar de enunciarlo igual. Cita el articulo del codigo que fija el computo.
- BLOQUE DE PREMIOS Y APROVECHAMIENTOS A CONVALIDAR: completa el campo "premiosYAprovechamientos" con una comparacion entre lo que el terreno permite HOY por codigo y el TECHO al que podria llegar si se aprobaran los mecanismos de incremento. Estructura obligatoria: (1) SITUACION BASE: m2 edificables, cantidad de unidades funcionales y techo de dormitorios que surgen de los indicadores vigentes, sin ningun mecanismo. (2) MECANISMO POR MECANISMO: para cada figura de incremento que el codigo entregado prevea (premios por mejora morfologica, incremento de unidades funcionales, transferencia de capacidad constructiva, incentivos fiscales u otros), informa en una linea: nombre del mecanismo, articulo, ESTADO, cuanto suma en m2 y en unidades, y que tramite exige. El ESTADO debe ser exactamente uno de estos tres: APLICABLE (la condicion habilitante esta verificada contra los datos del terreno), NO APLICABLE (el texto excluye expresamente a esta zona o parcela, indicando por que), o NO ACREDITADO (la condicion existe en el texto pero no puede verificarse con los datos disponibles, indicando que falta verificar). Si la zona misma del terreno no esta confirmada contra cartografia, ningun mecanismo puede declararse APLICABLE: el maximo estado posible es NO ACREDITADO. (3) TECHO RESULTANTE: la suma de lo base mas los mecanismos que no esten en estado NO APLICABLE, expresada como rango o como valor unico, SIEMPRE precedida de la leyenda "sujeto a aprobacion municipal" y aclarando que no constituye un derecho adquirido. (4) CUANDO UN MECANISMO SUME METROS PERO NO UNIDADES: si un incremento de superficie edificable no se traduce en mas unidades funcionales porque otro indicador (tipicamente la densidad) ya es el techo efectivo, decilo de forma explicita y cuantificada, porque es informacion determinante para decidir si conviene adquirir ese derecho. Este bloque es independiente del analisis de tipologias del campo "aprovechamiento": no repitas aca los escenarios de producto. Si el codigo entregado no preve ningun mecanismo aplicable a la zona, escribi la situacion base y aclara que no se identifican vias de incremento en el texto entregado. Este campo es OBLIGATORIO siempre que hayas podido calcular m2 edificables: no lo devuelvas vacio. Las vias de aumento de indicadores (premios, incremento de unidades funcionales, transferencia de capacidad constructiva, incentivos fiscales) se desarrollan UNICAMENTE en este campo y NO en el campo "aprovechamiento": en "aprovechamiento" limitate al CUF, la densidad y los escenarios de tipologia, y no incluyas alli ninguna via de aumento. Esta prohibido escribir en cualquier campo una remision del tipo "ver bloque premiosYAprovechamientos" sin haber completado efectivamente ese bloque.
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
  "premiosYAprovechamientos": "comparacion entre la situacion base por codigo y el techo a convalidar: mecanismo por mecanismo con articulo, estado (APLICABLE / NO APLICABLE / NO ACREDITADO), cuanto suma y que tramite exige. String vacio si no aplica",
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
        max_tokens: 12000,
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
