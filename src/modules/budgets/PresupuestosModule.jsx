import { useState, useEffect } from "react";
import { today } from "../../utils/date";
import { uid } from "../../utils/id";
import { COLORS, S } from "../../styles/theme";
import ProjectsList from "./ProjectsList";
import ProjectView from "./ProjectView";
import { GestorPrecios } from "../prices/PricesModule";
import { useAuth } from "../../auth/AuthContext";
import { getObras, saveObra, deleteObra, saveItems, getPrecios, savePrecios } from "../../services/obrasRepo";

// ─── NUEVO PROYECTO ───────────────────────────────────────────────────────────
function NuevoProyecto({ codigoSugerido, onCrear, onCancel }) {
  const [form, setForm] = useState({ codigo: codigoSugerido || "OBR-001", nombre: "", cliente: "", fechaInicio: today(), fechaFin: "", iccPct: "0" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const ok = form.nombre && form.cliente && form.fechaInicio;
  return (
    <div style={{ ...S.panel, maxWidth: "500px", margin: "0 auto" }}>
      <div style={{ fontWeight: 800, color: COLORS.gold, marginBottom: "20px", fontSize: "14px" }}>NUEVA OBRA</div>
      <div style={{ display: "grid", gap: "14px" }}>
        <div>
          <label style={S.label}>Código de obra</label>
          <input style={{ ...S.input, opacity: 0.6, cursor: "not-allowed" }} type="text" value={form.codigo} readOnly disabled title="El código se asigna automáticamente" />
          <div style={{ color: COLORS.muted, fontSize: "10px", marginTop: "3px" }}>Se asigna automáticamente</div>
        </div>
        {[["Nombre de obra", "nombre", "text"], ["Cliente / Comitente", "cliente", "text"], ["Fecha inicio", "fechaInicio", "date"], ["Fecha fin estimada", "fechaFin", "date"]].map(([lbl, key, type]) => (
          <div key={key}>
            <label style={S.label}>{lbl}</label>
            <input style={S.input} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div>
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

  useEffect(() => {
    (async () => {
      try {
        if (orgId) {
          const obras = await getObras(orgId);
          setProyectos(obras);
        }
      } catch {}
      try {
        if (orgId) {
          const precios = await getPrecios(orgId);
          setPreciosActualizados(precios);
        }
      } catch {}
      setStorageReady(true);
    })();
  }, [orgId]);

  useEffect(() => {
    if (!storageReady || !orgId) return;
    (async () => {
      try {
        await savePrecios(orgId, preciosActualizados);
      } catch {}
    })();
  }, [preciosActualizados, storageReady, orgId]);

  const activeProyecto = proyectos.find((p) => p.id === activeId);

  function siguienteCodigo() {
    let max = 0;
    for (const p of proyectos) {
      const m = /^OBR-(\d+)$/.exec(p.codigo || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return "OBR-" + String(max + 1).padStart(3, "0");
  }

  async function crearProyecto(data) {
    const np = { id: uid(), ...data, iccPct: data.iccPct || 15, items: [], creadoEn: today() };
    setProyectos((ps) => [...ps, np]);
    setActiveId(np.id);
    setView("proyecto");
    try { await saveObra(orgId, np); } catch (e) { console.error("Error creando obra:", e); }
  }

  async function updateProyecto(id, patch) {
    setProyectos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try {
      const actual = proyectos.find((p) => p.id === id);
      const merged = { ...actual, ...patch };
      await saveObra(orgId, merged);
      if (patch.items) await saveItems(orgId, id, merged.items);
    } catch (e) { console.error("Error guardando obra:", e); }
  }

  async function deleteProyecto(id) {
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
        {view === "nuevo" && <NuevoProyecto codigoSugerido={siguienteCodigo()} onCrear={crearProyecto} onCancel={() => setView("lista")} />}
        {view === "proyecto" && activeProyecto && <ProjectView proyecto={activeProyecto} updateProyecto={updateProyecto} preciosActualizados={preciosActualizados} BASE={BASE} />}
        {view === "precios" && <GestorPrecios preciosActualizados={preciosActualizados} setPreciosActualizados={setPreciosActualizados} BASE={BASE} />}
      </div>
    </div>
  );
}
