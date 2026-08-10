import { useState, useEffect } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { getDesarrollos, getClientes } from "../../services/desarrollosRepo";
import { getContratos, saveContrato, deleteContrato, getEgresos, saveEgreso, deleteEgreso, getIngresos, saveIngreso, deleteIngreso } from "../../services/financieroRepo";

const RUBROS = ["Movimiento de suelo", "Estructura", "Albañilería", "Instalación eléctrica",
  "Instalación sanitaria", "Instalación termomecánica", "Carpinterías", "Pintura",
  "Yeso/Durlock", "Cubiertas", "Ascensores", "Vidrios", "Otro"];

const FORM_CTR_VACIO = { nombre: "", rubro: "", montoTotal: "", moneda: "ARS", avancePct: "0", estado: "activo", notas: "" };

export default function FinancieroModule() {
  const { orgId } = useAuth();
  const [desarrollos, setDesarrollos] = useState([]);
  const [devId, setDevId] = useState("");
  const [tab, setTab] = useState("contratos");
  const [contratos, setContratos] = useState([]);
  const [form, setForm] = useState(FORM_CTR_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    getDesarrollos(orgId).then((lista) => {
      setDesarrollos(lista);
      if (lista.length && !devId) setDevId(lista[0].id);
      setReady(true);
    }).catch(() => setReady(true));
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !devId) { setContratos([]); return; }
    getContratos(orgId, devId).then(setContratos).catch(() => setContratos([]));
  }, [orgId, devId]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function guardar() {
    setError("");
    if (!form.nombre.trim()) { setError("El contratista necesita un nombre."); return; }
    if (!(Number(form.montoTotal) > 0)) { setError("El monto del contrato debe ser mayor a cero."); return; }
    setGuardando(true);
    try {
      await saveContrato(orgId, devId, {
        ...(editandoId ? { id: editandoId } : {}),
        nombre: form.nombre.trim(),
        rubro: form.rubro || "Otro",
        montoTotal: Number(form.montoTotal),
        moneda: form.moneda,
        avancePct: Number(form.avancePct) || 0,
        estado: form.estado,
        notas: form.notas.trim(),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_CTR_VACIO); setEditandoId(null);
      setContratos(await getContratos(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }

  function editar(c) {
    setEditandoId(c.id);
    setForm({ nombre: c.nombre, rubro: c.rubro, montoTotal: String(c.montoTotal),
      moneda: c.moneda, avancePct: String(c.avancePct), estado: c.estado, notas: c.notas || "" });
  }

  async function borrar(c) {
    if (!window.confirm(`¿Borrar el contrato de ${c.nombre}?`)) return;
    try { await deleteContrato(orgId, devId, c.id); setContratos(await getContratos(orgId, devId)); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }

  const fmt = (n, m) => (m === "USD" ? "USD " : "$ ") + Number(n || 0).toLocaleString("es-AR");

  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;

  const TABS = [
    { id: "contratos", label: "📑 Contratos" },
    { id: "egresos", label: "📤 Egresos" },
    { id: "ingresos", label: "📥 Ingresos" },
    { id: "arqueo", label: "⚖️ Arqueo" },
  ];

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>💰 SALUD FINANCIERA</span>
        <select style={{ ...S.input, width: "auto", minWidth: "200px" }} value={devId} onChange={(e) => setDevId(e.target.value)}>
          {desarrollos.length === 0 && <option value="">— No hay desarrollos —</option>}
          {desarrollos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </div>

      {desarrollos.length === 0 && (
        <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>
          Primero creá un desarrollo en el módulo 🏢 Desarrollos. La salud financiera se lleva por desarrollo.
        </div>
      )}

      {devId && (
        <>
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ ...S.btn(tab === t.id ? "gold" : "blue", tab !== t.id), cursor: "pointer", fontSize: "12px", padding: "6px 12px" }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "contratos" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
              <div style={S.panel}>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
                  {editandoId ? "Editar contrato" : "Nuevo contrato"}
                </div>
                {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}
                <label style={S.label}>Contratista</label>
                <input style={S.input} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Hormigones del Sur SRL" />
                <label style={S.label}>Rubro</label>
                <select style={S.input} value={form.rubro} onChange={(e) => set("rubro", e.target.value)}>
                  <option value="">— Elegir —</option>
                  {RUBROS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 2 }}>
                    <label style={S.label}>Monto del contrato</label>
                    <input style={S.input} type="number" value={form.montoTotal} onChange={(e) => set("montoTotal", e.target.value)} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Moneda</label>
                    <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <label style={S.label}>Avance de obra (%)</label>
                <input style={S.input} type="number" min="0" max="100" value={form.avancePct} onChange={(e) => set("avancePct", e.target.value)} />
                <label style={S.label}>Estado</label>
                <select style={S.input} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
                  <option value="activo">Activo</option>
                  <option value="terminado">Terminado</option>
                  <option value="rescindido">Rescindido</option>
                </select>
                <label style={S.label}>Notas</label>
                <input style={S.input} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Condiciones, forma de pago, etc." />
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
                    {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar contrato"}
                  </button>
                  {editandoId && <button style={{ ...S.btn("blue", true), cursor: "pointer" }} onClick={() => { setEditandoId(null); setForm(FORM_CTR_VACIO); setError(""); }}>Cancelar</button>}
                </div>
              </div>

              <div style={S.panel}>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
                  Contratistas ({contratos.length})
                </div>
                {contratos.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no cargaste contratos para este desarrollo.</div>}
                {contratos.map((c) => (
                  <div key={c.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>{c.nombre}</div>
                      <div style={{ fontSize: "11px", color: COLORS.muted }}>
                        {c.rubro} · {fmt(c.montoTotal, c.moneda)} · avance {c.avancePct}% · {c.estado}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => editar(c)}>Editar</button>
                      <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(c)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "egresos" && <TabEgresos orgId={orgId} devId={devId} contratos={contratos} fmt={fmt} />}
          {tab === "ingresos" && <TabIngresos orgId={orgId} devId={devId} fmt={fmt} />}
          {tab === "arqueo" && <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>⚖️ Arqueo — próxima pieza. Va a consolidar ingresos y egresos y mostrar la posición financiera del desarrollo.</div>}
        </>
      )}
    </div>
  );
}

const CATEGORIAS_EGRESO = [
  { id: "contratista", label: "Contratista" },
  { id: "material", label: "Material" },
  { id: "terreno", label: "Terreno" },
  { id: "impuesto", label: "Impuesto" },
  { id: "honorarios", label: "Honorarios" },
  { id: "servicios", label: "Servicios" },
  { id: "comision", label: "Comisión" },
  { id: "financiero", label: "Financiero" },
  { id: "imprevisto", label: "Imprevisto" },
  { id: "otro", label: "Otro" },
];

const ESTADOS_FISCAL = [
  { id: "con_factura", label: "Con factura" },
  { id: "sin_factura", label: "Sin factura" },
  { id: "pendiente", label: "Pendiente" },
];

const FORM_EGR_VACIO = { categoria: "contratista", contratoId: "", concepto: "", monto: "", moneda: "ARS", estadoFiscal: "con_factura", fecha: new Date().toISOString().slice(0, 10), medioPago: "transferencia", notas: "" };

function TabEgresos({ orgId, devId, contratos, fmt }) {
  const [egresos, setEgresos] = useState([]);
  const [form, setForm] = useState(FORM_EGR_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId || !devId) { setEgresos([]); return; }
    getEgresos(orgId, devId).then(setEgresos).catch(() => setEgresos([]));
  }, [orgId, devId]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function guardar() {
    setError("");
    if (!form.concepto.trim()) { setError("El egreso necesita un concepto."); return; }
    if (!(Number(form.monto) > 0)) { setError("El monto debe ser mayor a cero."); return; }
    if (form.categoria === "contratista" && !form.contratoId) { setError("Elegí a qué contrato corresponde el pago."); return; }
    setGuardando(true);
    try {
      await saveEgreso(orgId, devId, {
        ...(editandoId ? { id: editandoId } : {}),
        categoria: form.categoria,
        contratoId: form.categoria === "contratista" ? form.contratoId : "",
        concepto: form.concepto.trim(),
        monto: Number(form.monto),
        moneda: form.moneda,
        estadoFiscal: form.estadoFiscal,
        fecha: form.fecha,
        medioPago: form.medioPago,
        notas: form.notas.trim(),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_EGR_VACIO); setEditandoId(null);
      setEgresos(await getEgresos(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }

  function editar(e) {
    setEditandoId(e.id);
    setForm({ categoria: e.categoria, contratoId: e.contratoId || "", concepto: e.concepto,
      monto: String(e.monto), moneda: e.moneda, estadoFiscal: e.estadoFiscal,
      fecha: e.fecha, medioPago: e.medioPago, notas: e.notas || "" });
  }

  async function borrar(e) {
    if (!window.confirm(`¿Borrar el egreso "${e.concepto}"?`)) return;
    try { await deleteEgreso(orgId, devId, e.id); setEgresos(await getEgresos(orgId, devId)); }
    catch (err) { setError("No se pudo borrar: " + err.message); }
  }

  const nombreContrato = (id) => contratos.find((c) => c.id === id)?.nombre || "(contrato borrado)";
  const nombreCategoria = (id) => CATEGORIAS_EGRESO.find((c) => c.id === id)?.label || id;
  const labelFiscal = (id) => ESTADOS_FISCAL.find((f) => f.id === id)?.label || id;

  // Totales por moneda y por estado fiscal
  const tot = (mon) => egresos.filter((e) => e.moneda === mon);
  const suma = (arr) => arr.reduce((s, e) => s + (Number(e.monto) || 0), 0);
  const resumenMoneda = (mon) => {
    const arr = tot(mon);
    return {
      total: suma(arr),
      conF: suma(arr.filter((e) => e.estadoFiscal === "con_factura")),
      sinF: suma(arr.filter((e) => e.estadoFiscal === "sin_factura")),
      pend: suma(arr.filter((e) => e.estadoFiscal === "pendiente")),
    };
  };

  // Cruce pagado/resta por contrato
  const pagosDe = (ctrId) => egresos.filter((e) => e.categoria === "contratista" && e.contratoId === ctrId);
  const colorFiscal = (id) => id === "con_factura" ? COLORS.verde : id === "sin_factura" ? COLORS.amarillo : COLORS.muted;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
          {editandoId ? "Editar egreso" : "Nuevo egreso"}
        </div>
        {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}

        <label style={S.label}>Categoría</label>
        <select style={S.input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CATEGORIAS_EGRESO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        {form.categoria === "contratista" && (
          <>
            <label style={S.label}>Contrato</label>
            <select style={S.input} value={form.contratoId} onChange={(e) => set("contratoId", e.target.value)}>
              <option value="">— Elegir contrato —</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.rubro}</option>)}
            </select>
            {contratos.length === 0 && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginTop: "3px" }}>No hay contratos cargados. Cargá uno en la pestaña Contratos primero.</div>}
          </>
        )}

        <label style={S.label}>Concepto</label>
        <input style={S.input} value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Ej: Anticipo losa 2° piso" />

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Monto</label>
            <input style={S.input} type="number" value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Moneda</label>
            <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <label style={S.label}>Estado fiscal</label>
        <select style={S.input} value={form.estadoFiscal} onChange={(e) => set("estadoFiscal", e.target.value)}>
          {ESTADOS_FISCAL.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Medio</label>
            <select style={S.input} value={form.medioPago} onChange={(e) => set("medioPago", e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>

        <label style={S.label}>Notas</label>
        <input style={S.input} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Opcional" />

        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar egreso"}
          </button>
          {editandoId && <button style={{ ...S.btn("blue", true), cursor: "pointer" }} onClick={() => { setEditandoId(null); setForm(FORM_EGR_VACIO); setError(""); }}>Cancelar</button>}
        </div>
      </div>

      <div>
        {/* Resumen por moneda */}
        {["ARS", "USD"].map((mon) => {
          const r = resumenMoneda(mon);
          if (r.total === 0) return null;
          return (
            <div key={mon} style={{ ...S.panel, marginBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "6px" }}>Total egresos {mon}: {fmt(r.total, mon)}</div>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px" }}>
                <span style={{ color: COLORS.verde }}>● Con factura: {fmt(r.conF, mon)}</span>
                <span style={{ color: COLORS.amarillo }}>● Sin factura: {fmt(r.sinF, mon)}</span>
                <span style={{ color: COLORS.muted }}>● Pendiente: {fmt(r.pend, mon)}</span>
              </div>
            </div>
          );
        })}

        {/* Cruce por contrato */}
        {contratos.length > 0 && (
          <div style={{ ...S.panel, marginBottom: "10px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "8px" }}>Pagado por contrato</div>
            {contratos.map((c) => {
              const pagos = pagosDe(c.id);
              const pagado = suma(pagos);
              const conF = suma(pagos.filter((p) => p.estadoFiscal === "con_factura"));
              const sinF = suma(pagos.filter((p) => p.estadoFiscal === "sin_factura"));
              const resta = (Number(c.montoTotal) || 0) - pagado;
              return (
                <div key={c.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "6px 0", fontSize: "11px" }}>
                  <div style={{ fontWeight: 600, color: COLORS.text, fontSize: "12px" }}>{c.nombre} · {c.rubro}</div>
                  <div style={{ color: COLORS.muted }}>
                    Contrato {fmt(c.montoTotal, c.moneda)} · pagado {fmt(pagado, c.moneda)} (c/factura {fmt(conF, c.moneda)}, s/factura {fmt(sinF, c.moneda)}) · <span style={{ color: resta > 0 ? COLORS.amarillo : COLORS.verde }}>resta {fmt(resta, c.moneda)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Listado de egresos */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>Egresos ({egresos.length})</div>
          {egresos.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no cargaste egresos.</div>}
          {egresos.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((e) => (
            <div key={e.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>
                  {e.concepto} {e.categoria === "contratista" && e.contratoId ? <span style={{ color: COLORS.muted, fontWeight: 400 }}>· {nombreContrato(e.contratoId)}</span> : null}
                </div>
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  {nombreCategoria(e.categoria)} · {e.fecha} · {e.medioPago} · <span style={{ color: colorFiscal(e.estadoFiscal) }}>{labelFiscal(e.estadoFiscal)}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.text }}>{fmt(e.monto, e.moneda)}</span>
                <button style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => editar(e)}>Editar</button>
                <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(e)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CATEGORIAS_INGRESO = [
  { id: "inversor", label: "Inversor" },
  { id: "venta_cuota", label: "Venta / Cuota" },
  { id: "reserva", label: "Reserva" },
  { id: "otro", label: "Otro" },
];

const FORM_ING_VACIO = { categoria: "venta_cuota", clienteId: "", nombreLibre: "", concepto: "", monto: "", moneda: "ARS", estadoFiscal: "con_factura", fecha: new Date().toISOString().slice(0, 10), medioPago: "transferencia", notas: "" };

function TabIngresos({ orgId, devId, fmt }) {
  const [ingresos, setIngresos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(FORM_ING_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId || !devId) { setIngresos([]); return; }
    getIngresos(orgId, devId).then(setIngresos).catch(() => setIngresos([]));
  }, [orgId, devId]);

  useEffect(() => {
    if (!orgId) return;
    getClientes(orgId).then(setClientes).catch(() => setClientes([]));
  }, [orgId]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const usaCliente = (cat) => cat === "venta_cuota" || cat === "reserva";

  async function guardar() {
    setError("");
    if (!form.concepto.trim()) { setError("El ingreso necesita un concepto."); return; }
    if (!(Number(form.monto) > 0)) { setError("El monto debe ser mayor a cero."); return; }
    if (usaCliente(form.categoria) && !form.clienteId) { setError("Elegí el cliente de este ingreso."); return; }
    if (!usaCliente(form.categoria) && !form.nombreLibre.trim()) { setError("Cargá el nombre (inversor u origen del ingreso)."); return; }
    setGuardando(true);
    try {
      await saveIngreso(orgId, devId, {
        ...(editandoId ? { id: editandoId } : {}),
        categoria: form.categoria,
        clienteId: usaCliente(form.categoria) ? form.clienteId : "",
        nombreLibre: usaCliente(form.categoria) ? "" : form.nombreLibre.trim(),
        concepto: form.concepto.trim(),
        monto: Number(form.monto),
        moneda: form.moneda,
        estadoFiscal: form.estadoFiscal,
        fecha: form.fecha,
        medioPago: form.medioPago,
        notas: form.notas.trim(),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_ING_VACIO); setEditandoId(null);
      setIngresos(await getIngresos(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }

  function editar(i) {
    setEditandoId(i.id);
    setForm({ categoria: i.categoria, clienteId: i.clienteId || "", nombreLibre: i.nombreLibre || "",
      concepto: i.concepto, monto: String(i.monto), moneda: i.moneda, estadoFiscal: i.estadoFiscal,
      fecha: i.fecha, medioPago: i.medioPago, notas: i.notas || "" });
  }

  async function borrar(i) {
    if (!window.confirm(`¿Borrar el ingreso "${i.concepto}"?`)) return;
    try { await deleteIngreso(orgId, devId, i.id); setIngresos(await getIngresos(orgId, devId)); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }

  const nombreCliente = (id) => clientes.find((c) => c.id === id)?.nombre || "(cliente borrado)";
  const nombreCategoria = (id) => CATEGORIAS_INGRESO.find((c) => c.id === id)?.label || id;
  const labelFiscal = (id) => ESTADOS_FISCAL.find((f) => f.id === id)?.label || id;
  const colorFiscal = (id) => id === "con_factura" ? COLORS.verde : id === "sin_factura" ? COLORS.amarillo : COLORS.muted;

  const suma = (arr) => arr.reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const resumenMoneda = (mon) => {
    const arr = ingresos.filter((i) => i.moneda === mon);
    return {
      total: suma(arr),
      conF: suma(arr.filter((i) => i.estadoFiscal === "con_factura")),
      sinF: suma(arr.filter((i) => i.estadoFiscal === "sin_factura")),
      pend: suma(arr.filter((i) => i.estadoFiscal === "pendiente")),
    };
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
          {editandoId ? "Editar ingreso" : "Nuevo ingreso"}
        </div>
        {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}

        <label style={S.label}>Categoría</label>
        <select style={S.input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CATEGORIAS_INGRESO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        {usaCliente(form.categoria) ? (
          <>
            <label style={S.label}>Cliente</label>
            <select style={S.input} value={form.clienteId} onChange={(e) => set("clienteId", e.target.value)}>
              <option value="">— Elegir cliente —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {clientes.length === 0 && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginTop: "3px" }}>No hay clientes cargados. Cargalos en el módulo 👥 Clientes.</div>}
          </>
        ) : (
          <>
            <label style={S.label}>{form.categoria === "inversor" ? "Inversor" : "Origen"}</label>
            <input style={S.input} value={form.nombreLibre} onChange={(e) => set("nombreLibre", e.target.value)} placeholder="Ej: Aporte Juan Pérez" />
          </>
        )}

        <label style={S.label}>Concepto</label>
        <input style={S.input} value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Ej: Cuota 3 depto 2B" />

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Monto</label>
            <input style={S.input} type="number" value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Moneda</label>
            <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <label style={S.label}>Estado fiscal</label>
        <select style={S.input} value={form.estadoFiscal} onChange={(e) => set("estadoFiscal", e.target.value)}>
          {ESTADOS_FISCAL.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Medio</label>
            <select style={S.input} value={form.medioPago} onChange={(e) => set("medioPago", e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>

        <label style={S.label}>Notas</label>
        <input style={S.input} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Opcional" />

        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar ingreso"}
          </button>
          {editandoId && <button style={{ ...S.btn("blue", true), cursor: "pointer" }} onClick={() => { setEditandoId(null); setForm(FORM_ING_VACIO); setError(""); }}>Cancelar</button>}
        </div>
      </div>

      <div>
        {["ARS", "USD"].map((mon) => {
          const r = resumenMoneda(mon);
          if (r.total === 0) return null;
          return (
            <div key={mon} style={{ ...S.panel, marginBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "6px" }}>Total ingresos {mon}: {fmt(r.total, mon)}</div>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px" }}>
                <span style={{ color: COLORS.verde }}>● Con factura: {fmt(r.conF, mon)}</span>
                <span style={{ color: COLORS.amarillo }}>● Sin factura: {fmt(r.sinF, mon)}</span>
                <span style={{ color: COLORS.muted }}>● Pendiente: {fmt(r.pend, mon)}</span>
              </div>
            </div>
          );
        })}

        <div style={S.panel}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>Ingresos ({ingresos.length})</div>
          {ingresos.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no cargaste ingresos.</div>}
          {ingresos.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((i) => (
            <div key={i.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>
                  {i.concepto} <span style={{ color: COLORS.muted, fontWeight: 400 }}>· {i.clienteId ? nombreCliente(i.clienteId) : i.nombreLibre}</span>
                </div>
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  {nombreCategoria(i.categoria)} · {i.fecha} · {i.medioPago} · <span style={{ color: colorFiscal(i.estadoFiscal) }}>{labelFiscal(i.estadoFiscal)}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.verde }}>{fmt(i.monto, i.moneda)}</span>
                <button style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => editar(i)}>Editar</button>
                <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(i)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
