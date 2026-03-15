import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export function parseNumeroArgentino(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/\./g, "").replace(",", ".")) || 0;
}

export const NOMBRES_RUBRO_PROVINCIAL = {
  "1": "Trabajos Preparatorios", "2": "Movimiento de Suelo", "3": "Estructura Resistente",
  "4": "Albañilería", "5": "Revestimientos", "6": "Pisos y Zócalos", "7": "Marmolería",
  "8": "Cubiertas y Techados", "9": "Cielorrasos", "10": "Carpinterías y Mobiliario",
  "11": "Instalación Eléctrica", "12": "Instalación Sanitaria", "13": "Instalación de Gas",
  "14": "Instalación Electromecánica", "15": "Acondicionamiento Térmico",
  "16": "Instalación de Seguridad", "17": "Cristales, Espejos y Vidrios", "18": "Pinturas",
  "19": "Señalética", "20": "Obras Exteriores", "21": "Limpieza de Obra", "22": "Varios"
};

export const REGEX_ITEM_PDF = /^(\d+(?:\.\d+)?)\s+(?:(\d+)\s+)?(.+?)\s+(m2|m3|ml|u|un|nº|n°|gl|dia|mes|kg|tn)\s+([\d.,]+)\s+([\d.,]+)\s*\$/i;
export const REGEX_RUBRO_TOTAL = /^(\d{1,2})\s+([\d.,]+)\s*\$\s+([\d.,]+)%/;

export const BASURA_REGEX = /^(LANUS|ENSENADA|DISTRITO|ESTABLECIMIENTO|TIPO DE OBRA|COMPUTO Y PRESUPUESTO|MES BASE|RUBRO\s*$|ITEM\s*$|DESIGNACION|Cómputo\s*$|Presupuesto\s*$|%\s*incidencia|PLANILLA RESUMEN|FIRMA|PROYECTO|Responsable|Superficie|NOTA\s|Son PESOS|PLAZO DE|PRESUPUESTO TOTAL|HONORARIOS|HASTA\s*$|SUBTOTAL|Subtotal|Precio Rubro|GOBIERNO|Hoja Adicional|Informe gráfico|Número:|Referencia|El documento|página|AVANCE|Series|Monto de|% de avance|Unid\.|AMPLIACI|FC\s*$|Precio Item|TRABAJOS PREP|MOVIMIENTO|ESTRUCTURA|ALBAÑ|MAMPOST|REVOQUE|CONTRAPISO|AISLAC|REVESTIM|PISOS|MARMOL|CUBIERTA|CIELORRASO|CARPINTER|INSTALAC|CRISTAL|PINTURA|SEÑALÉTICA|VARIOS)/i;

export function parsearTextoPDFProvincial(texto) {
  if (!texto || typeof texto !== "string") return "";
  let textoLimpio = texto.replace(/(\d+,\d+%)\s{2,}/g, "$1\n");
  const lineas = textoLimpio.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const lineasFiltradas = lineas.filter((l) => !BASURA_REGEX.test(l) && !(/^\d+$/.test(l) && l.length <= 4));
  const output = [];
  const itemsParseados = [];
  let ultimoRubroNum = "";
  let lineaPendiente = "";

  function procesarLinea(line) {
    const itemMatch = line.match(REGEX_ITEM_PDF);
    if (itemMatch) {
      const [, num, subNum, desc, unidad, cantStr, precioStr] = itemMatch;
      const numero = subNum ? num + "." + subNum : num;
      const descClean = desc.trim().replace(/,/g, " ").replace(/\s+/g, " ").trim();
      const cantidad = parseNumeroArgentino(cantStr);
      const precio = parseNumeroArgentino(precioStr);
      const rubroNum = String(numero.includes(".") ? numero.split(".")[0] : numero);
      const nombreRubro = NOMBRES_RUBRO_PROVINCIAL[rubroNum] || "Rubro " + rubroNum;
      if (rubroNum !== ultimoRubroNum) {
        ultimoRubroNum = rubroNum;
        output.push("RUBRO: " + nombreRubro);
      }
      output.push(`${numero},${descClean},${unidad},${cantidad},${precio}`);
      itemsParseados.push({ numero, desc: descClean, unidad, cantidad, precio });
      return true;
    }
    const rubroMatch = line.match(REGEX_RUBRO_TOTAL);
    if (rubroMatch) {
      ultimoRubroNum = rubroMatch[1];
      return true;
    }
    return false;
  }

  for (let i = 0; i < lineasFiltradas.length; i++) {
    const line = lineasFiltradas[i];
    const concatenada = lineaPendiente ? lineaPendiente + " " + line : line;
    if (lineaPendiente && procesarLinea(concatenada)) {
      lineaPendiente = "";
      continue;
    }
    if (procesarLinea(line)) {
      lineaPendiente = "";
      continue;
    }
    if (/^\d+(?:\.\d+)?\s+(?:\d+\s+)?.+$/.test(line) && !REGEX_ITEM_PDF.test(line)) {
      lineaPendiente = line;
    } else {
      lineaPendiente = "";
    }
  }

  if (typeof console !== "undefined" && console.log && (output.length > 0)) {
    const rubrosUnicos = new Set(itemsParseados.map((i) => (i.numero.includes(".") ? i.numero.split(".")[0] : i.numero)));
    console.log("PDF provincial parseado: rubros detectados:", rubrosUnicos.size, "| total ítems:", itemsParseados.length);
    console.log("PDF provincial - primeros 10 ítems:", itemsParseados.slice(0, 10).map((i) => ({ desc: (i.desc || "").slice(0, 50), unidad: i.unidad, cant: i.cantidad, precio: i.precio })));
  }
  return output.length > 0 ? output.join("\n") : "";
}

export async function extraerTextoPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let texto = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    texto += pageText + "\n";
  }
  return { texto, numPaginas: pdf.numPages };
}

export function detectarCómputoEnTexto(texto) {
  if (!texto || typeof texto !== "string") return false;
  const lines = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let rubroCount = 0;
  let itemCount = 0;
  for (const line of lines.slice(0, 100)) {
    const mRubro = line.match(/^\s*(\d{1,3})\s+([A-ZÁÉÍÓÚÑ\s\-]{4,80})/);
    if (mRubro && !mRubro[1].includes(".")) {
      rubroCount++;
      continue;
    }
    const mItem = line.match(/^\s*(\d{1,3}\.\d{1,3})[\s.)\-]*(.*)/);
    if (mItem && mItem[2].trim().length > 3) itemCount++;
    if (/^\d[\d.]*\s+.+\s+(m2|m3|ml|un|u|kg|tn)\s+[\d,.]+\s*$/i.test(line)) itemCount++;
  }
  return rubroCount >= 1 && itemCount >= 2;
}

export function normalizarTexto(str) {
  return (str || "")
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calcularSimilaridad(a, b) {
  const wordsA = new Set(normalizarTexto(a).split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(normalizarTexto(b).split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let coincidencias = 0;
  wordsA.forEach((w) => { if (wordsB.has(w)) coincidencias++; });
  return coincidencias / Math.max(wordsA.size, wordsB.size);
}

export function buscarEnAprendidos(descripcion, unidad, preciosAprendidos) {
  if (!preciosAprendidos || preciosAprendidos.length === 0) return null;
  const descNorm = normalizarTexto(descripcion);

  const exacto = preciosAprendidos.find((p) =>
    normalizarTexto(p.descripcion) === descNorm && Number(p.precioUnitario) > 0
  );
  if (exacto) return { ...exacto, metodo: "exacto" };

  let mejorMatch = null;
  let mejorScore = 0;
  preciosAprendidos.forEach((p) => {
    if (Number(p.precioUnitario) <= 0) return;
    const score = calcularSimilaridad(descripcion, p.descripcion);
    if (score > mejorScore && score >= 0.7) {
      mejorScore = score;
      mejorMatch = { ...p, metodo: "fuzzy", score: Math.round(score * 100) };
    }
  });
  return mejorMatch;
}
