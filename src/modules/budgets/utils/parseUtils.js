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
  let currentRubroId = null;
  let lineaPendiente = "";

  function procesarLinea(line) {
    if (!line) return false;

    const UNIDAD_REGEX = /(m2|m3|ml|u|un|nº|n°|gl|dia|mes|kg|tn)/i;

    // 1) Encabezado de RUBRO: entero + texto en mayúsculas + precio de rubro ($)
    const rubroStart = line.match(/^(\d{1,2})\s+/);
    if (rubroStart && (/\$/.test(line) || /%/.test(line)) && !UNIDAD_REGEX.test(line)) {
      const rubroNum = rubroStart[1];
      const after = line.slice(rubroStart[0].length).trim();
      const primerToken = after.split(/\s+/)[0] || "";
      const looksLikeItemRow = /^\d+$/.test(primerToken); // si viene otro número, suele ser RUBRO + ITEM
      const hasUpperText = /[A-ZÁÉÍÓÚÑ]/.test(after);

      if (!looksLikeItemRow && hasUpperText) {
        currentRubroId = rubroNum;
        if (rubroNum !== ultimoRubroNum) {
          ultimoRubroNum = rubroNum;
          const nombreRubro = NOMBRES_RUBRO_PROVINCIAL[rubroNum] || "Rubro " + rubroNum;
          output.push("RUBRO: " + nombreRubro);
        }
        return true;
      }
    }

    // 2) Ítem: RUBRO + ITEM + DESIGNACION + UNIDAD + CANTIDAD + PRECIO UNITARIO
    //    Construir SIEMPRE `${currentRubroId}.${itemNum}`
    const itemStart = line.match(/^(\d{1,2})\s+(\d+)\s+/);
    if (itemStart) {
      const rubroCol = itemStart[1];
      const itemNum = itemStart[2];
      const unidadMatch = UNIDAD_REGEX.exec(line);
      if (unidadMatch && unidadMatch.index != null) {
        const unidad = unidadMatch[0];
        const desc = line.slice(itemStart[0].length, unidadMatch.index).trim();
        if (desc.length > 2) {
          if (!currentRubroId) currentRubroId = rubroCol;

          const afterUnit = line.slice(unidadMatch.index + unidad.length).trim();
          const nums = afterUnit.match(/[\d.,]+/g) || [];
          if (nums.length >= 2) {
            const cantidad = parseNumeroArgentino(nums[0]);
            const precioUnitario = parseNumeroArgentino(nums[1]);
            if (cantidad > 0 && precioUnitario >= 0) {
              const descClean = desc.replace(/,/g, " ").replace(/\s+/g, " ").trim();
              const codigo = `${currentRubroId}.${itemNum}`;
              output.push(`${codigo},${descClean},${unidad},${cantidad},${precioUnitario}`);
              itemsParseados.push({ numero: codigo, desc: descClean, unidad, cantidad, precio: precioUnitario });
              return true;
            }
          }
        }
      }
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
    if (/^\d{1,2}\s+\d+\s+/.test(line) && !/(m2|m3|ml|u|un|nº|n°|gl|dia|mes|kg|tn)/i.test(line)) {
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

export const RUBROS_MAP = {
  "1": "TRABAJOS PREPARATORIOS",
  "2": "MOVIMIENTO DE SUELO",
  "3": "ESTRUCTURA RESISTENTE",
  "4": "ALBAÑILERÍA",
  "5": "REVESTIMIENTOS",
  "6": "PISOS Y ZÓCALOS",
  "7": "MARMOLERÍA",
  "8": "CUBIERTAS Y TECHADOS",
  "9": "CIELORRASOS",
  "10": "CARPINTERÍAS Y MOBILIARIO",
  "11": "INSTALACIÓN ELÉCTRICA",
  "12": "INSTALACIÓN SANITARIA",
  "14": "INSTALACIÓN ELECTROMECÁNICA",
  "15": "INSTALACIÓN ACONDICIONAMIENTO TÉRMICO",
  "16": "INSTALACIÓN DE SEGURIDAD",
  "17": "CRISTALES, ESPEJOS Y VIDRIOS",
  "18": "PINTURAS",
  "19": "SEÑALÉTICA",
  "20": "OBRAS EXTERIORES",
  "21": "LIMPIEZA DE OBRA",
  "22": "VARIOS",
  "23": "HONORARIOS REPRESENTANTE TÉCNICO",
};

export function getRubroFromCodigo(codigo) {
  if (!codigo) return null;
  const str = String(codigo).trim();
  if (str.includes(".")) return str.split(".")[0];
  if (RUBROS_MAP[str]) return str;
  return str;
}

export function detectRowType(row) {
  const codigo = String(row.codigo || "").trim();
  const nombre = String(row.nombre || "").trim();
  const tienePrecios = row.precioUnitario != null && row.precioUnitario !== "";
  const tieneCantidad = row.cantidad != null && row.cantidad !== "";
  if (RUBROS_MAP[codigo] && !tienePrecios) return "rubro";
  if (/^\d+\.\d+$/.test(codigo) && !tienePrecios) return "subrubro";
  if (tienePrecios || tieneCantidad) return "item";
  if (nombre === nombre.toUpperCase() && nombre.length > 3 && !tienePrecios) return "subrubro";
  return "item";
}

export function enrichItemsWithHierarchy(items) {
  let currentRubroId = null;

  return items.map((item) => {
    const codigo = String(item.codigo || item.id || "").trim();

    // Si el código tiene punto → el rubro es el primer segmento
    // Ej: "3.1.2" → rubro 3 | "2.4.2" → rubro 2
    if (codigo.includes(".")) {
      const rubroCandidate = codigo.split(".")[0];
      if (RUBROS_MAP[rubroCandidate]) {
        currentRubroId = rubroCandidate;
      }
    }
    // Si el código es entero y está en RUBROS_MAP Y no tiene cantidad/precio → es rubro encabezado
    // (este caso no debería aparecer en los datos del Excel, pero por las dudas)
    else if (RUBROS_MAP[codigo] && !item.cantidad && !item.precioBase) {
      currentRubroId = codigo;
    }
    // Si es número entero con precio/cantidad → ítem suelto, hereda rubro actual

    const rubroId = currentRubroId || "SIN_RUBRO";

    return {
      ...item,
      type: "item",
      rubroId,
      rubroNombre: RUBROS_MAP[rubroId] || "SIN RUBRO",
      subtotal: item.subtotal ?? (Number(item.cantidad || 0) * Number(item.precioBase || 0)),
    };
  });
}

export function groupByRubro(items) {
  const enriched = enrichItemsWithHierarchy(items);
  const grupos = {};
  enriched.forEach((item) => {
    const rId = item.rubroId || "SIN_RUBRO";
    if (!grupos[rId]) {
      grupos[rId] = {
        rubroId: rId,
        rubroNombre: RUBROS_MAP[rId] || item.rubroNombre || "SIN RUBRO",
        precioRubro: 0,
        items: [],
      };
    }
    grupos[rId].items.push(item);
    if (item.type === "item") grupos[rId].precioRubro += Number(item.subtotal || 0);
  });
  return Object.values(grupos).sort((a, b) => Number(a.rubroId) - Number(b.rubroId));
}

export function flattenWithHeaders(items) {
  const grupos = groupByRubro(items);
  const result = [];
  grupos.forEach((grupo) => {
    result.push({
      type: "rubro",
      rubroId: grupo.rubroId,
      nombre: `${grupo.rubroId}. ${grupo.rubroNombre}`,
      precioRubro: grupo.precioRubro,
      _isHeader: true,
    });
    const subRubrosVistos = {};
    grupo.items.forEach((item) => {
      const codigo = String(item.codigo || item.id || "");
      const partes = codigo.split(".");
      const subKey = partes.length >= 2 ? `${partes[0]}.${partes[1]}` : null;
      if (subKey && !subRubrosVistos[subKey]) {
        subRubrosVistos[subKey] = true;
        result.push({ type: "subrubro", rubroId: grupo.rubroId, subrubroId: subKey, nombre: subKey, _isHeader: true });
      }
      result.push(item);
    });
  });
  return result;
}

export function parsePrecio(str) {
  if (!str) return 0;
  const clean = String(str).replace(/\$/g, "").replace(/\./g, "").replace(/,/g, ".").trim();
  return parseFloat(clean) || 0;
}

export function formatPrecioARS(valor) {
  if (valor == null || isNaN(valor)) return "$ 0,00";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(valor);
}
