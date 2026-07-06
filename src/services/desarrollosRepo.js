import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Capa de datos de la mitad inmobiliaria (vruto).
 * Schema: orgs/{orgId}/desarrollos/{devId}
 *         orgs/{orgId}/desarrollos/{devId}/unidades/{unidadId}
 *         orgs/{orgId}/clientes/{clienteId}
 * Mismo patrón que obrasRepo.js: orgId obligatorio, ids con prefijo.
 */

// ─── Desarrollos ────────────────────────────────────────────────────────────

/** Lee los desarrollos de una org (solo cabeceras, sin unidades). */
export async function getDesarrollos(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Crea o actualiza un desarrollo. Si trae id, actualiza; si no, genera dev-XXXX.
 * desarrollo: { nombre, ubicacion, estado (pozo|construccion|terminado), obraId? }
 * Devuelve el id.
 */
export async function saveDesarrollo(orgId, desarrollo) {
  if (!orgId) throw new Error("saveDesarrollo: falta orgId");
  let id = desarrollo.id;
  if (!id) {
    const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos"));
    let max = -1;
    for (const d of snap.docs) {
      const m = /^dev-(\d+)$/.exec(d.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    id = "dev-" + String(max + 1).padStart(4, "0");
  }
  const { id: _omit, ...data } = desarrollo;
  await setDoc(doc(db, "orgs", orgId, "desarrollos", id), data, { merge: true });
  return id;
}

/** Borra un desarrollo y su subcolección de unidades. */
export async function deleteDesarrollo(orgId, devId) {
  if (!orgId || !devId) throw new Error("deleteDesarrollo: faltan orgId o devId");
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, "unidades"));
  while (snap.docs.length) {
    const batch = writeBatch(db);
    snap.docs.splice(0, 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, "orgs", orgId, "desarrollos", devId));
}

// ─── Unidades ───────────────────────────────────────────────────────────────

/** Lee las unidades de un desarrollo. */
export async function getUnidades(orgId, devId) {
  if (!orgId || !devId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, "unidades"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Crea o actualiza una unidad. Si trae id, actualiza; si no, genera un-XXXX.
 * unidad: { codigo, tipologia, m2, piso, orientacion,
 *           estado (disponible|reservada|vendida), precioLista, moneda (USD|ARS) }
 * Devuelve el id.
 */
export async function saveUnidad(orgId, devId, unidad) {
  if (!orgId || !devId) throw new Error("saveUnidad: faltan orgId o devId");
  const col = collection(db, "orgs", orgId, "desarrollos", devId, "unidades");
  let id = unidad.id;
  if (!id) {
    const snap = await getDocs(col);
    let max = -1;
    for (const d of snap.docs) {
      const m = /^un-(\d+)$/.exec(d.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    id = "un-" + String(max + 1).padStart(4, "0");
  }
  const { id: _omit, ...data } = unidad;
  await setDoc(doc(col, id), data, { merge: true });
  return id;
}

/** Elimina una unidad. */
export async function deleteUnidad(orgId, devId, unidadId) {
  if (!orgId || !devId || !unidadId) throw new Error("deleteUnidad: faltan parámetros");
  await deleteDoc(doc(db, "orgs", orgId, "desarrollos", devId, "unidades", unidadId));
}

// ─── Clientes (CRM mínimo: compradores, inversores, leads) ─────────────────

/** Lee los clientes de una org. */
export async function getClientes(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "clientes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Crea o actualiza un cliente. Si trae id, actualiza; si no, genera cli-XXXX.
 * cliente: { nombre, contacto, tipo (comprador|inversor|lead), origen }
 * Devuelve el id.
 */
export async function saveCliente(orgId, cliente) {
  if (!orgId) throw new Error("saveCliente: falta orgId");
  let id = cliente.id;
  if (!id) {
    const snap = await getDocs(collection(db, "orgs", orgId, "clientes"));
    let max = -1;
    for (const d of snap.docs) {
      const m = /^cli-(\d+)$/.exec(d.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    id = "cli-" + String(max + 1).padStart(4, "0");
  }
  const { id: _omit, ...data } = cliente;
  await setDoc(doc(db, "orgs", orgId, "clientes", id), data, { merge: true });
  return id;
}

/** Elimina un cliente. */
export async function deleteCliente(orgId, clienteId) {
  if (!orgId || !clienteId) throw new Error("deleteCliente: faltan orgId o clienteId");
  await deleteDoc(doc(db, "orgs", orgId, "clientes", clienteId));
}
