import { useState, useEffect, useMemo } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { getClientes, saveCliente, deleteCliente } from "../../services/desarrollosRepo";

const TIPOS = [
  { id: "lead",      label: "Lead",      color: COLORS.amarillo },
  { id: "comprador", label: "Comprador", color: COLORS.verde },
  { id: "inversor",  label: "Inversor",  color: COLORS.blue },
];

const FORM_VACIO = { nombre: "", contacto: "", tipo: "lead", origen: "" };

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

  async function cargar() {
    if (!orgId) return;
    try {
      const lista = await getClientes(orgId);
      lista.sort((a, b) => (a.id > b.id ? 1 : -1));
      setClientes(lista);
    } catch (e) {
      setError("No se pudieron cargar los clientes.");
      console.error("Error cargando clientes:", e);
    }
    setReady(true);
  }

  useEffect(() => { cargar(); }, [orgId]);

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
    setForm({ nombre: cli.nombre || "", contacto: cli.contacto || "", tipo: cli.tipo || "lead", origen: cli.origen || "" });
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
              {t.count} {t.label.toUpperCase()}{t.count !== 1 && t.id !== "lead" ? "ES" : t.count !== 1 && t.id === "lead" ? "S" : ""}
            </span>
          ))}
        </div>
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
                return (
                  <div key={cli.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", color: COLORS.muted }}>{cli.id}</div>
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>{cli.nombre}</div>
                      <div style={{ fontSize: "11px", color: COLORS.muted }}>
                        {[cli.contacto || null, cli.origen ? `Origen: ${cli.origen}` : null].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <span style={S.tag(t.color)}>{t.label.toUpperCase()}</span>
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
    </div>
  );
}
