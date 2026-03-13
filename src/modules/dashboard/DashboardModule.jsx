import { useState, useEffect, useMemo } from "react";
import { storage } from "../../services/storage";
import { getRendimientoMatch } from "../../utils/rendimientos";
import { getCrewDailyCost, getLaborUnitCost, getLaborTotalCost } from "../../utils/laborCosts";
import { RENDIMIENTOS } from "../../data/rendimientos";
import { WORKER_DAILY_COST, CREWS } from "../../data/laborCosts";

const ars = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function itemSubtotal(it, iccPct = 0) {
  const price = it.precioCustom ?? it.precioBase ?? 0;
  const qty = it.cantPresup ?? 0;
  return price * qty * (1 + (iccPct || 0) / 100);
}

function rubroFromItem(it) {
  const c = (it.codigo || "").trim();
  return /^\d{2}\.\d{2}/.test(c) ? c.slice(0, 6) : "Otros";
}

function itemDiasEst(it) {
  const m = getRendimientoMatch(it.desc, it.um, RENDIMIENTOS);
  const rend = m?.rendimiento;
  const qty = it.cantPresup ?? 0;
  return rend != null && rend > 0 ? qty / rend : null;
}

function itemLaborTotal(it) {
  const m = getRendimientoMatch(it.desc, it.um, RENDIMIENTOS);
  const crewDaily = m?.crewId ? getCrewDailyCost(m.crewId, CREWS, WORKER_DAILY_COST) : 0;
  const laborUnit = getLaborUnitCost(crewDaily, m?.rendimiento);
  return getLaborTotalCost(laborUnit, it.cantPresup ?? 0);
}

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
    totalLabor,
    totalDuration,
    mostExpensiveLaborItem,
    longestActivity,
    laborDurationWarnings,
  } = useMemo(() => {
    const itemsWithSubtotal = [];
    obras.forEach((p) => {
      (p.items || []).forEach((it) => {
        const sub = itemSubtotal(it, p.iccPct ?? p.icc);
        const diasEst = itemDiasEst(it);
        const laborTotal = itemLaborTotal(it);
        itemsWithSubtotal.push({
          proyecto: p,
          item: it,
          subtotal: sub,
          rubro: rubroFromItem(it),
          diasEst: diasEst != null ? diasEst : null,
          laborTotal: laborTotal != null ? laborTotal : null,
        });
      });
    });
    const totalPresupuestado = itemsWithSubtotal.reduce((s, x) => s + x.subtotal, 0);
    const totalItems = itemsWithSubtotal.length;

    const totalLabor = itemsWithSubtotal.reduce((s, x) => s + (x.laborTotal != null ? x.laborTotal : 0), 0);
    const totalDuration = itemsWithSubtotal.reduce((s, x) => s + (x.diasEst != null ? x.diasEst : 0), 0);

    const withLabor = itemsWithSubtotal.filter((x) => x.laborTotal != null && x.laborTotal > 0);
    const mostExpensiveLaborItem = withLabor.length === 0 ? null : withLabor.reduce((best, x) => (x.laborTotal > best.laborTotal ? x : best), withLabor[0]);

    const withDuration = itemsWithSubtotal.filter((x) => x.diasEst != null && x.diasEst > 0);
    const longestActivity = withDuration.length === 0 ? null : withDuration.reduce((best, x) => (x.diasEst > best.diasEst ? x : best), withDuration[0]);

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

    const laborDurationWarnings = [];
    if (totalDuration > 0 && longestActivity && longestActivity.diasEst != null && longestActivity.diasEst / totalDuration >= 0.3) {
      const pct = ((100 * longestActivity.diasEst) / totalDuration).toFixed(0);
      laborDurationWarnings.push({
        type: "duration",
        text: `Una actividad concentra el ${pct}% de la duración estimada (${longestActivity.diasEst.toFixed(1)} días).`,
      });
    }
    if (totalLabor > 0 && mostExpensiveLaborItem && mostExpensiveLaborItem.laborTotal != null && mostExpensiveLaborItem.laborTotal / totalLabor >= 0.25) {
      const pct = ((100 * mostExpensiveLaborItem.laborTotal) / totalLabor).toFixed(0);
      laborDurationWarnings.push({
        type: "labor",
        text: `Un ítem concentra el ${pct}% del costo de mano de obra estimado.`,
      });
    }

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
      totalLabor,
      totalDuration,
      mostExpensiveLaborItem,
      longestActivity,
      laborDurationWarnings,
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

  const TEAL = "#1A9B7B";
  const GOLD = "#c8a84b";
  const ROJO = "#e05a5a";
  const card = { background: "#141a16", border: "1px solid #1e2a22", borderRadius: "10px", padding: "16px", marginBottom: "12px" };

  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%", background: "#0f1210" }}>
      <div style={{ fontWeight: 800, fontSize: "18px", color: "#d8e4de", marginBottom: "16px" }}>📊 Dashboard General</div>

      {/* Top summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        {[
          { label: "Presupuesto total", value: ars(totalPresupuestado), color: GOLD },
          { label: "Cantidad de ítems", value: totalItems, color: TEAL },
          { label: "Total MO est.", value: totalLabor > 0 ? ars(totalLabor) : "—", color: "#d8e4de" },
          { label: "Duración est. total", value: totalDuration > 0 ? `${totalDuration.toFixed(1)} días` : "—", color: "#d8e4de" },
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
          {
            label: "Ítem MO más caro",
            value: mostExpensiveLaborItem
              ? (() => {
                  const d = mostExpensiveLaborItem.item.desc || mostExpensiveLaborItem.item.codigo || "—";
                  return (d.length > 16 ? d.slice(0, 16) + "… " : d + " ") + ars(mostExpensiveLaborItem.laborTotal);
                })()
              : "—",
            color: "#d8e4de",
          },
          {
            label: "Actividad más larga",
            value: longestActivity
              ? (() => {
                  const d = longestActivity.item.desc || longestActivity.item.codigo || "—";
                  return (d.length > 16 ? d.slice(0, 16) + "… " : d + " ") + longestActivity.diasEst.toFixed(1) + " días";
                })()
              : "—",
            color: "#d8e4de",
          },
          { label: "Riesgo / Alerta", value: mainRisk, color: alertasRojas.length > 0 ? ROJO : "#d8e4de" },
        ].map((k) => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: "11px", color: "#4a6055", marginBottom: "6px" }}>{k.label}</div>
            <div style={{ fontSize: k.label === "Ítem más caro" || k.label === "Riesgo / Alerta" || k.label === "Ítem MO más caro" || k.label === "Actividad más larga" ? "12px" : "18px", fontWeight: 800, color: k.color, lineHeight: 1.25 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Cost analysis by rubro */}
      <div style={card}>
        <div style={{ fontWeight: 700, color: GOLD, fontSize: "12px", marginBottom: "10px" }}>📋 Análisis por rubro</div>
        {rubroTotals.length === 0 ? (
          <div style={{ color: "#4a6055", fontSize: "12px" }}>Sin ítems en el presupuesto</div>
        ) : (
          rubroTotals.map((r) => (
            <div key={r.nombre} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1e2a22", fontSize: "12px" }}>
              <span style={{ color: "#d8e4de" }}>{r.nombre}</span>
              <span style={{ color: GOLD, fontWeight: 700 }}>
                {ars(r.total)} <span style={{ color: "#4a6055", fontWeight: 500 }}>({r.pct.toFixed(1)}%)</span>
              </span>
            </div>
          ))
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

      {/* Labor & duration insights */}
      {laborDurationWarnings.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 700, color: ROJO, fontSize: "12px", marginBottom: "10px" }}>⚠️ Trabajo y duración</div>
          {laborDurationWarnings.map((w, i) => (
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
