import { useState, useEffect } from "react";
import { uid } from "../../utils/id";
import { ars } from "../../utils/format";
import { precioVigente } from "../../utils/budgets";
import { COLORS, S } from "../../styles/theme";

const STORAGE_KEY_PROYECTOS = "choix_proyectos";
const STORAGE_KEY_PRECIOS = "choix_precios";

const ESTADOS = ["borrador", "presentado", "aprobado", "cobrado"];

function buildCertItems(proyecto, cert, preciosActualizados, iccFactor) {
  const prevCert = (proyecto.certificaciones || []).find((c) => c.numero === (cert.numero || 0) - 1);
  const prevByItemId = new Map();
  if (prevCert && Array.isArray(prevCert.items)) {
    prevCert.items.forEach((it) => prevByItemId.set(it.itemId, it));
  }
  return (proyecto.items || []).map((item) => {
    const prev = prevByItemId.get(item.codigo);
    const cantAnterior = prev ? (prev.cantAcumulada ?? 0) : 0;
    const precioUnit = item.precioCustom ?? precioVigente(item.baseCodigo ?? item.codigo, item.precioBase, preciosActualizados);
    const precioUnitario = precioUnit * iccFactor;
    const existing = cert.items && cert.items.find((i) => i.itemId === item.codigo);
    const cantPeriodo = existing ? (existing.cantPeriodo ?? 0) : 0;
    const cantAcumulada = cantAnterior + cantPeriodo;
    const montoPeriodo = cantPeriodo * precioUnitario;
    const montoAcumulado = cantAcumulada * precioUnitario;
    const cantPresup = item.cantPresup ?? 0;
    const porcentaje = cantPresup > 0 ? (cantAcumulada / cantPresup) * 100 : 0;
    return {
      itemId: item.codigo,
      descripcion: item.desc ?? "",
      unidad: item.um ?? "UN",
      cantPresup,
      precioUnitario,
      cantAnterior,
      cantPeriodo,
      cantAcumulada,
      montoPeriodo,
      montoAcumulado,
      porcentaje,
    };
  });
}

function recalcCertTotals(items) {
  const totalPeriodo = (items || []).reduce((s, i) => s + (i.montoPeriodo ?? 0), 0);
  const totalAcumulado = (items || []).reduce((s, i) => s + (i.montoAcumulado ?? 0), 0);
  return { totalPeriodo, totalAcumulado };
}

// ─── Lista de obras (selector) ─────────────────────────────────────────────────
function ListaObras({ proyectos, onSelect }) {
  if (!proyectos.length)
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: COLORS.muted }}>
        No hay obras. Creá una desde Presupuestos.
      </div>
    );
  return (
    <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
      {proyectos.map((p) => (
        <div
          key={p.id}
          style={{ ...S.panel, cursor: "pointer" }}
          onClick={() => onSelect(p)}
        >
          <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: "12px" }}>{p.codigo}</div>
          <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "4px" }}>{p.nombre}</div>
          <div style={{ color: COLORS.muted, fontSize: "11px", marginTop: "4px" }}>{(p.certificaciones || []).length} certificación(es)</div>
        </div>
      ))}
    </div>
  );
}

// ─── Lista de certificaciones + botón nueva ────────────────────────────────────
function ListaCertificaciones({ proyecto, preciosActualizados, onNewCert, onSelectCert }) {
  const certs = (proyecto.certificaciones || []).slice().sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ color: COLORS.muted, fontSize: "11px" }}>OBRA: {proyecto.codigo} — {proyecto.nombre}</div>
        </div>
        <button style={S.btn("gold", true)} onClick={onNewCert}>
          + NUEVA CERTIFICACIÓN
        </button>
      </div>
      {certs.length === 0 ? (
        <div style={{ ...S.panel, textAlign: "center", color: COLORS.muted, padding: "40px" }}>
          Aún no hay certificaciones. Creá la primera.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {certs.map((c) => (
            <div
              key={c.id}
              style={{ ...S.panel, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}
              onClick={() => onSelectCert(c)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "14px" }}>N° {c.numero}</span>
                <span style={{ color: COLORS.text }}>Período {c.periodo}</span>
                <span style={{ color: COLORS.muted, fontSize: "12px" }}>{c.fecha}</span>
                <span style={S.tag(ESTADOS.indexOf(c.estado) >= 2 ? COLORS.verde : COLORS.muted)}>{c.estado}</span>
              </div>
              <div style={{ fontWeight: 700, color: COLORS.gold }}>{ars(c.totalPeriodo ?? 0)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detalle de certificación (tabla ítems) ────────────────────────────────────
function DetalleCertificacion({ proyecto, certificacion, preciosActualizados, onBack, onSave }) {
  const iccFactor = 1 + (proyecto.iccPct ?? 0) / 100;
  const [items, setItems] = useState([]);
  const [observaciones, setObservaciones] = useState(certificacion.observaciones ?? "");
  const [estado, setEstado] = useState(certificacion.estado ?? "borrador");
  const [periodo, setPeriodo] = useState(certificacion.periodo ?? "");
  const [fecha, setFecha] = useState(certificacion.fecha ?? "");

  useEffect(() => {
    const built = buildCertItems(proyecto, certificacion, preciosActualizados, iccFactor);
    setItems(built);
  }, [proyecto.id, certificacion?.id, certificacion?.items, preciosActualizados]);

  const { totalPeriodo, totalAcumulado } = recalcCertTotals(items);

  function setCantPeriodo(itemId, value) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.itemId !== itemId) return it;
        const cantPeriodo = num;
        const cantAcumulada = it.cantAnterior + cantPeriodo;
        const montoPeriodo = cantPeriodo * it.precioUnitario;
        const montoAcumulado = cantAcumulada * it.precioUnitario;
        const porcentaje = it.cantPresup > 0 ? (cantAcumulada / it.cantPresup) * 100 : 0;
        return { ...it, cantPeriodo, cantAcumulada, montoPeriodo, montoAcumulado, porcentaje };
      })
    );
  }

  function handleSave() {
    onSave({
      ...certificacion,
      items,
      totalPeriodo,
      totalAcumulado,
      iccFactor,
      observaciones,
      estado,
      periodo: periodo || certificacion.periodo,
      fecha: fecha || certificacion.fecha,
    });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <button style={S.btn("", true)} onClick={onBack}>← Volver</button>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, color: COLORS.gold }}>Certificación N° {certificacion.numero}</span>
          <input style={{ ...S.input, width: "100px" }} placeholder="2026-01" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          <input style={{ ...S.input, width: "120px" }} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <select style={{ ...S.input, width: "130px" }} value={estado} onChange={(e) => setEstado(e.target.value)}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <button style={S.btn("gold", true)} onClick={handleSave}>GUARDAR</button>
        </div>
      </div>

      <div style={{ overflowX: "auto", marginBottom: "16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Descripción", "UM", "Cant. Presup", "Cant. Anterior", "Cant. Período", "Cant. Acumulada", "% Avance", "Monto Período"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.itemId}>
                <td style={{ ...S.td, maxWidth: "220px" }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.descripcion}>{it.descripcion}</div></td>
                <td style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>{it.unidad}</td>
                <td style={{ ...S.td, textAlign: "right" }}>{it.cantPresup}</td>
                <td style={{ ...S.td, textAlign: "right", color: COLORS.muted }}>{it.cantAnterior}</td>
                <td style={S.td}>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    style={{ ...S.input, width: "90px", textAlign: "right" }}
                    value={it.cantPeriodo}
                    onChange={(e) => setCantPeriodo(it.itemId, e.target.value)}
                  />
                </td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>{it.cantAcumulada.toFixed(2)}</td>
                <td style={{ ...S.td, textAlign: "right" }}>{it.porcentaje.toFixed(1)}%</td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: COLORS.gold }}>{ars(it.montoPeriodo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `2px solid ${COLORS.border}` }}>
              <td colSpan={7} style={{ ...S.td, fontWeight: 700, textAlign: "right" }}>Total período</td>
              <td style={{ ...S.td, fontWeight: 800, color: COLORS.gold, textAlign: "right" }}>{ars(totalPeriodo)}</td>
            </tr>
            <tr>
              <td colSpan={7} style={{ ...S.td, fontWeight: 700, textAlign: "right" }}>Total acumulado</td>
              <td style={{ ...S.td, fontWeight: 800, color: COLORS.gold, textAlign: "right" }}>{ars(totalAcumulado)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ marginTop: "12px" }}>
        <label style={S.label}>Observaciones</label>
        <textarea style={{ ...S.input, minHeight: "60px", resize: "vertical" }} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones..." />
      </div>
    </div>
  );
}

// ─── MAIN MODULE ─────────────────────────────────────────────────────────────
export default function CertificacionesModule({ BASE }) {
  const [proyectos, setProyectos] = useState([]);
  const [preciosActualizados, setPreciosActualizados] = useState({});
  const [storageReady, setStorageReady] = useState(false);
  const [view, setView] = useState("obras"); // obras | certs | detalle
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROYECTOS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setProyectos(parsed);
      }
    } catch (e) {
      console.error("Error cargando proyectos desde localStorage:", e);
    }
    try {
      const rawP = localStorage.getItem(STORAGE_KEY_PRECIOS);
      if (rawP) {
        const parsed = JSON.parse(rawP);
        if (parsed && typeof parsed === "object") setPreciosActualizados(parsed);
      }
    } catch {}
    setStorageReady(true);
  }, []);

  function updateProyecto(id, patch) {
    setProyectos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function handleSelectObra(p) {
    setSelectedProyecto(p);
    setView("certs");
    setSelectedCert(null);
  }

  function handleNewCert() {
    if (!selectedProyecto) return;
    const certs = selectedProyecto.certificaciones || [];
    const nextNum = certs.length ? Math.max(...certs.map((c) => c.numero ?? 0)) + 1 : 1;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0);
    const fecha = `${y}-${m}-${String(lastDay.getDate()).padStart(2, "0")}`;
    const iccFactor = 1 + (selectedProyecto.iccPct ?? 0) / 100;
    const newCert = {
      id: "CERT-" + uid().slice(0, 6).toUpperCase(),
      numero: nextNum,
      periodo: `${y}-${m}`,
      fecha,
      estado: "borrador",
      items: [],
      totalPeriodo: 0,
      totalAcumulado: 0,
      iccFactor,
      observaciones: "",
    };
    const builtItems = buildCertItems(selectedProyecto, newCert, preciosActualizados, iccFactor);
    const { totalPeriodo, totalAcumulado } = recalcCertTotals(builtItems);
    newCert.items = builtItems;
    newCert.totalPeriodo = totalPeriodo;
    newCert.totalAcumulado = totalAcumulado;
    const updatedCerts = [...certs, newCert];
    updateProyecto(selectedProyecto.id, { certificaciones: updatedCerts });
    setSelectedCert(newCert);
    setView("detalle");
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROYECTOS);
      const proyectosFromStorage = raw ? JSON.parse(raw) : [];
      const updatedProyectos = proyectosFromStorage.map((p) =>
        p.id === selectedProyecto.id ? { ...p, certificaciones: updatedCerts } : p
      );
      localStorage.setItem(STORAGE_KEY_PROYECTOS, JSON.stringify(updatedProyectos));
      setProyectos(updatedProyectos);
    } catch (e) {
      console.error("Error guardando nueva certificación en localStorage:", e);
    }
  }

  function handleSelectCert(cert) {
    setSelectedCert(cert);
    setView("detalle");
  }

  function handleSaveCert(updatedCert) {
    if (!selectedProyecto) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROYECTOS);
      const proyectosFromStorage = raw ? JSON.parse(raw) : [];
      const certs = (selectedProyecto.certificaciones || []).map((c) =>
        c.id === updatedCert.id ? updatedCert : c
      );
      const updatedProyectos = proyectosFromStorage.map((p) =>
        p.id === selectedProyecto.id ? { ...p, certificaciones: certs } : p
      );
      localStorage.setItem(STORAGE_KEY_PROYECTOS, JSON.stringify(updatedProyectos));
      setProyectos(updatedProyectos);
      setSelectedCert(updatedCert);
      console.log("Certificación guardada:", updatedCert.id);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (e) {
      console.error("Error guardando certificación en localStorage:", e);
    }
  }

  const activeProyecto = selectedProyecto ? (proyectos.find((p) => p.id === selectedProyecto.id) ?? selectedProyecto) : null;

  if (!storageReady)
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: COLORS.muted }}>Cargando...</span>
      </div>
    );

  return (
    <div style={{ ...S.app, height: "100%", overflow: "auto" }}>
      <div style={{ padding: "16px", maxWidth: "1100px", margin: "0 auto" }}>
        {view === "obras" && (
          <>
            <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "16px", fontSize: "14px" }}>📈 CERTIFICACIONES</div>
            <div style={{ color: COLORS.muted, fontSize: "12px", marginBottom: "16px" }}>Elegí una obra para ver o crear certificaciones de avance.</div>
            <ListaObras proyectos={proyectos} onSelect={handleSelectObra} />
          </>
        )}
        {view === "certs" && activeProyecto && (
          <>
            <div style={{ marginBottom: "12px" }}>
              <button style={S.btn("", true)} onClick={() => { setView("obras"); setSelectedProyecto(null); }}>← Obras</button>
            </div>
            <ListaCertificaciones
              proyecto={activeProyecto}
              preciosActualizados={preciosActualizados}
              onNewCert={handleNewCert}
              onSelectCert={handleSelectCert}
            />
          </>
        )}
        {view === "detalle" && activeProyecto && selectedCert && (
          <>
            {savedFeedback && (
              <div style={{ marginBottom: "12px", padding: "10px 14px", background: COLORS.verde + "22", border: `1px solid ${COLORS.verde}`, borderRadius: "8px", color: COLORS.verde, fontWeight: 600, fontSize: "13px" }}>
                Certificación guardada
              </div>
            )}
            <DetalleCertificacion
              proyecto={activeProyecto}
              certificacion={selectedCert}
              preciosActualizados={preciosActualizados}
              onBack={() => { setView("certs"); setSelectedCert(null); }}
              onSave={handleSaveCert}
            />
          </>
        )}
      </div>
    </div>
  );
}
