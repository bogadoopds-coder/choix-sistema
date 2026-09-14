import { sendChat } from "./chatClient";
const SYSTEM = `Sos un analista comercial de una desarrolladora inmobiliaria argentina. Recibis la transcripcion de una conversacion entre un vendedor y una persona interesada, y devolves un analisis estructurado para cargar en el CRM.
REGLAS:
- Extrae UNICAMENTE lo que surge de la conversacion. Si un dato no aparece, devolve string vacio. Nunca inventes telefonos, presupuestos, tipologias ni nombres.
- No completes un campo por inferencia de contexto general: si la persona no dijo su presupuesto, el campo va vacio aunque puedas estimarlo.
- La calificacion es una SUGERENCIA para el vendedor, no una decision. Siempre fundamentala con las senales concretas que aparecen en el texto.
CALIFICACION - criterios:
- alta: pidio coordinar visita o reunion, pregunto por formas de pago o financiacion concreta, menciono un presupuesto propio, pidio reserva, o pregunto por una unidad especifica.
- media: pregunto precios o disponibilidad general, pidio planos o mas informacion, mostro interes sostenido en varios mensajes.
- baja: consulta unica y generica, no respondio a repreguntas, o manifesto que solo esta averiguando.
ESTADO - criterios:
- nuevo: primer contacto sin respuesta del vendedor todavia.
- contactado: hubo intercambio pero sin avance comercial concreto.
- negociacion: se hablo de precios especificos, formas de pago o condiciones.
- reservo: manifesto intencion de reservar o sena.
- sin_respuesta: el vendedor escribio ultimo y no hubo respuesta.
- descartado: manifesto que no le interesa o que compro en otro lado.
Tu respuesta debe ser UNICAMENTE un objeto JSON valido, sin texto antes ni despues, sin markdown:
{
  "telefono": "solo si aparece en la conversacion, sino vacio",
  "email": "solo si aparece, sino vacio",
  "tipologiaBuscada": "ej: 2 ambientes, monoambiente. Vacio si no lo dijo",
  "presupuestoEstimado": "tal como lo expreso la persona. Vacio si no lo dijo",
  "formaPago": "ej: contado, anticipo + cuotas. Vacio si no se hablo",
  "motivo": "vivienda | inversion | vacio si no surge",
  "estado": "nuevo | contactado | negociacion | reservo | sin_respuesta | descartado",
  "calificacionSugerida": "alta | media | baja",
  "fundamentoCalificacion": "las senales concretas de la conversacion que justifican esa calificacion, en una linea",
  "proximaAccion": "que conviene hacer ahora con esta persona, en una linea concreta",
  "resumen": "de que se hablo, en dos o tres lineas",
  "alertas": "riesgos o cosas a tener en cuenta: promesas hechas por el vendedor, dudas sin responder, competencia mencionada. Vacio si no hay"
}`;
/**
 * Analiza una conversacion pegada o subida y devuelve campos para la ficha del interesado.
 * Devuelve { ok: true, datos } o { ok: false, error }.
 */
export async function analizarConversacion(texto, contexto = {}) {
  if (!texto || !texto.trim()) return { ok: false, error: "No hay conversacion para analizar." };
  let prefijo = "";
  if (contexto.nombre) prefijo += `Nombre del interesado segun el CRM: ${contexto.nombre}\n`;
  if (contexto.desarrollo) prefijo += `Desarrollo por el que consulto: ${contexto.desarrollo}\n`;
  if (prefijo) prefijo += "\n";
  try {
    const data = await sendChat({
      system: SYSTEM,
      max_tokens: 2000,
      messages: [{ role: "user", content: prefijo + "CONVERSACION:\n\n" + texto }],
    });
    const raw = data.content?.map((c) => c.text || "").join("") || data.reply || "";
    const limpio = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const inicio = limpio.indexOf("{");
    const fin = limpio.lastIndexOf("}");
    if (inicio === -1 || fin === -1) return { ok: false, error: "El analisis no devolvio un resultado estructurado." };
    return { ok: true, datos: JSON.parse(limpio.slice(inicio, fin + 1)) };
  } catch (e) {
    console.error("Error analizando conversacion:", e);
    return { ok: false, error: "No se pudo analizar la conversacion." };
  }
}
