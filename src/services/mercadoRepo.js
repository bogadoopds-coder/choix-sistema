import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
/**
 * Estudios de mercado (comparables de venta buscados en la web).
 * Schema: orgs/{orgId}/estudiosMercado/{estId}
 */
/** Lee los estudios de mercado de la org, más recientes primero. */
export async function getEstudios(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "estudiosMercado"));
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => (b.creadoEn || "").localeCompare(a.creadoEn || ""));
  return lista;
}
/** Guarda un estudio nuevo. Genera est-XXXX. Devuelve el id. */
export async function saveEstudio(orgId, estudio) {
  if (!orgId) throw new Error("saveEstudio: falta orgId");
  const snap = await getDocs(collection(db, "orgs", orgId, "estudiosMercado"));
  let max = -1;
  for (const d of snap.docs) {
    const m = /^est-(\d+)$/.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const id = "est-" + String(max + 1).padStart(4, "0");
  await setDoc(doc(db, "orgs", orgId, "estudiosMercado", id), {
    ...estudio,
    creadoEn: new Date().toISOString(),
  });
  return id;
}
/** Elimina un estudio. */
export async function deleteEstudio(orgId, estId) {
  if (!orgId || !estId) throw new Error("deleteEstudio: faltan orgId o estId");
  await deleteDoc(doc(db, "orgs", orgId, "estudiosMercado", estId));
}
