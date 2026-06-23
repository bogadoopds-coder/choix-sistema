import { useState } from "react";
import { COLORS, S } from "../../../styles/theme";

export function TabConfig({ proyecto, updateProyecto }) {
  const [form, setForm] = useState({ ...proyecto });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={{ ...S.panel, maxWidth: "480px" }}>
      <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "16px", fontSize: "12px" }}>CONFIGURACIÓN DE OBRA</div>
      <div style={{ display: "grid", gap: "14px" }}>
        <div>
          <label style={S.label}>Código</label>
          <input
            style={{ ...S.input, opacity: 0.6, cursor: "not-allowed" }}
            type="text"
            value={form.codigo || ""}
            readOnly
            disabled
            title="El código se asigna automáticamente y no se puede modificar"
          />
          <div style={{ color: COLORS.muted, fontSize: "10px", marginTop: "3px" }}>Identificador fijo de la obra</div>
        </div>
        {[["Nombre", "nombre", "text"], ["Cliente", "cliente", "text"], ["Fecha inicio", "fechaInicio", "date"], ["Fecha fin", "fechaFin", "date"]].map(([l, k, t]) => (
          <div key={k}>
            <label style={S.label}>{l}</label>
            <input style={S.input} type={t} value={form[k] || ""} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
        <div>
          <label style={S.label}>Ajuste ICC ({form.iccPct}%)</label>
          <input style={S.input} type="range" min="0" max="60" step="0.5" value={form.iccPct} onChange={(e) => set("iccPct", parseFloat(e.target.value))} />
          <div style={{ color: COLORS.gold, fontSize: "11px", marginTop: "3px" }}>×{(1 + form.iccPct / 100).toFixed(3)} sobre precios ago-2025</div>
        </div>
      </div>
      <button style={{ ...S.btn(), marginTop: "16px" }} onClick={() => updateProyecto(proyecto.id, form)}>GUARDAR CAMBIOS</button>
    </div>
  );
}
