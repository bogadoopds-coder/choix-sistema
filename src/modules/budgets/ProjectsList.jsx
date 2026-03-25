import { ars } from "../../utils/format";
import { precioVigente, semaforo } from "../../utils/budgets";
import { COLORS, S } from "../../styles/theme";

export default function ProjectsList({ proyectos, preciosActualizados, setActiveId, setView, deleteProyecto }) {
  if (proyectos.length === 0)
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏗️</div>
        <div style={{ color: COLORS.muted, marginBottom: "20px" }}>No hay obras todavía. Creá la primera.</div>
        <button style={S.btn()} onClick={() => setView("nuevo")}>
          + NUEVA OBRA
        </button>
      </div>
    );
  return (
    <div>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ color: COLORS.muted, fontSize: "11px" }}>{proyectos.length} OBRA{proyectos.length !== 1 ? "S" : ""}</span>
          <button style={S.btn()} onClick={() => setView("nuevo")}>
            + NUEVA OBRA
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
        {proyectos.map((p) => {
          const total = (p.items || []).reduce((s, i) => s + (i.cantPresup ?? 0) * (i.precioCustom ?? precioVigente(i.baseCodigo ?? i.codigo, i.precioBase, preciosActualizados)) * (1 + (p.iccPct ?? 0) / 100), 0);
          const alertas = (p.items || []).filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "rojo").length;
          return (
            <div
              key={p.id}
              style={{ ...S.panel, cursor: "pointer", transition: "border .15s" }}
              onClick={() => {
                setActiveId(p.id);
                setView("proyecto");
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: "12px" }}>{p.codigo}</div>
                  <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "2px" }}>{p.nombre}</div>
                  <div style={{ color: COLORS.muted, fontSize: "11px", marginTop: "2px" }}>{p.cliente}</div>
                </div>
                <button style={{ ...S.btn("red", true), padding: "3px 7px" }} onClick={(e) => { e.stopPropagation(); deleteProyecto(p.id); }}>
                  ✕
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                <span style={S.tag(COLORS.blue)}>{(p.items || []).length} ítems</span>
                {alertas > 0 && <span style={S.tag(COLORS.rojo)}>⚠ {alertas} alerta{alertas !== 1 ? "s" : ""}</span>}
                <span style={S.tag(COLORS.muted)}>ICC +{p.iccPct}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: COLORS.muted, fontSize: "10px" }}>{p.fechaInicio} → {p.fechaFin}</span>
                <span style={{ fontWeight: 700, color: COLORS.gold, fontSize: "14px" }}>{ars(total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
