import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export const CHANDIAS_COMPRIMIDO = `RENDIMIENTOS CHANDÍAS (por unidad):
H°A° losa: cem300kg+arena0.65m3+piedra0.65m3+hierro90kg/m3|of19h+ay18h
H°A° viga: hierro120kg/m3|of22h+ay20h
H°A° col: hierro130kg/m3|of24h+ay22h
H°A° platea: hierro80kg/m3|of16h+ay15h
Mamp hueco18: 16.5lad+74kg mort/m2|of1.12h+ay0.75h
Mamp hueco12: 12lad+52kg mort/m2|of0.90h+ay0.60h
Mamp comun15: 62lad+95kg mort/m3|of2.20h+ay1.50h
Rev ext: 23L/m2|of0.95h+ay0.65h
Rev int: 20L/m2|of0.80h+ay0.55h
Contrap TN15: cem+arena+piedra|of0.45h+ay0.40h
Contrap losa8: cem+arena+piedra|of0.35h+ay0.30h
Cielorraso yeso: placa+perfil|of0.85h+ay0.55h
Membrana4mm: 1.15m2/m2|of0.25h+ay0.15h
Pintura latex: 0.22L/m2|of0.12h+ay0.08h
Piso ceramico: 1.05m2+8kg peg/m2|of0.65h+ay0.35h
Piso granitico: 1.05m2+12kg/m2|of0.90h+ay0.45h
MANO OBRA mar2026: of$4500/h ay$3200/h elec$5000/h plom$4800/h`;

export async function guardarPreciosAprendidos(items) {
  try {
    const docRef = doc(db, "configuracion", "preciosAprendidos");
    const snap = await getDoc(docRef);
    const existentes = snap.exists() ? snap.data().items || [] : [];

    const mapa = {};
    existentes.forEach((it) => {
      const key = it.descripcion.toUpperCase().trim();
      mapa[key] = it;
    });

    items.forEach((it) => {
      if (it.descripcion && it.precioUnitario > 0) {
        const key = it.descripcion.toUpperCase().trim();
        mapa[key] = {
          descripcion: it.descripcion.trim(),
          unidad: it.unidad || "",
          precioUnitario: it.precioUnitario,
          fecha: new Date().toISOString().slice(0, 10),
          origen: "pliego",
        };
      }
    });

    await setDoc(docRef, { items: Object.values(mapa) });
    console.log("Precios aprendidos guardados:", Object.keys(mapa).length);
  } catch (e) {
    console.error("Error guardando precios aprendidos:", e);
  }
}

const STOPWORDS = new Set(["de", "del", "para", "segun", "incluye", "tipo", "obra"]);

const PALABRAS_GENERICAS = new Set([
  "color", "negro", "blanco", "gris", "rojo", "azul", "verde", "amarillo", "mm", "cm", "mts", "x", "con", "sin", "mas", "menos",
  "200", "100", "150", "250", "300", "400", "500", "esp", "espesor", "alto", "ancho", "largo", "zona", "modelo", "marca", "tipo", "nro", "numero",
  "lts", "film", "rollo", "bolsa", "bolson", "balde",
]);

const PALABRAS_CLAVE_CONSTRUCCION = new Set([
  "hormigon", "cemento", "arena", "cal", "hierro", "acero", "malla", "ladrillo", "ceramico", "membrana", "pintura", "latex", "esmalte",
  "revoque", "contrapiso", "carpeta", "caño", "cañeria", "tubo", "cable", "llave", "valvula", "tanque", "puerta", "ventana", "vidrio",
  "placa", "yeso", "clavo", "tornillo", "adhesivo", "impermeabilizante", "aislante", "chapa", "madera", "fenolico", "piedra", "grava",
  "mosaico", "baldosa", "laja", "granito", "marmol", "espejo", "cristal", "extintor", "matafuegos",
]);

function normalizeForMatch(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[Ø°º.,()\/\[\]\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeForMatch(s) {
  const n = normalizeForMatch(s);
  if (!n) return [];
  return n.split(/\s+/).filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

function wordOverlapCount(wordsA, wordsB) {
  const setB = new Set(wordsB.filter((w) => !PALABRAS_GENERICAS.has(w)));
  return wordsA.filter((w) => setB.has(w) && !PALABRAS_GENERICAS.has(w)).length;
}

function wordsIntersection(wordsA, wordsB) {
  const setB = new Set(wordsB.filter((w) => !PALABRAS_GENERICAS.has(w)));
  return wordsA.filter((w) => setB.has(w) && !PALABRAS_GENERICAS.has(w));
}

export function findBestBaseMatch(desc, um, BASE) {
  const emptyMatchInfo = (palabrasBuscadas, mejorCandidato = "", overlapMejor = 0, minRequerido = 0) => ({
    matched: false,
    palabrasBuscadas,
    mejorCandidato,
    overlapMejor,
    minRequerido,
  });
  if (!BASE || !Array.isArray(BASE) || BASE.length === 0) {
    const tokensDesc = tokenizeForMatch(desc);
    return { codigo: null, precio: null, matchInfo: emptyMatchInfo(tokensDesc) };
  }
  const tokensDesc = tokenizeForMatch(desc);
  if (tokensDesc.length === 0) return { codigo: null, precio: null, matchInfo: emptyMatchInfo([]) };
  const nUm = normalizeForMatch(um) || "un";
  const minOverlap = Math.min(2, tokensDesc.length);

  const scored = [];
  for (const b of BASE) {
    const tokensBase = tokenizeForMatch(b.desc);
    const overlap = wordOverlapCount(tokensDesc, tokensBase);
    scored.push({
      base: b,
      overlap,
      sameUnit: normalizeForMatch(b.um) === nUm,
      tokensBase,
    });
  }
  scored.sort((a, b) => {
    if (a.sameUnit !== b.sameUnit) return b.sameUnit ? 1 : -1;
    return b.overlap - a.overlap;
  });
  const best = scored[0];
  if (!best) return { codigo: null, precio: null, matchInfo: emptyMatchInfo(tokensDesc) };
  const palabrasMatch = wordsIntersection(tokensDesc, best.tokensBase);
  const tieneClave = (palabrasMatch || []).some((w) => PALABRAS_CLAVE_CONSTRUCCION.has(w));
  if (best.overlap >= minOverlap && tieneClave) {
    return {
      codigo: best.base.codigo,
      precio: best.base.precio,
      matchInfo: {
        matched: true,
        baseCodigo: best.base.codigo,
        baseDesc: best.base.desc,
        overlap: best.overlap,
        palabrasMatch,
      },
    };
  }
  return {
    codigo: null,
    precio: null,
    matchInfo: emptyMatchInfo(tokensDesc, best.base.desc, best.overlap, minOverlap),
  };
}
