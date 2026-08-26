import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
/**
 * Conversaciones del Agente IA.
 * Schema: orgs/{orgId}/conversaciones/{convId}
 *         orgs/{orgId}/conversaciones/{convId}/mensajes/{msgId}
 * El campo devId es opcional: null = conversacion general.
 */
/** Lista las conversaciones de la org, mas recientes primero. */
export async function getConversaciones(orgId, devId = undefined) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "conversaciones"));
  let lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (devId !== undefined) lista = lista.filter((c) => (c.devId || null) === (devId || null));
  lista.sort((a, b) => (b.actualizadaEn || "").localeCompare(a.actualizadaEn || ""));
  return lista;
}
/** Crea una conversacion nueva. Devuelve el id generado por Firestore. */
export async function crearConversacion(orgId, { titulo = "Nueva conversación", devId = null } = {}) {
  if (!orgId) throw new Error("crearConversacion: falta orgId");
  const ahora = new Date().toISOString();
  const ref = await addDoc(collection(db, "orgs", orgId, "conversaciones"), {
    titulo, devId, creadaEn: ahora, actualizadaEn: ahora, preview: "",
  });
  return ref.id;
}
/** Lee los mensajes de una conversacion, del mas viejo al mas nuevo. */
export async function getMensajes(orgId, convId, max = 200) {
  if (!orgId || !convId) return [];
  const ref = collection(db, "orgs", orgId, "conversaciones", convId, "mensajes");
  const snap = await getDocs(query(ref, orderBy("creadoEn", "desc"), limit(max)));
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  lista.reverse();
  return lista;
}
/** Agrega un mensaje. Solo actualiza el preview de la conversacion si tocaPreview es true. */
export async function addMensaje(orgId, convId, { role, content }, tocaPreview = false) {
  if (!orgId || !convId) throw new Error("addMensaje: faltan orgId o convId");
  const ahora = new Date().toISOString();
  const ref = collection(db, "orgs", orgId, "conversaciones", convId, "mensajes");
  await addDoc(ref, { role, content, creadoEn: ahora });
  if (tocaPreview) {
    await updateDoc(doc(db, "orgs", orgId, "conversaciones", convId), {
      actualizadaEn: ahora,
      preview: String(content || "").slice(0, 120),
    });
  }
}
/** Renombra una conversacion (tambien la usa el titulo automatico del primer mensaje). */
export async function renombrarConversacion(orgId, convId, titulo) {
  if (!orgId || !convId) throw new Error("renombrarConversacion: faltan orgId o convId");
  await updateDoc(doc(db, "orgs", orgId, "conversaciones", convId), { titulo });
}
/** Elimina una conversacion y todos sus mensajes. */
export async function deleteConversacion(orgId, convId) {
  if (!orgId || !convId) throw new Error("deleteConversacion: faltan orgId o convId");
  const ref = collection(db, "orgs", orgId, "conversaciones", convId, "mensajes");
  const snap = await getDocs(ref);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "orgs", orgId, "conversaciones", convId));
}
