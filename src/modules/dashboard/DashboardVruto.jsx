import { useState, useEffect } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import {
  getDesarrollos, getUnidades, getBoletos, getCuotas,
} from "../../services/desarrollosRepo";
import { getContratos, getEgresos, getIngresos } from "../../services/financieroRepo";
import { getObras } from "../../services/obrasRepo";
const UMBRAL_SOBREPAGO = 10; // puntos porcentuales por encima del avance
export default function DashboardVruto() {
  const { orgId } = useAuth();
  const [tc, setTc] = useState("1000");
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!orgId) return;
    let cancel = false;
    setCargando(true);
    (async () => {
      try {
        const desarrollos = await getDesarrollos(orgId);
        const obras = await getObras(orgId).catch(() => []);
        const detalle = [];
        for (const d of desarrollos) {
          const [unidades, boletosRaw, contratos, egresos, ingresos] = await Promise.all([
            getUnidades(orgId, d.id).catch(() => []),
            getBoletos(orgId, d.id).catch(() => []),
            getContratos(orgId, d.id).catch(() => []),
            getEgresos(orgId, d.id).catch(() => []),
            getIngresos(orgId, d.id).catch(() => []),
          ]);
          const boletos = [];
          for (const b of boletosRaw) {
            const cuotas = await getCuotas(orgId, d.id, b.id).catch(() => []);
            boletos.push({ ...b, cuotas });
          }
          detalle.push({ ...d, unidades, boletos, contratos, egresos, ingresos });
        }
        if (!cancel) setData({ desarrollos: detalle, obras });
      } catch (e) {
        if (!cancel) setData({ desarrollos: [], obras: [] });
      }
      if (!cancel) setCargando(false);
    })();
    return () => { cancel = true; };
  }, [orgId]);
  const tcNum = Number(tc) > 0 ? Number(tc) : 1000;
  const aUSD = (monto, moneda) => moneda === "USD" ? Number(monto || 0) : Number(monto || 0) / tcNum;
  const fmtUSD = (n) => "USD " + Math.round(Number(n) || 0).toLocaleString("es-AR");
  if (cargando) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Calculando el estado del negocio...</div>;
  if (!data || data.desarrollos.length === 0) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ fontWeight: 800, color: COLORS.gold, fontSize: "16px", marginBottom: "12px" }}>📊 PANORAMA DEL NEGOCIO</div>
        <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>
          Todavía no hay desarrollos cargados. Creá tu primer desarrollo en 🏢 Desarrollos para ver acá el panorama financiero, comercial y de rentabilidad.
        </div>
      </div>
    );
  }
  let cajaIngresosUSD = 0, cajaEgresosUSD = 0;
  let uVendidas = 0, uReservadas = 0, uDisponibles = 0, uTotal = 0;
  let ventasUSD = 0, disponibleUSD = 0;
  let costoObraUSD = 0, tierraUSD = 0, indirectosUSD = 0, ventasEsperadasUSD = 0;
  const alertas = [];
  for (const d of data.desarrollos) {
    const ingD = d.ingresos.reduce((s, i) => s + aUSD(i.monto, i.moneda), 0);
    const egrD = d.egresos.reduce((s, e) => s + aUSD(e.monto, e.moneda), 0);
    cajaIngresosUSD += ingD;
    cajaEgresosUSD += egrD;
    for (const u of d.unidades) {
      uTotal++;
      const precioU = aUSD(u.precioLista, u.moneda);
      if (u.estado === "vendida") { uVendidas++; ventasUSD += precioU; }
      else if (u.estado === "reservada") { uReservadas++; ventasUSD += precioU; }
      else { uDisponibles++; disponibleUSD += precioU; }
    }
    const ventasEspD = d.unidades.reduce((s, u) => s + aUSD(u.precioLista, u.moneda), 0);
    ventasEsperadasUSD += ventasEspD;
    const obra = data.obras.find((o) => o.id === d.obraId);
    let obraUSD = 0;
    if (obra && Array.isArray(obra.items)) {
      const totalObraARS = obra.items.reduce((s, i) => s + (Number(i.cantPresup) || 0) * (Number(i.precioCustom ?? i.precioBase) || 0), 0);
      obraUSD = totalObraARS / tcNum;
    }
    costoObraUSD += obraUSD;
    const tierraD = d.valorTierra ? aUSD(d.valorTierra, d.monedaTierra || "USD") : 0;
    tierraUSD += tierraD;
    const indirectosD = d.pctIndirectos ? obraUSD * Number(d.pctIndirectos) / 100 : 0;
    indirectosUSD += indirectosD;
    // ALERTAS
    if (ingD - egrD < 0) {
      alertas.push({ dev: d.nombre, texto: `Caja negativa: ${fmtUSD(ingD - egrD)}` });
    }
    for (const c of d.contratos) {
      const pagos = d.egresos.filter((e) => e.categoria === "contratista" && e.contratoId === c.id);
      const pagado = pagos.reduce((s, e) => s + (Number(e.monto) || 0), 0);
      const pctPagado = c.montoTotal > 0 ? (pagado / Number(c.montoTotal)) * 100 : 0;
      const avance = Number(c.avancePct) || 0;
      if (pctPagado >= avance + UMBRAL_SOBREPAGO) {
        alertas.push({ dev: d.nombre, texto: `${c.nombre} sobrepagado: ${Math.round(pctPagado)}% pagado vs ${avance}% de avance` });
      }
    }
    const hoy = new Date().toISOString().slice(0, 10);
    let morosas = 0;
    for (const b of d.boletos) {
      for (const cuota of (b.cuotas || [])) {
        if (cuota.estado !== "pagada" && cuota.vencimiento && cuota.vencimiento < hoy) morosas++;
      }
    }
    if (morosas > 0) {
      alertas.push({ dev: d.nombre, texto: `${morosas} cuota${morosas === 1 ? "" : "s"} en mora` });
    }
    if (obra && Array.isArray(obra.items) && d.unidades.length > 0) {
      const pctVendido = (d.unidades.filter((u) => u.estado === "vendida" || u.estado === "reservada").length / d.unidades.length) * 100;
      const totalObra = obra.items.reduce((s, i) => s + (Number(i.cantPresup) || 0) * (Number(i.precioCustom ?? i.precioBase) || 0), 0);
      const consumidoObra = obra.items.reduce((s, i) => s + (Number(i.consumidoReal) || 0) * (Number(i.precioCustom ?? i.precioBase) || 0), 0);
      const pctObra = totalObra > 0 ? (consumidoObra / totalObra) * 100 : 0;
      if (pctObra > pctVendido + 25) {
        alertas.push({ dev: d.nombre, texto: `Obra al ${Math.round(pctObra)}% pero solo ${Math.round(pctVendido)}% vendido — vigilá la caja` });
      }
    }
  }
  const cajaNeta = cajaIngresosUSD - cajaEgresosUSD;
  const costoTotal = costoObraUSD + tierraUSD + indirectosUSD;
  const margen = ventasEsperadasUSD - costoTotal;
  const margenPct = ventasEsperadasUSD > 0 ? (margen / ventasEsperadasUSD) * 100 : 0;
  const Card = ({ titulo, valor, sub, color }) => (
    <div style={{ ...S.panel, flex: 1, minWidth: "180px" }}>
      <div style={{ fontSize: "11px", color: COLORS.muted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{titulo}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: color || COLORS.text }}>{valor}</div>
      {sub && <div style={{ fontSize: "11px", color: COLORS.muted, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ padding: "16px", height: "100%", overflow: "auto", background: COLORS.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "16px" }}>📊 PANORAMA DEL NEGOCIO</span>
        <span style={{ marginLeft: "auto", fontSize: "11px", color: COLORS.muted }}>Consolidado en USD · TC $</span>
        <input type="number" value={tc} onChange={(e) => setTc(e.target.value)}
          style={{ ...S.input, width: "90px", margin: 0, padding: "4px 8px", fontSize: "12px" }} />
      </div>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
        <Card titulo="💰 Caja (posición neta)" valor={fmtUSD(cajaNeta)}
          sub={`Ingresos ${fmtUSD(cajaIngresosUSD)} · Egresos ${fmtUSD(cajaEgresosUSD)}`}
          color={cajaNeta >= 0 ? COLORS.verde : COLORS.rojo} />
        <Card titulo="🏢 Ventas" valor={`${uVendidas + uReservadas}/${uTotal} unidades`}
          sub={`${uVendidas} vendidas · ${uReservadas} reservadas · ${uDisponibles} disponibles`}
          color={COLORS.gold} />
        <Card titulo="📈 Rentabilidad proyectada" valor={fmtUSD(margen)}
          sub={ventasEsperadasUSD > 0 ? `Margen ${Math.round(margenPct)}% · sobre ventas de ${fmtUSD(ventasEsperadasUSD)}` : "Cargá precios de unidades y costos"}
          color={margen >= 0 ? COLORS.verde : COLORS.rojo} />
      </div>
      <div style={{ ...S.panel, marginBottom: "14px", borderColor: alertas.length ? COLORS.rojo : COLORS.border }}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: alertas.length ? COLORS.rojo : COLORS.verde, marginBottom: alertas.length ? "10px" : "0" }}>
          {alertas.length ? `⚠️ ${alertas.length} DESVÍO${alertas.length === 1 ? "" : "S"} A REVISAR` : "✅ Sin desvíos riesgosos detectados"}
        </div>
        {alertas.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: i < alertas.length - 1 ? `1px solid ${COLORS.border}` : "none", fontSize: "12px" }}>
            <span style={{ color: COLORS.amarillo }}>●</span>
            <span style={{ color: COLORS.text, fontWeight: 600 }}>{a.dev}:</span>
            <span style={{ color: COLORS.muted }}>{a.texto}</span>
          </div>
        ))}
      </div>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "10px" }}>Detalle por desarrollo</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px" }}>
            <thead>
              <tr style={{ color: COLORS.muted, textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Desarrollo</th>
                <th style={{ padding: "6px 8px" }}>Estado</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Unidades</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Caja neta</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Tierra</th>
              </tr>
            </thead>
            <tbody>
              {data.desarrollos.map((d) => {
                const ing = d.ingresos.reduce((s, i) => s + aUSD(i.monto, i.moneda), 0);
                const egr = d.egresos.reduce((s, e) => s + aUSD(e.monto, e.moneda), 0);
                const neta = ing - egr;
                const vend = d.unidades.filter((u) => u.estado === "vendida").length;
                const res = d.unidades.filter((u) => u.estado === "reservada").length;
                return (
                  <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.border}`, color: COLORS.text }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{d.nombre}</td>
                    <td style={{ padding: "6px 8px", color: COLORS.muted }}>{d.estado}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{vend + res}/{d.unidades.length}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: neta >= 0 ? COLORS.verde : COLORS.rojo, fontWeight: 600 }}>{fmtUSD(neta)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: COLORS.muted }}>{d.valorTierra ? fmtUSD(aUSD(d.valorTierra, d.monedaTierra || "USD")) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "10px" }}>
          Rentabilidad proyectada = suma de precios de lista de todas las unidades − (costo de obra vinculada + tierra + costos indirectos). Es una estimación con los datos cargados; no reemplaza un análisis contable. Los montos se consolidan a USD con el TC que indiques arriba.
        </div>
      </div>
    </div>
  );
}
