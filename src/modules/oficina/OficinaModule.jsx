import { useState, useEffect } from "react";
import { COLORS, S } from "../../styles/theme";
import InputMoneda from "../../components/InputMoneda";
import { useAuth } from "../../auth/AuthContext";
import {
  getEntidades, saveEntidad, deleteEntidad,
  getEmpleados, saveEmpleado, deleteEmpleado,
  getGastos, saveGasto, deleteGasto,
  generarSueldosDelPeriodo,
} from "../../services/oficinaRepo";
import { getDesarrollos, getUnidades } from "../../services/desarrollosRepo";
// Categorías de gasto de estructura del estudio. "Honorarios internos" es especial:
// registra plata que una entidad le paga a otra (egreso en una, ingreso en la otra).
const CATEGORIAS = [
  "Sueldos", "Honorarios internos", "Alquiler", "Expensas", "Luz", "Gas", "Agua",
  "Internet", "Teléfono", "Auto/Combustible", "Seguros", "ART", "Impuestos/Tasas",
  "Contador/Honorarios prof.", "Librería/Insumos", "Software/Suscripciones",
  "Mantenimiento", "Otro",
];
const fmt = (n, m) => (m === "USD" ? "USD " : "$ ") + Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
export default function OficinaModule() {
  const { orgId } = useAuth();
  const [tab, setTab] = useState("gastos");
  const [entidades, setEntidades] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [ready, setReady] = useState(false);
  const [desarrollos, setDesarrollos] = useState([]);
  async function recargar() {
    if (!orgId) return;
    const [ent, emp, gas] = await Promise.all([getEntidades(orgId), getEmpleados(orgId), getGastos(orgId)]);
    setEntidades(ent); setEmpleados(emp); setGastos(gas);
  }
  useEffect(() => {
    if (!orgId) return;
    setReady(false);
    recargar().then(() => setReady(true)).catch(() => setReady(true));
  }, [orgId]);
  // m² por desarrollo (suma de las unidades de cada uno), para el prorrateo del Resumen
  useEffect(() => {
    if (!orgId) return;
    let cancel = false;
    (async () => {
      try {
        const devs = await getDesarrollos(orgId);
        const conM2 = await Promise.all(devs.map(async (d) => {
          let m2 = 0;
          try { const us = await getUnidades(orgId, d.id); m2 = us.reduce((s, u) => s + (Number(u.m2) || 0), 0); } catch {}
          return { id: d.id, nombre: d.nombre, m2 };
        }));
        if (!cancel) setDesarrollos(conM2);
      } catch {}
    })();
    return () => { cancel = true; };
  }, [orgId]);
  const nombreEnt = (id) => entidades.find((e) => e.id === id)?.nombre || "(entidad borrada)";
  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;
  const TABS = [
    { id: "gastos", label: "📤 Gastos" },
    { id: "empleados", label: "👥 Empleados" },
    { id: "entidades", label: "🏢 Entidades" },
    { id: "resumen", label: "📊 Resumen" },
  ];
  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>🏢 OFICINA · ESTRUCTURA DEL ESTUDIO</span>
      </div>
      {entidades.length === 0 && (
        <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px", marginBottom: "14px" }}>
          Todavía no cargaste entidades. Una entidad es cada empresa que paga gastos (ej: Pensamiento Visual S.A. y Punto 2).
          Andá a la pestaña <b style={{ color: COLORS.text }}>🏢 Entidades</b> para crearlas; después vas a poder etiquetar cada gasto con la que lo paga.
        </div>
      )}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...S.btn(tab === t.id ? "gold" : "ghost", true) }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "entidades" && <TabEntidades orgId={orgId} entidades={entidades} onChange={recargar} />}
      {tab === "empleados" && <TabEmpleados orgId={orgId} entidades={entidades} empleados={empleados} onChange={recargar} />}
      {tab === "gastos" && <TabGastos orgId={orgId} entidades={entidades} gastos={gastos} nombreEnt={nombreEnt} onChange={recargar} />}
      {tab === "resumen" && <TabResumen entidades={entidades} gastos={gastos} nombreEnt={nombreEnt} desarrollos={desarrollos} />}
    </div>
  );
}
// ═══════════════════════ ENTIDADES ═══════════════════════
const FORM_ENT_VACIO = { nombre: "", notas: "" };
function TabEntidades({ orgId, entidades, onChange }) {
  const [form, setForm] = useState(FORM_ENT_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function guardar() {
    setError("");
    if (!form.nombre.trim()) { setError("La entidad necesita un nombre."); return; }
    setGuardando(true);
    try {
      await saveEntidad(orgId, {
        ...(editandoId ? { id: editandoId } : {}),
        nombre: form.nombre.trim(), notas: form.notas.trim(),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_ENT_VACIO); setEditandoId(null);
      await onChange();
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }
  async function seedVruto() {
    setGuardando(true); setError("");
    try {
      await saveEntidad(orgId, { nombre: "Pensamiento Visual S.A.", notas: "Constructora / desarrolladora", creadoEn: new Date().toISOString() });
      await saveEntidad(orgId, { nombre: "Punto 2", notas: "Estudio de arquitectura", creadoEn: new Date().toISOString() });
      await onChange();
    } catch (e) { setError("No se pudo crear: " + e.message); }
    setGuardando(false);
  }
  async function borrar(ent) {
    if (!window.confirm(`¿Borrar la entidad "${ent.nombre}"? Los gastos ya cargados a su nombre quedan, pero sin entidad asignada.`)) return;
    try { await deleteEntidad(orgId, ent.id); await onChange(); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>{editandoId ? "Editar entidad" : "Nueva entidad"}</div>
        {error && <div style={errBox}>{error}</div>}
        <label style={S.label}>Nombre</label>
        <input style={S.input} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Pensamiento Visual S.A." />
        <label style={{ ...S.label, marginTop: "10px" }}>Notas</label>
        <input style={S.input} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Ej: constructora / estudio" />
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button style={S.btn("gold")} onClick={guardar} disabled={guardando}>{guardando ? "..." : editandoId ? "Guardar" : "Agregar"}</button>
          {editandoId && <button style={S.btn("ghost")} onClick={() => { setForm(FORM_ENT_VACIO); setEditandoId(null); }}>Cancelar</button>}
        </div>
        {entidades.length === 0 && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: "11px", color: COLORS.muted, marginBottom: "6px" }}>¿Arrancamos con las dos de VRUTO?</div>
            <button style={S.btn("blue")} onClick={seedVruto} disabled={guardando}>Crear Pensamiento Visual S.A. + Punto 2</button>
          </div>
        )}
      </div>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>Entidades ({entidades.length})</div>
        {entidades.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Sin entidades todavía.</div>}
        {entidades.map((ent) => (
          <div key={ent.id} style={rowCard}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>{ent.nombre}</div>
              {ent.notas && <div style={{ fontSize: "11px", color: COLORS.muted }}>{ent.notas}</div>}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={S.btn("ghost", true)} onClick={() => { setEditandoId(ent.id); setForm({ nombre: ent.nombre, notas: ent.notas || "" }); }}>Editar</button>
              <button style={S.btn("red", true)} onClick={() => borrar(ent)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ═══════════════════════ EMPLEADOS ═══════════════════════
const FORM_EMP_VACIO = { nombre: "", rolDesc: "", sueldo: "", moneda: "ARS", tc: "", activo: true, repartos: [] };
function TabEmpleados({ orgId, entidades, empleados, onChange }) {
  const [form, setForm] = useState(FORM_EMP_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [genMsg, setGenMsg] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const nombreEnt = (id) => entidades.find((e) => e.id === id)?.nombre || "(entidad)";
  function addReparto() { setForm((f) => ({ ...f, repartos: [...f.repartos, { entId: entidades[0]?.id || "", pct: "" }] })); }
  function setReparto(i, k, v) { setForm((f) => ({ ...f, repartos: f.repartos.map((r, j) => j === i ? { ...r, [k]: v } : r) })); }
  function delReparto(i) { setForm((f) => ({ ...f, repartos: f.repartos.filter((_, j) => j !== i) })); }
  const sumaPct = form.repartos.reduce((s, r) => s + (Number(r.pct) || 0), 0);
  async function guardar() {
    setError("");
    if (!form.nombre.trim()) { setError("El empleado necesita un nombre."); return; }
    if (!(Number(form.sueldo) > 0)) { setError("El sueldo debe ser mayor a cero."); return; }
    const repartos = form.repartos.filter((r) => r.entId && Number(r.pct) > 0).map((r) => ({ entId: r.entId, pct: Number(r.pct) }));
    if (repartos.length === 0) { setError("Asigná al menos una entidad con su porcentaje."); return; }
    setGuardando(true);
    try {
      await saveEmpleado(orgId, {
        ...(editandoId ? { id: editandoId } : {}),
        nombre: form.nombre.trim(), rolDesc: form.rolDesc.trim(),
        sueldo: Number(form.sueldo), moneda: form.moneda,
        tc: form.moneda === "ARS" ? (Number(form.tc) || 0) : 0,
        activo: !!form.activo, repartos,
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_EMP_VACIO); setEditandoId(null);
      await onChange();
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }
  function editar(emp) {
    setEditandoId(emp.id);
    setForm({
      nombre: emp.nombre, rolDesc: emp.rolDesc || "", sueldo: String(emp.sueldo),
      moneda: emp.moneda || "ARS", tc: emp.tc != null ? String(emp.tc) : "",
      activo: emp.activo !== false,
      repartos: (emp.repartos || []).map((r) => ({ entId: r.entId, pct: String(r.pct) })),
    });
  }
  async function borrar(emp) {
    if (!window.confirm(`¿Borrar a ${emp.nombre} de la plantilla? Los sueldos ya generados en Gastos quedan.`)) return;
    try { await deleteEmpleado(orgId, emp.id); await onChange(); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }
  async function generar() {
    setGenMsg(""); setError("");
    if (!window.confirm(`¿Generar los sueldos de ${periodo}? Crea un gasto por entidad para cada empleado activo. Si ya los generaste para ese mes, los salta.`)) return;
    setGuardando(true);
    try {
      const r = await generarSueldosDelPeriodo(orgId, periodo, periodo + "-01");
      let msg = `Listo: ${r.creados} gasto(s) de sueldo creados por ${fmt(r.total, "ARS")} aprox.`;
      if (r.saltados.length) msg += ` Salteados (ya estaban): ${r.saltados.join(", ")}.`;
      if (r.creados === 0 && r.saltados.length === 0) msg = "No había empleados activos con reparto para generar.";
      setGenMsg(msg);
      await onChange();
    } catch (e) { setError("No se pudieron generar: " + e.message); }
    setGuardando(false);
  }
  const noEnt = entidades.length === 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>{editandoId ? "Editar empleado" : "Nuevo empleado"}</div>
        {error && <div style={errBox}>{error}</div>}
        {noEnt && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginBottom: "8px" }}>Primero creá al menos una entidad en la pestaña 🏢 Entidades.</div>}
        <label style={S.label}>Nombre</label>
        <input style={S.input} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Agustín" />
        <label style={{ ...S.label, marginTop: "10px" }}>Rol / puesto</label>
        <input style={S.input} value={form.rolDesc} onChange={(e) => set("rolDesc", e.target.value)} placeholder="Ej: Arquitecto / Administrativo" />
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Sueldo</label>
            <InputMoneda style={S.input} value={form.sueldo} onChange={(v) => set("sueldo", v)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Moneda</label>
            <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {form.moneda === "ARS" && (
            <div style={{ flex: 1 }}>
              <label style={S.label}>Dólar del día</label>
              <input style={S.input} type="number" value={form.tc} onChange={(e) => set("tc", e.target.value)} placeholder="ej 1530" />
            </div>
          )}
        </div>
        <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={S.label}>Reparto por entidad</span>
            <span style={{ fontSize: "11px", color: sumaPct === 100 ? COLORS.verde : COLORS.amarillo }}>Suma: {sumaPct}%</span>
          </div>
          {form.repartos.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
              <select style={{ ...S.input, flex: 2 }} value={r.entId} onChange={(e) => setReparto(i, "entId", e.target.value)} disabled={noEnt}>
                {entidades.map((ent) => <option key={ent.id} value={ent.id}>{ent.nombre}</option>)}
              </select>
              <input style={{ ...S.input, flex: 1 }} type="number" value={r.pct} onChange={(e) => setReparto(i, "pct", e.target.value)} placeholder="%" />
              <button style={S.btn("red", true)} onClick={() => delReparto(i)}>✕</button>
            </div>
          ))}
          <button style={S.btn("ghost", true)} onClick={addReparto} disabled={noEnt}>+ Entidad</button>
          <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "4px" }}>Ej: Agustín 50% Pensamiento Visual · 50% Punto 2.</div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", fontSize: "12px", cursor: "pointer" }}>
          <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} /> Activo (entra en la generación de sueldos)
        </label>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button style={S.btn("gold")} onClick={guardar} disabled={guardando || noEnt}>{guardando ? "..." : editandoId ? "Guardar" : "Agregar"}</button>
          {editandoId && <button style={S.btn("ghost")} onClick={() => { setForm(FORM_EMP_VACIO); setEditandoId(null); }}>Cancelar</button>}
        </div>
      </div>
      <div style={S.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>Plantilla ({empleados.length})</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <input style={{ ...S.input, width: "auto" }} type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
            <button style={S.btn("blue", true)} onClick={generar} disabled={guardando || empleados.length === 0}>Generar sueldos del mes</button>
          </div>
        </div>
        {genMsg && <div style={{ ...okBox }}>{genMsg}</div>}
        {empleados.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Sin empleados en la plantilla.</div>}
        {empleados.map((emp) => (
          <div key={emp.id} style={rowCard}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>
                {emp.nombre} {emp.activo === false && <span style={{ ...S.tag(COLORS.muted), marginLeft: "4px" }}>inactivo</span>}
              </div>
              <div style={{ fontSize: "11px", color: COLORS.muted }}>
                {emp.rolDesc ? emp.rolDesc + " · " : ""}{fmt(emp.sueldo, emp.moneda)}
              </div>
              <div style={{ fontSize: "11px", color: COLORS.text, marginTop: "2px" }}>
                {(emp.repartos || []).map((r, i) => <span key={i}>{i > 0 ? " · " : ""}{r.pct}% {nombreEnt(r.entId)}</span>)}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button style={S.btn("ghost", true)} onClick={() => editar(emp)}>Editar</button>
              <button style={S.btn("red", true)} onClick={() => borrar(emp)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ═══════════════════════ GASTOS ═══════════════════════
const hoy = () => new Date().toISOString().slice(0, 10);
const MEDIOS_PAGO = ["", "Transferencia", "Efectivo", "Banco", "Cheque", "Otro"];
const LINEA_VACIA = { entidadId: "", monto: "", fondeadoPor: "", medioPago: "" };
const FORM_GAS_VACIO = { categoria: "Alquiler", concepto: "", moneda: "ARS", tc: "", fecha: hoy(), conFactura: true, entidadCobraId: "", reparto: [{ ...LINEA_VACIA }] };
// Líneas de reparto de un gasto (una o varias entidades).
// Compatibilidad: gastos viejos (una sola entidad) se leen como una sola línea.
function lineasDe(g) {
  if (Array.isArray(g.reparto) && g.reparto.length) {
    return g.reparto.map((r) => ({
      entidadId: r.entidadId || "", monto: Number(r.monto) || 0,
      fondeadoPor: r.fondeadoPor || "", medioPago: r.medioPago || "",
    }));
  }
  return [{ entidadId: g.entidadId || "", monto: Number(g.monto) || 0, fondeadoPor: g.fondeadoPor || "", medioPago: g.medioPago || "" }];
}
function TabGastos({ orgId, entidades, gastos, nombreEnt, onChange }) {
  const [form, setForm] = useState({ ...FORM_GAS_VACIO, reparto: [{ ...LINEA_VACIA, entidadId: entidades[0]?.id || "" }] });
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [filtroEnt, setFiltroEnt] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const esHon = form.categoria === "Honorarios internos";
  function setLinea(i, k, v) { setForm((f) => ({ ...f, reparto: f.reparto.map((l, j) => j === i ? { ...l, [k]: v } : l) })); }
  function addLinea() { setForm((f) => ({ ...f, reparto: [...f.reparto, { ...LINEA_VACIA, entidadId: entidades[0]?.id || "" }] })); }
  function delLinea(i) { setForm((f) => ({ ...f, reparto: f.reparto.length > 1 ? f.reparto.filter((_, j) => j !== i) : f.reparto })); }
  const totalForm = form.reparto.reduce((s, l) => s + (Number(l.monto) || 0), 0);
  async function guardar() {
    setError("");
    const fuente = esHon ? [form.reparto[0]] : form.reparto;
    const limpio = fuente
      .filter((l) => l.entidadId && Number(l.monto) > 0)
      .map((l) => ({ entidadId: l.entidadId, monto: Number(l.monto), fondeadoPor: (l.fondeadoPor || "").trim(), medioPago: l.medioPago || "" }));
    if (limpio.length === 0) { setError("Cargá al menos una entidad con su monto."); return; }
    if (esHon && !form.entidadCobraId) { setError("En honorarios internos elegí la entidad que cobra."); return; }
    if (esHon && form.entidadCobraId === limpio[0].entidadId) { setError("La entidad que paga y la que cobra no pueden ser la misma."); return; }
    const total = limpio.reduce((s, l) => s + l.monto, 0);
    setGuardando(true);
    try {
      await saveGasto(orgId, {
        ...(editandoId ? { id: editandoId } : {}),
        categoria: form.categoria,
        concepto: form.concepto.trim(),
        monto: total,
        reparto: limpio,
        entidadId: limpio[0].entidadId,
        moneda: form.moneda,
        tc: form.moneda === "ARS" ? (Number(form.tc) || 0) : 0,
        fecha: form.fecha,
        periodo: (form.fecha || "").slice(0, 7),
        conFactura: !!form.conFactura,
        esHonorario: esHon,
        entidadCobraId: esHon ? form.entidadCobraId : "",
        empId: editandoId ? (gastos.find((g) => g.id === editandoId)?.empId || "") : "",
        creadoEn: new Date().toISOString(),
      });
      setForm({ ...FORM_GAS_VACIO, reparto: [{ ...LINEA_VACIA, entidadId: entidades[0]?.id || "" }] });
      setEditandoId(null);
      await onChange();
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }
  function editar(g) {
    setEditandoId(g.id);
    setForm({
      categoria: g.categoria || "Otro", concepto: g.concepto || "",
      moneda: g.moneda || "ARS", tc: g.tc != null ? String(g.tc) : "",
      fecha: g.fecha || hoy(), conFactura: g.conFactura !== false,
      entidadCobraId: g.entidadCobraId || "",
      reparto: lineasDe(g).map((l) => ({ entidadId: l.entidadId, monto: String(l.monto), fondeadoPor: l.fondeadoPor, medioPago: l.medioPago })),
    });
  }
  async function borrar(g) {
    if (!window.confirm(`¿Borrar el gasto "${g.concepto || g.categoria}"?`)) return;
    try { await deleteGasto(orgId, g.id); await onChange(); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }
  const noEnt = entidades.length === 0;
  const fondeadores = Array.from(new Set(gastos.flatMap((g) => lineasDe(g).map((l) => l.fondeadoPor)).filter(Boolean))).sort();
  const lista = filtroEnt ? gastos.filter((g) => lineasDe(g).some((l) => l.entidadId === filtroEnt) || g.entidadCobraId === filtroEnt) : gastos;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>{editandoId ? "Editar gasto" : "Nuevo gasto"}</div>
        {error && <div style={errBox}>{error}</div>}
        {noEnt && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginBottom: "8px" }}>Primero creá una entidad en 🏢 Entidades.</div>}
        <label style={S.label}>Categoría</label>
        <select style={S.input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ ...S.label, marginTop: "10px" }}>Concepto</label>
        <input style={S.input} value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder={esHon ? "Ej: Honorarios obra PH51" : "Ej: Alquiler oficina octubre"} />
        <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Moneda</label>
            <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {form.moneda === "ARS" && (
            <div style={{ flex: 1 }}>
              <label style={S.label}>Dólar del día</label>
              <input style={S.input} type="number" value={form.tc} onChange={(e) => set("tc", e.target.value)} placeholder="ej 1530" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", marginTop: "10px" }}>
          <input type="checkbox" checked={form.conFactura} onChange={(e) => set("conFactura", e.target.checked)} /> Con factura
        </label>
        {esHon ? (
          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${COLORS.border}` }}>
            <label style={S.label}>Entidad que paga</label>
            <select style={S.input} value={form.reparto[0].entidadId} onChange={(e) => setLinea(0, "entidadId", e.target.value)} disabled={noEnt}>
              <option value="">— Elegir —</option>
              {entidades.map((ent) => <option key={ent.id} value={ent.id}>{ent.nombre}</option>)}
            </select>
            <label style={{ ...S.label, marginTop: "10px" }}>Entidad que cobra</label>
            <select style={S.input} value={form.entidadCobraId} onChange={(e) => set("entidadCobraId", e.target.value)} disabled={noEnt}>
              <option value="">— Elegir —</option>
              {entidades.filter((ent) => ent.id !== form.reparto[0].entidadId).map((ent) => <option key={ent.id} value={ent.id}>{ent.nombre}</option>)}
            </select>
            <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "4px" }}>Cuenta como egreso en la que paga y como ingreso en la que cobra.</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Monto</label>
                <InputMoneda style={S.input} value={form.reparto[0].monto} onChange={(v) => setLinea(0, "monto", v)} placeholder="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Quién puso</label>
                <input style={S.input} list="oficina-fondeadores" value={form.reparto[0].fondeadoPor} onChange={(e) => setLinea(0, "fondeadoPor", e.target.value)} placeholder="Ej: Martín" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Medio</label>
                <select style={S.input} value={form.reparto[0].medioPago} onChange={(e) => setLinea(0, "medioPago", e.target.value)}>
                  {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m || "—"}</option>)}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={S.label}>Reparto por entidad</span>
              <span style={{ fontSize: "12px", color: COLORS.gold, fontWeight: 700 }}>Total: {fmt(totalForm, form.moneda)}</span>
            </div>
            {form.reparto.map((l, i) => (
              <div key={i} style={{ border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "8px", marginBottom: "8px" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <select style={{ ...S.input, flex: 2 }} value={l.entidadId} onChange={(e) => setLinea(i, "entidadId", e.target.value)} disabled={noEnt}>
                    <option value="">— Entidad —</option>
                    {entidades.map((ent) => <option key={ent.id} value={ent.id}>{ent.nombre}</option>)}
                  </select>
                  <InputMoneda style={{ ...S.input, flex: 1 }} value={l.monto} onChange={(v) => setLinea(i, "monto", v)} placeholder="monto" />
                  {form.reparto.length > 1 && <button style={S.btn("red", true)} onClick={() => delLinea(i)}>✕</button>}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  <input style={{ ...S.input, flex: 2 }} list="oficina-fondeadores" value={l.fondeadoPor} onChange={(e) => setLinea(i, "fondeadoPor", e.target.value)} placeholder="Quién puso la plata (ej: Martín)" />
                  <select style={{ ...S.input, flex: 1 }} value={l.medioPago} onChange={(e) => setLinea(i, "medioPago", e.target.value)}>
                    {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m || "medio"}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button style={S.btn("ghost", true)} onClick={addLinea} disabled={noEnt}>+ Entidad</button>
            <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "4px" }}>Ej: Alquiler $800 → $200 Pensamiento Visual + $600 Punto 2, con quién puso cada parte.</div>
          </div>
        )}
        <datalist id="oficina-fondeadores">
          {fondeadores.map((f) => <option key={f} value={f} />)}
        </datalist>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button style={S.btn("gold")} onClick={guardar} disabled={guardando || noEnt}>{guardando ? "..." : editandoId ? "Guardar" : "Agregar"}</button>
          {editandoId && <button style={S.btn("ghost")} onClick={() => { setForm({ ...FORM_GAS_VACIO, reparto: [{ ...LINEA_VACIA, entidadId: entidades[0]?.id || "" }] }); setEditandoId(null); }}>Cancelar</button>}
        </div>
      </div>
      <div style={S.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>Gastos ({lista.length})</span>
          <select style={{ ...S.input, width: "auto" }} value={filtroEnt} onChange={(e) => setFiltroEnt(e.target.value)}>
            <option value="">Todas las entidades</option>
            {entidades.map((ent) => <option key={ent.id} value={ent.id}>{ent.nombre}</option>)}
          </select>
        </div>
        {lista.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Sin gastos cargados.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {lista.map((g) => {
            const ls = lineasDe(g);
            return (
              <div key={g.id} style={{ ...rowCard, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px" }}>{fmt(g.monto, g.moneda)}</span>
                    <span style={S.tag(g.esHonorario ? COLORS.purple : COLORS.teal)}>{g.categoria}</span>
                    {g.conFactura ? <span style={S.tag(COLORS.verde)}>c/factura</span> : <span style={S.tag(COLORS.amarillo)}>s/factura</span>}
                  </div>
                  <div style={{ fontSize: "11px", color: COLORS.muted, marginTop: "3px" }}>
                    {g.concepto && <span>{g.concepto} · </span>}
                    {g.esHonorario
                      ? <><b style={{ color: COLORS.text }}>{nombreEnt(ls[0].entidadId)}</b>{g.entidadCobraId && <span> → cobra {nombreEnt(g.entidadCobraId)}</span>}</>
                      : (ls.length === 1
                          ? <b style={{ color: COLORS.text }}>{nombreEnt(ls[0].entidadId)}</b>
                          : <span>{ls.map((l, i) => <span key={i}>{i > 0 ? " · " : ""}<b style={{ color: COLORS.text }}>{nombreEnt(l.entidadId)}</b> {fmt(l.monto, g.moneda)}</span>)}</span>)}
                    {" · "}{g.fecha}
                    {g.moneda === "ARS" && g.tc ? ` · dólar ${Number(g.tc).toLocaleString("es-AR")}` : ""}
                  </div>
                  {ls.some((l) => l.fondeadoPor || l.medioPago) && (
                    <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "2px" }}>
                      {ls.filter((l) => l.fondeadoPor || l.medioPago).map((l, i) => (
                        <span key={i}>{i > 0 ? " · " : ""}{ls.length > 1 ? nombreEnt(l.entidadId) + ": " : ""}puso <b style={{ color: COLORS.text }}>{l.fondeadoPor || "?"}</b>{l.medioPago ? ` (${l.medioPago})` : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button style={S.btn("ghost", true)} onClick={() => editar(g)}>Editar</button>
                  <button style={S.btn("red", true)} onClick={() => borrar(g)}>Borrar</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ═══════════════════════ RESUMEN ═══════════════════════
function TabResumen({ entidades, gastos, nombreEnt, desarrollos = [] }) {
  const [mes, setMes] = useState("");
  const [tcRef, setTcRef] = useState("");
  const [m2Over, setM2Over] = useState({});
  const meses = Array.from(new Set(gastos.map((g) => (g.periodo || (g.fecha || "").slice(0, 7))).filter(Boolean))).sort().reverse();
  const tcRefNum = Number(tcRef) || 0;
  const aUSD = (g) => {
    if (g.moneda === "USD") return { usd: Number(g.monto) || 0, ok: true };
    const tc = Number(g.tc) || tcRefNum;
    if (tc > 0) return { usd: (Number(g.monto) || 0) / tc, ok: true };
    return { usd: 0, ok: false };
  };
  const base = mes ? gastos.filter((g) => (g.periodo || (g.fecha || "").slice(0, 7)) === mes) : gastos;
  let sinTC = false;
  const lineaUSD = (l, g) => {
    if (g.moneda === "USD") return { usd: l.monto, ok: true };
    const tc = Number(g.tc) || tcRefNum;
    if (tc > 0) return { usd: l.monto / tc, ok: true };
    return { usd: 0, ok: false };
  };
  function totalesEntidad(entId) {
    let egARS = 0, egUSD = 0, egCons = 0, nG = 0;
    for (const g of base) {
      for (const l of lineasDe(g)) {
        if (l.entidadId !== entId) continue;
        nG += 1;
        if (g.moneda === "USD") egUSD += l.monto; else egARS += l.monto;
        const r = lineaUSD(l, g); if (!r.ok) sinTC = true; egCons += r.usd;
      }
    }
    const ingresos = base.filter((g) => g.esHonorario && g.entidadCobraId === entId);
    const sum = (arr, mon) => arr.filter((g) => g.moneda === mon).reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const sumUSD = (arr) => arr.reduce((s, g) => { const r = aUSD(g); if (!r.ok) sinTC = true; return s + r.usd; }, 0);
    return {
      egARS, egUSD, egCons,
      inARS: sum(ingresos, "ARS"), inUSD: sum(ingresos, "USD"), inCons: sumUSD(ingresos),
      nGastos: nG, nHon: ingresos.length,
    };
  }
  const totalCons = base.reduce((s, g) => {
    if (g.esHonorario) return s;
    return s + lineasDe(g).reduce((ss, l) => { const r = lineaUSD(l, g); if (!r.ok) sinTC = true; return ss + r.usd; }, 0);
  }, 0);
  const porFondeador = (() => {
    const map = {};
    for (const g of base) {
      for (const l of lineasDe(g)) {
        const k = l.fondeadoPor || "(sin especificar)";
        if (!map[k]) map[k] = { quien: k, ars: 0, usd: 0, cons: 0, n: 0 };
        if (g.moneda === "ARS") map[k].ars += l.monto; else map[k].usd += l.monto;
        const r = lineaUSD(l, g); if (!r.ok) sinTC = true; map[k].cons += r.usd;
        map[k].n += 1;
      }
    }
    return Object.values(map).sort((a, b) => b.cons - a.cons);
  })();
  const hayFond = porFondeador.some((f) => f.quien !== "(sin especificar)");
  const m2De = (d) => { const o = m2Over[d.id]; return o === undefined || o === "" ? (Number(d.m2) || 0) : (Number(o) || 0); };
  const totM2 = (desarrollos || []).reduce((s, d) => s + m2De(d), 0);
  return (
    <div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
        <select style={{ ...S.input, width: "auto" }} value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="">Todos los períodos</option>
          {meses.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: "12px", color: COLORS.muted }}>Estructura total (sin honorarios internos): <b style={{ color: COLORS.gold }}>{fmt(totalCons, "USD")}</b></span>
      </div>
      {entidades.length === 0 && <div style={{ ...S.panel, color: COLORS.muted, fontSize: "12px" }}>Creá entidades para ver el resumen.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "14px" }}>
        {entidades.map((ent) => {
          const t = totalesEntidad(ent.id);
          const neto = t.egCons - t.inCons;
          return (
            <div key={ent.id} style={S.panel}>
              <div style={{ fontWeight: 800, fontSize: "14px", color: COLORS.gold, marginBottom: "10px" }}>{ent.nombre}</div>
              <div style={{ fontSize: "11px", color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>Gastos que paga ({t.nGastos})</div>
              <div style={lineRow}><span>En pesos</span><b>{fmt(t.egARS, "ARS")}</b></div>
              <div style={lineRow}><span>En dólares</span><b>{fmt(t.egUSD, "USD")}</b></div>
              <div style={{ ...lineRow, color: COLORS.text }}><span>Consolidado USD</span><b style={{ color: COLORS.rojo }}>{fmt(t.egCons, "USD")}</b></div>
              {(t.nHon > 0) && (
                <>
                  <div style={{ fontSize: "11px", color: COLORS.muted, letterSpacing: "0.06em", textTransform: "uppercase", margin: "10px 0 4px" }}>Honorarios que cobra ({t.nHon})</div>
                  <div style={lineRow}><span>En pesos</span><b>{fmt(t.inARS, "ARS")}</b></div>
                  <div style={lineRow}><span>En dólares</span><b>{fmt(t.inUSD, "USD")}</b></div>
                  <div style={{ ...lineRow, color: COLORS.text }}><span>Consolidado USD</span><b style={{ color: COLORS.verde }}>{fmt(t.inCons, "USD")}</b></div>
                </>
              )}
              <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 800 }}>
                <span>Neto (USD)</span>
                <span style={{ color: neto > 0 ? COLORS.rojo : COLORS.verde }}>{fmt(neto, "USD")}</span>
              </div>
              <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "2px" }}>Neto = gastos que paga − honorarios que cobra.</div>
            </div>
          );
        })}
      </div>
      {hayFond && (
        <div style={{ ...S.panel, marginTop: "14px" }}>
          <div style={{ fontWeight: 800, fontSize: "13px", color: COLORS.gold, marginBottom: "10px" }}>💵 Quién puso la plata</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Quién</th>
              <th style={{ ...S.th, textAlign: "right" }}>Pesos</th>
              <th style={{ ...S.th, textAlign: "right" }}>Dólares</th>
              <th style={{ ...S.th, textAlign: "right" }}>Consol. USD</th>
              <th style={{ ...S.th, textAlign: "right" }}>Movs.</th>
            </tr></thead>
            <tbody>
              {porFondeador.map((f) => (
                <tr key={f.quien}>
                  <td style={S.td}>{f.quien}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{fmt(f.ars, "ARS")}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{fmt(f.usd, "USD")}</td>
                  <td style={{ ...S.td, textAlign: "right", color: COLORS.text }}>{fmt(f.cons, "USD")}</td>
                  <td style={{ ...S.td, textAlign: "right", color: COLORS.muted }}>{f.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "6px" }}>Cuánto puso cada persona/fondo en el período. Pesos y dólares no se suman; el consolidado usa el dólar de cada gasto.</div>
        </div>
      )}
      {(desarrollos && desarrollos.length > 0) && (
        <div style={{ ...S.panel, marginTop: "14px" }}>
          <div style={{ fontWeight: 800, fontSize: "13px", color: COLORS.gold, marginBottom: "4px" }}>📐 Prorrateo por desarrollo (por m²)</div>
          <div style={{ fontSize: "11px", color: COLORS.muted, marginBottom: "10px" }}>Reparte la estructura total (<b style={{ color: COLORS.text }}>{fmt(totalCons, "USD")}</b>{mes ? ` de ${mes}` : ""}) entre los desarrollos, proporcional a los m². Los m² salen de las unidades cargadas; podés ajustarlos acá.</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={S.th}>Desarrollo</th>
              <th style={{ ...S.th, textAlign: "right" }}>m²</th>
              <th style={{ ...S.th, textAlign: "right" }}>%</th>
              <th style={{ ...S.th, textAlign: "right" }}>Le toca (USD)</th>
            </tr></thead>
            <tbody>
              {desarrollos.map((d) => {
                const m2 = m2De(d);
                const pct = totM2 > 0 ? (m2 / totM2) * 100 : 0;
                const share = totM2 > 0 ? totalCons * (m2 / totM2) : 0;
                return (
                  <tr key={d.id}>
                    <td style={S.td}>{d.nombre}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <input style={{ ...S.input, width: "90px", textAlign: "right", display: "inline-block" }} type="number"
                        value={m2Over[d.id] !== undefined ? m2Over[d.id] : (d.m2 || "")}
                        onChange={(e) => setM2Over((o) => ({ ...o, [d.id]: e.target.value }))} placeholder="0" />
                    </td>
                    <td style={{ ...S.td, textAlign: "right", color: COLORS.muted }}>{pct.toFixed(1)}%</td>
                    <td style={{ ...S.td, textAlign: "right", color: COLORS.text, fontWeight: 700 }}>{fmt(share, "USD")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totM2 === 0 && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginTop: "6px" }}>No hay m² cargados. Cargá unidades con m² en el módulo Desarrollos, o escribí los m² acá arriba.</div>}
          <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "6px" }}>Total m²: {totM2.toLocaleString("es-AR")} · El prorrateo usa la estructura consolidada en USD (sin honorarios internos). Cambiá el mes de arriba para prorratear un período puntual.</div>
        </div>
      )}
      {sinTC && (
        <div style={{ ...S.panel, marginTop: "14px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", color: COLORS.amarillo }}>⚠️ Hay gastos en pesos sin dólar del día cargado. Para consolidarlos en USD poné un dólar de referencia:</span>
          <input style={{ ...S.input, width: "auto" }} type="number" value={tcRef} onChange={(e) => setTcRef(e.target.value)} placeholder="ej 1530" />
        </div>
      )}
    </div>
  );
}
// ─── estilos locales ──────────────────────────────────────────────────────────
const errBox = { background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo };
const okBox = { background: "rgba(34,197,94,0.12)", border: `1px solid ${COLORS.verde}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.verde };
const rowCard = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", padding: "10px", border: `1px solid ${COLORS.border}`, borderRadius: "8px", marginBottom: "8px" };
const lineRow = { display: "flex", justifyContent: "space-between", fontSize: "12px", color: COLORS.muted, padding: "2px 0" };
