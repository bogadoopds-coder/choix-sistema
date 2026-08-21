import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
/**
 * Factibilidad de terrenos.
 * - Biblioteca de codigos de planeamiento: orgs/{orgId}/codigosPlaneamiento/{codId}
 *   (el texto se extrae UNA vez del PDF/Word y queda guardado para reusar)
 * - Analisis de factibilidad: orgs/{orgId}/factibilidades/{facId}
 */
// Tope coherente con el que usa agent-factibilidad-background (y < 1MB de Firestore)
export const MAX_CODIGO_CHARS = 350000;
// ─── Biblioteca de códigos de planeamiento ──────────────────────────────────
/** Lee los códigos guardados de la org (sin el texto, para listar liviano). */
export async function getCodigos(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "codigosPlaneamiento"));
  const lista = snap.docs.map((d) => {
    const { texto, ...meta } = d.data();
    return { id: d.id, ...meta };
  });
  lista.sort((a, b) => (a.id > b.id ? 1 : -1));
  return lista;
}
/** Lee un código completo (con su texto) para usarlo en un análisis. */
export async function getCodigoConTexto(orgId, codId) {
  if (!orgId || !codId) return null;
  const snap = await getDoc(doc(db, "orgs", orgId, "codigosPlaneamiento", codId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
/**
 * Guarda un código nuevo en la biblioteca. Genera cod-XXXX.
 * codigo: { nombre, municipio, texto }
 * El texto se recorta al tope; si era más largo queda truncado: true.
 * Devuelve el id.
 */
export async function saveCodigo(orgId, codigo) {
  if (!orgId) throw new Error("saveCodigo: falta orgId");
  if (!codigo?.texto || !codigo?.nombre) throw new Error("saveCodigo: faltan nombre o texto");
  const snap = await getDocs(collection(db, "orgs", orgId, "codigosPlaneamiento"));
  let max = -1;
  for (const d of snap.docs) {
    const m = /^cod-(\d+)$/.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const id = "cod-" + String(max + 1).padStart(4, "0");
  const original = codigo.texto.length;
  const truncado = original > MAX_CODIGO_CHARS;
  await setDoc(doc(db, "orgs", orgId, "codigosPlaneamiento", id), {
    nombre: codigo.nombre.trim(),
    provincia: (codigo.provincia || "").trim(),
    municipio: (codigo.municipio || "").trim(),
    texto: truncado ? codigo.texto.slice(0, MAX_CODIGO_CHARS) : codigo.texto,
    chars: Math.min(original, MAX_CODIGO_CHARS),
    charsOriginal: original,
    truncado,
    creadoEn: new Date().toISOString(),
  });
  return id;
}
/** Elimina un código de la biblioteca. */
export async function deleteCodigo(orgId, codId) {
  if (!orgId || !codId) throw new Error("deleteCodigo: faltan orgId o codId");
  await deleteDoc(doc(db, "orgs", orgId, "codigosPlaneamiento", codId));
}
// ─── Análisis de factibilidad ───────────────────────────────────────────────
/** Lee los análisis de factibilidad de la org, más recientes primero. */
export async function getFactibilidades(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "factibilidades"));
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => (b.creadoEn || "").localeCompare(a.creadoEn || ""));
  return lista;
}
/** Guarda un análisis nuevo. Genera fac-XXXX. Devuelve el id. */
export async function saveFactibilidad(orgId, analisis) {
  if (!orgId) throw new Error("saveFactibilidad: falta orgId");
  const snap = await getDocs(collection(db, "orgs", orgId, "factibilidades"));
  let max = -1;
  for (const d of snap.docs) {
    const m = /^fac-(\d+)$/.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const id = "fac-" + String(max + 1).padStart(4, "0");
  await setDoc(doc(db, "orgs", orgId, "factibilidades", id), {
    ...analisis,
    creadoEn: new Date().toISOString(),
  });
  return id;
}
/** Elimina un análisis. */
export async function deleteFactibilidad(orgId, facId) {
  if (!orgId || !facId) throw new Error("deleteFactibilidad: faltan orgId o facId");
  await deleteDoc(doc(db, "orgs", orgId, "factibilidades", facId));
}
