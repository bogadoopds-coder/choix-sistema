import { useState, useEffect } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { getObras } from "../../services/obrasRepo";
import {
  getDesarrollos, saveDesarrollo, deleteDesarrollo,
  getUnidades, saveUnidad, deleteUnidad,
  getClientes, getBoletos, getCuotas,
  crearBoletoConCuotas, anularBoleto, registrarPago,
} from "../../services/desarrollosRepo";

const ESTADOS_DEV = [
  { id: "pozo",         label: "Pozo",            color: COLORS.amarillo },
  { id: "construccion", label: "En construcción", color: COLORS.blue },
  { id: "terminado",    label: "Terminado",       color: COLORS.verde },
];

const ESTADOS_UNIDAD = [
  { id: "disponible", label: "Disponible", color: COLORS.verde },
  { id: "reservada",  label: "Reservada",  color: COLORS.amarillo },
  { id: "vendida",    label: "Vendida",    color: COLORS.blue },
];

const FORM_DEV_VACIO = { nombre: "", ubicacion: "", estado: "pozo", obraId: "", valorTierra: "", monedaTierra: "USD", pctIndirectos: "" };
const FORM_UNIDAD_VACIO = {
  codigo: "", tipologia: "", m2: "", piso: "", orientacion: "",
  estado: "disponible", precioLista: "", moneda: "USD",
};

function money(monto, moneda) {
  if (monto === null || monto === undefined || monto === "") return "—";
  const n = Number(monto);
  if (Number.isNaN(n)) return "—";
  return (moneda === "USD" ? "USD " : "$ ") + n.toLocaleString("es-AR");
}

// ─── MÓDULO DESARROLLOS (mitad inmobiliaria) ────────────────────────────────
export default function DesarrollosModule() {
  const { orgId } = useAuth();
  const [desarrollos, setDesarrollos] = useState([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(FORM_DEV_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null); // desarrollo abierto (vista unidades)
  const [obras, setObras] = useState([]);

  async function cargar() {
    if (!orgId) return;
    try {
      const lista = await getDesarrollos(orgId);
      lista.sort((a, b) => (a.id > b.id ? 1 : -1));
      setDesarrollos(lista);
    } catch (e) {
      setError("No se pudieron cargar los desarrollos.");
      console.error("Error cargando desarrollos:", e);
    }
    setReady(true);
  }

  useEffect(() => { cargar(); }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    getObras(orgId)
      .then((os) => setObras(Array.isArray(os) ? os : []))
      .catch(() => {});
  }, [orgId]);

  async function guardar() {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    setError("");
    try {
      await saveDesarrollo(orgId, {
        ...(editandoId ? { id: editandoId } : {}),
        nombre: form.nombre.trim(),
        ubicacion: form.ubicacion.trim(),
        estado: form.estado,
        obraId: form.obraId || null,
        valorTierra: form.valorTierra ? Number(form.valorTierra) : null,
        monedaTierra: form.monedaTierra || "USD",
        pctIndirectos: form.pctIndirectos ? Number(form.pctIndirectos) : null,
        ...(editandoId ? {} : { creadoEn: new Date().toISOString() }),
      });
      setForm(FORM_DEV_VACIO);
      setEditandoId(null);
      await cargar();
    } catch (e) {
      setError("No se pudo guardar. Revisá la conexión.");
      console.error("Error guardando desarrollo:", e);
    }
    setGuardando(false);
  }

  function editar(dev) {
    setEditandoId(dev.id);
    setForm({ nombre: dev.nombre || "", ubicacion: dev.ubicacion || "", estado: dev.estado || "pozo", obraId: dev.obraId || "", valorTierra: dev.valorTierra != null ? String(dev.valorTierra) : "", monedaTierra: dev.monedaTierra || "USD", pctIndirectos: dev.pctIndirectos != null ? String(dev.pctIndirectos) : "" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm(FORM_DEV_VACIO);
  }

  async function borrar(dev) {
    const ok = window.confirm(`¿Eliminar el desarrollo "${dev.nombre}"? Se borran también sus unidades.`);
    if (!ok) return;
    setError("");
    try {
      await deleteDesarrollo(orgId, dev.id);
      if (editandoId === dev.id) cancelarEdicion();
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar.");
      console.error("Error eliminando desarrollo:", e);
    }
  }

  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;

  // ── Vista detalle: unidades de un desarrollo ──
  if (detalle) {
    return <DetalleUnidades orgId={orgId} dev={detalle} onVolver={() => setDetalle(null)} />;
  }

  // ── Vista principal: cartera ──
  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>🏢 DESARROLLOS</span>
        <span style={S.tag(COLORS.blue)}>{desarrollos.length} desarrollo{desarrollos.length !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: COLORS.rojo }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "14px", alignItems: "start" }}>

        {/* ── Alta / edición ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>
            {editandoId ? `EDITAR ${editandoId.toUpperCase()}` : "NUEVO DESARROLLO"}
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <label style={S.label}>Nombre</label>
              <input style={S.input} placeholder="Ej: Torre Alvear" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Ubicación</label>
              <input style={S.input} placeholder="Ej: Alvear 1250, La Plata" value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Estado</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {ESTADOS_DEV.map((es) => (
                  <button key={es.id} onClick={() => setForm({ ...form, estado: es.id })}
                    style={{
                      ...S.btn(form.estado === es.id ? "blue" : undefined, true),
                      padding: "6px 10px", fontSize: "11px", cursor: "pointer",
                      borderColor: form.estado === es.id ? es.color : COLORS.border,
                      color: form.estado === es.id ? es.color : COLORS.muted,
                    }}>
                    {es.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Obra vinculada (opcional)</label>
              <select style={S.input} value={form.obraId}
                onChange={(e) => setForm({ ...form, obraId: e.target.value })}>
                <option value="">— Sin obra vinculada —</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ""}{o.nombre}</option>
                ))}
              </select>
            </div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: "10px", marginTop: "2px" }}>
              <div style={{ fontSize: "10.5px", color: COLORS.muted, marginBottom: "8px" }}>
                Datos para el cálculo de rentabilidad (opcionales). El valor de la tierra es el costo del terreno del proyecto, lo hayas pagado o no. Los costos indirectos son un estimado (impuestos, honorarios, comisiones, gastos) como % sobre el costo de obra.
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 2 }}>
                  <label style={S.label}>Valor de la tierra</label>
                  <input style={S.input} type="number" placeholder="Ej: 300000" value={form.valorTierra}
                    onChange={(e) => setForm({ ...form, valorTierra: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Moneda</label>
                  <select style={S.input} value={form.monedaTierra}
                    onChange={(e) => setForm({ ...form, monedaTierra: e.target.value })}>
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>Costos indirectos estimados (% sobre obra)</label>
                <input style={S.input} type="number" placeholder="Ej: 25" value={form.pctIndirectos}
                  onChange={(e) => setForm({ ...form, pctIndirectos: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ ...S.btn("gold"), flex: 1, padding: "8px", cursor: "pointer", opacity: !form.nombre.trim() || guardando ? 0.5 : 1 }}
                disabled={!form.nombre.trim() || guardando} onClick={guardar}>
                {guardando ? "GUARDANDO..." : editandoId ? "GUARDAR CAMBIOS" : "CREAR DESARROLLO"}
              </button>
              {editandoId && (
                <button style={{ ...S.btn(undefined, true), padding: "8px 12px", cursor: "pointer" }} onClick={cancelarEdicion}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Listado ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>CARTERA</div>
          {desarrollos.length === 0 ? (
            <div style={{ color: COLORS.muted, textAlign: "center", padding: "30px", fontSize: "12px" }}>
              Todavía no hay desarrollos.<br />Creá el primero con el formulario de la izquierda.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {desarrollos.map((dev) => {
                const es = ESTADOS_DEV.find((e) => e.id === dev.estado) || ESTADOS_DEV[0];
                return (
                  <div key={dev.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: COLORS.muted }}>{dev.id}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>{dev.nombre}</div>
                      {dev.ubicacion && <div style={{ fontSize: "11px", color: COLORS.muted }}>📍 {dev.ubicacion}</div>}
                      {dev.obraId && <div style={{ fontSize: "10px", color: COLORS.teal }}>🔗 {(obras.find((o) => o.id === dev.obraId)?.codigo) || dev.obraId}</div>}
                    </div>
                    <span style={S.tag(es.color)}>{es.label.toUpperCase()}</span>
                    <button onClick={() => setDetalle(dev)}
                      style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "4px 10px" }}>
                      Unidades →
                    </button>
                    <button onClick={() => editar(dev)}
                      style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: "6px", color: COLORS.text, cursor: "pointer", fontSize: "11px", padding: "4px 8px" }}>
                      Editar
                    </button>
                    <button onClick={() => borrar(dev)}
                      style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "12px", padding: "0 3px" }}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DETALLE: UNIDADES DE UN DESARROLLO ─────────────────────────────────────
function DetalleUnidades({ orgId, dev, onVolver }) {
  const [unidades, setUnidades] = useState([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(FORM_UNIDAD_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("unidades");

  async function cargar() {
    try {
      const lista = await getUnidades(orgId, dev.id);
      lista.sort((a, b) => (a.id > b.id ? 1 : -1));
      setUnidades(lista);
    } catch (e) {
      setError("No se pudieron cargar las unidades.");
      console.error("Error cargando unidades:", e);
    }
    setReady(true);
  }

  useEffect(() => { cargar(); }, [orgId, dev.id]);

  async function guardar() {
    if (!form.codigo.trim()) return;
    setGuardando(true);
    setError("");
    try {
      await saveUnidad(orgId, dev.id, {
        ...(editandoId ? { id: editandoId } : {}),
        codigo: form.codigo.trim(),
        tipologia: form.tipologia.trim(),
        m2: form.m2 === "" ? null : parseFloat(form.m2),
        piso: form.piso.trim(),
        orientacion: form.orientacion.trim(),
        estado: form.estado,
        precioLista: form.precioLista === "" ? null : parseFloat(form.precioLista),
        moneda: form.moneda,
      });
      setForm(FORM_UNIDAD_VACIO);
      setEditandoId(null);
      await cargar();
    } catch (e) {
      setError("No se pudo guardar la unidad.");
      console.error("Error guardando unidad:", e);
    }
    setGuardando(false);
  }

  function editar(u) {
    setEditandoId(u.id);
    setForm({
      codigo: u.codigo || "", tipologia: u.tipologia || "",
      m2: u.m2 ?? "", piso: u.piso || "", orientacion: u.orientacion || "",
      estado: u.estado || "disponible",
      precioLista: u.precioLista ?? "", moneda: u.moneda || "USD",
    });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm(FORM_UNIDAD_VACIO);
  }

  async function borrar(u) {
    const ok = window.confirm(`¿Eliminar la unidad "${u.codigo}"?`);
    if (!ok) return;
    setError("");
    try {
      await deleteUnidad(orgId, dev.id, u.id);
      if (editandoId === u.id) cancelarEdicion();
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar la unidad.");
      console.error("Error eliminando unidad:", e);
    }
  }

  const resumen = ESTADOS_UNIDAD.map((es) => ({
    ...es, count: unidades.filter((u) => u.estado === es.id).length,
  }));

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <button onClick={onVolver}
          style={{ ...S.btn(undefined, true), cursor: "pointer", fontSize: "11px", padding: "5px 10px" }}>
          ← Desarrollos
        </button>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>🏢 {dev.nombre}</span>
        <span style={{ fontSize: "11px", color: COLORS.muted }}>{dev.id}{dev.ubicacion ? ` · 📍 ${dev.ubicacion}` : ""}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {resumen.map((es) => (
            <span key={es.id} style={S.tag(es.color)}>{es.count} {es.label.toUpperCase()}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <button onClick={() => setTab("unidades")}
          style={{ ...S.btn(tab === "unidades" ? "blue" : undefined, true), padding: "6px 14px", fontSize: "11px", cursor: "pointer" }}>
          Unidades ({unidades.length})
        </button>
        <button onClick={() => setTab("boletos")}
          style={{ ...S.btn(tab === "boletos" ? "blue" : undefined, true), padding: "6px 14px", fontSize: "11px", cursor: "pointer" }}>
          Boletos
        </button>
      </div>

      {error && (
        <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: COLORS.rojo }}>
          {error}
        </div>
      )}

      {!ready ? (
        <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>
      ) : tab === "boletos" ? (
        <TabBoletos orgId={orgId} dev={dev} unidades={unidades} onCambio={cargar} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "14px", alignItems: "start" }}>

          {/* ── Alta / edición de unidad ── */}
          <div style={S.panel}>
            <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>
              {editandoId ? `EDITAR ${editandoId.toUpperCase()}` : "NUEVA UNIDAD"}
            </div>
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={S.label}>Código</label>
                  <input style={S.input} placeholder="Ej: 3A" value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Tipología</label>
                  <input style={S.input} placeholder="Ej: 2amb" value={form.tipologia}
                    onChange={(e) => setForm({ ...form, tipologia: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={S.label}>m²</label>
                  <input style={S.input} type="number" placeholder="Ej: 58" value={form.m2}
                    onChange={(e) => setForm({ ...form, m2: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Piso</label>
                  <input style={S.input} placeholder="Ej: 3" value={form.piso}
                    onChange={(e) => setForm({ ...form, piso: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Orientación</label>
                  <input style={S.input} placeholder="Ej: NE" value={form.orientacion}
                    onChange={(e) => setForm({ ...form, orientacion: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={S.label}>Estado</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {ESTADOS_UNIDAD.map((es) => (
                    <button key={es.id} onClick={() => setForm({ ...form, estado: es.id })}
                      style={{
                        ...S.btn(form.estado === es.id ? "blue" : undefined, true),
                        padding: "6px 10px", fontSize: "11px", cursor: "pointer",
                        borderColor: form.estado === es.id ? es.color : COLORS.border,
                        color: form.estado === es.id ? es.color : COLORS.muted,
                      }}>
                      {es.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "end" }}>
                <div>
                  <label style={S.label}>Precio de lista</label>
                  <input style={S.input} type="number" placeholder="Ej: 120000" value={form.precioLista}
                    onChange={(e) => setForm({ ...form, precioLista: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {["USD", "ARS"].map((m) => (
                    <button key={m} onClick={() => setForm({ ...form, moneda: m })}
                      style={{
                        ...S.btn(form.moneda === m ? "blue" : undefined, true),
                        padding: "7px 10px", fontSize: "11px", cursor: "pointer",
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ ...S.btn("gold"), flex: 1, padding: "8px", cursor: "pointer", opacity: !form.codigo.trim() || guardando ? 0.5 : 1 }}
                  disabled={!form.codigo.trim() || guardando} onClick={guardar}>
                  {guardando ? "GUARDANDO..." : editandoId ? "GUARDAR CAMBIOS" : "CREAR UNIDAD"}
                </button>
                {editandoId && (
                  <button style={{ ...S.btn(undefined, true), padding: "8px 12px", cursor: "pointer" }} onClick={cancelarEdicion}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Listado de unidades ── */}
          <div style={S.panel}>
            <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>
              UNIDADES ({unidades.length})
            </div>
            {unidades.length === 0 ? (
              <div style={{ color: COLORS.muted, textAlign: "center", padding: "30px", fontSize: "12px" }}>
                Este desarrollo todavía no tiene unidades.<br />Cargá la primera con el formulario de la izquierda.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {unidades.map((u) => {
                  const es = ESTADOS_UNIDAD.find((e) => e.id === u.estado) || ESTADOS_UNIDAD[0];
                  return (
                    <div key={u.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10px", color: COLORS.muted }}>{u.id}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>
                          {u.codigo}{u.tipologia ? ` · ${u.tipologia}` : ""}
                        </div>
                        <div style={{ fontSize: "11px", color: COLORS.muted }}>
                          {[u.m2 ? `${u.m2} m²` : null, u.piso ? `Piso ${u.piso}` : null, u.orientacion || null]
                            .filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: COLORS.gold, fontSize: "12px" }}>{money(u.precioLista, u.moneda)}</div>
                      </div>
                      <span style={S.tag(es.color)}>{es.label.toUpperCase()}</span>
                      <button onClick={() => editar(u)}
                        style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: "6px", color: COLORS.text, cursor: "pointer", fontSize: "11px", padding: "4px 8px" }}>
                        Editar
                      </button>
                      <button onClick={() => borrar(u)}
                        style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "12px", padding: "0 3px" }}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ESTADOS_CUOTA = {
  pendiente: { label: "PENDIENTE", color: COLORS.amarillo },
  pagada:    { label: "PAGADA",    color: COLORS.verde },
  mora:      { label: "MORA",      color: COLORS.rojo },
};

const FORM_BOLETO_VACIO = {
  unidadId: "", clienteId: "", montoTotal: "", moneda: "USD",
  plan: "fijo", anticipo: "", cantidadCuotas: "", primerVencimiento: "",
};

// ─── TAB BOLETOS: venta en pozo ─────────────────────────────────────────────
function TabBoletos({ orgId, dev, unidades, onCambio }) {
  const [boletos, setBoletos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(FORM_BOLETO_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(null);      // id del boleto expandido
  const [cuotasPorBoleto, setCuotasPorBoleto] = useState({});

  async function cargar() {
    try {
      const [bols, clis] = await Promise.all([
        getBoletos(orgId, dev.id),
        getClientes(orgId),
      ]);
      bols.sort((a, b) => (a.id > b.id ? 1 : -1));
      setBoletos(bols);
      setClientes(clis);
    } catch (e) {
      setError("No se pudieron cargar los boletos.");
      console.error("Error cargando boletos:", e);
    }
    setReady(true);
  }

  useEffect(() => { cargar(); }, [orgId, dev.id]);

  const disponibles = unidades.filter((u) => u.estado === "disponible");

  const financiado = (Number(form.montoTotal) || 0) - (Number(form.anticipo) || 0);
  const n = Number(form.cantidadCuotas) || 0;
  const previewCuota = financiado > 0 && n > 0 ? financiado / n : null;

  const puedeCrear = form.unidadId && form.clienteId
    && Number(form.montoTotal) > 0
    && (Number(form.anticipo) || 0) < Number(form.montoTotal)
    && n >= 1 && form.primerVencimiento;

  async function crear() {
    if (!puedeCrear || guardando) return;
    setGuardando(true);
    setError("");
    try {
      await crearBoletoConCuotas(orgId, dev.id, {
        unidadId: form.unidadId,
        clienteId: form.clienteId,
        montoTotal: Number(form.montoTotal),
        moneda: form.moneda,
        plan: form.plan,
        anticipo: Number(form.anticipo) || 0,
      }, {
        cantidadCuotas: n,
        primerVencimiento: form.primerVencimiento,
      });
      setForm(FORM_BOLETO_VACIO);
      await cargar();
      onCambio(); // refresca unidades en el padre (la unidad pasó a vendida)
    } catch (e) {
      setError(e.message || "No se pudo crear el boleto.");
      console.error("Error creando boleto:", e);
    }
    setGuardando(false);
  }

  async function toggleCuotas(bolId) {
    if (abierto === bolId) { setAbierto(null); return; }
    setAbierto(bolId);
    if (!cuotasPorBoleto[bolId]) {
      try {
        const cts = await getCuotas(orgId, dev.id, bolId);
        setCuotasPorBoleto((prev) => ({ ...prev, [bolId]: cts }));
      } catch (e) {
        console.error("Error cargando cuotas:", e);
      }
    }
  }

  async function pagar(bol, cuota) {
    const ok = window.confirm(`¿Registrar pago de la cuota ${cuota.numero} (${money(cuota.montoAjustado, bol.moneda)})?`);
    if (!ok) return;
    setError("");
    try {
      await registrarPago(orgId, {
        devId: dev.id, boletoId: bol.id, cuotaId: cuota.id,
        monto: cuota.montoAjustado,
      });
      const cts = await getCuotas(orgId, dev.id, bol.id);
      setCuotasPorBoleto((prev) => ({ ...prev, [bol.id]: cts }));
    } catch (e) {
      setError(e.message || "No se pudo registrar el pago.");
      console.error("Error registrando pago:", e);
    }
  }

  async function anular(bol) {
    const ok = window.confirm(`¿Anular el boleto ${bol.id}? Se borran sus cuotas y la unidad vuelve a disponible.`);
    if (!ok) return;
    setError("");
    try {
      await anularBoleto(orgId, dev.id, bol.id);
      setAbierto(null);
      await cargar();
      onCambio();
    } catch (e) {
      setError(e.message || "No se pudo anular el boleto.");
      console.error("Error anulando boleto:", e);
    }
  }

  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;

  return (
    <div>
      {error && (
        <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: COLORS.rojo }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "14px", alignItems: "start" }}>

        {/* ── Nuevo boleto ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>NUEVO BOLETO</div>
          {disponibles.length === 0 ? (
            <div style={{ color: COLORS.muted, fontSize: "12px", padding: "10px 0" }}>
              No hay unidades disponibles en este desarrollo.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              <div>
                <label style={S.label}>Unidad (solo disponibles)</label>
                <select style={S.input} value={form.unidadId}
                  onChange={(e) => setForm({ ...form, unidadId: e.target.value })}>
                  <option value="">— Elegir unidad —</option>
                  {disponibles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo}{u.tipologia ? ` · ${u.tipologia}` : ""}{u.m2 ? ` · ${u.m2} m²` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Cliente</label>
                <select style={S.input} value={form.clienteId}
                  onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                  <option value="">— Elegir cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "end" }}>
                <div>
                  <label style={S.label}>Monto total</label>
                  <input style={S.input} type="number" placeholder="Ej: 120000" value={form.montoTotal}
                    onChange={(e) => setForm({ ...form, montoTotal: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {["USD", "ARS"].map((m) => (
                    <button key={m} onClick={() => setForm({ ...form, moneda: m })}
                      style={{ ...S.btn(form.moneda === m ? "blue" : undefined, true), padding: "7px 10px", fontSize: "11px", cursor: "pointer" }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Plan</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["fijo", "USD", "CAC"].map((p) => (
                    <button key={p} onClick={() => setForm({ ...form, plan: p })}
                      style={{ ...S.btn(form.plan === p ? "blue" : undefined, true), padding: "6px 10px", fontSize: "11px", cursor: "pointer" }}>
                      {p}
                    </button>
                  ))}
                </div>
                {form.plan === "CAC" && (
                  <div style={{ fontSize: "10px", color: COLORS.amarillo, marginTop: "4px" }}>
                    ⚠ El recálculo por CAC todavía no está activo (pendiente de validación contable). Las cuotas se generan sin ajuste.
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={S.label}>Anticipo</label>
                  <input style={S.input} type="number" placeholder="Ej: 30000" value={form.anticipo}
                    onChange={(e) => setForm({ ...form, anticipo: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Cant. de cuotas</label>
                  <input style={S.input} type="number" placeholder="Ej: 24" value={form.cantidadCuotas}
                    onChange={(e) => setForm({ ...form, cantidadCuotas: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={S.label}>Primer vencimiento</label>
                <input style={S.input} type="date" value={form.primerVencimiento}
                  onChange={(e) => setForm({ ...form, primerVencimiento: e.target.value })} />
              </div>
              {previewCuota !== null && (
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  Financiado: <span style={{ color: COLORS.text, fontWeight: 700 }}>{money(financiado, form.moneda)}</span>
                  {" "}→ {n} cuota{n !== 1 ? "s" : ""} de ≈ <span style={{ color: COLORS.gold, fontWeight: 700 }}>{money(previewCuota, form.moneda)}</span>
                </div>
              )}
              <button style={{ ...S.btn("gold"), padding: "8px", cursor: "pointer", opacity: !puedeCrear || guardando ? 0.5 : 1 }}
                disabled={!puedeCrear || guardando} onClick={crear}>
                {guardando ? "CREANDO..." : "CREAR BOLETO"}
              </button>
            </div>
          )}
        </div>

        {/* ── Listado de boletos ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>
            BOLETOS ({boletos.length})
          </div>
          {boletos.length === 0 ? (
            <div style={{ color: COLORS.muted, textAlign: "center", padding: "30px", fontSize: "12px" }}>
              Este desarrollo todavía no tiene boletos.<br />Creá el primero con el formulario de la izquierda.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {boletos.map((bol) => {
                const uni = unidades.find((u) => u.id === bol.unidadId);
                const cli = clientes.find((c) => c.id === bol.clienteId);
                const cts = cuotasPorBoleto[bol.id] || [];
                const pagadas = cts.filter((c) => c.estado === "pagada").length;
                return (
                  <div key={bol.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10px", color: COLORS.muted }}>{bol.id} · {bol.fecha}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>
                          {uni ? `Unidad ${uni.codigo}` : bol.unidadId} → {cli ? cli.nombre : bol.clienteId}
                        </div>
                        <div style={{ fontSize: "11px", color: COLORS.muted }}>
                          {money(bol.montoTotal, bol.moneda)} · anticipo {money(bol.anticipo, bol.moneda)} · {bol.cantidadCuotas} cuotas · plan {bol.plan}
                        </div>
                      </div>
                      <button onClick={() => toggleCuotas(bol.id)}
                        style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "4px 10px" }}>
                        {abierto === bol.id ? "Ocultar cuotas" : "Ver cuotas"}
                      </button>
                      <button onClick={() => anular(bol)}
                        style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: "6px", color: COLORS.rojo, cursor: "pointer", fontSize: "11px", padding: "4px 8px" }}>
                        Anular
                      </button>
                    </div>
                    {abierto === bol.id && (
                      <div style={{ borderTop: `1px solid ${COLORS.border}30`, marginTop: "8px", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "3px" }}>
                        {cts.length === 0 ? (
                          <div style={{ fontSize: "11px", color: COLORS.muted }}>Cargando cuotas...</div>
                        ) : (
                          <>
                            <div style={{ fontSize: "10px", color: COLORS.muted, marginBottom: "4px" }}>
                              {pagadas}/{cts.length} pagadas · montos sin ajuste aplicado (indiceAjuste pendiente)
                            </div>
                            {cts.map((c) => {
                              const ec = ESTADOS_CUOTA[c.estado] || ESTADOS_CUOTA.pendiente;
                              return (
                                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                                  <span style={{ color: COLORS.muted, minWidth: "36px" }}>#{c.numero}</span>
                                  <span style={{ color: COLORS.muted, minWidth: "80px" }}>{c.vencimiento}</span>
                                  <span style={{ fontWeight: 600, minWidth: "100px" }}>{money(c.montoAjustado, bol.moneda)}</span>
                                  <span style={S.tag(ec.color)}>{ec.label}</span>
                                  {c.estado === "pendiente" && (
                                    <button onClick={() => pagar(bol, c)}
                                      style={{ ...S.btn(undefined, true), cursor: "pointer", fontSize: "10px", padding: "2px 8px", marginLeft: "auto" }}>
                                      Registrar pago
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
