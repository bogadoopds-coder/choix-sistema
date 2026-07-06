import { useState, useEffect } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { getDesarrollos, saveDesarrollo, deleteDesarrollo } from "../../services/desarrollosRepo";

const ESTADOS = [
  { id: "pozo",         label: "Pozo",            color: COLORS.amarillo },
  { id: "construccion", label: "En construcción", color: COLORS.blue },
  { id: "terminado",    label: "Terminado",       color: COLORS.verde },
];

const FORM_VACIO = { nombre: "", ubicacion: "", estado: "pozo" };

// ─── MÓDULO DESARROLLOS (mitad inmobiliaria) ────────────────────────────────
export default function DesarrollosModule() {
  const { orgId } = useAuth();
  const [desarrollos, setDesarrollos] = useState([]);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

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
        ...(editandoId ? {} : { creadoEn: new Date().toISOString() }),
      });
      setForm(FORM_VACIO);
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
    setForm({ nombre: dev.nombre || "", ubicacion: dev.ubicacion || "", estado: dev.estado || "pozo" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setForm(FORM_VACIO);
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
                {ESTADOS.map((es) => (
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
                const es = ESTADOS.find((e) => e.id === dev.estado) || ESTADOS[0];
                return (
                  <div key={dev.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: COLORS.muted }}>{dev.id}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>{dev.nombre}</div>
                      {dev.ubicacion && <div style={{ fontSize: "11px", color: COLORS.muted }}>📍 {dev.ubicacion}</div>}
                    </div>
                    <span style={S.tag(es.color)}>{es.label.toUpperCase()}</span>
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
