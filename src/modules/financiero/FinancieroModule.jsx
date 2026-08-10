import { useState, useEffect } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { getDesarrollos } from "../../services/desarrollosRepo";
import { getContratos, saveContrato, deleteContrato } from "../../services/financieroRepo";

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

          {tab === "egresos" && <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>📤 Egresos — próxima pieza. Acá vas a cargar pagos a contratistas, materiales, terreno, impuestos y gastos, con estado fiscal (con factura / sin factura / pendiente).</div>}
          {tab === "ingresos" && <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>📥 Ingresos — próxima pieza. Acá vas a cargar aportes de inversores, reservas y cobranzas de clientes.</div>}
          {tab === "arqueo" && <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>⚖️ Arqueo — próxima pieza. Va a consolidar ingresos y egresos y mostrar la posición financiera del desarrollo.</div>}
        </>
      )}
    </div>
  );
}
