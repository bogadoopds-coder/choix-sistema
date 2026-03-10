import { useState, useEffect } from "react";
import { storage } from "../../services/storage";

export default function DashboardModule() {
  const [proyectos, setProyectos] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("choix_proyectos");
        if (r?.value) setProyectos(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  const obras = proyectos.filter((p) => p.activo !== false);
  const totalPresupuestado = obras.reduce((sum, p) => {
    const items = p.items || [];
    return sum + items.reduce((s, it) => s + ((it.precioCustom ?? it.precioBase ?? 0) * (it.cantPresup ?? 0)) * (1 + (p.icc || 0) / 100), 0);
  }, 0);

  const alertasRojas = obras.flatMap((p) =>
    (p.items || [])
      .filter((it) => {
        const consumido = it.consumidoReal ?? 0;
        const presup = it.cantPresup ?? 0;
        return presup > 0 && consumido / presup > 0.9;
      })
      .map((it) => ({ ...it, obra: p.nombre }))
  );

  const top5obras = [...obras]
    .sort((a, b) => {
      const tot = (p) => (p.items || []).reduce((s, it) => s + ((it.precioCustom ?? it.precioBase ?? 0) * (it.cantPresup ?? 0)) * (1 + (p.icc || 0) / 100), 0);
      return tot(b) - tot(a);
    })
    .slice(0, 5);

  const TEAL = "#1A9B7B";
  const GOLD = "#c8a84b";
  const ROJO = "#e05a5a";
  const card = { background: "#141a16", border: "1px solid #1e2a22", borderRadius: "10px", padding: "16px", marginBottom: "12px" };

  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%", background: "#0f1210" }}>
      <div style={{ fontWeight: 800, fontSize: "18px", color: "#d8e4de", marginBottom: "16px" }}>📊 Dashboard General</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "16px" }}>
        {[
          { label: "Obras activas", value: obras.length, color: TEAL },
          { label: "Monto total presup.", value: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(totalPresupuestado), color: GOLD },
          { label: "Alertas semáforo 🔴", value: alertasRojas.length, color: ROJO },
        ].map((k) => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: "11px", color: "#4a6055", marginBottom: "6px" }}>{k.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px", marginBottom: "10px" }}>🏆 Top 5 obras por presupuesto</div>
        {top5obras.length === 0 ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin datos</div>
        ) : (
          top5obras.map((p, i) => {
            const tot = (p.items || []).reduce((s, it) => s + ((it.precioCustom ?? it.precioBase ?? 0) * (it.cantPresup ?? 0)) * (1 + (p.icc || 0) / 100), 0);
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2a22", fontSize: "12px" }}>
                <span style={{ color: "#d8e4de" }}>#{i + 1} {p.nombre}</span>
                <span style={{ color: GOLD, fontWeight: 700 }}>{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(tot)}</span>
              </div>
            );
          })
        )}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, color: ROJO, fontSize: "12px", marginBottom: "10px" }}>🔴 Top 5 ítems con alerta roja</div>
        {alertasRojas.length === 0 ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin alertas 🎉</div>
        ) : (
          alertasRojas.slice(0, 5).map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2a22", fontSize: "12px" }}>
              <span style={{ color: "#d8e4de" }}>{it.desc}</span>
              <span style={{ color: ROJO, fontWeight: 700 }}>{it.obra}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
