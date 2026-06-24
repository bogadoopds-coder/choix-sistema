import { useState, useEffect } from "react";
import { uid } from "../../utils/id";
import { today } from "../../utils/date";
import { ars } from "../../utils/format";
import { COLORS, S } from "../../styles/theme";
import { storage } from "../../services/storage";
import { useAuth } from "../../auth/AuthContext";
import { getObras, saveRequerimientos, getProveedores, saveProveedor, deleteProveedor, getOrdenesCompra, crearOrdenCompra } from "../../services/obrasRepo";


const URGENCIAS = ["normal", "urgente", "crítico"];

const ESTADO_BADGE = {
  pendiente: { bg: `${COLORS.amarillo}33`, color: COLORS.amarillo, label: "pendiente" },
  en_revision: { bg: "#3b82f633", color: "#3b82f6", label: "en revisión" },
  aprobado: { bg: `${COLORS.verde}33`, color: COLORS.verde, label: "aprobado" },
  comprado: { bg: `${COLORS.muted}44`, color: COLORS.muted, label: "comprado" },
};

function urgenciaIaStyles(u) {
  const s = String(u ?? "normal")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (s.includes("crit")) return { bg: `${COLORS.rojo}35`, color: COLORS.rojo, label: String(u || "crítico") };
  if (s.includes("urgent")) return { bg: `${COLORS.amarillo}35`, color: COLORS.amarillo, label: String(u || "urgente") };
  if (s === "alta" || s.includes("alta")) return { bg: "#f9731635", color: "#f97316", label: String(u || "alta") };
  return { bg: `${COLORS.muted}55`, color: COLORS.muted, label: String(u || "normal") };
}

function diferenciaPctColor(pct) {
  const n = Math.abs(Number(pct));
  if (!Number.isFinite(n)) return COLORS.muted;
  if (n < 10) return COLORS.verde;
  if (n <= 20) return COLORS.amarillo;
  return COLORS.rojo;
}

function criticidadStyles(c) {
  const s = String(c ?? "").toLowerCase();
  if (s.includes("rojo")) return { bg: `${COLORS.rojo}35`, color: COLORS.rojo };
  if (s.includes("amarillo")) return { bg: `${COLORS.amarillo}35`, color: COLORS.amarillo };
  if (s.includes("verde")) return { bg: `${COLORS.verde}35`, color: COLORS.verde };
  return { bg: `${COLORS.muted}44`, color: COLORS.muted };
}

const chipBase = {
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: "6px",
  fontSize: "10px",
  marginRight: "6px",
  marginBottom: "4px",
  fontWeight: 600,
};

function AnalisisComprasVisual({ data }) {
  if (!data || typeof data !== "object") {
    return <div style={{ color: COLORS.muted, fontSize: "12px" }}>Sin datos de análisis.</div>;
  }

  const reqsAi = Array.isArray(data.reqs) ? data.reqs : [];
  const validacion = Array.isArray(data.validacionPrecios) ? data.validacionPrecios : [];
  const faltantes = Array.isArray(data.faltantes) ? data.faltantes : [];
  const ordenes = Array.isArray(data.ordenesCompra) ? data.ordenesCompra : [];
  const proy = data.proyeccion && typeof data.proyeccion === "object" ? data.proyeccion : null;
  const resumen = data.resumen != null ? String(data.resumen) : "";

  const sectionTitle = (t) => (
    <div style={{ fontWeight: 700, fontSize: "12px", color: COLORS.gold, marginTop: "16px", marginBottom: "10px", letterSpacing: "0.04em" }}>{t}</div>
  );

  return (
    <div style={{ color: COLORS.text, fontSize: "12px", lineHeight: 1.45, maxHeight: "70vh", overflowY: "auto", paddingRight: "6px" }}>
      {sectionTitle("REQS")}
      {reqsAi.length === 0 ? (
        <div style={{ color: COLORS.muted, fontSize: "11px" }}>Sin análisis de REQs.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {reqsAi.map((r, i) => {
            const u = urgenciaIaStyles(r.urgencia);
            const enPres = Array.isArray(r.itemsEnPresupuesto) ? r.itemsEnPresupuesto : [];
            const exc = Array.isArray(r.itemsExcepcion) ? r.itemsExcepcion : [];
            return (
              <div
                key={i}
                style={{
                  background: COLORS.subtle,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 800, color: COLORS.gold }}>REQ N° {r.numero ?? "—"}</span>
                  <span style={{ color: COLORS.text }}>{r.jefeObra || "—"}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px", background: u.bg, color: u.color }}>{u.label}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 700, color: COLORS.gold }}>{ars(Number(r.montoEstimado) || 0)}</span>
                </div>
                <div style={{ fontSize: "10px", color: COLORS.muted, marginBottom: "4px" }}>En presupuesto</div>
                <div>
                  {enPres.length === 0 ? (
                    <span style={{ color: COLORS.muted, fontSize: "10px" }}>—</span>
                  ) : (
                    enPres.map((x, j) => (
                      <span key={j} style={{ ...chipBase, background: `${COLORS.verde}30`, color: COLORS.verde }}>
                        {String(x)}
                      </span>
                    ))
                  )}
                </div>
                <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "8px", marginBottom: "4px" }}>Excepciones</div>
                <div>
                  {exc.length === 0 ? (
                    <span style={{ color: COLORS.muted, fontSize: "10px" }}>—</span>
                  ) : (
                    exc.map((x, j) => (
                      <span key={j} style={{ ...chipBase, background: `${COLORS.amarillo}28`, color: COLORS.amarillo }}>
                        {String(x)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sectionTitle("VALIDACIÓN DE PRECIOS")}
      {validacion.length === 0 ? (
        <div style={{ color: COLORS.muted, fontSize: "11px" }}>Sin ítems en validación.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr>
                {["Código", "Descripción", "UM", "Precio actual", "Precio mercado", "Diferencia %", "Fuente", "Recomendación"].map((h) => (
                  <th key={h} style={{ ...S.th, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {validacion.map((row, i) => {
                const pct = Number(row.diferenciaPct);
                const dc = diferenciaPctColor(pct);
                return (
                  <tr key={i}>
                    <td style={S.td}>{row.codigo ?? "—"}</td>
                    <td style={{ ...S.td, maxWidth: "160px" }}>{row.desc ?? "—"}</td>
                    <td style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>{row.um ?? "—"}</td>
                    <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>{ars(Number(row.precioActual) || 0)}</td>
                    <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>{ars(Number(row.precioMercado) || 0)}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: dc, whiteSpace: "nowrap" }}>
                      {Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ ...S.td, fontSize: "10px", color: COLORS.muted, maxWidth: "120px" }}>{row.fuente ?? "—"}</td>
                    <td style={{ ...S.td, fontSize: "10px", maxWidth: "140px" }}>{row.recomendacion ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sectionTitle("FALTANTES")}
      {faltantes.length === 0 ? (
        <div style={{ color: COLORS.muted, fontSize: "11px" }}>Sin faltantes detectados.</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "18px" }}>
          {faltantes.map((f, i) => {
            const cr = criticidadStyles(f.criticidad);
            return (
              <li key={i} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "8px" }}>
                  <strong style={{ color: COLORS.gold }}>{f.codigo ?? "—"}</strong>
                  <span>{f.desc ?? "—"}</span>
                  <span style={{ color: COLORS.muted, fontSize: "11px" }}>
                    {f.um != null ? `${f.um} · ` : ""}
                    faltante: {f.cantFaltante != null ? Number(f.cantFaltante).toLocaleString("es-AR") : "—"}
                  </span>
                  <span style={{ fontWeight: 700 }}>{ars(Number(f.montoEstimado) || 0)}</span>
                  <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", background: cr.bg, color: cr.color }}>{f.criticidad ?? "—"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {sectionTitle("ÓRDENES DE COMPRA SUGERIDAS")}
      {ordenes.length === 0 ? (
        <div style={{ color: COLORS.muted, fontSize: "11px" }}>Sin sugerencias de OC.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {ordenes.map((oc, i) => (
            <div
              key={i}
              style={{
                background: COLORS.subtle,
                border: `1px solid ${COLORS.border}`,
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: "6px" }}>{oc.proveedor ?? "Proveedor"}</div>
              <div style={{ fontSize: "11px", color: COLORS.muted, marginBottom: "6px" }}>
                {(Array.isArray(oc.items) ? oc.items : []).map((it, j) => (
                  <span key={j} style={{ ...chipBase, background: `${COLORS.blue}22`, color: COLORS.text }}>
                    {String(it)}
                  </span>
                ))}
              </div>
              <div style={{ fontWeight: 700, color: COLORS.gold }}>Total: {ars(Number(oc.montoTotal) || 0)}</div>
            </div>
          ))}
        </div>
      )}

      {sectionTitle("PROYECCIÓN")}
      {!proy ? (
        <div style={{ color: COLORS.muted, fontSize: "11px" }}>Sin datos de proyección.</div>
      ) : (
        <div style={{ background: COLORS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "12px" }}>
          <div style={{ marginBottom: "6px" }}>
            <span style={{ color: COLORS.muted }}>Monto restante estimado: </span>
            <strong style={{ color: COLORS.gold }}>{ars(Number(proy.montoRestante) || 0)}</strong>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <span style={{ color: COLORS.muted }}>Alcanza presupuesto: </span>
            <strong style={{ color: proy.alcanzaPresupuesto ? COLORS.verde : COLORS.amarillo }}>{proy.alcanzaPresupuesto ? "Sí" : "No"}</strong>
          </div>
          {Array.isArray(proy.alertas) && proy.alertas.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "18px", color: COLORS.text, fontSize: "11px" }}>
              {proy.alertas.map((a, i) => (
                <li key={i} style={{ marginBottom: "4px" }}>
                  {String(a)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sectionTitle("RESUMEN")}
      <div style={{ fontSize: "12px", color: COLORS.text, whiteSpace: "pre-wrap" }}>{resumen || "—"}</div>
    </div>
  );
}

function emptyLineItem() {
  return {
    id: uid(),
    esExcepcion: false,
    codigoPresupuesto: "",
    busqueda: "",
    descMostrada: "",
    descLibre: "",
    umLibre: "UN",
    cantSolicitada: 1,
    urgencia: "normal",
  };
}

// ─── Lista de obras ───────────────────────────────────────────────────────────
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
        <div key={p.id} style={{ ...S.panel, cursor: "pointer" }} onClick={() => onSelect(p)}>
          <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: "12px" }}>{p.codigo}</div>
          <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "4px" }}>{p.nombre}</div>
          <div style={{ color: COLORS.muted, fontSize: "11px", marginTop: "4px" }}>{(p.reqs || []).length} REQ(s)</div>
        </div>
      ))}
    </div>
  );
}

function BloqueDespacho({ req, proveedores, onCrearOrden }) {
  const [seleccion, setSeleccion] = useState(new Set());
  const [provId, setProvId] = useState("");
  const [creando, setCreando] = useState(false);

  const items = Array.isArray(req.items) ? req.items : [];
  const sueltos = items
    .map((it, idx) => ({ it, idx }))
    .filter(({ it }) => !it.ocCodigo);

  function toggle(idx) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const puedeCrear = seleccion.size > 0 && provId && !creando;

  async function crear() {
    if (!puedeCrear) return;
    const proveedor = proveedores.find((p) => p.id === provId);
    if (!proveedor) return;
    setCreando(true);
    try {
      await onCrearOrden(req, Array.from(seleccion), proveedor);
      setSeleccion(new Set());
      setProvId("");
    } catch (e) {
      console.error("Error al crear orden:", e);
    }
    setCreando(false);
  }

  if (sueltos.length === 0) {
    return (
      <div style={{ marginTop: "10px", fontSize: "11px", color: "#5dcaa5" }}>
        ✓ Todos los ítems de este requerimiento ya fueron despachados.
      </div>
    );
  }

  return (
    <div style={{ marginTop: "12px", padding: "10px", borderRadius: "6px", background: COLORS.bg, border: `1px solid ${COLORS.border || "#2a3f34"}` }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.gold, marginBottom: "8px" }}>Despachar a proveedor</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
        {sueltos.map(({ it, idx }) => (
          <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: COLORS.text, cursor: "pointer" }}>
            <input type="checkbox" checked={seleccion.has(idx)} onChange={() => toggle(idx)} />
            <span>{it.codigo} — {it.desc} ({it.cantSolicitada} {it.um})</span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <select value={provId} onChange={(e) => setProvId(e.target.value)} style={{ ...S.input, maxWidth: "240px" }}>
          <option value="">Elegí proveedor...</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <button style={{ ...S.btn("gold", true), opacity: puedeCrear ? 1 : 0.5 }} disabled={!puedeCrear} onClick={crear}>
          {creando ? "Creando..." : `Crear orden (${seleccion.size})`}
        </button>
      </div>
      {proveedores.length === 0 && (
        <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "6px" }}>No hay proveedores cargados. Cargá uno en la solapa Proveedores.</div>
      )}
    </div>
  );
}

// ─── Lista de REQs + barra ────────────────────────────────────────────────────
function ListaReqs({
  proyecto,
  ordenesCompra,
  proveedores,
  onCrearOrden,
  BASE,
  onBack,
  onNewReq,
  aiLoading,
  onAnalizarIA,
  aiAnalysis,
  aiError,
  onCloseAiPanel,
  children,
}) {
  const reqs = (proyecto.reqs || []).slice().sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
  const [expandidoId, setExpandidoId] = useState(null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" style={S.btn("", true)} onClick={onBack}>
            ← Obras
          </button>
          <div style={{ color: COLORS.muted, fontSize: "11px" }}>
            OBRA: {proyecto.codigo} — {proyecto.nombre}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" style={S.btn("", true)} onClick={onAnalizarIA} disabled={aiLoading}>
            {aiLoading ? "Analizando..." : "🤖 Analizar con IA"}
          </button>
          <button type="button" style={S.btn("gold", true)} onClick={onNewReq}>
            + NUEVO REQ
          </button>
        </div>
      </div>

      {children}

      {(aiAnalysis !== null || aiError !== null) && (
        <div
          style={{
            marginBottom: "16px",
            padding: "14px 40px 14px 14px",
            borderRadius: "8px",
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            color: "#ffffff",
            position: "relative",
          }}
        >
          <button
            type="button"
            style={{ ...S.btn("red", true), padding: "2px 8px", position: "absolute", top: "10px", right: "10px" }}
            onClick={onCloseAiPanel}
          >
            ✕
          </button>
          {aiError ? (
            <div style={{ color: COLORS.rojo, fontSize: "12px" }}>{aiError}</div>
          ) : typeof aiAnalysis === "string" ? (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "11px", lineHeight: 1.5, fontFamily: "inherit", color: COLORS.text }}>
              {aiAnalysis}
            </pre>
          ) : (
            <AnalisisComprasVisual data={aiAnalysis} />
          )}
        </div>
      )}

      {reqs.length === 0 ? (
        <div style={{ ...S.panel, textAlign: "center", color: COLORS.muted, padding: "40px" }}>
          Aún no hay requerimientos. Creá el primero con + NUEVO REQ.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {reqs.map((r) => {
            const badge = ESTADO_BADGE[r.estado] || ESTADO_BADGE.pendiente;
            const nItems = Array.isArray(r.items) ? r.items.length : 0;
            const obs = (r.observaciones || "").trim();
            const abierto = expandidoId === r.id;
            return (
              <div key={r.id} style={{ ...S.panel, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div
                  onClick={() => setExpandidoId(abierto ? null : r.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ color: COLORS.muted, fontSize: "12px" }}>{abierto ? "▼" : "▶"}</span>
                    <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "14px" }}>REQ N° {r.numero}</span>
                    <span style={{ color: COLORS.muted, fontSize: "12px" }}>{r.fecha}</span>
                    <span style={{ color: COLORS.text, fontSize: "12px" }}>Jefe: {r.jefeObra || "—"}</span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ color: COLORS.muted, fontSize: "11px" }}>{nItems} ítem{nItems !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                {obs ? (
                  <div style={{ fontSize: "11px", color: COLORS.muted, lineHeight: 1.45 }}>{obs.length > 200 ? `${obs.slice(0, 200)}…` : obs}</div>
                ) : null}
                {abierto && (
                  <div style={{ marginTop: "4px", borderTop: `1px solid ${COLORS.border || "#2a3f34"}`, paddingTop: "8px" }}>
                    {nItems === 0 ? (
                      <div style={{ color: COLORS.muted, fontSize: "11px" }}>Este requerimiento no tiene ítems cargados.</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                        <thead>
                          <tr style={{ color: COLORS.muted, textAlign: "left" }}>
                            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Código</th>
                            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Descripción</th>
                            <th style={{ padding: "4px 6px", fontWeight: 600, textAlign: "right" }}>Cant.</th>
                            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Unidad</th>
                            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Urgencia</th>
                            <th style={{ padding: "4px 6px", fontWeight: 600 }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.items.map((it, idx) => (
                            <tr key={idx} style={{ borderTop: `1px solid ${COLORS.border || "#2a3f34"}`, color: COLORS.text }}>
                              <td style={{ padding: "4px 6px" }}>{it.codigo || "—"}</td>
                              <td style={{ padding: "4px 6px" }}>{it.desc || "—"}</td>
                              <td style={{ padding: "4px 6px", textAlign: "right" }}>{it.cantSolicitada ?? "—"}</td>
                              <td style={{ padding: "4px 6px" }}>{it.um || "—"}</td>
                              <td style={{ padding: "4px 6px" }}>{it.urgencia || "—"}</td>
                              <td style={{ padding: "4px 6px" }}>
                                {it.ocCodigo ? (
                                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "rgba(93,202,165,0.15)", color: "#5dcaa5" }}>{it.ocCodigo}</span>
                                ) : (
                                  <span style={{ fontSize: "10px", color: COLORS.muted }}>suelto</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <BloqueDespacho req={r} proveedores={proveedores} onCrearOrden={onCrearOrden} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Formulario nuevo REQ ─────────────────────────────────────────────────────
function FormularioNuevoReq({ proyecto, nextNumero, onSave, onCancel, BASE = [] }) {
  const [fecha, setFecha] = useState(today());
  const [jefeObra, setJefeObra] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [lineItems, setLineItems] = useState([emptyLineItem()]);

  const itemsPresup = proyecto.items || [];

  function addLine() {
    setLineItems((prev) => [...prev, emptyLineItem()]);
  }

  function removeLine(id) {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  }

  function updateLine(id, patch) {
    setLineItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function handleGuardar() {
    const jefe = jefeObra.trim();
    if (!jefe) return;
    const normalized = [];
    for (const li of lineItems) {
      const cant = Number(li.cantSolicitada);
      if (!Number.isFinite(cant) || cant <= 0) continue;
      if (li.esExcepcion) {
        const d = (li.descLibre || "").trim();
        if (!d) continue;
        normalized.push({
          codigo: `EXC-${li.id.slice(0, 8)}`,
          desc: d,
          um: (li.umLibre || "UN").trim() || "UN",
          cantSolicitada: cant,
          urgencia: li.urgencia,
        });
      } else {
        if (!li.codigoPresupuesto) continue;
        const pi = BASE.find((x) => x.codigo === li.codigoPresupuesto);
        normalized.push({
          codigo: pi?.codigo ?? li.codigoPresupuesto,
          desc: pi?.desc ?? li.descMostrada ?? "",
          um: pi?.um ?? "UN",
          cantSolicitada: cant,
          urgencia: li.urgencia,
        });
      }
    }
    if (normalized.length === 0) return;
    onSave({
      id: "REQ-" + uid().slice(0, 8).toUpperCase(),
      numero: nextNumero,
      fecha,
      jefeObra: jefe,
      estado: "pendiente",
      observaciones: observaciones.trim(),
      items: normalized,
    });
  }

  return (
    <div style={{ ...S.panel, marginBottom: "16px" }}>
      <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "14px", fontSize: "13px" }}>Nuevo requerimiento — REQ N° {nextNumero}</div>
      <div style={{ display: "grid", gap: "12px", marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ minWidth: "120px" }}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label style={S.label}>Jefe de obra</label>
            <input style={S.input} value={jefeObra} onChange={(e) => setJefeObra(e.target.value)} placeholder="Nombre" />
          </div>
        </div>
        <div>
          <label style={S.label}>Observaciones</label>
          <textarea style={{ ...S.input, minHeight: "70px", resize: "vertical" }} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones..." />
        </div>
      </div>

      <div style={{ fontWeight: 600, fontSize: "11px", color: COLORS.muted, marginBottom: "8px" }}>Ítems del REQ</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {lineItems.map((li) => (
          <div key={li.id} style={{ background: COLORS.subtle, borderRadius: "8px", padding: "10px", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end", marginBottom: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: COLORS.text, cursor: "pointer" }}>
                <input type="checkbox" checked={li.esExcepcion} onChange={(e) => updateLine(li.id, { esExcepcion: e.target.checked, codigoPresupuesto: e.target.checked ? "" : li.codigoPresupuesto })} style={{ accentColor: COLORS.gold }} />
                Excepción (texto libre)
              </label>
            </div>
            {li.esExcepcion ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ flex: 2, minWidth: "180px" }}>
                  <label style={S.label}>Descripción</label>
                  <input style={S.input} value={li.descLibre} onChange={(e) => updateLine(li.id, { descLibre: e.target.value })} placeholder="Material / trabajo no en presupuesto" />
                </div>
                <div style={{ width: "80px" }}>
                  <label style={S.label}>UM</label>
                  <input style={S.input} value={li.umLibre} onChange={(e) => updateLine(li.id, { umLibre: e.target.value })} />
                </div>
                <div style={{ width: "100px" }}>
                  <label style={S.label}>Cantidad</label>
                  <input style={S.input} type="number" min={0} step="any" value={li.cantSolicitada} onChange={(e) => updateLine(li.id, { cantSolicitada: e.target.value })} />
                </div>
                <div style={{ width: "120px" }}>
                  <label style={S.label}>Urgencia</label>
                  <select style={S.input} value={li.urgencia} onChange={(e) => updateLine(li.id, { urgencia: e.target.value })}>
                    {URGENCIAS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" style={{ ...S.btn("red", true), padding: "6px 10px", alignSelf: "flex-end" }} onClick={() => removeLine(li.id)}>
                  Quitar
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
                <div style={{ flex: 2, minWidth: "240px", position: "relative" }}>
                  <label style={S.label}>Material</label>
                  {li.codigoPresupuesto ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", ...S.input }}>
                      <span style={{ flex: 1, fontSize: "11px", color: COLORS.text }}>{li.codigoPresupuesto} — {li.descMostrada}</span>
                      <button type="button" style={{ background: "transparent", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "14px" }} onClick={() => updateLine(li.id, { codigoPresupuesto: "", descMostrada: "", busqueda: "" })}>✕</button>
                    </div>
                  ) : (
                    <>
                      <input
                        style={S.input}
                        value={li.busqueda}
                        onChange={(e) => updateLine(li.id, { busqueda: e.target.value })}
                        placeholder="Buscar material (ej: cemento)…"
                      />
                      {li.busqueda.trim().length >= 2 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "6px", maxHeight: "200px", overflowY: "auto", marginTop: "2px" }}>
                          {BASE.filter((b) => {
                            const q = li.busqueda.toLowerCase();
                            return b.desc.toLowerCase().includes(q) || b.codigo.includes(q);
                          }).slice(0, 15).map((b) => (
                            <div
                              key={b.codigo}
                              onClick={() => updateLine(li.id, { codigoPresupuesto: b.codigo, descMostrada: b.desc, busqueda: "" })}
                              style={{ padding: "6px 10px", cursor: "pointer", fontSize: "11px", color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}
                            >
                              <span style={{ color: COLORS.muted }}>{b.codigo}</span> — {b.desc}
                            </div>
                          ))}
                          {BASE.filter((b) => {
                            const q = li.busqueda.toLowerCase();
                            return b.desc.toLowerCase().includes(q) || b.codigo.includes(q);
                          }).length === 0 && (
                            <div style={{ padding: "6px 10px", fontSize: "11px", color: COLORS.muted }}>Sin resultados. Usá "Excepción" para texto libre.</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div style={{ width: "100px" }}>
                  <label style={S.label}>Cantidad</label>
                  <input style={S.input} type="number" min={0} step="any" value={li.cantSolicitada} onChange={(e) => updateLine(li.id, { cantSolicitada: e.target.value })} />
                </div>
                <div style={{ width: "120px" }}>
                  <label style={S.label}>Urgencia</label>
                  <select style={S.input} value={li.urgencia} onChange={(e) => updateLine(li.id, { urgencia: e.target.value })}>
                    {URGENCIAS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" style={{ ...S.btn("red", true), padding: "6px 10px" }} onClick={() => removeLine(li.id)}>
                  Quitar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" style={{ ...S.btn("", true), marginTop: "10px" }} onClick={addLine}>
        + Agregar ítem
      </button>

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button type="button" style={S.btn("gold", true)} onClick={handleGuardar}>
          Guardar
        </button>
        <button type="button" style={S.btn("", true)} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function SeccionProveedores({ orgId }) {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ nombre: "", cuit: "", telefono: "", email: "" });
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      const lista = await getProveedores(orgId);
      setProveedores(lista);
    } catch (e) {
      console.error("Error cargando proveedores:", e);
    }
    setCargando(false);
  }

  useEffect(() => {
    if (orgId) cargar();
  }, [orgId]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const puedeGuardar = form.nombre.trim().length > 0;

  function limpiarForm() {
    setForm({ nombre: "", cuit: "", telefono: "", email: "" });
    setEditandoId(null);
  }

  async function handleGuardar() {
    if (!puedeGuardar) return;
    setGuardando(true);
    try {
      const payload = editandoId ? { ...form, id: editandoId } : { ...form };
      await saveProveedor(orgId, payload);
      limpiarForm();
      await cargar();
    } catch (e) {
      console.error("Error guardando proveedor:", e);
    }
    setGuardando(false);
  }

  function handleEditar(p) {
    setForm({ nombre: p.nombre || "", cuit: p.cuit || "", telefono: p.telefono || "", email: p.email || "" });
    setEditandoId(p.id);
  }

  async function handleEliminar(p) {
    if (!window.confirm(`¿Eliminar el proveedor "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteProveedor(orgId, p.id);
      if (editandoId === p.id) limpiarForm();
      await cargar();
    } catch (e) {
      console.error("Error eliminando proveedor:", e);
    }
  }

  return (
    <div>
      <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "16px", fontSize: "14px" }}>🏪 PROVEEDORES</div>

      <div style={{ ...S.panel, marginBottom: "16px", maxWidth: "640px" }}>
        <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: "12px", fontSize: "12px" }}>
          {editandoId ? "Editar proveedor" : "Nuevo proveedor"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={S.label}>Nombre / Razón social</label>
            <input style={S.input} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>CUIT</label>
            <input style={S.input} value={form.cuit} onChange={(e) => set("cuit", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Teléfono</label>
            <input style={S.input} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button style={{ ...S.btn(), opacity: puedeGuardar && !guardando ? 1 : 0.5 }} disabled={!puedeGuardar || guardando} onClick={handleGuardar}>
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "+ Agregar proveedor"}
          </button>
          {editandoId && (
            <button style={{ ...S.btn("", false) }} onClick={limpiarForm}>Cancelar</button>
          )}
        </div>
      </div>

      {cargando ? (
        <div style={{ color: COLORS.muted, fontSize: "12px" }}>Cargando proveedores...</div>
      ) : proveedores.length === 0 ? (
        <div style={{ ...S.panel, textAlign: "center", color: COLORS.muted, padding: "30px" }}>Aún no hay proveedores cargados.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {proveedores.map((p) => (
            <div key={p.id} style={{ ...S.panel, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ fontWeight: 700, color: COLORS.text, fontSize: "13px" }}>{p.nombre}</div>
                <div style={{ color: COLORS.muted, fontSize: "11px" }}>
                  {p.cuit ? `CUIT ${p.cuit}` : "Sin CUIT"} · {p.telefono || "Sin tel."} · {p.email || "Sin email"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button style={{ background: "transparent", border: `1px solid ${COLORS.border || "#2a3f34"}`, borderRadius: "6px", color: COLORS.text, cursor: "pointer", fontSize: "11px", padding: "4px 10px" }} onClick={() => handleEditar(p)}>Editar</button>
                <button style={{ background: "transparent", border: "1px solid #e57373", borderRadius: "6px", color: "#e57373", cursor: "pointer", fontSize: "11px", padding: "4px 10px" }} onClick={() => handleEliminar(p)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function ComprasModule({ BASE = [] }) {
  const { orgId } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [view, setView] = useState("obras");
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [showFormReq, setShowFormReq] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [seccion, setSeccion] = useState("compras");
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        if (orgId) {
          const obras = await getObras(orgId);
          setProyectos(obras.filter((p) => p && p.id));
        }
      } catch (e) {
        console.error("Compras: error cargando proyectos", e);
      }
      setStorageReady(true);
    })();
  }, [orgId]);

  const activeProyecto = selectedProyecto ? proyectos.find((p) => p.id === selectedProyecto.id) ?? selectedProyecto : null;

  async function persistAll(updatedProyectos) {
    const sel = selectedProyecto?.id;
    setProyectos(updatedProyectos);
    if (sel) {
      const p = updatedProyectos.find((x) => x.id === sel);
      if (p) {
        setSelectedProyecto(p);
        try {
          await saveRequerimientos(orgId, p.id, p.reqs || []);
        } catch (e) {
          console.error("Compras: error guardando", e);
        }
      }
    }
  }

  async function handleSelectObra(p) {
    setSelectedProyecto(p);
    setView("reqs");
    setShowFormReq(false);
    setAiAnalysis(null);
    setAiError(null);
    try {
      const ocs = await getOrdenesCompra(orgId, p.id);
      setOrdenesCompra(ocs);
    } catch (e) {
      console.error("Compras: error cargando órdenes", e);
      setOrdenesCompra([]);
    }
    try {
      const provs = await getProveedores(orgId);
      setProveedores(provs);
    } catch (e) {
      console.error("Compras: error cargando proveedores", e);
      setProveedores([]);
    }
  }

  function nextReqNumero(p) {
    const reqs = p.reqs || [];
    return reqs.length ? Math.max(...reqs.map((r) => r.numero ?? 0)) + 1 : 1;
  }

  async function handleSaveReq(nuevo) {
    if (!activeProyecto) return;
    const updated = proyectos.map((p) => {
      if (p.id !== activeProyecto.id) return p;
      const prev = Array.isArray(p.reqs) ? p.reqs : [];
      return { ...p, reqs: [...prev, nuevo] };
    });
    await persistAll(updated);
    setShowFormReq(false);
  }

  async function handleCrearOrden(req, indicesSeleccionados, proveedor) {
    if (!activeProyecto || !proveedor || !indicesSeleccionados.length) return;
    const obraId = activeProyecto.id;
    const itemsReq = Array.isArray(req.items) ? req.items : [];
    const itemsOrden = indicesSeleccionados.map((idx) => {
      const it = itemsReq[idx];
      return {
        codigo: it.codigo || "",
        desc: it.desc || "",
        cantSolicitada: it.cantSolicitada ?? null,
        um: it.um || "",
      };
    });
    const orden = {
      reqId: req.id,
      reqNumero: req.numero ?? null,
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre || "",
      fecha: new Date().toISOString().slice(0, 10),
      estado: "abierta",
      items: itemsOrden,
    };
    let ocId;
    try {
      ocId = await crearOrdenCompra(orgId, obraId, orden);
    } catch (e) {
      console.error("Compras: error creando orden", e);
      return;
    }
    const setIdx = new Set(indicesSeleccionados);
    const reqActualizado = {
      ...req,
      items: itemsReq.map((it, idx) =>
        setIdx.has(idx) ? { ...it, ocId, ocCodigo: ocId } : it
      ),
    };
    const updated = proyectos.map((p) => {
      if (p.id !== obraId) return p;
      const reqs = (p.reqs || []).map((rr) => (rr.id === req.id ? reqActualizado : rr));
      return { ...p, reqs };
    });
    await persistAll(updated);
    try {
      const ocs = await getOrdenesCompra(orgId, obraId);
      setOrdenesCompra(ocs);
    } catch (e) {
      console.error("Compras: error recargando órdenes", e);
    }
  }

  async function analizarConIA() {
    if (!activeProyecto) return;
    setAiError(null);
    setAiAnalysis(null);
    setAiLoading(true);
    try {
      const p = activeProyecto;
      const body = {
        proyecto: {
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
          cliente: p.cliente,
          iccPct: p.iccPct ?? 0,
        },
        items: (p.items || []).map((i) => ({
          codigo: i.codigo,
          desc: i.desc,
          um: i.um,
          precioCustom: i.precioCustom,
          precioBase: i.precioBase,
          cantPresup: i.cantPresup,
          consumidoReal: i.consumidoReal,
        })),
        reqs: p.reqs || [],
      };
      const res = await fetch("/.netlify/functions/agent-compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        data = {};
      }
      if (!res.ok) {
        setAiError(typeof data.error === "string" ? data.error : `Error ${res.status}`);
        return;
      }
      setAiAnalysis(data);
    } catch (e) {
      setAiError(e?.message || "Error al analizar");
    } finally {
      setAiLoading(false);
    }
  }

  if (!storageReady) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: COLORS.muted }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{ ...S.app, height: "100%", overflow: "auto" }}>
      <div style={{ padding: "16px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", borderBottom: `1px solid ${COLORS.border || "#2a3f34"}`, paddingBottom: "8px" }}>
          <button
            onClick={() => setSeccion("compras")}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: seccion === "compras" ? 700 : 400, color: seccion === "compras" ? COLORS.gold : COLORS.muted, padding: "4px 8px" }}
          >
            📦 Compras
          </button>
          <button
            onClick={() => setSeccion("proveedores")}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: seccion === "proveedores" ? 700 : 400, color: seccion === "proveedores" ? COLORS.gold : COLORS.muted, padding: "4px 8px" }}
          >
            🏪 Proveedores
          </button>
        </div>
        {seccion === "compras" && (
          <>
        {view === "obras" && (
          <>
            <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "16px", fontSize: "14px" }}>📦 REQUERIMIENTOS Y COMPRAS</div>
            <div style={{ color: COLORS.muted, fontSize: "12px", marginBottom: "16px" }}>Elegí una obra para ver y crear REQs de compra.</div>
            <ListaObras proyectos={proyectos} onSelect={handleSelectObra} />
          </>
        )}
        {view === "reqs" && activeProyecto && (
          <ListaReqs
            proyecto={activeProyecto}
            ordenesCompra={ordenesCompra}
            proveedores={proveedores}
            onCrearOrden={handleCrearOrden}
            BASE={BASE}
            onBack={() => {
              setView("obras");
              setSelectedProyecto(null);
              setShowFormReq(false);
              setAiAnalysis(null);
              setAiError(null);
            }}
            onNewReq={() => setShowFormReq(true)}
            aiLoading={aiLoading}
            onAnalizarIA={analizarConIA}
            aiAnalysis={aiAnalysis}
            aiError={aiError}
            onCloseAiPanel={() => {
              setAiAnalysis(null);
              setAiError(null);
            }}
          >
            {showFormReq && (
              <FormularioNuevoReq
                proyecto={activeProyecto}
                nextNumero={nextReqNumero(activeProyecto)}
                onSave={handleSaveReq}
                onCancel={() => setShowFormReq(false)}
                BASE={BASE}
              />
            )}
          </ListaReqs>
        )}
          </>
        )}
        {seccion === "proveedores" && <SeccionProveedores orgId={orgId} />}
      </div>
    </div>
  );
}
