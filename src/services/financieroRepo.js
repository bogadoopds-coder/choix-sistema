import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Capa de datos de salud financiera por desarrollo.
 * Schema: orgs/{orgId}/desarrollos/{devId}/contratos/{contratoId}
 *         orgs/{orgId}/desarrollos/{devId}/egresos/{egresoId}
 *         orgs/{orgId}/desarrollos/{devId}/ingresos/{ingresoId}
 * Mismo patrón que desarrollosRepo.js: orgId+devId obligatorios, ids con prefijo.
 */
async function nextId(orgId, devId, sub, prefix) {
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, sub));
  let max = -1;
  const re = new RegExp("^" + prefix + "-(\\d+)$");
  for (const d of snap.docs) {
    const m = re.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + "-" + String(max + 1).padStart(4, "0");
}

// ─── Contratos (contratistas) ───────────────────────────────────────────────
export async function getContratos(orgId, devId) {
  if (!orgId || !devId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, "contratos"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveContrato(orgId, devId, contrato) {
  if (!orgId || !devId) throw new Error("saveContrato: faltan orgId o devId");
  let id = contrato.id || (await nextId(orgId, devId, "contratos", "ctr"));
  const { id: _o, ...data } = contrato;
  await setDoc(doc(db, "orgs", orgId, "desarrollos", devId, "contratos", id), data, { merge: true });
  return id;
}

export async function deleteContrato(orgId, devId, contratoId) {
  if (!orgId || !devId || !contratoId) throw new Error("deleteContrato: faltan datos");
  await deleteDoc(doc(db, "orgs", orgId, "desarrollos", devId, "contratos", contratoId));
}

// ─── Egresos ────────────────────────────────────────────────────────────────
export async function getEgresos(orgId, devId) {
  if (!orgId || !devId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, "egresos"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveEgreso(orgId, devId, egreso) {
  if (!orgId || !devId) throw new Error("saveEgreso: faltan orgId o devId");
  let id = egreso.id || (await nextId(orgId, devId, "egresos", "egr"));
  const { id: _o, ...data } = egreso;
  await setDoc(doc(db, "orgs", orgId, "desarrollos", devId, "egresos", id), data, { merge: true });
  return id;
}

export async function deleteEgreso(orgId, devId, egresoId) {
  if (!orgId || !devId || !egresoId) throw new Error("deleteEgreso: faltan datos");
  await deleteDoc(doc(db, "orgs", orgId, "desarrollos", devId, "egresos", egresoId));
}

// ─── Ingresos ───────────────────────────────────────────────────────────────
export async function getIngresos(orgId, devId) {
  if (!orgId || !devId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, "ingresos"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveIngreso(orgId, devId, ingreso) {
  if (!orgId || !devId) throw new Error("saveIngreso: faltan orgId o devId");
  let id = ingreso.id || (await nextId(orgId, devId, "ingresos", "ing"));
  const { id: _o, ...data } = ingreso;
  await setDoc(doc(db, "orgs", orgId, "desarrollos", devId, "ingresos", id), data, { merge: true });
  return id;
}

export async function deleteIngreso(orgId, devId, ingresoId) {
  if (!orgId || !devId || !ingresoId) throw new Error("deleteIngreso: faltan datos");
  await deleteDoc(doc(db, "orgs", orgId, "desarrollos", devId, "ingresos", ingresoId));
}
