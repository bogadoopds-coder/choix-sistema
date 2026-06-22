import { useState, useEffect } from "react";
import { today } from "../../utils/date";
import { uid } from "../../utils/id";
import { COLORS, S } from "../../styles/theme";
import { storage } from "../../services/storage";
import ProjectsList from "./ProjectsList";
import ProjectView from "./ProjectView";
import { GestorPrecios } from "../prices/PricesModule";
import { useAuth } from "../../auth/AuthContext";
import { getObras, saveObra, deleteObra, saveItems } from "../../services/obrasRepo";

// ─── NUEVO PROYECTO ───────────────────────────────────────────────────────────
function NuevoProyecto({ onCrear, onCancel }) {
  const [form, setForm] = useState({ codigo: "OBR-001", nombre: "", cliente: "", fechaInicio: today(), fechaFin: "", iccPct: "15" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ok = form.nombre && form.cliente && form.fechaInicio;
  return (
    <div style={{ ...S.panel, maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ fontWeight: 800, color: COLORS.gold, marginBottom: "20px", fontSize: "14px" }}>NUEVA OBRA</div>
      <div style={{ display: "grid", gap: "14px" }}>
        {[["Código de obra", "codigo", "text"], ["Nombre de obra", "nombre", "text"], ["Cliente / Comitente", "cliente", "text"], ["Fecha inicio", "fechaInicio", "date"], ["Fecha fin estimada", "fechaFin", "date"]].map(([lbl, key, type]) => (
          <div key={key}>
            <label style={S.label}>{lbl}</label>
            <input style={S.input} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div>
          <label style={S.label}>Ajuste ICC propio ({form.iccPct}%)</label>
          <input style={S.input} type="range" min="0" max="60" step="0.5" value={form.iccPct} onChange={(e) => set("iccPct", e.target.value)} />
          <div style={{ color: COLORS.gold, fontSize: "11px", marginTop: "3px" }}>Factor acumulado: ×{(1 + form.iccPct / 100).toFixed(3)} sobre precios ago-2025</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button style={S.btn()} disabled={!ok} onClick={() => onCrear({ ...form, iccPct: parseFloat(form.iccPct) })}>CREAR OBRA</button>
        <button style={S.btn("", false)} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── MAIN MODULE ─────────────────────────────────────────────────────────────
export default function PresupuestosModule({ BASE }) {
  const { orgId } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("lista");
  const [storageReady, setStorageReady] = useState(false);
  const [preciosActualizados, setPreciosActualizados] = useState({});
  const [huboCambioUsuario, setHuboCambioUsuario] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (orgId) {
          const obras = await getObras(orgId);
          setProyectos(obras);
        }
      } catch {}
      try {
        const r2 = await storage.get("choix_precios");
        if (r2?.value) setPreciosActualizados(JSON.parse(r2.value));
      } catch {}
      setStorageReady(true);
    })();
  }, [orgId]);

  useEffect(() => {
    // Desactivado: la persistencia de proyectos ahora se hace en Firestore vía el repo
    // (saveObra/saveItems/deleteObra) dentro de crearProyecto/updateProyecto/deleteProyecto.
    return;
    // eslint-disable-next-line no-unreachable
    if (!storageReady) return;
    if (!huboCambioUsuario) return;
    (async () => {
      try {
        await storage.set("choix_proyectos", JSON.stringify(proyectos));
      } catch {}
    })();
  }, [proyectos, storageReady, huboCambioUsuario]);

  useEffect(() => {
    if (!storageReady) return;
    (async () => {
      try {
        await storage.set("choix_precios", JSON.stringify(preciosActualizados));
      } catch {}
    })();
  }, [preciosActualizados, storageReady]);

  const activeProyecto = proyectos.find((p) => p.id === activeId);

  async function crearProyecto(data) {
    const np = { id: uid(), ...data, iccPct: data.iccPct || 15, items: [], creadoEn: today() };
    setHuboCambioUsuario(true);
    setProyectos((ps) => [...ps, np]);
    setActiveId(np.id);
    setView("proyecto");
    try { await saveObra(orgId, np); } catch (e) { console.error("Error creando obra:", e); }
  }

  async function updateProyecto(id, patch) {
    setHuboCambioUsuario(true);
    setProyectos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      const actual = proyectos.find((p) => p.id === id);
      const merged = { ...actual, ...patch };
      await saveObra(orgId, merged);
      if (patch.items) await saveItems(orgId, id, merged.items);
    } catch (e) { console.error("Error guardando obra:", e); }
  }

  async function deleteProyecto(id) {
    setHuboCambioUsuario(true);
    setProyectos((ps) => ps.filter((p) => p.id !== id));
    if (activeId === id) { setActiveId(null); setView("lista"); }
    try { await deleteObra(orgId, id); } catch (e) { console.error("Error borrando obra:", e); }
  }

  if (!storageReady)
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: COLORS.muted }}>Cargando...</span>
      </div>
    );

  return (
    <div style={{ ...S.app, height: "100%", overflow: "auto" }}>
      <div style={{ padding: "16px", maxWidth: "1200px", margin: "0 auto" }}>
        {view === "lista" && <ProjectsList proyectos={proyectos} preciosActualizados={preciosActualizados} setActiveId={setActiveId} setView={setView} deleteProyecto={deleteProyecto} />}
        {view === "nuevo" && <NuevoProyecto onCrear={crearProyecto} onCancel={() => setView("lista")} />}
        {view === "proyecto" && activeProyecto && <ProjectView proyecto={activeProyecto} updateProyecto={updateProyecto} preciosActualizados={preciosActualizados} BASE={BASE} />}
        {view === "precios" && <GestorPrecios preciosActualizados={preciosActualizados} setPreciosActualizados={setPreciosActualizados} BASE={BASE} />}
      </div>
    </div>
  );
}
