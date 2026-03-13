import { useState, useEffect, useMemo } from "react";
import { storage } from "../../services/storage";
import { precioVigente } from "../../utils/budgets";

const ars = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function itemSubtotal(it, iccPct = 0) {
  const price = it.precioCustom ?? it.precioBase ?? 0;
  const qty = it.cantPresup ?? 0;
  return price * qty * (1 + (iccPct || 0) / 100);
}

function itemSubtotalWithPrecios(it, iccPct, preciosActualizados) {
  const codigoBase = it.baseCodigo ?? it.codigo;
  const price = it.precioCustom ?? precioVigente(codigoBase, it.precioBase, preciosActualizados);
  const qty = it.cantPresup ?? 0;
  return price * qty * (1 + (iccPct || 0) / 100);
}

function itemConsumido(it, iccPct) {
  const price = it.precioCustom ?? it.precioBase ?? 0;
  const consumido = it.consumidoReal ?? 0;
  return consumido * price * (1 + (iccPct || 0) / 100);
}

function rubroFromItem(it) {
  const c = (it.codigo || "").trim();
  return /^\d{2}\.\d{2}/.test(c) ? c.slice(0, 6) : "Otros";
}

export default function DashboardModule() {
  const [proyectos, setProyectos] = useState([]);
  const [preciosActualizados, setPreciosActualizados] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("choix_proyectos");
        if (r?.value) setProyectos(JSON.parse(r.value));
      } catch {}
      try {
        let pr = await storage.get("choix_precios_actualizados");
        if (!pr?.value) pr = await storage.get("choix_precios");
        if (pr?.value) setPreciosActualizados(JSON.parse(pr.value));
      } catch {}
    })();
  }, []);

  const obras = proyectos.filter((p) => p.activo !== false);

  const {
    totalPresupuestado,
    totalItems,
    mostExpensiveItem,
    mostExpensiveRubro,
    mainRisk,
    itemsWithSubtotal,
    rubroTotals,
    top5Items,
    riskWarnings,
  } = useMemo(() => {
    const itemsWithSubtotal = [];
    obras.forEach((p) => {
      (p.items || []).forEach((it) => {
        const sub = itemSubtotal(it, p.iccPct ?? p.icc);
        itemsWithSubtotal.push({
          proyecto: p,
          item: it,
          subtotal: sub,
          rubro: rubroFromItem(it),
        });
      });
    });
    const totalPresupuestado = itemsWithSubtotal.reduce((s, x) => s + x.subtotal, 0);
    const totalItems = itemsWithSubtotal.length;

    const mostExpensiveItem =
      itemsWithSubtotal.length === 0
        ? null
        : itemsWithSubtotal.reduce((best, x) => (x.subtotal > best.subtotal ? x : best), itemsWithSubtotal[0]);

    const rubroMap = new Map();
    itemsWithSubtotal.forEach(({ rubro, subtotal }) => {
      rubroMap.set(rubro, (rubroMap.get(rubro) || 0) + subtotal);
    });
    const rubroTotals = [...rubroMap.entries()]
      .map(([nombre, total]) => ({ nombre, total, pct: totalPresupuestado > 0 ? (100 * total) / totalPresupuestado : 0 }))
      .sort((a, b) => b.total - a.total);
    const mostExpensiveRubro = rubroTotals[0] || null;

    const top5Items = [...itemsWithSubtotal].sort((a, b) => b.subtotal - a.subtotal).slice(0, 5);

    const alertasRojas = itemsWithSubtotal.filter((x) => {
      const presup = x.item.cantPresup ?? 0;
      const consumido = x.item.consumidoReal ?? 0;
      return presup > 0 && consumido / presup > 0.9;
    });
    const rubroAlto = rubroTotals.find((r) => r.pct >= 40);
    const itemAlto = totalPresupuestado > 0 && mostExpensiveItem && mostExpensiveItem.subtotal / totalPresupuestado >= 0.2;

    const riskWarnings = [];
    if (rubroAlto) riskWarnings.push({ type: "rubro", text: `El rubro ${rubroAlto.nombre} representa el ${rubroAlto.pct.toFixed(0)}% del presupuesto.` });
    if (itemAlto && mostExpensiveItem)
      riskWarnings.push({
        type: "item",
        text: `Un ítem concentra el ${((100 * mostExpensiveItem.subtotal) / totalPresupuestado).toFixed(0)}% del presupuesto.`,
      });

    let mainRisk = "Sin alertas destacadas";
    if (alertasRojas.length > 0) mainRisk = `${alertasRojas.length} ítem(s) con alerta roja (consumo >90%)`;
    else if (rubroAlto) mainRisk = `Concentración en rubro ${rubroAlto.nombre} (${rubroAlto.pct.toFixed(0)}%)`;
    else if (itemAlto) mainRisk = "Un ítem representa más del 20% del presupuesto";

    return {
      totalPresupuestado,
      totalItems,
      mostExpensiveItem,
      mostExpensiveRubro,
      mainRisk,
      itemsWithSubtotal,
      rubroTotals,
      top5Items,
      riskWarnings,
    };
  }, [obras]);

  const alertasRojas = useMemo(
    () =>
      obras.flatMap((p) =>
        (p.items || [])
          .filter((it) => {
            const consumido = it.consumidoReal ?? 0;
            const presup = it.cantPresup ?? 0;
            return presup > 0 && consumido / presup > 0.9;
          })
          .map((it) => ({ ...it, obra: p.nombre }))
      ),
    [obras]
  );

  const top5obras = useMemo(
    () =>
      [...obras]
        .sort((a, b) => {
          const tot = (p) => (p.items || []).reduce((s, it) => s + itemSubtotal(it, p.iccPct ?? p.icc), 0);
          return tot(b) - tot(a);
        })
        .slice(0, 5),
    [obras]
  );

  const saludPorObra = useMemo(() => {
    return obras.map((p) => {
      const presupuestoTotal = (p.items || []).reduce((s, it) => s + itemSubtotal(it, p.iccPct ?? p.icc), 0);
      const totalConsumido = (p.items || []).reduce((s, it) => s + itemConsumido(it, p.iccPct ?? p.icc), 0);
      const pctAvance = presupuestoTotal > 0 ? (100 * totalConsumido) / presupuestoTotal : 0;
      const desvio = totalConsumido - presupuestoTotal;
      const desvioPct = presupuestoTotal > 0 ? (100 * desvio) / presupuestoTotal : 0;
      return { proyecto: p, presupuestoTotal, totalConsumido, pctAvance, desvio, desvioPct };
    });
  }, [obras]);

  const resumenPrecios = useMemo(() => {
    let totalOriginal = 0;
    let totalActualizado = 0;
    const codigosConActualizacion = new Set();
    obras.forEach((p) => {
      (p.items || []).forEach((it) => {
        const codigoBase = it.baseCodigo ?? it.codigo;
        const precioOrig = it.precioBase ?? 0;
        const precioVig = precioVigente(codigoBase, it.precioBase, preciosActualizados);
        const qty = it.cantPresup ?? 0;
        const icc = 1 + (p.iccPct ?? p.icc ?? 0) / 100;
        totalOriginal += qty * precioOrig * icc;
        totalActualizado += qty * (it.precioCustom ?? precioVig) * icc;
        if (preciosActualizados?.[codigoBase]?.length > 0) codigosConActualizacion.add(codigoBase);
      });
    });
    const impacto = totalActualizado - totalOriginal;
    const impactoPct = totalOriginal > 0 ? (100 * impacto) / totalOriginal : 0;
    return { totalOriginal, totalActualizado, impacto, impactoPct, count: codigosConActualizacion.size, tieneDatos: Object.keys(preciosActualizados || {}).length > 0 };
  }, [obras, preciosActualizados]);

  const TEAL = "#1A9B7B";
  const GOLD = "#c8a84b";
  const ROJO = "#e05a5a";
  const AMARILLO = "#d4a84b";
  const card = { background: "#141a16", border: "1px solid #1e2a22", borderRadius: "10px", padding: "16px", marginBottom: "12px" };

  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%", background: "#0f1210" }}>
      <div style={{ fontWeight: 800, fontSize: "18px", color: "#d8e4de", marginBottom: "16px" }}>📊 Dashboard General</div>

      {/* Top summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        {[
          { label: "Presupuesto total", value: ars(totalPresupuestado), color: GOLD },
          { label: "Cantidad de ítems", value: totalItems, color: TEAL },
          {
            label: "Ítem más caro",
            value: mostExpensiveItem
              ? (() => {
                  const d = mostExpensiveItem.item.desc || mostExpensiveItem.item.codigo || "—";
                  return (d.length > 18 ? d.slice(0, 18) + "… " : d + " ") + ars(mostExpensiveItem.subtotal);
                })()
              : "—",
            color: "#d8e4de",
          },
          {
            label: "Rubro más caro",
            value: mostExpensiveRubro ? `${mostExpensiveRubro.nombre} (${ars(mostExpensiveRubro.total)})` : "—",
            color: "#d8e4de",
          },
          { label: "Riesgo / Alerta", value: mainRisk, color: alertasRojas.length > 0 ? ROJO : "#d8e4de" },
        ].map((k) => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: "11px", color: "#4a6055", marginBottom: "6px" }}>{k.label}</div>
            <div style={{ fontSize: k.label === "Ítem más caro" || k.label === "Riesgo / Alerta" ? "12px" : "18px", fontWeight: 800, color: k.color, lineHeight: 1.25 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Salud financiera por obra */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px", marginBottom: "12px" }}>💚 Salud financiera por obra</div>
        {saludPorObra.length === 0 ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin obras activas</div>
        ) : (
          saludPorObra.map(({ proyecto: p, presupuestoTotal, totalConsumido, pctAvance, desvio, desvioPct }) => {
            const barColor = pctAvance < 80 ? TEAL : pctAvance <= 95 ? AMARILLO : ROJO;
            return (
              <div key={p.id} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px solid #1e2a22" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ color: "#d8e4de", fontWeight: 600, fontSize: "12px" }}>{p.nombre}</span>
                  <span style={{ color: "#4a6055", fontSize: "11px" }}>{p.codigo}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#4a6055", marginBottom: "4px" }}>
                  <span>Presupuesto: {ars(presupuestoTotal)}</span>
                  <span>Consumido: {ars(totalConsumido)}</span>
                </div>
                <div style={{ fontSize: "11px", color: GOLD, fontWeight: 700, marginBottom: "6px" }}>% de avance: {pctAvance.toFixed(1)}%</div>
                <div style={{ height: "8px", background: "#1e2a22", borderRadius: "4px", overflow: "hidden", marginBottom: "6px" }}>
                  <div style={{ width: `${Math.min(100, pctAvance)}%`, height: "100%", background: barColor, borderRadius: "4px", transition: "width 0.2s" }} />
                </div>
                <div style={{ fontSize: "11px", color: desvio > 0 ? ROJO : "#4a6055" }}>
                  Desvío: {desvio >= 0 ? "+" : ""}{ars(desvio)} ({desvio >= 0 ? "+" : ""}{desvioPct.toFixed(1)}%)
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cost analysis by rubro */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px", marginBottom: "10px" }}>📋 Análisis por rubro</div>
        {rubroTotals.length === 0 ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin ítems en el presupuesto</div>
        ) : (
          rubroTotals.map((r) => (
            <div key={r.nombre} style={{ padding: "6px 0", borderBottom: "1px solid #1e2a22", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ color: "#d8e4de" }}>{r.nombre}</span>
                <span style={{ color: GOLD, fontWeight: 700 }}>
                  {ars(r.total)} <span style={{ color: "#4a6055", fontWeight: 500 }}>({r.pct.toFixed(1)}%)</span>
                </span>
              </div>
              <div style={{ height: "6px", background: "#1e2a22", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, r.pct)}%`, height: "100%", background: TEAL, borderRadius: "3px", minWidth: r.pct > 0 ? "4px" : 0 }} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumen de precios actualizados */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px", marginBottom: "10px" }}>📌 Resumen de precios actualizados</div>
        {!resumenPrecios.tieneDatos ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin actualizaciones de precios</div>
        ) : (
          <div style={{ fontSize: "12px", color: "#d8e4de" }}>
            <div style={{ marginBottom: "6px" }}>Productos con precio actualizado: <strong style={{ color: GOLD }}>{resumenPrecios.count}</strong></div>
            <div style={{ marginBottom: "6px" }}>Impacto total: <strong style={{ color: resumenPrecios.impacto >= 0 ? ROJO : TEAL }}>{ars(resumenPrecios.impacto)}</strong></div>
            <div style={{ color: "#4a6055", fontSize: "11px" }}>
              Los precios actualizados impactan en {resumenPrecios.impacto >= 0 ? "+" : ""}{ars(resumenPrecios.impacto)} ({resumenPrecios.impacto >= 0 ? "+" : ""}{resumenPrecios.impactoPct.toFixed(1)}%) sobre el presupuesto original.
            </div>
          </div>
        )}
      </div>

      {/* Top 5 most expensive items */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px", marginBottom: "10px" }}>🏆 Top 5 ítems más caros</div>
        {top5Items.length === 0 ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin datos</div>
        ) : (
          top5Items.map((x, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2a22", fontSize: "12px" }}>
              <span style={{ color: "#d8e4de" }} title={x.item.desc}>#{i + 1} {(x.item.desc || x.item.codigo || "—").slice(0, 36)}{(x.item.desc && x.item.desc.length > 36 ? "…" : "")}</span>
              <span style={{ color: GOLD, fontWeight: 700 }}>{ars(x.subtotal)}</span>
            </div>
          ))
        )}
      </div>

      {/* Risk insights */}
      {riskWarnings.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, color: ROJO, fontSize: "12px", marginBottom: "10px" }}>⚠️ Alertas de concentración</div>
          {riskWarnings.map((w, i) => (
            <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #1e2a22", fontSize: "12px", color: "#d8e4de" }}>
              {w.text}
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px", marginBottom: "10px" }}>🏆 Top 5 obras por presupuesto</div>
        {top5obras.length === 0 ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin datos</div>
        ) : (
          top5obras.map((p, i) => {
            const tot = (p.items || []).reduce((s, it) => s + itemSubtotal(it, p.iccPct ?? p.icc), 0);
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2a22", fontSize: "12px" }}>
                <span style={{ color: "#d8e4de" }}>#{i + 1} {p.nombre}</span>
                <span style={{ color: GOLD, fontWeight: 700 }}>{ars(tot)}</span>
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
