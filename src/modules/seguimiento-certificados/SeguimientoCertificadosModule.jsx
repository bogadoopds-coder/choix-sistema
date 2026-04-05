import { useState, useEffect, useMemo } from "react";
import { storage } from "../../services/storage";
import { COLORS, S } from "../../styles/theme";

const STORAGE_KEY = "choix_seguimiento_certificados";

const ars = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const pct = (n) => `${n.toFixed(1)}%`;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const today = () => new Date().toISOString().slice(0, 10);

const daysBetween = (a, b) => {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
};

const daysSince = (d) => {
  if (!d) return null;
  return Math.round((new Date() - new Date(d)) / 86400000);
};

// Default expected days for each transition
const DEFAULT_PLAZOS = {
  presentadoAFacturado: 30,
  facturadoACobrado: 30,
};

// Financial cost: TNA (annual nominal rate) for delay cost estimation
const DEFAULT_TNA = 65; // 65% annual rate (Argentina context)

function semaforoColor(diasReales, diasEsperados) {
  if (diasReales === null || diasEsperados === null) return null;
  const ratio = diasReales / diasEsperados;
  if (ratio <= 1) return COLORS.verde;
  if (ratio <= 1.5) return COLORS.amarillo;
  return COLORS.rojo;
}

function semaforoLabel(diasReales, diasEsperados) {
  if (diasReales === null || diasEsperados === null) return "—";
  const ratio = diasReales / diasEsperados;
  if (ratio <= 1) return "En plazo";
  if (ratio <= 1.5) return "Demorado";
  return "Crítico";
}

function costoFinanciero(monto, diasDemora, tna) {
  if (!monto || !diasDemora || diasDemora <= 0) return 0;
  return monto * (tna / 100) * (diasDemora / 365);
}

// ─── VIEWS ──────────────────────────────────────────────────────────────────

function DashboardView({ data, setView, setSelectedOrg }) {
  const { organismos, certificados, config } = data;
  const tna = config.tna ?? DEFAULT_TNA;

  const stats = useMemo(() => {
    let totalMonto = 0, totalPendiente = 0, totalCobrado = 0, totalCostoFinanciero = 0;
    let countPresentado = 0, countFacturado = 0, countCobrado = 0;
    let criticos = 0, demorados = 0, enPlazo = 0;

    const porOrganismo = {};

    certificados.forEach((c) => {
      const org = organismos.find((o) => o.id === c.organismoId);
      const orgName = org?.nombre ?? "Sin organismo";
      const plazos = org?.plazos ?? DEFAULT_PLAZOS;

      if (!porOrganismo[c.organismoId]) {
        porOrganismo[c.organismoId] = { nombre: orgName, id: c.organismoId, total: 0, pendiente: 0, cobrado: 0, costoFin: 0, criticos: 0, demorados: 0, enPlazo: 0, count: 0 };
      }
      const po = porOrganismo[c.organismoId];
      po.count++;

      totalMonto += c.monto || 0;
      po.total += c.monto || 0;

      if (c.estado === "cobrado") {
        countCobrado++;
        totalCobrado += c.monto || 0;
        po.cobrado += c.monto || 0;

        // Calculate delay cost even for collected ones
        const diasPaF = daysBetween(c.fechaPresentado, c.fechaFacturado);
        const diasFaC = daysBetween(c.fechaFacturado, c.fechaCobrado);
        const demoraP = diasPaF !== null ? Math.max(0, diasPaF - plazos.presentadoAFacturado) : 0;
        const demoraF = diasFaC !== null ? Math.max(0, diasFaC - plazos.facturadoACobrado) : 0;
        const cf = costoFinanciero(c.monto, demoraP + demoraF, tna);
        totalCostoFinanciero += cf;
        po.costoFin += cf;
        enPlazo++;
        po.enPlazo++;
      } else if (c.estado === "facturado") {
        countFacturado++;
        totalPendiente += c.monto || 0;
        po.pendiente += c.monto || 0;

        const diasPaF = daysBetween(c.fechaPresentado, c.fechaFacturado);
        const diasFaC = daysSince(c.fechaFacturado);
        const demoraP = diasPaF !== null ? Math.max(0, diasPaF - plazos.presentadoAFacturado) : 0;
        const demoraF = diasFaC !== null ? Math.max(0, diasFaC - plazos.facturadoACobrado) : 0;
        const cf = costoFinanciero(c.monto, demoraP + demoraF, tna);
        totalCostoFinanciero += cf;
        po.costoFin += cf;

        const color = semaforoColor(diasFaC, plazos.facturadoACobrado);
        if (color === COLORS.rojo) { criticos++; po.criticos++; }
        else if (color === COLORS.amarillo) { demorados++; po.demorados++; }
        else { enPlazo++; po.enPlazo++; }
      } else {
        // presentado
        countPresentado++;
        totalPendiente += c.monto || 0;
        po.pendiente += c.monto || 0;

        const diasPaF = daysSince(c.fechaPresentado);
        const demoraP = diasPaF !== null ? Math.max(0, diasPaF - plazos.presentadoAFacturado) : 0;
        const cf = costoFinanciero(c.monto, demoraP, tna);
        totalCostoFinanciero += cf;
        po.costoFin += cf;

        const color = semaforoColor(diasPaF, plazos.presentadoAFacturado);
        if (color === COLORS.rojo) { criticos++; po.criticos++; }
        else if (color === COLORS.amarillo) { demorados++; po.demorados++; }
        else { enPlazo++; po.enPlazo++; }
      }
    });

    return { totalMonto, totalPendiente, totalCobrado, totalCostoFinanciero, countPresentado, countFacturado, countCobrado, criticos, demorados, enPlazo, porOrganismo: Object.values(porOrganismo).sort((a, b) => b.pendiente - a.pendiente) };
  }, [certificados, organismos, tna]);

  const kpis = [
    { label: "Monto Total", value: ars(stats.totalMonto), color: COLORS.text },
    { label: "Pendiente Cobro", value: ars(stats.totalPendiente), color: COLORS.amarillo },
    { label: "Cobrado", value: ars(stats.totalCobrado), color: COLORS.verde },
    { label: "Costo Financiero Demoras", value: ars(stats.totalCostoFinanciero), color: COLORS.rojo },
  ];

  const semaforo = [
    { label: "En Plazo", count: stats.enPlazo, color: COLORS.verde },
    { label: "Demorados", count: stats.demorados, color: COLORS.amarillo },
    { label: "Criticos", count: stats.criticos, color: COLORS.rojo },
  ];

  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...S.panel, textAlign: "center" }}>
            <div style={S.label}>{k.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: k.color, marginTop: "6px" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Semaforo summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {semaforo.map((s) => (
          <div key={s.label} style={{ ...S.panel, display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: s.color, opacity: 0.9, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "22px", fontWeight: 800 }}>{s.count}</div>
              <div style={{ fontSize: "11px", color: COLORS.muted }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-organismo table */}
      <div style={S.panel}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>Certificados por Organismo</span>
          <button style={S.btn("gold", true)} onClick={() => setView("organismos")}>Gestionar Organismos</button>
        </div>
        {stats.porOrganismo.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: "12px", padding: "20px", textAlign: "center" }}>
            No hay certificados cargados. Agregue un organismo y comience a cargar certificados.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Organismo</th>
                <th style={S.th}>Cert.</th>
                <th style={{ ...S.th, textAlign: "right" }}>Monto Total</th>
                <th style={{ ...S.th, textAlign: "right" }}>Pendiente</th>
                <th style={{ ...S.th, textAlign: "right" }}>Cobrado</th>
                <th style={{ ...S.th, textAlign: "right" }}>Costo Fin.</th>
                <th style={{ ...S.th, textAlign: "center" }}>Estado</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {stats.porOrganismo.map((po) => {
                const worstColor = po.criticos > 0 ? COLORS.rojo : po.demorados > 0 ? COLORS.amarillo : COLORS.verde;
                return (
                  <tr key={po.id} style={{ cursor: "pointer" }} onClick={() => { setSelectedOrg(po.id); setView("certificados"); }}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{po.nombre}</td>
                    <td style={S.td}>{po.count}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>{ars(po.total)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: COLORS.amarillo }}>{ars(po.pendiente)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: COLORS.verde }}>{ars(po.cobrado)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: COLORS.rojo }}>{ars(po.costoFin)}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                        {po.criticos > 0 && <span style={S.tag(COLORS.rojo)}>{po.criticos} crit</span>}
                        {po.demorados > 0 && <span style={S.tag(COLORS.amarillo)}>{po.demorados} dem</span>}
                        {po.enPlazo > 0 && <span style={S.tag(COLORS.verde)}>{po.enPlazo} ok</span>}
                      </div>
                    </td>
                    <td style={S.td}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: worstColor }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Top delayed certificates */}
      <TopDelayedCerts certificados={certificados} organismos={organismos} tna={tna} />
    </div>
  );
}

function TopDelayedCerts({ certificados, organismos, tna }) {
  const delayed = useMemo(() => {
    return certificados
      .filter((c) => c.estado !== "cobrado")
      .map((c) => {
        const org = organismos.find((o) => o.id === c.organismoId);
        const plazos = org?.plazos ?? DEFAULT_PLAZOS;
        let diasDemora = 0;
        if (c.estado === "presentado") {
          const d = daysSince(c.fechaPresentado);
          diasDemora = d !== null ? Math.max(0, d - plazos.presentadoAFacturado) : 0;
        } else {
          const d1 = daysBetween(c.fechaPresentado, c.fechaFacturado);
          const d2 = daysSince(c.fechaFacturado);
          const dem1 = d1 !== null ? Math.max(0, d1 - plazos.presentadoAFacturado) : 0;
          const dem2 = d2 !== null ? Math.max(0, d2 - plazos.facturadoACobrado) : 0;
          diasDemora = dem1 + dem2;
        }
        const cf = costoFinanciero(c.monto, diasDemora, tna);
        return { ...c, orgNombre: org?.nombre ?? "—", diasDemora, costoFin: cf };
      })
      .filter((c) => c.diasDemora > 0)
      .sort((a, b) => b.costoFin - a.costoFin)
      .slice(0, 10);
  }, [certificados, organismos, tna]);

  if (delayed.length === 0) return null;

  return (
    <div style={{ ...S.panel, marginTop: "16px" }}>
      <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.rojo }}>Top Certificados Demorados (por costo financiero)</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={S.th}>Certificado</th>
            <th style={S.th}>Organismo</th>
            <th style={S.th}>Estado</th>
            <th style={{ ...S.th, textAlign: "right" }}>Monto</th>
            <th style={{ ...S.th, textAlign: "right" }}>Dias Demora</th>
            <th style={{ ...S.th, textAlign: "right" }}>Costo Financiero</th>
          </tr>
        </thead>
        <tbody>
          {delayed.map((c) => (
            <tr key={c.id}>
              <td style={{ ...S.td, fontWeight: 600 }}>{c.nombre}</td>
              <td style={S.td}>{c.orgNombre}</td>
              <td style={S.td}><span style={S.tag(c.estado === "presentado" ? COLORS.blue : COLORS.amarillo)}>{c.estado.toUpperCase()}</span></td>
              <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>{ars(c.monto)}</td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: COLORS.rojo }}>{c.diasDemora}d</td>
              <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: COLORS.rojo }}>{ars(c.costoFin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ORGANISMOS VIEW ────────────────────────────────────────────────────────

function OrganismosView({ data, save, setView }) {
  const { organismos, config } = data;
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nombre: "", plazoPaF: DEFAULT_PLAZOS.presentadoAFacturado, plazoFaC: DEFAULT_PLAZOS.facturadoACobrado });

  function startEdit(org) {
    setEditId(org.id);
    setForm({ nombre: org.nombre, plazoPaF: org.plazos?.presentadoAFacturado ?? DEFAULT_PLAZOS.presentadoAFacturado, plazoFaC: org.plazos?.facturadoACobrado ?? DEFAULT_PLAZOS.facturadoACobrado });
  }

  function startNew() {
    setEditId("new");
    setForm({ nombre: "", plazoPaF: DEFAULT_PLAZOS.presentadoAFacturado, plazoFaC: DEFAULT_PLAZOS.facturadoACobrado });
  }

  function handleSave() {
    if (!form.nombre.trim()) return;
    const plazos = { presentadoAFacturado: Number(form.plazoPaF) || 30, facturadoACobrado: Number(form.plazoFaC) || 30 };
    if (editId === "new") {
      save({ ...data, organismos: [...organismos, { id: uid(), nombre: form.nombre.trim(), plazos }] });
    } else {
      save({ ...data, organismos: organismos.map((o) => (o.id === editId ? { ...o, nombre: form.nombre.trim(), plazos } : o)) });
    }
    setEditId(null);
  }

  function handleDelete(id) {
    if (!confirm("Eliminar organismo? Los certificados asociados no se eliminaran.")) return;
    save({ ...data, organismos: organismos.filter((o) => o.id !== id) });
  }

  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <button style={S.btn("ghost", true)} onClick={() => setView("dashboard")}>← Dashboard</button>
        <span style={{ fontWeight: 700, fontSize: "14px" }}>Organismos</span>
        <button style={{ ...S.btn("gold", true), marginLeft: "auto" }} onClick={startNew}>+ Nuevo Organismo</button>
      </div>

      {/* Config TNA */}
      <div style={{ ...S.panel, marginBottom: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
        <div>
          <label style={S.label}>TNA para costo financiero (%)</label>
          <input type="number" value={config.tna ?? DEFAULT_TNA} style={{ ...S.input, width: "100px" }}
            onChange={(e) => save({ ...data, config: { ...config, tna: Number(e.target.value) } })} />
        </div>
        <div style={{ fontSize: "11px", color: COLORS.muted, maxWidth: "400px" }}>
          Tasa Nominal Anual usada para calcular el costo financiero de la demora en el cobro de certificados. Se aplica proporcionalmente a los dias de demora sobre el monto del certificado.
        </div>
      </div>

      {editId && (
        <div style={{ ...S.panel, marginBottom: "16px" }}>
          <div style={{ fontWeight: 700, marginBottom: "10px" }}>{editId === "new" ? "Nuevo Organismo" : "Editar Organismo"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px", alignItems: "end" }}>
            <div>
              <label style={S.label}>Nombre</label>
              <input style={S.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Municipalidad de Córdoba" />
            </div>
            <div>
              <label style={S.label}>Plazo Presentado → Facturado (dias)</label>
              <input type="number" style={S.input} value={form.plazoPaF} onChange={(e) => setForm({ ...form, plazoPaF: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Plazo Facturado → Cobrado (dias)</label>
              <input type="number" style={S.input} value={form.plazoFaC} onChange={(e) => setForm({ ...form, plazoFaC: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button style={S.btn("gold", true)} onClick={handleSave}>Guardar</button>
            <button style={S.btn("ghost", true)} onClick={() => setEditId(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={S.panel}>
        {organismos.length === 0 ? (
          <div style={{ color: COLORS.muted, textAlign: "center", padding: "20px" }}>No hay organismos. Cree uno para comenzar.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Organismo</th>
                <th style={{ ...S.th, textAlign: "center" }}>Plazo Pres→Fact</th>
                <th style={{ ...S.th, textAlign: "center" }}>Plazo Fact→Cobro</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {organismos.map((o) => (
                <tr key={o.id}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{o.nombre}</td>
                  <td style={{ ...S.td, textAlign: "center" }}>{o.plazos?.presentadoAFacturado ?? 30} dias</td>
                  <td style={{ ...S.td, textAlign: "center" }}>{o.plazos?.facturadoACobrado ?? 30} dias</td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    <button style={S.btn("ghost", true)} onClick={() => startEdit(o)}>Editar</button>{" "}
                    <button style={S.btn("red", true)} onClick={() => handleDelete(o.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── CERTIFICADOS VIEW ──────────────────────────────────────────────────────

function CertificadosView({ data, save, selectedOrg, setSelectedOrg, setView }) {
  const { organismos, certificados, config } = data;
  const tna = config.tna ?? DEFAULT_TNA;
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  const org = organismos.find((o) => o.id === selectedOrg);
  const plazos = org?.plazos ?? DEFAULT_PLAZOS;
  const certs = certificados.filter((c) => c.organismoId === selectedOrg).sort((a, b) => (b.fechaPresentado || "").localeCompare(a.fechaPresentado || ""));

  function startNew() {
    setEditId("new");
    setForm({ nombre: "", obra: "", periodo: "", monto: "", fechaPresentado: today(), fechaFacturado: "", fechaCobrado: "", estado: "presentado", notas: "" });
  }

  function startEdit(c) {
    setEditId(c.id);
    setForm({ nombre: c.nombre, obra: c.obra || "", periodo: c.periodo || "", monto: String(c.monto || ""), fechaPresentado: c.fechaPresentado || "", fechaFacturado: c.fechaFacturado || "", fechaCobrado: c.fechaCobrado || "", estado: c.estado, notas: c.notas || "" });
  }

  function handleSave() {
    if (!form.nombre.trim() || !form.monto) return;
    // Auto-derive estado from dates
    let estado = "presentado";
    if (form.fechaCobrado) estado = "cobrado";
    else if (form.fechaFacturado) estado = "facturado";

    const cert = {
      nombre: form.nombre.trim(),
      obra: form.obra.trim(),
      periodo: form.periodo.trim(),
      monto: Number(form.monto) || 0,
      fechaPresentado: form.fechaPresentado || "",
      fechaFacturado: form.fechaFacturado || "",
      fechaCobrado: form.fechaCobrado || "",
      estado,
      notas: form.notas,
      organismoId: selectedOrg,
    };

    if (editId === "new") {
      save({ ...data, certificados: [...certificados, { ...cert, id: uid() }] });
    } else {
      save({ ...data, certificados: certificados.map((c) => (c.id === editId ? { ...c, ...cert } : c)) });
    }
    setEditId(null);
  }

  function handleDelete(id) {
    if (!confirm("Eliminar certificado?")) return;
    save({ ...data, certificados: certificados.filter((c) => c.id !== id) });
  }

  function quickAdvance(c) {
    let updated;
    if (c.estado === "presentado") {
      updated = { ...c, estado: "facturado", fechaFacturado: today() };
    } else if (c.estado === "facturado") {
      updated = { ...c, estado: "cobrado", fechaCobrado: today() };
    } else return;
    save({ ...data, certificados: certificados.map((x) => (x.id === c.id ? updated : x)) });
  }

  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <button style={S.btn("ghost", true)} onClick={() => setView("dashboard")}>← Dashboard</button>
        <span style={{ fontWeight: 700, fontSize: "14px" }}>Certificados — {org?.nombre ?? "Organismo"}</span>
        <button style={{ ...S.btn("gold", true), marginLeft: "auto" }} onClick={startNew}>+ Nuevo Certificado</button>
      </div>

      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
        <MiniKpi label="Total" value={ars(certs.reduce((s, c) => s + (c.monto || 0), 0))} />
        <MiniKpi label="Presentados" value={certs.filter((c) => c.estado === "presentado").length} color={COLORS.blue} />
        <MiniKpi label="Facturados" value={certs.filter((c) => c.estado === "facturado").length} color={COLORS.amarillo} />
        <MiniKpi label="Cobrados" value={certs.filter((c) => c.estado === "cobrado").length} color={COLORS.verde} />
      </div>

      {editId && (
        <div style={{ ...S.panel, marginBottom: "16px" }}>
          <div style={{ fontWeight: 700, marginBottom: "10px" }}>{editId === "new" ? "Nuevo Certificado" : "Editar Certificado"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={S.label}>Nombre / Nro Certificado</label>
              <input style={S.input} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Cert #3 - Etapa 1" />
            </div>
            <div>
              <label style={S.label}>Obra</label>
              <input style={S.input} value={form.obra} onChange={(e) => setForm({ ...form, obra: e.target.value })} placeholder="Nombre de la obra" />
            </div>
            <div>
              <label style={S.label}>Periodo</label>
              <input style={S.input} value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="Ej: Mar 2026" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginTop: "10px" }}>
            <div>
              <label style={S.label}>Monto ($)</label>
              <input type="number" style={S.input} value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Fecha Presentado</label>
              <input type="date" style={S.input} value={form.fechaPresentado} onChange={(e) => setForm({ ...form, fechaPresentado: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Fecha Facturado</label>
              <input type="date" style={S.input} value={form.fechaFacturado} onChange={(e) => setForm({ ...form, fechaFacturado: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Fecha Cobrado</label>
              <input type="date" style={S.input} value={form.fechaCobrado} onChange={(e) => setForm({ ...form, fechaCobrado: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: "10px" }}>
            <label style={S.label}>Notas</label>
            <input style={S.input} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones..." />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button style={S.btn("gold", true)} onClick={handleSave}>Guardar</button>
            <button style={S.btn("ghost", true)} onClick={() => setEditId(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Certificates table */}
      <div style={S.panel}>
        {certs.length === 0 ? (
          <div style={{ color: COLORS.muted, textAlign: "center", padding: "20px" }}>Sin certificados para este organismo.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}></th>
                <th style={S.th}>Certificado</th>
                <th style={S.th}>Obra</th>
                <th style={S.th}>Periodo</th>
                <th style={{ ...S.th, textAlign: "right" }}>Monto</th>
                <th style={S.th}>Estado</th>
                <th style={S.th}>Presentado</th>
                <th style={S.th}>Facturado</th>
                <th style={S.th}>Cobrado</th>
                <th style={{ ...S.th, textAlign: "right" }}>Demora</th>
                <th style={{ ...S.th, textAlign: "right" }}>Costo Fin.</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => {
                let diasDemora = 0;
                let sColor = COLORS.verde;
                if (c.estado === "presentado") {
                  const d = daysSince(c.fechaPresentado);
                  diasDemora = d !== null ? Math.max(0, d - plazos.presentadoAFacturado) : 0;
                  sColor = semaforoColor(d, plazos.presentadoAFacturado) ?? COLORS.verde;
                } else if (c.estado === "facturado") {
                  const d1 = daysBetween(c.fechaPresentado, c.fechaFacturado);
                  const d2 = daysSince(c.fechaFacturado);
                  diasDemora = (d1 !== null ? Math.max(0, d1 - plazos.presentadoAFacturado) : 0) + (d2 !== null ? Math.max(0, d2 - plazos.facturadoACobrado) : 0);
                  sColor = semaforoColor(d2, plazos.facturadoACobrado) ?? COLORS.verde;
                } else {
                  const d1 = daysBetween(c.fechaPresentado, c.fechaFacturado);
                  const d2 = daysBetween(c.fechaFacturado, c.fechaCobrado);
                  diasDemora = (d1 !== null ? Math.max(0, d1 - plazos.presentadoAFacturado) : 0) + (d2 !== null ? Math.max(0, d2 - plazos.facturadoACobrado) : 0);
                  sColor = COLORS.verde;
                }
                const cf = costoFinanciero(c.monto, diasDemora, tna);

                const estadoColor = c.estado === "cobrado" ? COLORS.verde : c.estado === "facturado" ? COLORS.amarillo : COLORS.blue;
                const nextLabel = c.estado === "presentado" ? "Facturar" : c.estado === "facturado" ? "Cobrar" : null;

                return (
                  <tr key={c.id}>
                    <td style={S.td}><div style={{ width: "10px", height: "10px", borderRadius: "50%", background: sColor }} /></td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{c.nombre}</td>
                    <td style={{ ...S.td, fontSize: "11px", color: COLORS.muted }}>{c.obra}</td>
                    <td style={{ ...S.td, fontSize: "11px" }}>{c.periodo}</td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace" }}>{ars(c.monto)}</td>
                    <td style={S.td}><span style={S.tag(estadoColor)}>{c.estado.toUpperCase()}</span></td>
                    <td style={{ ...S.td, fontSize: "11px" }}>{c.fechaPresentado}</td>
                    <td style={{ ...S.td, fontSize: "11px" }}>{c.fechaFacturado || "—"}</td>
                    <td style={{ ...S.td, fontSize: "11px" }}>{c.fechaCobrado || "—"}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: diasDemora > 0 ? COLORS.rojo : COLORS.verde }}>
                      {diasDemora > 0 ? `${diasDemora}d` : "—"}
                    </td>
                    <td style={{ ...S.td, textAlign: "right", fontFamily: "monospace", color: cf > 0 ? COLORS.rojo : COLORS.muted }}>
                      {cf > 0 ? ars(cf) : "—"}
                    </td>
                    <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                      {nextLabel && <button style={S.btn("blue", true)} onClick={() => quickAdvance(c)}>{nextLabel}</button>}
                      {" "}
                      <button style={S.btn("ghost", true)} onClick={() => startEdit(c)}>Editar</button>
                      {" "}
                      <button style={S.btn("red", true)} onClick={() => handleDelete(c.id)}>X</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MiniKpi({ label, value, color }) {
  return (
    <div style={{ ...S.panel, padding: "10px 14px" }}>
      <div style={S.label}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 800, color: color ?? COLORS.text, marginTop: "2px" }}>{value}</div>
    </div>
  );
}

// ─── MAIN MODULE ────────────────────────────────────────────────────────────

export default function SeguimientoCertificadosModule() {
  const [data, setData] = useState({ organismos: [], certificados: [], config: { tna: DEFAULT_TNA } });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard"); // dashboard | organismos | certificados
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEY);
        if (r?.value) setData(JSON.parse(r.value));
      } catch (e) {
        console.error("Error loading seguimiento data:", e);
      }
      setLoading(false);
    })();
  }, []);

  async function save(newData) {
    setData(newData);
    try {
      await storage.set(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error("Error saving seguimiento data:", e);
    }
  }

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;

  if (view === "organismos") return <OrganismosView data={data} save={save} setView={setView} />;
  if (view === "certificados") return <CertificadosView data={data} save={save} selectedOrg={selectedOrg} setSelectedOrg={setSelectedOrg} setView={setView} />;
  return <DashboardView data={data} setView={setView} setSelectedOrg={setSelectedOrg} />;
}
