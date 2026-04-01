import { useState, useEffect } from "react";
import { uid } from "../../utils/id";
import { today } from "../../utils/date";
import { COLORS, S } from "../../styles/theme";
import { storage } from "../../services/storage";

const STORAGE_KEY_PROYECTOS = "choix_proyectos";

const URGENCIAS = ["normal", "urgente", "crítico"];

const ESTADO_BADGE = {
  pendiente: { bg: `${COLORS.amarillo}33`, color: COLORS.amarillo, label: "pendiente" },
  en_revision: { bg: "#3b82f633", color: "#3b82f6", label: "en revisión" },
  aprobado: { bg: `${COLORS.verde}33`, color: COLORS.verde, label: "aprobado" },
  comprado: { bg: `${COLORS.muted}44`, color: COLORS.muted, label: "comprado" },
};

function emptyLineItem() {
  return {
    id: uid(),
    esExcepcion: false,
    codigoPresupuesto: "",
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

// ─── Lista de REQs + barra ────────────────────────────────────────────────────
function ListaReqs({
  proyecto,
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
            background: "#0f1210",
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
          ) : (
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "11px", lineHeight: 1.5, fontFamily: "inherit" }}>
              {typeof aiAnalysis === "string" ? aiAnalysis : JSON.stringify(aiAnalysis, null, 2)}
            </pre>
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
            return (
              <div key={r.id} style={{ ...S.panel, display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Formulario nuevo REQ ─────────────────────────────────────────────────────
function FormularioNuevoReq({ proyecto, nextNumero, onSave, onCancel }) {
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
        const pi = itemsPresup.find((x) => x.codigo === li.codigoPresupuesto);
        normalized.push({
          codigo: pi?.codigo ?? li.codigoPresupuesto,
          desc: pi?.desc ?? "",
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
                <div style={{ flex: 2, minWidth: "200px" }}>
                  <label style={S.label}>Ítem del presupuesto</label>
                  <select style={S.input} value={li.codigoPresupuesto} onChange={(e) => updateLine(li.id, { codigoPresupuesto: e.target.value })}>
                    <option value="">Elegir…</option>
                    {itemsPresup.map((it) => (
                      <option key={it.codigo} value={it.codigo}>
                        {it.codigo} — {it.desc ?? ""}
                      </option>
                    ))}
                  </select>
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

// ─── MAIN ───────────────────────────────────────────────────────────────────
export default function ComprasModule() {
  const [proyectos, setProyectos] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [view, setView] = useState("obras");
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [showFormReq, setShowFormReq] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEY_PROYECTOS);
        const raw = r?.value ?? localStorage.getItem(STORAGE_KEY_PROYECTOS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setProyectos(parsed.filter((p) => p && p.id));
        }
      } catch (e) {
        console.error("Compras: error cargando proyectos", e);
      }
      setStorageReady(true);
    })();
  }, []);

  const activeProyecto = selectedProyecto ? proyectos.find((p) => p.id === selectedProyecto.id) ?? selectedProyecto : null;

  async function persistAll(updatedProyectos) {
    try {
      await storage.set(STORAGE_KEY_PROYECTOS, JSON.stringify(updatedProyectos));
      localStorage.setItem("choix_proyectos", JSON.stringify(updatedProyectos));
    } catch (e) {
      console.error("Compras: error guardando", e);
    }
    setProyectos(updatedProyectos);
    const sel = selectedProyecto?.id;
    if (sel) {
      const p = updatedProyectos.find((x) => x.id === sel);
      if (p) setSelectedProyecto(p);
    }
  }

  function handleSelectObra(p) {
    setSelectedProyecto(p);
    setView("reqs");
    setShowFormReq(false);
    setAiAnalysis(null);
    setAiError(null);
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
              />
            )}
          </ListaReqs>
        )}
      </div>
    </div>
  );
}
