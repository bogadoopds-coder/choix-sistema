import { useState, useEffect, useRef } from "react";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { sendChat } from "../../services/ai/chatClient";
import {
  getCodigos, getCodigoConTexto, saveCodigo, deleteCodigo,
  getFactibilidades, saveFactibilidad, deleteFactibilidad,
} from "../../services/factibilidadRepo";
const FORM_TERRENO_VACIO = { ubicacion: "", superficie: "", frente: "", fondo: "", zona: "", codId: "" };
function num(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString("es-AR");
}
// ─── MÓDULO FACTIBILIDAD: viabilidad de terreno según código de planeamiento ─
export default function FactibilidadModule() {
  const { orgId } = useAuth();
  const fileRef = useRef(null);
  const [codigos, setCodigos] = useState([]);
  const [analisis, setAnalisis] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // form de análisis
  const [form, setForm] = useState(FORM_TERRENO_VACIO);
  const [analizando, setAnalizando] = useState(false);
  const [abierto, setAbierto] = useState(null);
  // alta de código en biblioteca
  const [codNombre, setCodNombre] = useState("");
  const [codMunicipio, setCodMunicipio] = useState("");
  const [extrayendo, setExtrayendo] = useState(false);
  async function cargar() {
    if (!orgId) return;
    try {
      const [cods, facs] = await Promise.all([getCodigos(orgId), getFactibilidades(orgId)]);
      setCodigos(cods);
      setAnalisis(facs);
    } catch (e) {
      console.error("Error cargando factibilidad:", e);
    }
    setReady(true);
  }
  useEffect(() => { cargar(); }, [orgId]);
  // ── Subir código a la biblioteca (extracción una sola vez) ──
  async function handleCodigoFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!codNombre.trim()) {
      setError("Poné un nombre al código (ej: Ordenanza 12692/25) antes de subir el archivo.");
      e.target.value = "";
      return;
    }
    setExtrayendo(true);
    setError("");
    const ext = file.name.split(".").pop().toLowerCase();
    try {
      let texto = "";
      if (ext === "pdf") {
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const data = await sendChat({
          messages: [
            {
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                { type: "text", text: "Extraé el texto completo de este documento. Solo el texto, sin comentarios." },
              ],
            },
          ],
        });
        texto = data.content?.map((c) => c.text || "").join("").trim();
      } else if (ext === "docx") {
        const mammoth = await import("https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.esm.js");
        const ab = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: ab });
        texto = result.value;
      } else {
        texto = await file.text();
      }
      if (!texto || texto.length < 200) {
        throw new Error("No se pudo extraer texto útil del archivo (¿es un PDF escaneado como imagen?).");
      }
      await saveCodigo(orgId, { nombre: codNombre, municipio: codMunicipio, texto });
      setCodNombre("");
      setCodMunicipio("");
      await cargar();
    } catch (err) {
      setError("Error al procesar el código: " + (err.message || "desconocido") + " — Si el PDF es muy grande, probá subir solo la sección de indicadores urbanísticos, o el archivo en .txt.");
      console.error("Error subiendo código:", err);
    }
    setExtrayendo(false);
    e.target.value = "";
  }
  async function borrarCodigo(cod) {
    const ok = window.confirm(`¿Eliminar "${cod.nombre}" de la biblioteca?`);
    if (!ok) return;
    try {
      await deleteCodigo(orgId, cod.id);
      if (form.codId === cod.id) setForm({ ...form, codId: "" });
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar el código.");
    }
  }
  // ── Analizar terreno ──
  const puedeAnalizar = form.ubicacion.trim() && Number(form.superficie) > 0 && form.codId && !analizando;
  async function analizar() {
    if (!puedeAnalizar) return;
    setAnalizando(true);
    setError("");
    try {
      const cod = await getCodigoConTexto(orgId, form.codId);
      if (!cod?.texto) throw new Error("No se pudo leer el código seleccionado.");
      const jobId = "job-" + Date.now();
      fetch("/.netlify/functions/agent-factibilidad-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          jobId,
          terreno: {
            ubicacion: form.ubicacion.trim(),
            superficie: Number(form.superficie),
            frente: form.frente ? Number(form.frente) : null,
            fondo: form.fondo ? Number(form.fondo) : null,
            zona: form.zona.trim() || null,
          },
          codigoTexto: cod.texto,
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
            const facId = await saveFactibilidad(orgId, {
              ubicacion: form.ubicacion.trim(),
              superficie: Number(form.superficie),
              frente: form.frente ? Number(form.frente) : null,
              fondo: form.fondo ? Number(form.fondo) : null,
              zonaUsuario: form.zona.trim() || null,
              codigoId: form.codId,
              codigoNombre: cod.nombre || "",
              resultado: datos,
              resultadoTexto: !datos ? (j.resultadoTexto || "") : "",
            });
            await cargar();
            setAbierto(facId);
          } catch (e) {
            setError("El análisis terminó pero no se pudo guardar.");
            console.error("Error guardando factibilidad:", e);
          }
          setAnalizando(false);
        } else if (j.estado === "error") {
          unsub();
          setError("El análisis falló: " + (j.detalle || "sin detalle"));
          setAnalizando(false);
        }
      });
    } catch (e) {
      setError(e.message || "No se pudo iniciar el análisis.");
      setAnalizando(false);
    }
  }
  async function borrarAnalisis(fac) {
    const ok = window.confirm(`¿Eliminar el análisis de "${fac.ubicacion}"?`);
    if (!ok) return;
    try {
      await deleteFactibilidad(orgId, fac.id);
      if (abierto === fac.id) setAbierto(null);
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar el análisis.");
    }
  }
  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;
  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>📐 FACTIBILIDAD</span>
        <span style={S.tag(COLORS.blue)}>{analisis.length} análisis</span>
        <span style={S.tag(COLORS.teal)}>{codigos.length} código{codigos.length !== 1 ? "s" : ""} en biblioteca</span>
      </div>
      {error && (
        <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: COLORS.rojo }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "14px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* ── Analizar terreno ── */}
          <div style={S.panel}>
            <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>ANALIZAR TERRENO</div>
            <div style={{ display: "grid", gap: "10px" }}>
              <div>
                <label style={S.label}>Ubicación del terreno</label>
                <input style={S.input} placeholder="Ej: 19 y 38, La Plata" value={form.ubicacion}
                  onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={S.label}>Superficie m²</label>
                  <input style={S.input} type="number" placeholder="Ej: 300" value={form.superficie}
                    onChange={(e) => setForm({ ...form, superficie: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Frente m (opc.)</label>
                  <input style={S.input} type="number" placeholder="Ej: 10" value={form.frente}
                    onChange={(e) => setForm({ ...form, frente: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Fondo m (opc.)</label>
                  <input style={S.input} type="number" placeholder="Ej: 30" value={form.fondo}
                    onChange={(e) => setForm({ ...form, fondo: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={S.label}>Zona (opcional, muy recomendado)</label>
                <input style={S.input} placeholder="Ej: UC2 / R3" value={form.zona}
                  onChange={(e) => setForm({ ...form, zona: e.target.value })} />
                <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "3px" }}>
                  ¿No sabés la zona? En La Plata podés consultarla en{" "}
                  <a href="https://caubauno.org/geouno/" target="_blank" rel="noreferrer" style={{ color: COLORS.teal }}>
                    GEOUNO (CAPBA D1) ↗
                  </a>
                </div>
              </div>
              <div>
                <label style={S.label}>Código de planeamiento</label>
                <select style={S.input} value={form.codId}
                  onChange={(e) => setForm({ ...form, codId: e.target.value })}>
                  <option value="">— Elegir de la biblioteca —</option>
                  {codigos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.municipio ? ` (${c.municipio})` : ""}</option>
                  ))}
                </select>
                {codigos.length === 0 && (
                  <div style={{ fontSize: "10px", color: COLORS.amarillo, marginTop: "3px" }}>
                    Primero subí un código a la biblioteca (abajo).
                  </div>
                )}
              </div>
              <button style={{ ...S.btn("gold"), padding: "8px", cursor: "pointer", opacity: puedeAnalizar ? 1 : 0.5 }}
                disabled={!puedeAnalizar} onClick={analizar}>
                {analizando ? "📐 ANALIZANDO..." : "ANALIZAR VIABILIDAD"}
              </button>
              {analizando && (
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  El agente está leyendo el código y calculando. Puede tardar 1-2 minutos; el resultado aparece solo a la derecha.
                </div>
              )}
            </div>
          </div>
          {/* ── Biblioteca de códigos ── */}
          <div style={S.panel}>
            <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>BIBLIOTECA DE CÓDIGOS</div>
            <div style={{ display: "grid", gap: "8px" }}>
              <input style={S.input} placeholder="Nombre (ej: Ordenanza 12692/25 - POT La Plata)" value={codNombre}
                onChange={(e) => setCodNombre(e.target.value)} />
              <input style={S.input} placeholder="Municipio (ej: La Plata)" value={codMunicipio}
                onChange={(e) => setCodMunicipio(e.target.value)} />
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={handleCodigoFile} />
              <button style={{ ...S.btn("blue", true), padding: "7px", cursor: "pointer", opacity: extrayendo || !codNombre.trim() ? 0.5 : 1 }}
                disabled={extrayendo || !codNombre.trim()} onClick={() => fileRef.current?.click()}>
                {extrayendo ? "📄 EXTRAYENDO TEXTO..." : "📎 SUBIR CÓDIGO (PDF / Word / txt)"}
              </button>
              <div style={{ fontSize: "10px", color: COLORS.muted }}>
                El texto se extrae una sola vez y queda guardado para reusar en todos los análisis.
              </div>
            </div>
            {codigos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                {codigos.map((c) => (
                  <div key={c.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: 700 }}>{c.nombre}</div>
                      <div style={{ fontSize: "10px", color: COLORS.muted }}>
                        {c.id}{c.municipio ? ` · ${c.municipio}` : ""} · {num(c.chars)} caracteres{c.truncado ? " · ⚠ truncado" : ""}
                      </div>
                    </div>
                    <button onClick={() => borrarCodigo(c)}
                      style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "12px" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ── Historial de análisis ── */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>ANÁLISIS GUARDADOS</div>
          {analisis.length === 0 ? (
            <div style={{ color: COLORS.muted, textAlign: "center", padding: "30px", fontSize: "12px" }}>
              Todavía no hay análisis de factibilidad.<br />Subí un código y analizá el primer terreno.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {analisis.map((fac) => {
                const r = fac.resultado;
                return (
                  <div key={fac.id} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "10px", color: COLORS.muted }}>{fac.id} · {(fac.creadoEn || "").slice(0, 10)} · {fac.codigoNombre}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700 }}>📍 {fac.ubicacion} · {num(fac.superficie)} m²</div>
                        <div style={{ fontSize: "11px", color: COLORS.muted }}>
                          {r ? `Zona: ${r.zonaDetectada || fac.zonaUsuario || "s/d"} · ~${num(r.m2EdificablesEstimados)} m² edificables` : "resultado sin estructurar"}
                        </div>
                      </div>
                      <button onClick={() => setAbierto(abierto === fac.id ? null : fac.id)}
                        style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "4px 10px" }}>
                        {abierto === fac.id ? "Ocultar" : "Ver detalle"}
                      </button>
                      <button onClick={() => borrarAnalisis(fac)}
                        style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "12px", padding: "0 3px" }}>✕</button>
                    </div>
                    {abierto === fac.id && (
                      <div style={{ borderTop: `1px solid ${COLORS.border}30`, marginTop: "8px", paddingTop: "8px", fontSize: "11px" }}>
                        {r ? (
                          <>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                              <span style={S.tag(COLORS.gold)}>~{num(r.m2EdificablesEstimados)} m² EDIFICABLES</span>
                              {r.zonaDetectada && <span style={S.tag(COLORS.blue)}>ZONA {r.zonaDetectada}</span>}
                            </div>
                            {r.calculo && <div style={{ color: COLORS.text, marginBottom: "6px" }}>🧮 {r.calculo}</div>}
                            {Array.isArray(r.indicadores) && r.indicadores.length > 0 && (
                              <div style={{ marginBottom: "8px" }}>
                                <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: "10.5px", marginBottom: "4px" }}>INDICADORES (con fuente en el código)</div>
                                {r.indicadores.map((ind, i) => (
                                  <div key={i} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 600, minWidth: "90px" }}>{ind.nombre}</span>
                                    <span style={{ minWidth: "80px" }}>{ind.valor}</span>
                                    <span style={{ color: COLORS.muted, fontSize: "10px" }}>{ind.fuente}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {Array.isArray(r.usosPermitidos) && r.usosPermitidos.length > 0 && (
                              <div style={{ marginBottom: "6px", color: COLORS.muted }}>
                                <span style={{ fontWeight: 700, color: COLORS.gold, fontSize: "10.5px" }}>USOS: </span>
                                {r.usosPermitidos.join(", ")}
                              </div>
                            )}
                            {r.observaciones && <div style={{ color: COLORS.text, marginBottom: "6px" }}>{r.observaciones}</div>}
                            {Array.isArray(r.faltantes) && r.faltantes.length > 0 && (
                              <div style={{ color: COLORS.amarillo, marginBottom: "6px" }}>
                                <span style={{ fontWeight: 700, fontSize: "10.5px" }}>FALTANTES: </span>
                                {r.faltantes.join(" · ")}
                              </div>
                            )}
                            {r.advertencia && <div style={{ color: COLORS.amarillo, fontSize: "10px" }}>⚠ {r.advertencia}</div>}
                          </>
                        ) : (
                          <div style={{ color: COLORS.muted, whiteSpace: "pre-wrap" }}>{fac.resultadoTexto || "Sin resultado."}</div>
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
