import { semaforo } from "../../../utils/budgets";
import { COLORS, S } from "../../../styles/theme";

export function TabSemaforo({ proyecto, iccFactor, updateItem, preciosActualizados }) {
  const items = proyecto.items;
  const rojos = items.filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "rojo");
  const amarillos = items.filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "amarillo");
  const verdes = items.filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "verde");
  const sinDato = items.filter((i) => !semaforo(i.consumidoReal, i.cantPresup));

  if (items.length === 0) return <div style={{ ...S.panel, color: COLORS.muted, textAlign: "center", padding: "40px" }}>No hay ítems en el presupuesto</div>;

  function SemGroup({ label, color, emoji, list }) {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, color, marginBottom: "8px", fontSize: "12px" }}>{emoji} {label} ({list.length})</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Código", "Descripción", "UM", "Presup.", "Consumido", "% Uso"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((item) => {
              const pct = item.consumidoReal && item.cantPresup ? (item.consumidoReal / item.cantPresup * 100).toFixed(1) : "—";
              return (
                <tr key={item.codigo}>
                  <td style={{ ...S.td, color: COLORS.muted, fontSize: "11px" }}>{item.codigo}</td>
                  <td style={{ ...S.td, fontSize: "12px", maxWidth: "250px" }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.desc}>{item.desc}</div></td>
                  <td style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>{item.um}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{item.cantPresup}</td>
                  <td style={S.td}>
                    <input type="number" style={{ ...S.input, width: "80px", textAlign: "right" }} value={item.consumidoReal ?? ""} placeholder="0" onChange={(e) => updateItem(item.codigo, { consumidoReal: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    <span style={{ fontWeight: 700, color, padding: "2px 8px", background: `${color}15`, borderRadius: "4px" }}>{pct}{pct !== "—" ? "%" : ""}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
        {[
          ["🔴", COLORS.rojo, rojos.length, "Sobre rendimiento"],
          ["🟡", COLORS.amarillo, amarillos.length, "En límite"],
          ["🟢", COLORS.verde, verdes.length, "OK"],
          ["⚪", COLORS.muted, sinDato.length, "Sin datos"],
        ].map(([e, c, n, l]) => (
          <div key={l} style={{ ...S.panel, flex: 1, minWidth: "100px", textAlign: "center", padding: "12px" }}>
            <div style={{ fontSize: "22px" }}>{e}</div>
            <div style={{ fontWeight: 800, fontSize: "20px", color: c }}>{n}</div>
            <div style={{ color: COLORS.muted, fontSize: "10px" }}>{l}</div>
          </div>
        ))}
      </div>
      <SemGroup label="SOBRE RENDIMIENTO — Acción requerida" color={COLORS.rojo} emoji="🔴" list={rojos} />
      <SemGroup label="EN LÍMITE — Monitorear" color={COLORS.amarillo} emoji="🟡" list={amarillos} />
      <SemGroup label="OK — Dentro del presupuesto" color={COLORS.verde} emoji="🟢" list={verdes} />
      <SemGroup label="SIN CONSUMO CARGADO" color={COLORS.muted} emoji="⚪" list={sinDato} />
    </div>
  );
}
