import { useState, useEffect, useMemo } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { getClientes, saveCliente, deleteCliente, getDesarrollos } from "../../services/desarrollosRepo";
import { analizarConversacion } from "../../services/ai/analizarConversacion";

const TIPOS = [
  { id: "interesado", label: "Interesado", color: COLORS.amarillo },
  { id: "comprador",  label: "Comprador",  color: COLORS.verde },
  { id: "inversor",   label: "Inversor",   color: COLORS.blue },
];
const ESTADOS = [
  { id: "nuevo",         label: "Nuevo",          color: COLORS.blue },
  { id: "contactado",    label: "Contactado",     color: COLORS.blue },
  { id: "negociacion",   label: "En negociación", color: COLORS.amarillo },
  { id: "reservo",       label: "Reservó",        color: COLORS.verde },
  { id: "comprador",     label: "Comprador",      color: COLORS.verde },
  { id: "sin_respuesta", label: "Sin respuesta",  color: COLORS.muted },
  { id: "descartado",    label: "Descartado",     color: COLORS.muted },
];
const CALIFICACIONES = [
  { id: "alta",  label: "Alta",  color: COLORS.verde },
  { id: "media", label: "Media", color: COLORS.amarillo },
  { id: "baja",  label: "Baja",  color: COLORS.muted },
];
const CANALES = [
  { id: "whatsapp",   label: "WhatsApp" },
  { id: "instagram",  label: "Instagram" },
  { id: "mail",       label: "Mail" },
  { id: "web",        label: "Web" },
  { id: "referido",   label: "Referido" },
  { id: "presencial", label: "Presencial" },
  { id: "otro",       label: "Otro" },
];

const FORM_VACIO = { nombre: "", contacto: "", tipo: "interesado", origen: "", canal: "", devId: "" };

// ─── MÓDULO CLIENTES (CRM mínimo — mitad inmobiliaria) ─────────────────────
export default function ClientesModule() {
  const { orgId } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState(null);
  const [fichaAbierta, setFichaAbierta] = useState(null);
  const [fichaForm, setFichaForm] = useState({});
  const [guardandoFicha, setGuardandoFicha] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState(null);
  const [filtroCalificacion, setFiltroCalificacion] = useState(null);
  const [desarrollos, setDesarrollos] = useState([]);
  const [conversacion, setConversacion] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis] = useState(null);
  const [panelConv, setPanelConv] = useState(false);

  async function cargar() {
    if (!orgId) return;
    try {
      const lista = await getClientes(orgId);
      setClientes(lista);
    } catch (e) {
      setError("No se pudieron cargar los clientes.");
      console.error("Error cargando clientes:", e);
    }
    setReady(true);
  }

  useEffect(() => { cargar(); }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    getDesarrollos(orgId).then(setDesarrollos).catch(() => setDesarrollos([]));
  }, [orgId]);

  async function guardar() {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    setError("");
    try {
      await saveCliente(orgId, {
        ...(editandoId ? { id: editandoId } : {}),
        nombre: form.nombre.trim(),
        contacto: form.contacto.trim(),
        tipo: form.tipo,
        origen: form.origen.trim(),
        canal: form.canal || "",
        devId: form.devId || "",
        ultimaInteraccion: new Date().toISOString(),
        ...(editandoId ? {} : { creadoEn: new Date().toISOString() }),
      });
      setForm(FORM_VACIO);
      setEditandoId(null);
      await cargar();
    } catch (e) {
      setError("No se pudo guardar. Revisá la conexión.");
      console.error("Error guardando cliente:", e);
    }
    setGuardando(false);
  }

  function editar(cli) {
    setEditandoId(cli.id);
    setForm({ nombre: cli.nombre || "", contacto: cli.contacto || "", tipo: cli.tipo || "interesado", origen: cli.origen || "", canal: cli.canal || "", devId: cli.devId || "" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm(FORM_VACIO);
  }

  async function borrar(cli) {
    const ok = window.confirm(`¿Eliminar el cliente "${cli.nombre}"?`);
    if (!ok) return;
    setError("");
    try {
      await deleteCliente(orgId, cli.id);
      if (editandoId === cli.id) cancelarEdicion();
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar.");
      console.error("Error eliminando cliente:", e);
    }
  }

  function abrirFicha(cli) {
    setFichaAbierta(cli);
    setConversacion("");
    setAnalisis(null);
    setPanelConv(false);
    setFichaForm({
      estado: cli.estado || "nuevo",
      calificacion: cli.calificacion || "",
      tipologiaBuscada: cli.tipologiaBuscada || "",
      presupuestoEstimado: cli.presupuestoEstimado || "",
      formaPago: cli.formaPago || "",
      motivo: cli.motivo || "",
      vendedor: cli.vendedor || "",
      proximaAccion: cli.proximaAccion || "",
      notas: cli.notas || "",
    });
  }
  async function analizar() {
    if (!conversacion.trim() || !fichaAbierta) return;
    setAnalizando(true);
    setError("");
    setAnalisis(null);
    const dev = desarrollos.find((d) => d.id === fichaAbierta.devId);
    const res = await analizarConversacion(conversacion, {
      nombre: fichaAbierta.nombre,
      desarrollo: dev ? dev.nombre : "",
    });
    if (res.ok) {
      const d = res.datos;
      setAnalisis(d);
      setFichaForm((f) => ({
        ...f,
        estado: d.estado || f.estado,
        tipologiaBuscada: d.tipologiaBuscada || f.tipologiaBuscada,
        presupuestoEstimado: d.presupuestoEstimado || f.presupuestoEstimado,
        formaPago: d.formaPago || f.formaPago,
        motivo: d.motivo || f.motivo,
        proximaAccion: d.proximaAccion || f.proximaAccion,
        notas: [f.notas, d.resumen ? `[Resumen del agente] ${d.resumen}` : ""].filter(Boolean).join("\n\n"),
      }));
    } else {
      setError(res.error);
    }
    setAnalizando(false);
  }
  async function guardarFicha() {
    if (!fichaAbierta) return;
    setGuardandoFicha(true);
    setError("");
    try {
      await saveCliente(orgId, {
        id: fichaAbierta.id,
        ...fichaForm,
        ...(analisis?.calificacionSugerida ? { calificacionSugerida: analisis.calificacionSugerida } : {}),
        ...(analisis?.fundamentoCalificacion ? { fundamentoCalificacion: analisis.fundamentoCalificacion } : {}),
        ...(analisis?.telefono ? { telefono: analisis.telefono } : {}),
        ...(analisis?.email ? { email: analisis.email } : {}),
        ultimaInteraccion: new Date().toISOString(),
      });
      setFichaAbierta(null);
      setFichaForm({});
      await cargar();
    } catch (e) {
      setError("No se pudo guardar la ficha.");
      console.error("Error guardando ficha:", e);
    }
    setGuardandoFicha(false);
  }

  const filtrados = useMemo(() => {
    return clientes.filter((c) => {
      if (filtroTipo && c.tipo !== filtroTipo) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (c.nombre || "").toLowerCase().includes(q)
          || (c.contacto || "").toLowerCase().includes(q)
          || (c.origen || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [clientes, busqueda, filtroTipo]);

  const prioritarios = useMemo(() => {
    const hoy = Date.now();
    const dias = (iso) => {
      if (!iso) return null;
      const t = Date.parse(iso);
      if (isNaN(t)) return null;
      return Math.floor((hoy - t) / 86400000);
    };
    const UMBRAL = { alta: 3, media: 7, baja: 15 };
    return clientes
      .filter((c) => !["descartado", "comprador", "reservo"].includes(c.estado))
      .map((c) => {
        const d = dias(c.ultimaInteraccion);
        const cal = c.calificacion || "baja";
        const umbral = UMBRAL[cal] ?? 15;
        const vencido = d !== null && d >= umbral;
        const sinContacto = d === null;
        // peso: calificación primero, días después
        const peso = (cal === "alta" ? 300 : cal === "media" ? 200 : 100) + Math.min(d ?? 99, 99);
        return { ...c, _dias: d, _vencido: vencido || sinContacto, _peso: peso };
      })
      .filter((c) => c._vencido || c.proximaAccion)
      .sort((a, b) => b._peso - a._peso)
      .slice(0, 8);
  }, [clientes]);
  const resumen = TIPOS.map((t) => ({ ...t, count: clientes.filter((c) => c.tipo === t.id).length }));

  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>👥 CLIENTES</span>
        <span style={S.tag(COLORS.blue)}>{clientes.length} en total</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
          {resumen.map((t) => (
            <span key={t.id} onClick={() => setFiltroTipo(filtroTipo === t.id ? null : t.id)}
              style={{ ...S.tag(t.color), cursor: "pointer", opacity: filtroTipo && filtroTipo !== t.id ? 0.4 : 1 }}>
              {t.count} {t.label.toUpperCase()}{t.count !== 1 ? "S" : ""}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: COLORS.rojo }}>
          {error}
        </div>
      )}

      {prioritarios.length > 0 && (
        <div style={{ ...S.panel, marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontWeight: 700, color: COLORS.gold, fontSize: "12px" }}>🔔 A CONTACTAR HOY</span>
            <span style={S.tag(COLORS.amarillo)}>{prioritarios.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {prioritarios.map((c) => {
              const cal = CALIFICACIONES.find((x) => x.id === c.calificacion) || null;
              const est = ESTADOS.find((x) => x.id === c.estado) || null;
              return (
                <div key={c.id} onClick={() => abrirFicha(c)}
                  style={{ background: COLORS.subtle, borderRadius: "6px", padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700 }}>{c.nombre}</div>
                    <div style={{ fontSize: "10px", color: COLORS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.proximaAccion || "Sin próxima acción definida"}
                      {c.vendedor ? ` · ${c.vendedor}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: "10px", color: c._dias === null ? COLORS.amarillo : c._vencido ? COLORS.rojo : COLORS.muted, whiteSpace: "nowrap" }}>
                    {c._dias === null ? "sin contacto" : c._dias === 0 ? "hoy" : `hace ${c._dias}d`}
                  </span>
                  {cal && <span style={S.tag(cal.color)}>{cal.label.toUpperCase()}</span>}
                  {est && <span style={S.tag(est.color)}>{est.label.toUpperCase()}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "14px", alignItems: "start" }}>

        {/* ── Alta / edición ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>
            {editandoId ? `EDITAR ${editandoId.toUpperCase()}` : "NUEVO CLIENTE"}
          </div>
          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <label style={S.label}>Nombre</label>
              <input style={S.input} placeholder="Ej: Juan Pérez" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Contacto (tel / mail)</label>
              <input style={S.input} placeholder="Ej: 221-555-0000 / juan@mail.com" value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Tipo</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {TIPOS.map((t) => (
                  <button key={t.id} onClick={() => setForm({ ...form, tipo: t.id })}
                    style={{
                      ...S.btn(form.tipo === t.id ? "blue" : undefined, true),
                      padding: "6px 10px", fontSize: "11px", cursor: "pointer",
                      borderColor: form.tipo === t.id ? t.color : COLORS.border,
                      color: form.tipo === t.id ? t.color : COLORS.muted,
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Canal de ingreso</label>
              <select style={S.input} value={form.canal}
                onChange={(e) => setForm({ ...form, canal: e.target.value })}>
                <option value="">— sin especificar —</option>
                {CANALES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Desarrollo consultado</label>
              <select style={S.input} value={form.devId}
                onChange={(e) => setForm({ ...form, devId: e.target.value })}>
                <option value="">— ninguno —</option>
                {desarrollos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre || d.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Origen</label>
              <input style={S.input} placeholder="Ej: Recomendado / Instagram / Inmobiliaria X" value={form.origen}
                onChange={(e) => setForm({ ...form, origen: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ ...S.btn("gold"), flex: 1, padding: "8px", cursor: "pointer", opacity: !form.nombre.trim() || guardando ? 0.5 : 1 }}
                disabled={!form.nombre.trim() || guardando} onClick={guardar}>
                {guardando ? "GUARDANDO..." : editandoId ? "GUARDAR CAMBIOS" : "CREAR CLIENTE"}
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: "12px" }}>CARTERA ({filtrados.length})</div>
            <input style={{ ...S.input, flex: 1, marginLeft: "auto", maxWidth: "220px" }}
              placeholder="Buscar por nombre, contacto, origen..."
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          {filtrados.length === 0 ? (
            <div style={{ color: COLORS.muted, textAlign: "center", padding: "30px", fontSize: "12px" }}>
              {clientes.length === 0
                ? <>Todavía no hay clientes.<br />Creá el primero con el formulario de la izquierda.</>
                : "Ningún cliente coincide con la búsqueda o el filtro."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtrados.map((cli) => {
                const t = TIPOS.find((x) => x.id === cli.tipo) || TIPOS[0];
                const est = ESTADOS.find((x) => x.id === cli.estado) || null;
                const cal = CALIFICACIONES.find((x) => x.id === cli.calificacion) || null;
                const can = CANALES.find((x) => x.id === cli.canal) || null;
                const dev = desarrollos.find((d) => d.id === cli.devId) || null;
                return (
                  <div key={cli.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: COLORS.muted }}>{cli.id}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>{cli.nombre}</div>
                      <div style={{ fontSize: "11px", color: COLORS.muted }}>
                        {[
                          cli.contacto || null,
                          can ? can.label : null,
                          dev ? dev.nombre || dev.id : null,
                          cli.origen ? `Origen: ${cli.origen}` : null,
                        ].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    {cal && <span style={S.tag(cal.color)} title="Calificación">{cal.label.toUpperCase()}</span>}
                    {est && <span style={S.tag(est.color)} title="Estado">{est.label.toUpperCase()}</span>}
                    <span style={S.tag(t.color)}>{t.label.toUpperCase()}</span>
                    <button onClick={() => abrirFicha(cli)}
                      style={{ background: "none", border: `1px solid ${COLORS.gold}`, borderRadius: "6px", color: COLORS.gold, cursor: "pointer", fontSize: "11px", padding: "4px 8px" }}>
                      Ficha
                    </button>
                    <button onClick={() => editar(cli)}
                      style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: "6px", color: COLORS.text, cursor: "pointer", fontSize: "11px", padding: "4px 8px" }}>
                      Editar
                    </button>
                    <button onClick={() => borrar(cli)}
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
      {fichaAbierta && (
        <div onClick={() => setFichaAbierta(null)}
          style={{ position: "fixed", inset: 0, background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ ...S.panel, width: "min(560px, 100%)", maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ fontWeight: 800, color: COLORS.gold, fontSize: "14px" }}>{fichaAbierta.nombre}</div>
              <div style={{ fontSize: "10px", color: COLORS.muted }}>{fichaAbierta.id}</div>
              <button onClick={() => setFichaAbierta(null)}
                style={{ marginLeft: "auto", background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: "6px", padding: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.gold }}>ANALIZAR CONVERSACIÓN</span>
                  <button onClick={() => setPanelConv(!panelConv)}
                    style={{ marginLeft: "auto", background: "none", border: `1px solid ${COLORS.border}`, borderRadius: "6px", color: COLORS.text, cursor: "pointer", fontSize: "11px", padding: "3px 8px" }}>
                    {panelConv ? "Ocultar" : "Pegar chat"}
                  </button>
                </div>
                {panelConv && (
                  <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                    <textarea style={{ ...S.input, minHeight: "110px", resize: "vertical", fontFamily: "inherit", fontSize: "11px" }}
                      placeholder="Pegá acá la conversación de WhatsApp, Instagram o mail"
                      value={conversacion}
                      onChange={(e) => setConversacion(e.target.value)} />
                    <button style={{ ...S.btn("blue"), padding: "7px", cursor: "pointer", opacity: !conversacion.trim() || analizando ? 0.5 : 1 }}
                      disabled={!conversacion.trim() || analizando} onClick={analizar}>
                      {analizando ? "ANALIZANDO..." : "ANALIZAR Y COMPLETAR FICHA"}
                    </button>
                  </div>
                )}
                {analisis && (
                  <div style={{ marginTop: "8px", fontSize: "11px", color: COLORS.text, display: "grid", gap: "5px" }}>
                    <div>
                      <strong style={{ color: COLORS.gold }}>Calificación sugerida: {(analisis.calificacionSugerida || "—").toUpperCase()}</strong>
                    </div>
                    {analisis.fundamentoCalificacion && <div style={{ color: COLORS.muted }}>{analisis.fundamentoCalificacion}</div>}
                    {analisis.alertas && (
                      <div style={{ color: COLORS.amarillo }}>⚠ {analisis.alertas}</div>
                    )}
                    <div style={{ color: COLORS.muted, fontSize: "10px" }}>
                      Los campos de abajo se completaron con el análisis. Revisalos antes de guardar.
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={S.label}>Estado</label>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {ESTADOS.map((e) => (
                    <button key={e.id} onClick={() => setFichaForm({ ...fichaForm, estado: e.id })}
                      style={{ ...S.btn(undefined, true), padding: "5px 9px", fontSize: "11px", cursor: "pointer",
                        borderColor: fichaForm.estado === e.id ? e.color : COLORS.border,
                        color: fichaForm.estado === e.id ? e.color : COLORS.muted }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Calificación</label>
                <div style={{ display: "flex", gap: "5px" }}>
                  {CALIFICACIONES.map((c) => (
                    <button key={c.id} onClick={() => setFichaForm({ ...fichaForm, calificacion: c.id })}
                      style={{ ...S.btn(undefined, true), padding: "5px 12px", fontSize: "11px", cursor: "pointer",
                        borderColor: fichaForm.calificacion === c.id ? c.color : COLORS.border,
                        color: fichaForm.calificacion === c.id ? c.color : COLORS.muted }}>
                      {c.label}
                    </button>
                  ))}
                </div>
                {fichaAbierta.calificacionSugerida && (
                  <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "5px" }}>
                    Sugerida por el agente: <strong>{fichaAbierta.calificacionSugerida}</strong>
                    {fichaAbierta.fundamentoCalificacion ? ` — ${fichaAbierta.fundamentoCalificacion}` : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={S.label}>Tipología buscada</label>
                  <input style={S.input} placeholder="Ej: 2 ambientes" value={fichaForm.tipologiaBuscada}
                    onChange={(e) => setFichaForm({ ...fichaForm, tipologiaBuscada: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Presupuesto estimado</label>
                  <input style={S.input} placeholder="Ej: USD 90.000" value={fichaForm.presupuestoEstimado}
                    onChange={(e) => setFichaForm({ ...fichaForm, presupuestoEstimado: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Forma de pago</label>
                  <input style={S.input} placeholder="Ej: anticipo + 24 cuotas" value={fichaForm.formaPago}
                    onChange={(e) => setFichaForm({ ...fichaForm, formaPago: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Motivo</label>
                  <select style={S.input} value={fichaForm.motivo}
                    onChange={(e) => setFichaForm({ ...fichaForm, motivo: e.target.value })}>
                    <option value="">— sin especificar —</option>
                    <option value="vivienda">Vivienda</option>
                    <option value="inversion">Inversión</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Vendedor responsable</label>
                  <input style={S.input} placeholder="Ej: Agustín" value={fichaForm.vendedor}
                    onChange={(e) => setFichaForm({ ...fichaForm, vendedor: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Próxima acción</label>
                  <input style={S.input} placeholder="Ej: llamar el lunes" value={fichaForm.proximaAccion}
                    onChange={(e) => setFichaForm({ ...fichaForm, proximaAccion: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={S.label}>Notas</label>
                <textarea style={{ ...S.input, minHeight: "70px", resize: "vertical", fontFamily: "inherit" }}
                  placeholder="Lo que haga falta recordar de este interesado"
                  value={fichaForm.notas}
                  onChange={(e) => setFichaForm({ ...fichaForm, notas: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{ ...S.btn("gold"), flex: 1, padding: "8px", cursor: "pointer", opacity: guardandoFicha ? 0.5 : 1 }}
                  disabled={guardandoFicha} onClick={guardarFicha}>
                  {guardandoFicha ? "GUARDANDO..." : "GUARDAR FICHA"}
                </button>
                <button style={{ ...S.btn(undefined, true), padding: "8px 12px", cursor: "pointer" }}
                  onClick={() => setFichaAbierta(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
