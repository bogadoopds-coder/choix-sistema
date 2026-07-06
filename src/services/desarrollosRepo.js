import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
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

// ─── Boletos y cuotas (venta en pozo) ───────────────────────────────────────
// Regla de oro: montoOriginal se escribe UNA vez y nunca se pisa.
// El ajuste (CAC u otro índice) vive en indiceAjuste + montoAjustado.

/** Lee los boletos de un desarrollo. */
export async function getBoletos(orgId, devId) {
  if (!orgId || !devId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, "boletos"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Lee las cuotas de un boleto, ordenadas por numero. */
export async function getCuotas(orgId, devId, boletoId) {
  if (!orgId || !devId || !boletoId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "desarrollos", devId, "boletos", boletoId, "cuotas"));
  const cuotas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  cuotas.sort((a, b) => (a.numero || 0) - (b.numero || 0));
  return cuotas;
}

/** Suma meses a una fecha ISO (yyyy-mm-dd) preservando el día cuando se puede. */
function sumarMeses(fechaISO, meses) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(d, ultimoDia));
  return base.toISOString().slice(0, 10);
}

/**
 * Crea un boleto con su plan de cuotas y marca la unidad como vendida,
 * todo en una sola operación atómica (writeBatch).
 *
 * boleto: { unidadId, clienteId, fecha (yyyy-mm-dd), montoTotal, moneda (USD|ARS),
 *           plan (CAC|USD|fijo), anticipo }
 * opciones: { cantidadCuotas, primerVencimiento (yyyy-mm-dd) }
 *
 * Cuotas: monto financiado = montoTotal - anticipo, dividido en partes iguales;
 * la última cuota absorbe la diferencia de redondeo para que la suma cierre exacta.
 * Devuelve el id del boleto.
 */
export async function crearBoletoConCuotas(orgId, devId, boleto, opciones) {
  if (!orgId || !devId) throw new Error("crearBoletoConCuotas: faltan orgId o devId");
  if (!boleto?.unidadId || !boleto?.clienteId) throw new Error("crearBoletoConCuotas: faltan unidadId o clienteId");
  const montoTotal = Number(boleto.montoTotal);
  const anticipo = Number(boleto.anticipo || 0);
  const n = Number(opciones?.cantidadCuotas);
  if (!montoTotal || montoTotal <= 0) throw new Error("crearBoletoConCuotas: montoTotal inválido");
  if (anticipo < 0 || anticipo >= montoTotal) throw new Error("crearBoletoConCuotas: anticipo inválido");
  if (!n || n < 1 || n > 240) throw new Error("crearBoletoConCuotas: cantidadCuotas inválida");
  if (!opciones?.primerVencimiento) throw new Error("crearBoletoConCuotas: falta primerVencimiento");

  // id del boleto por prefijo
  const colBoletos = collection(db, "orgs", orgId, "desarrollos", devId, "boletos");
  const snap = await getDocs(colBoletos);
  let max = -1;
  for (const d of snap.docs) {
    const m = /^bol-(\d+)$/.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const boletoId = "bol-" + String(max + 1).padStart(4, "0");

  // plan de cuotas: iguales, la última absorbe el redondeo
  const financiado = montoTotal - anticipo;
  const montoCuota = Math.round((financiado / n) * 100) / 100;
  const cuotas = [];
  let acumulado = 0;
  for (let i = 1; i <= n; i++) {
    const monto = i === n ? Math.round((financiado - acumulado) * 100) / 100 : montoCuota;
    acumulado = Math.round((acumulado + monto) * 100) / 100;
    cuotas.push({
      id: "cta-" + String(i).padStart(4, "0"),
      numero: i,
      vencimiento: sumarMeses(opciones.primerVencimiento, i - 1),
      montoOriginal: monto,      // ← NUNCA se pisa
      indiceAjuste: null,        // ← se completa al aplicar CAC (pendiente contador)
      montoAjustado: monto,      // ← arranca igual al original
      estado: "pendiente",
    });
  }

  const batch = writeBatch(db);
  batch.set(doc(colBoletos, boletoId), {
    unidadId: boleto.unidadId,
    clienteId: boleto.clienteId,
    fecha: boleto.fecha || new Date().toISOString().slice(0, 10),
    montoTotal,
    moneda: boleto.moneda || "USD",
    plan: boleto.plan || "fijo",
    anticipo,
    cantidadCuotas: n,
    estado: "vigente",
    creadoEn: new Date().toISOString(),
  });
  for (const c of cuotas) {
    const { id, ...data } = c;
    batch.set(doc(colBoletos, boletoId, "cuotas", id), data);
  }
  // primera lógica cruzada: la unidad pasa a vendida
  batch.set(doc(db, "orgs", orgId, "desarrollos", devId, "unidades", boleto.unidadId),
    { estado: "vendida" }, { merge: true });
  await batch.commit();
  return boletoId;
}

/**
 * Anula un boleto: borra sus cuotas, borra el boleto y devuelve la unidad
 * a disponible. Atómico. Solo para boletos sin pagos registrados —
 * la anulación con cobranzas hechas es un caso contable que queda para
 * cuando el contador defina reglas.
 */
export async function anularBoleto(orgId, devId, boletoId) {
  if (!orgId || !devId || !boletoId) throw new Error("anularBoleto: faltan parámetros");
  const ref = doc(db, "orgs", orgId, "desarrollos", devId, "boletos", boletoId);
  const boletoSnap = await getDoc(ref);
  if (!boletoSnap.exists()) throw new Error("anularBoleto: el boleto no existe");
  const boleto = boletoSnap.data();
  const cuotasSnap = await getDocs(collection(ref, "cuotas"));
  const conPago = cuotasSnap.docs.some((d) => d.data().estado === "pagada");
  if (conPago) throw new Error("anularBoleto: tiene cuotas pagadas — anulación con cobranzas pendiente de reglas contables");
  const batch = writeBatch(db);
  cuotasSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  if (boleto.unidadId) {
    batch.set(doc(db, "orgs", orgId, "desarrollos", devId, "unidades", boleto.unidadId),
      { estado: "disponible" }, { merge: true });
  }
  await batch.commit();
}

// ─── Cobranzas ──────────────────────────────────────────────────────────────

/** Lee las cobranzas de la org (todas, ordenadas por fecha desc). */
export async function getCobranzas(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(collection(db, "orgs", orgId, "cobranzas"));
  const pagos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  pagos.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  return pagos;
}

/**
 * Registra un pago contra una cuota: escribe la cobranza a nivel org y marca
 * la cuota como pagada, en un solo batch.
 * pago: { devId, boletoId, cuotaId, fecha (yyyy-mm-dd), monto, medio, comprobante }
 * Devuelve el id del pago.
 */
export async function registrarPago(orgId, pago) {
  if (!orgId) throw new Error("registrarPago: falta orgId");
  if (!pago?.devId || !pago?.boletoId || !pago?.cuotaId) throw new Error("registrarPago: faltan devId, boletoId o cuotaId");
  if (!pago.monto || Number(pago.monto) <= 0) throw new Error("registrarPago: monto inválido");
  const colPagos = collection(db, "orgs", orgId, "cobranzas");
  const snap = await getDocs(colPagos);
  let max = -1;
  for (const d of snap.docs) {
    const m = /^pago-(\d+)$/.exec(d.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const pagoId = "pago-" + String(max + 1).padStart(4, "0");
  const batch = writeBatch(db);
  batch.set(doc(colPagos, pagoId), {
    devId: pago.devId,
    boletoId: pago.boletoId,
    cuotaId: pago.cuotaId,
    fecha: pago.fecha || new Date().toISOString().slice(0, 10),
    monto: Number(pago.monto),
    medio: pago.medio || "",
    comprobante: pago.comprobante || "",
    creadoEn: new Date().toISOString(),
  });
  batch.set(doc(db, "orgs", orgId, "desarrollos", pago.devId, "boletos", pago.boletoId, "cuotas", pago.cuotaId),
    { estado: "pagada" }, { merge: true });
  await batch.commit();
  return pagoId;
}

// ─── Ajuste CAC — GATEADO ───────────────────────────────────────────────────

/**
 * Recalcula montoAjustado de las cuotas pendientes según el índice CAC.
 * NO IMPLEMENTADO A PROPÓSITO: qué índice aplicar, desde qué período,
 * redondeos y tratamiento de mora son reglas contables que afectan deuda
 * real de clientes. Se codea únicamente con la validación del contador.
 */
export async function ajustarCuotasCAC() {
  throw new Error("ajustarCuotasCAC: pendiente de validación del contador — no usar en producción");
}
