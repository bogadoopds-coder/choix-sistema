import { useState, useEffect } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { getEstudios, saveEstudio, deleteEstudio } from "../../services/mercadoRepo";
const RADIOS = ["mismas cuadras", "hasta 10 cuadras", "barrio", "toda la ciudad"];
const TIPOLOGIAS = ["1amb", "2amb", "3amb", "4amb+", "local"];
const ESTADOS_BUSQUEDA = [
  { id: "", label: "Todos" },
  { id: "pozo", label: "Pozo" },
  { id: "estrenar", label: "A estrenar" },
  { id: "usado", label: "Usado" },
];
function usd(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-AR");
}
const FORM_VACIO = { ubicacion: "", radio: "hasta 10 cuadras", tipologias: [], estadoUnidad: "", m2Min: "", m2Max: "" };
// ─── MÓDULO MERCADO: comparables de venta en la zona ────────────────────────
export default function MercadoModule() {
  const { orgId } = useAuth();
  const [form, setForm] = useState(FORM_VACIO);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [estudios, setEstudios] = useState([]);
  const [abierto, setAbierto] = useState(null); // id del estudio expandido
  const [ready, setReady] = useState(false);
  async function cargar() {
    if (!orgId) return;
    try {
      setEstudios(await getEstudios(orgId));
    } catch (e) {
      console.error("Error cargando estudios:", e);
    }
    setReady(true);
  }
  useEffect(() => { cargar(); }, [orgId]);
  function toggleTipologia(t) {
    setForm((f) => ({
      ...f,
      tipologias: f.tipologias.includes(t) ? f.tipologias.filter((x) => x !== t) : [...f.tipologias, t],
    }));
  }
  async function buscar() {
    if (!form.ubicacion.trim() || buscando) return;
    setBuscando(true);
    setError("");
    const jobId = "job-" + Date.now();
    fetch("/.netlify/functions/agent-mercado-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        jobId,
        ubicacion: form.ubicacion.trim(),
        radio: form.radio,
        tipologias: form.tipologias,
        estadoUnidad: form.estadoUnidad,
        m2Min: form.m2Min ? Number(form.m2Min) : null,
        m2Max: form.m2Max ? Number(form.m2Max) : null,
      }),
    }).catch(() => {});
    const jobRef = doc(db, "orgs", orgId, "jobs", jobId);
    const unsub = onSnapshot(jobRef, async (snap) => {
      const j = snap.data();
      if (!j) return;
      if (j.estado === "listo") {
        unsub();
        try {
          let datos = null;
          if (j.resultado) {
            try { datos = JSON.parse(j.resultado); } catch (_) { datos = null; }
          }
          const estId = await saveEstudio(orgId, {
            ubicacion: form.ubicacion.trim(),
            radio: form.radio,
            tipologias: form.tipologias,
            estadoUnidad: form.estadoUnidad,
            m2Min: form.m2Min ? Number(form.m2Min) : null,
            m2Max: form.m2Max ? Number(form.m2Max) : null,
            comparables: datos?.comparables || [],
            resumen: datos?.resumen || null,
            resultadoTexto: !datos ? (j.resultadoTexto || "") : "",
          });
          await cargar();
          setAbierto(estId);
        } catch (e) {
          setError("La búsqueda terminó pero no se pudo guardar el estudio.");
          console.error("Error guardando estudio:", e);
        }
        setBuscando(false);
      } else if (j.estado === "error") {
        unsub();
        setError("La búsqueda falló: " + (j.detalle || "sin detalle"));
        setBuscando(false);
      }
    });
  }
  async function borrar(est) {
    const ok = window.confirm(`¿Eliminar el estudio de "${est.ubicacion}"?`);
    if (!ok) return;
    try {
      await deleteEstudio(orgId, est.id);
      if (abierto === est.id) setAbierto(null);
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar el estudio.");
      console.error("Error eliminando estudio:", e);
    }
  }
  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;
  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>🔎 MERCADO</span>
        <span style={S.tag(COLORS.blue)}>{estudios.length} estudio{estudios.length !== 1 ? "s" : ""}</span>
      </div>
      {error && (
        <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: COLORS.rojo }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "14px", alignItems: "start" }}>
        {/* ── Nueva búsqueda ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>NUEVO ESTUDIO DE ZONA</div>
          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <label style={S.label}>Ubicación (esquina, barrio o ciudad)</label>
              <input style={S.input} placeholder="Ej: 19 y 38, La Plata / Palermo, CABA / Godoy Cruz, Mendoza"
                value={form.ubicacion}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Radio de búsqueda</label>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {RADIOS.map((r) => (
                  <button key={r} onClick={() => setForm({ ...form, radio: r })}
                    style={{ ...S.btn(form.radio === r ? "blue" : undefined, true), padding: "5px 9px", fontSize: "10.5px", cursor: "pointer" }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Tipologías (vacío = todas)</label>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {TIPOLOGIAS.map((t) => (
                  <button key={t} onClick={() => toggleTipologia(t)}
                    style={{ ...S.btn(form.tipologias.includes(t) ? "blue" : undefined, true), padding: "5px 9px", fontSize: "10.5px", cursor: "pointer" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Estado</label>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {ESTADOS_BUSQUEDA.map((es) => (
                  <button key={es.id} onClick={() => setForm({ ...form, estadoUnidad: es.id })}
                    style={{ ...S.btn(form.estadoUnidad === es.id ? "blue" : undefined, true), padding: "5px 9px", fontSize: "10.5px", cursor: "pointer" }}>
                    {es.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={S.label}>m² mín (opcional)</label>
                <input style={S.input} type="number" placeholder="Ej: 35" value={form.m2Min}
                  onChange={(e) => setForm({ ...form, m2Min: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>m² máx (opcional)</label>
                <input style={S.input} type="number" placeholder="Ej: 90" value={form.m2Max}
                  onChange={(e) => setForm({ ...form, m2Max: e.target.value })} />
              </div>
            </div>
            <button style={{ ...S.btn("gold"), padding: "8px", cursor: "pointer", opacity: !form.ubicacion.trim() || buscando ? 0.5 : 1 }}
              disabled={!form.ubicacion.trim() || buscando} onClick={buscar}>
              {buscando ? "🔎 BUSCANDO EN LA WEB..." : "BUSCAR COMPARABLES"}
            </button>
            {buscando && (
              <div style={{ fontSize: "11px", color: COLORS.muted }}>
                El agente está buscando en portales inmobiliarios. Puede tardar 1-3 minutos; el resultado aparece solo acá a la derecha.
              </div>
            )}
          </div>
        </div>
        {/* ── Historial de estudios ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>ESTUDIOS GUARDADOS</div>
          {estudios.length === 0 ? (
            <div style={{ color: COLORS.muted, textAlign: "center", padding: "30px", fontSize: "12px" }}>
              Todavía no hay estudios de mercado.<br />Lanzá el primero con el formulario de la izquierda.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {estudios.map((est) => {
                const r = est.resumen;
                return (
                  <div key={est.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10px", color: COLORS.muted }}>{est.id} · {(est.creadoEn || "").slice(0, 10)}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>📍 {est.ubicacion}</div>
                        <div style={{ fontSize: "11px", color: COLORS.muted }}>
                          {r ? `${r.muestras || (est.comparables || []).length} muestras · mediana USD ${usd(r.precioM2Mediana)}/m²` : "resultado sin estructurar"}
                          {est.radio ? ` · ${est.radio}` : ""}
                        </div>
                      </div>
                      <button onClick={() => setAbierto(abierto === est.id ? null : est.id)}
                        style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "4px 10px" }}>
                        {abierto === est.id ? "Ocultar" : "Ver detalle"}
                      </button>
                      <button onClick={() => borrar(est)}
                        style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "12px", padding: "0 3px" }}>
                        ✕
                      </button>
                    </div>
                    {abierto === est.id && (
                      <div style={{ borderTop: `1px solid ${COLORS.border}30`, marginTop: "8px", paddingTop: "8px" }}>
                        {r && (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                            <span style={S.tag(COLORS.verde)}>MÍN USD {usd(r.precioM2Min)}/m²</span>
                            <span style={S.tag(COLORS.gold)}>MEDIANA USD {usd(r.precioM2Mediana)}/m²</span>
                            <span style={S.tag(COLORS.rojo)}>MÁX USD {usd(r.precioM2Max)}/m²</span>
                          </div>
                        )}
                        {r?.observaciones && (
                          <div style={{ fontSize: "11px", color: COLORS.text, marginBottom: "6px" }}>{r.observaciones}</div>
                        )}
                        {r?.advertencia && (
                          <div style={{ fontSize: "10.5px", color: COLORS.amarillo, marginBottom: "8px" }}>⚠ {r.advertencia}</div>
                        )}
                        {(est.comparables || []).length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {est.comparables.map((c, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", flexWrap: "wrap" }}>
                                <span style={{ color: COLORS.muted, minWidth: "150px", flex: 1 }}>{c.zona || "—"}</span>
                                <span style={{ minWidth: "44px" }}>{c.tipologia || "—"}</span>
                                <span style={{ minWidth: "50px" }}>{c.m2 ? `${c.m2} m²` : "—"}</span>
                                <span style={{ fontWeight: 600, minWidth: "90px" }}>{c.moneda || "USD"} {usd(c.precio)}</span>
                                <span style={{ color: COLORS.gold, fontWeight: 700, minWidth: "90px" }}>{c.precioM2 ? `USD ${usd(c.precioM2)}/m²` : "—"}</span>
                                {c.fuente && (
                                  <a href={c.fuente} target="_blank" rel="noreferrer"
                                    style={{ color: COLORS.teal, fontSize: "10.5px" }}>
                                    ver aviso ↗
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : est.resultadoTexto ? (
                          <div style={{ fontSize: "11px", color: COLORS.muted, whiteSpace: "pre-wrap" }}>{est.resultadoTexto}</div>
                        ) : (
                          <div style={{ fontSize: "11px", color: COLORS.muted }}>Sin comparables encontrados para estos criterios.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
