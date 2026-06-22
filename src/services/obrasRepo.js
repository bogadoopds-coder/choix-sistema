import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Lee las obras del schema normalizado (orgs/{orgId}/obras/...) y las
 * devuelve con items[] y certificaciones[] embebidos, con la MISMA forma
 * que tenia el blob viejo (choix_proyectos). Asi los modulos no cambian
 * su logica: solo cambia de donde sale el dato.
 */
export async function getObras(orgId) {
  if (!orgId) return [];
  const obrasSnap = await getDocs(collection(db, "orgs", orgId, "obras"));
  return Promise.all(
    obrasSnap.docs.map(async (obraDoc) => {
      const [itemsSnap, certsSnap, reqsSnap] = await Promise.all([
        getDocs(collection(db, "orgs", orgId, "obras", obraDoc.id, "items")),
        getDocs(collection(db, "orgs", orgId, "obras", obraDoc.id, "certificaciones")),
        getDocs(collection(db, "orgs", orgId, "obras", obraDoc.id, "requerimientos")),
      ]);
      return {
        id: obraDoc.id,
        ...obraDoc.data(),
        items: itemsSnap.docs.map((d) => ({ _id: d.id, ...d.data() })),
        certificaciones: certsSnap.docs.map((d) => d.data()),
        reqs: reqsSnap.docs.map((d) => d.data()),
      };
    })
  );
}

/** Crea o actualiza la cabecera de una obra (sin tocar items ni certificaciones). */
export async function saveObra(orgId, obra) {
  if (!orgId || !obra?.id) throw new Error("saveObra: faltan orgId u obra.id");
  const { items, certificaciones, ...cabecera } = obra;
  await setDoc(doc(db, "orgs", orgId, "obras", obra.id), cabecera, { merge: true });
}

/** Borra una obra y sus subcolecciones items y certificaciones. */
export async function deleteObra(orgId, obraId) {
  if (!orgId || !obraId) throw new Error("deleteObra: faltan orgId u obraId");
  for (const sub of ["items", "certificaciones"]) {
    const snap = await getDocs(collection(db, "orgs", orgId, "obras", obraId, sub));
    while (snap.docs.length) {
      const batch = writeBatch(db);
      snap.docs.splice(0, 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, "orgs", orgId, "obras", obraId));
}

/**
 * Guarda los items de una obra escribiendo SOLO las diferencias.
 * - item con _id existente  -> update en su documento
 * - item sin _id            -> nuevo documento con id generado
 * - documento que ya no esta -> se borra
 */
export async function saveItems(orgId, obraId, items) {
  if (!orgId || !obraId) throw new Error("saveItems: faltan orgId u obraId");
  const col = collection(db, "orgs", orgId, "obras", obraId, "items");

  // IDs que existen hoy en Firestore
  const snap = await getDocs(col);
  const idsEnDB = new Set(snap.docs.map((d) => d.id));
  const idsEnPantalla = new Set();

  // calcular el proximo indice para ids nuevos (it-XXXX)
  let maxIdx = -1;
  for (const id of idsEnDB) {
    const m = /^it-(\d+)$/.exec(id);
    if (m) maxIdx = Math.max(maxIdx, parseInt(m[1], 10));
  }

  const batch = writeBatch(db);
  for (const item of items || []) {
    let id = item._id;
    if (!id) {
      maxIdx += 1;
      id = "it-" + String(maxIdx).padStart(4, "0");
    }
    idsEnPantalla.add(id);
    const { _id, ...data } = item;
    batch.set(doc(col, id), data);
  }

  // borrar los que estaban en DB pero ya no en pantalla
  for (const id of idsEnDB) {
    if (!idsEnPantalla.has(id)) batch.delete(doc(col, id));
  }

  await batch.commit();
}

/**
 * Guarda las certificaciones de una obra escribiendo SOLO las diferencias.
 * Las certificaciones ya traen su propio id (CERT-XXXXXX), que se usa como id
 * de documento. Cada cert lleva sus items[] embebidos (igual que el schema).
 */
export async function saveCertificaciones(orgId, obraId, certificaciones) {
  if (!orgId || !obraId) throw new Error("saveCertificaciones: faltan orgId u obraId");
  const col = collection(db, "orgs", orgId, "obras", obraId, "certificaciones");

  const snap = await getDocs(col);
  const idsEnDB = new Set(snap.docs.map((d) => d.id));
  const idsEnPantalla = new Set();

  const batch = writeBatch(db);
  for (const cert of certificaciones || []) {
    const id = cert.id;
    if (!id) continue;
    idsEnPantalla.add(id);
    batch.set(doc(col, id), cert);
  }
  for (const id of idsEnDB) {
    if (!idsEnPantalla.has(id)) batch.delete(doc(col, id));
  }
  await batch.commit();
}

/**
 * Guarda los requerimientos (reqs) de una obra en su subcoleccion,
 * escribiendo SOLO las diferencias. Cada req trae su id; si no, se genera.
 */
export async function saveRequerimientos(orgId, obraId, reqs) {
  if (!orgId || !obraId) throw new Error("saveRequerimientos: faltan orgId u obraId");
  const col = collection(db, "orgs", orgId, "obras", obraId, "requerimientos");

  const snap = await getDocs(col);
  const idsEnDB = new Set(snap.docs.map((d) => d.id));
  const idsEnPantalla = new Set();

  let maxIdx = -1;
  for (const id of idsEnDB) {
    const m = /^req-(\d+)$/.exec(id);
    if (m) maxIdx = Math.max(maxIdx, parseInt(m[1], 10));
  }

  const batch = writeBatch(db);
  for (const req of reqs || []) {
    let id = req.id;
    if (!id) {
      maxIdx += 1;
      id = "req-" + String(maxIdx).padStart(4, "0");
    }
    idsEnPantalla.add(id);
    batch.set(doc(col, id), { ...req, id });
  }
  for (const id of idsEnDB) {
    if (!idsEnPantalla.has(id)) batch.delete(doc(col, id));
  }
  await batch.commit();
}
