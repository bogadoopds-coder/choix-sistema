import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Capa de datos del módulo Oficina (gastos de estructura del estudio).
 * Vive a nivel organización — NO por desarrollo.
 *
 * Schema:
 *   orgs/{orgId}/oficinaEntidades/{entId}
 *     └─ nombre, notas, creadoEn
 *   orgs/{orgId}/oficinaEmpleados/{empId}
 *     └─ nombre, rolDesc, sueldo, moneda, tc,
 *        repartos: [{ entId, pct }]   ← reparto del sueldo por entidad (suma 100)
 *        activo, notas, creadoEn
 *   orgs/{orgId}/oficinaGastos/{gasId}
 *     └─ entidadId        ← entidad que PAGA
 *        categoria, concepto, monto, moneda, tc (dólar del día si ARS),
 *        fecha, periodo (yyyy-mm), conFactura (bool),
 *        esHonorario (bool), entidadCobraId (si es honorario interno),
 *        empId (si es sueldo generado desde la plantilla), creadoEn
 *
 * Mismo patrón que desarrollosRepo.js: orgId obligatorio, ids con prefijo.
 * Reglas de Firestore: orgs/{orgId}/** → solo miembros de la org. Ya cubierto.
 */

async function nextId(orgId, sub, prefix) {
  const snap = await getDocs(collection(db, "orgs", orgId, sub));
  let max = -1;
  const re = new RegExp("^" + prefix + "-(\\d+)$");
  for (const d of snap.docs) {
    const m = re.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + "-" + String(max + 1).padStart(4, "0");
}

// ─── Entidades (las empresas del grupo: Pensamiento Visual, Punto 2, …) ──────

export async function getEntidades(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "oficinaEntidades"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveEntidad(orgId, entidad) {
  if (!orgId) throw new Error("saveEntidad: falta orgId");
  const id = entidad.id || (await nextId(orgId, "oficinaEntidades", "ent"));
  const { id: _o, ...data } = entidad;
  await setDoc(doc(db, "orgs", orgId, "oficinaEntidades", id), data, { merge: true });
  return id;
}

export async function deleteEntidad(orgId, entId) {
  if (!orgId || !entId) throw new Error("deleteEntidad: faltan datos");
  await deleteDoc(doc(db, "orgs", orgId, "oficinaEntidades", entId));
}

// ─── Empleados (plantilla con sueldo fijo repartido por entidad) ─────────────

export async function getEmpleados(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "oficinaEmpleados"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveEmpleado(orgId, empleado) {
  if (!orgId) throw new Error("saveEmpleado: falta orgId");
  const id = empleado.id || (await nextId(orgId, "oficinaEmpleados", "emp"));
  const { id: _o, ...data } = empleado;
  await setDoc(doc(db, "orgs", orgId, "oficinaEmpleados", id), data, { merge: true });
  return id;
}

export async function deleteEmpleado(orgId, empId) {
  if (!orgId || !empId) throw new Error("deleteEmpleado: faltan datos");
  await deleteDoc(doc(db, "orgs", orgId, "oficinaEmpleados", empId));
}

// ─── Gastos ──────────────────────────────────────────────────────────────────

export async function getGastos(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "oficinaGastos"));
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  return lista;
}

export async function saveGasto(orgId, gasto) {
  if (!orgId) throw new Error("saveGasto: falta orgId");
  const id = gasto.id || (await nextId(orgId, "oficinaGastos", "gas"));
  const { id: _o, ...data } = gasto;
  await setDoc(doc(db, "orgs", orgId, "oficinaGastos", id), data, { merge: true });
  return id;
}

export async function deleteGasto(orgId, gasId) {
  if (!orgId || !gasId) throw new Error("deleteGasto: faltan datos");
  await deleteDoc(doc(db, "orgs", orgId, "oficinaGastos", gasId));
}

/**
 * Genera los gastos de sueldo de un período (yyyy-mm) a partir de la plantilla
 * de empleados. Por cada empleado activo crea un gasto por entidad según su
 * reparto (monto × pct/100), categoría "Sueldos", concepto = nombre.
 *
 * Idempotente a nivel empleado+período: si ya existe un gasto de sueldo de ese
 * empleado en ese período, lo SALTEA (no duplica). Devuelve un resumen:
 *   { creados, saltados: [nombres], total }
 *
 * No decide montos contables: solo replica el sueldo cargado por el usuario.
 */
export async function generarSueldosDelPeriodo(orgId, periodo, fecha) {
  if (!orgId) throw new Error("generarSueldosDelPeriodo: falta orgId");
  if (!/^\d{4}-\d{2}$/.test(periodo || "")) throw new Error("Período inválido (usá yyyy-mm).");

  const [empleados, gastos] = await Promise.all([getEmpleados(orgId), getGastos(orgId)]);
  const yaGenerados = new Set(
    gastos
      .filter((g) => g.categoria === "Sueldos" && g.periodo === periodo && g.empId)
      .map((g) => g.empId)
  );

  const activos = empleados.filter((e) => e.activo !== false);
  let max = -1;
  const re = /^gas-(\d+)$/;
  for (const g of gastos) {
    const m = re.exec(g.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }

  const batch = writeBatch(db);
  const col = collection(db, "orgs", orgId, "oficinaGastos");
  const saltados = [];
  let creados = 0;
  let total = 0;
  const fechaGasto = fecha || periodo + "-01";

  for (const emp of activos) {
    if (yaGenerados.has(emp.id)) {
      saltados.push(emp.nombre);
      continue;
    }
    const sueldo = Number(emp.sueldo) || 0;
    if (sueldo <= 0) continue;
    const repartos = (emp.repartos || []).filter((r) => r.entId && Number(r.pct) > 0);
    if (repartos.length === 0) continue;

    for (const r of repartos) {
      const monto = Math.round(sueldo * (Number(r.pct) / 100) * 100) / 100;
      if (monto <= 0) continue;
      max += 1;
      const id = "gas-" + String(max).padStart(4, "0");
      batch.set(doc(col, id), {
        entidadId: r.entId,
        categoria: "Sueldos",
        concepto: emp.nombre + (repartos.length > 1 ? ` (${r.pct}%)` : ""),
        monto,
        moneda: emp.moneda || "ARS",
        tc: (emp.moneda || "ARS") === "ARS" ? (Number(emp.tc) || 0) : 0,
        fecha: fechaGasto,
        periodo,
        conFactura: false,
        esHonorario: false,
        entidadCobraId: "",
        empId: emp.id,
        creadoEn: new Date().toISOString(),
      });
      creados += 1;
      total += monto;
    }
  }

  if (creados > 0) await batch.commit();
  return { creados, saltados, total };
}
