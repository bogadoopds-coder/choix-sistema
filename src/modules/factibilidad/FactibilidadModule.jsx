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
import { exportarPDF, esc } from "../../utils/exportPdf";
const FORM_TERRENO_VACIO = { ubicacion: "", superficie: "", frente: "", fondo: "", zona: "", codIds: [] };
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
      if (form.codIds.includes(cod.id)) setForm({ ...form, codIds: form.codIds.filter((x) => x !== cod.id) });
      await cargar();
    } catch (e) {
      setError("No se pudo eliminar el código.");
    }
  }
  // ── Analizar terreno ──
  const puedeAnalizar = form.ubicacion.trim() && Number(form.superficie) > 0 && form.codIds.length > 0 && !analizando;
  async function analizar() {
    if (!puedeAnalizar) return;
    setAnalizando(true);
    setError("");
    try {
      const cods = [];
      for (const id of form.codIds) {
        const c = await getCodigoConTexto(orgId, id);
        if (c?.texto) cods.push(c);
      }
      if (cods.length === 0) throw new Error("No se pudo leer ningún código seleccionado.");
      const textoCombinado = cods
        .map((c) => `===== DOCUMENTO: ${c.nombre} =====\n${c.texto}`)
        .join("\n\n");
      const nombresCombinados = cods.map((c) => c.nombre).join(" + ");
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
          codigoTexto: textoCombinado,
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
              codigoId: form.codIds.join("+"),
              codigoNombre: nombresCombinados,
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
                <label style={S.label}>Códigos de planeamiento (podés marcar varios)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {codigos.map((c) => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={form.codIds.includes(c.id)}
                        onChange={(e) => {
                          const codIds = e.target.checked
                            ? [...form.codIds, c.id]
                            : form.codIds.filter((x) => x !== c.id);
                          setForm({ ...form, codIds });
                        }}
                      />
                      <span>{c.nombre}{c.municipio ? ` (${c.municipio})` : ""}</span>
                    </label>
                  ))}
                </div>
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
                      {fac.resultado && (
                        <button
                          onClick={() => {
                            const r = fac.resultado;
                            const indicadoresHTML = Array.isArray(r.indicadores) && r.indicadores.length > 0
                              ? `<h2>Indicadores (con fuente en el código)</h2><table><tr><th>Indicador</th><th>Valor</th><th>Fuente</th></tr>${r.indicadores.map((i) => `<tr><td>${esc(i.nombre)}</td><td>${esc(i.valor)}</td><td>${esc(i.fuente)}</td></tr>`).join("")}</table>`
                              : "";
                            exportarPDF({
                              titulo: `Factibilidad — ${fac.ubicacion}`,
                              subtitulo: `${fac.id} · ${(fac.creadoEn || "").slice(0, 10)} · ${fac.superficie} m²${fac.frente ? ` · frente ${fac.frente} m` : ""}${fac.fondo ? ` · fondo ${fac.fondo} m` : ""} · Código: ${fac.codigoNombre}`,
                              contenidoHTML: `
                                <h2>Resultado</h2>
                                <p><b>Zona:</b> ${esc(r.zonaDetectada || fac.zonaUsuario || "s/d")} · <b>m² edificables estimados:</b> ${esc(r.m2EdificablesEstimados ?? "s/d")}</p>
                                ${r.calculo ? `<p><b>Cálculo:</b> ${esc(r.calculo)}</p>` : ""}
                                ${indicadoresHTML}
                                ${Array.isArray(r.usosPermitidos) && r.usosPermitidos.length ? `<h2>Usos</h2><p>${esc(r.usosPermitidos.join(", "))}</p>` : ""}
                                ${r.observaciones ? `<h2>Observaciones</h2><p>${esc(r.observaciones)}</p>` : ""}
                                ${Array.isArray(r.faltantes) && r.faltantes.length ? `<h2>Datos faltantes / a verificar</h2><ul>${r.faltantes.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
                                ${r.advertencia ? `<div class="alerta">⚠ ${esc(r.advertencia)}</div>` : ""}
                              `,
                            });
                          }}
                          style={{ ...S.btn("gold", true), cursor: "pointer", fontSize: "11px", padding: "4px 10px" }}>
                          🖨 PDF
                        </button>
                      )}
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
                            {r.m2EdificablesEstimados > 0 && <SimuladorUnidades m2Edificables={Number(r.m2EdificablesEstimados)} superficieParcela={Number(fac.superficie) || 0} indicadores={r.indicadores || []} />}
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
const TIPOLOGIAS_DEFAULT = [
  { id: "mono", label: "Monoambiente", m2: 30, icono: "🏠", esCochera: false },
  { id: "amb2", label: "2 amb (1 dorm)", m2: 35, icono: "🏠", esCochera: false },
  { id: "amb3", label: "3 amb (2 dorm)", m2: 54, icono: "🏠", esCochera: false },
  { id: "amb4", label: "4 amb (3 dorm)", m2: 72, icono: "🏠", esCochera: false },
  { id: "cochera", label: "Cochera", m2: 25, icono: "🚗", esCochera: true },
];
const LS_TIPOLOGIAS = "praxia_tipologias_m2";
const LS_FACTOR = "praxia_factor_aprovechamiento";
function cargarM2Guardados() {
  try {
    const raw = localStorage.getItem(LS_TIPOLOGIAS);
    if (!raw) return null;
    const guardado = JSON.parse(raw);
    return TIPOLOGIAS_DEFAULT.map((t) => ({ ...t, m2: Number(guardado[t.id]) > 0 ? Number(guardado[t.id]) : t.m2 }));
  } catch { return null; }
}
// Intenta leer el CUF (avenida/calle) desde los indicadores del análisis
function leerCUF(indicadores) {
  const res = { avenida: null, calle: null };
  for (const i of (indicadores || [])) {
    const nombre = (i.nombre || "").toLowerCase();
    const valor = parseFloat(String(i.valor).replace(",", "."));
    if (isNaN(valor)) continue;
    if (nombre.includes("cuf") && nombre.includes("aven")) res.avenida = valor;
    else if (nombre.includes("cuf") && nombre.includes("calle")) res.calle = valor;
  }
  return res;
}
function SimuladorUnidades({ m2Edificables, superficieParcela = 0, indicadores = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [tipologias, setTipologias] = useState(() => cargarM2Guardados() || TIPOLOGIAS_DEFAULT);
  const [factor, setFactor] = useState(() => {
    try { return localStorage.getItem(LS_FACTOR) || "83"; } catch { return "83"; }
  });
  const [cant, setCant] = useState({ mono: 0, amb2: 0, amb3: 0, amb4: 0, cochera: 0 });
  const [editandoM2, setEditandoM2] = useState(false);
  const cufDetectado = leerCUF(indicadores);
  const [tipoVia, setTipoVia] = useState("calle"); // 'avenida' | 'calle'
  const [cufManual, setCufManual] = useState("");
  useEffect(() => {
    try { localStorage.setItem(LS_FACTOR, factor); } catch {}
  }, [factor]);
  function setM2(id, v) {
    const val = Math.max(0, Math.floor(Number(v) || 0));
    setTipologias((ts) => {
      const next = ts.map((t) => (t.id === id ? { ...t, m2: val } : t));
      try {
        const obj = {};
        next.forEach((t) => { obj[t.id] = t.m2; });
        localStorage.setItem(LS_TIPOLOGIAS, JSON.stringify(obj));
      } catch {}
      return next;
    });
  }
  function resetM2() {
    setTipologias(TIPOLOGIAS_DEFAULT);
    try { localStorage.removeItem(LS_TIPOLOGIAS); } catch {}
  }
  const factorNum = Math.max(0, Math.min(100, Number(factor) || 0));
  const m2Utiles = Math.round(m2Edificables * factorNum / 100);
  const consumido = tipologias.reduce((s, t) => s + (cant[t.id] || 0) * t.m2, 0);
  const saldo = m2Utiles - consumido;
  const habitables = tipologias.filter((t) => !t.esCochera);
  const totalUnidades = habitables.reduce((s, t) => s + (cant[t.id] || 0), 0);
  const totalCocheras = cant.cochera || 0;
  // ── CUF: unidades funcionales máximas = superficie parcela / CUF ──
  const cufAuto = tipoVia === "avenida" ? cufDetectado.avenida : cufDetectado.calle;
  const cufUsado = Number(cufManual) > 0 ? Number(cufManual) : cufAuto;
  const aplicaCUF = superficieParcela > 200 && cufUsado > 0; // Art 159: <=200 m2 no aplica CUF
  let ufMax = null;
  if (aplicaCUF) {
    const raw = superficieParcela / cufUsado;
    ufMax = Math.floor(raw) + ((raw - Math.floor(raw)) >= 0.5 ? 1 : 0); // Art 162 redondeo
  }
  // Las cocheras NO cuentan para el CUF (Art 162)
  const excedeCUF = ufMax != null && totalUnidades > ufMax;
  const setC = (id, v) => setCant((c) => ({ ...c, [id]: Math.max(0, Math.floor(Number(v) || 0)) }));
  const fmt = (n) => Number(n).toLocaleString("es-AR");
  const pct = (n) => totalUnidades > 0 ? Math.round((n / totalUnidades) * 100) : 0;
  return (
    <div style={{ marginTop: "10px", borderTop: `1px solid ${COLORS.border}30`, paddingTop: "8px" }}>
      <button
        onClick={() => setAbierto((a) => !a)}
        style={{ ...S.btn("gold", true), cursor: "pointer", fontSize: "11px", padding: "5px 10px" }}>
        🏗️ {abierto ? "Ocultar simulador de unidades" : "Simular unidades a construir"}
      </button>
      {abierto && (
        <div style={{ marginTop: "10px", padding: "10px", background: `${COLORS.blue}10`, borderRadius: "6px" }}>
          <div style={{ fontSize: "10px", color: COLORS.muted, marginBottom: "10px" }}>
            Estimación orientativa. Las superficies por tipología son los mínimos legales del código de La Plata (Art. 163); ajustalas a tus medidas comerciales con "Editar m²" (se recuerdan en este navegador). No reemplaza el proyecto del arquitecto. En La Plata las cocheras suelen ir en planta baja: ocupan metros edificables, pero NO cuentan para el CUF (Art. 162).
          </div>
          {/* Factor */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            <span style={{ fontSize: "11px", color: COLORS.text }}>Aprovechamiento:</span>
            <input type="number" min="1" max="100" value={factor}
              onChange={(e) => setFactor(e.target.value)}
              style={{ ...S.input, width: "60px", margin: 0, padding: "3px 6px", fontSize: "11px" }} />
            <span style={{ fontSize: "11px", color: COLORS.muted }}>% de {fmt(m2Edificables)} m²</span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.gold, marginLeft: "auto" }}>= {fmt(m2Utiles)} m² útiles</span>
          </div>
          {/* Editar m2 */}
          <div style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setEditandoM2((e) => !e)}
              style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "10px", padding: "2px 8px" }}>
              {editandoM2 ? "✓ Listo" : "✎ Editar m² por tipología"}
            </button>
            {editandoM2 && (
              <button onClick={resetM2}
                style={{ background: "none", border: `1px solid ${COLORS.muted}`, color: COLORS.muted, borderRadius: "4px", cursor: "pointer", fontSize: "10px", padding: "2px 8px" }}>
                Restaurar mínimos legales
              </button>
            )}
          </div>
          {/* Tipologías */}
          {tipologias.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", fontSize: "11px" }}>
              <span style={{ minWidth: "130px", color: COLORS.text }}>{t.icono} {t.label}</span>
              <button onClick={() => setC(t.id, (cant[t.id] || 0) - 1)}
                style={{ ...S.btn("blue", true), cursor: "pointer", padding: "1px 8px", fontSize: "13px" }}>−</button>
              <input type="number" min="0" value={cant[t.id] || 0}
                onChange={(e) => setC(t.id, e.target.value)}
                style={{ ...S.input, width: "48px", margin: 0, padding: "3px 6px", fontSize: "11px", textAlign: "center" }} />
              <button onClick={() => setC(t.id, (cant[t.id] || 0) + 1)}
                style={{ ...S.btn("blue", true), cursor: "pointer", padding: "1px 8px", fontSize: "13px" }}>+</button>
              {editandoM2 ? (
                <span style={{ display: "flex", alignItems: "center", gap: "3px", minWidth: "90px" }}>
                  <span style={{ color: COLORS.muted }}>×</span>
                  <input type="number" min="1" value={t.m2}
                    onChange={(e) => setM2(t.id, e.target.value)}
                    style={{ ...S.input, width: "52px", margin: 0, padding: "3px 6px", fontSize: "11px", textAlign: "center" }} />
                  <span style={{ color: COLORS.muted }}>m²</span>
                </span>
              ) : (
                <span style={{ color: COLORS.muted, minWidth: "70px" }}>× {t.m2} m²</span>
              )}
              <span style={{ color: COLORS.text, marginLeft: "auto", fontWeight: 600 }}>{fmt((cant[t.id] || 0) * t.m2)} m²</span>
            </div>
          ))}
          {/* Medidor de m2 */}
          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
              <span style={{ color: COLORS.muted }}>Consumido</span>
              <span style={{ color: COLORS.text, fontWeight: 600 }}>{fmt(consumido)} m²</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
              <span style={{ color: COLORS.muted }}>Disponible</span>
              <span style={{ color: COLORS.text, fontWeight: 600 }}>{fmt(m2Utiles)} m²</span>
            </div>
            <div style={{ height: "10px", background: `${COLORS.border}`, borderRadius: "5px", overflow: "hidden", marginBottom: "6px" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, m2Utiles > 0 ? (consumido / m2Utiles) * 100 : 0)}%`,
                background: saldo >= 0 ? COLORS.verde : COLORS.rojo,
                transition: "width 0.2s",
              }} />
            </div>
            <div style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: saldo >= 0 ? COLORS.verde : COLORS.rojo }}>
              {saldo >= 0 ? `✅ Entra en m² — sobran ${fmt(saldo)} m²` : `⚠️ No entra en m² — faltan ${fmt(-saldo)} m²`}
            </div>
          </div>
          {/* ── LÍMITE POR CUF ── */}
          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.gold }}>Límite por CUF</span>
              <span style={{ fontSize: "10px", color: COLORS.muted }}>La parcela da a:</span>
              <button onClick={() => setTipoVia("avenida")}
                style={{ ...S.btn(tipoVia === "avenida" ? "blue" : undefined, true), fontSize: "10px", padding: "2px 8px", cursor: "pointer" }}>Avenida</button>
              <button onClick={() => setTipoVia("calle")}
                style={{ ...S.btn(tipoVia === "calle" ? "blue" : undefined, true), fontSize: "10px", padding: "2px 8px", cursor: "pointer" }}>Calle</button>
            </div>
            {superficieParcela <= 200 ? (
              <div style={{ fontSize: "10.5px", color: COLORS.muted }}>
                La parcela ({fmt(superficieParcela)} m²) es ≤ 200 m²: el CUF no se aplica (Art. 159). La edificabilidad se ajusta a los demás parámetros de la zona.
              </div>
            ) : (
              <>
                {!(cufUsado > 0) && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "10.5px", color: COLORS.amarillo }}>No detecté el CUF en el análisis. Cargalo (valor de la ficha para {tipoVia}):</span>
                    <input type="number" min="1" value={cufManual} onChange={(e) => setCufManual(e.target.value)}
                      placeholder="CUF" style={{ ...S.input, width: "60px", margin: 0, padding: "3px 6px", fontSize: "11px" }} />
                  </div>
                )}
                {cufUsado > 0 && (
                  <>
                    <div style={{ fontSize: "10.5px", color: COLORS.muted, marginBottom: "4px" }}>
                      {fmt(superficieParcela)} m² ÷ CUF {cufUsado} = <b style={{ color: COLORS.text }}>{ufMax} unidades funcionales máximas</b> (Art. 162, cocheras no computan)
                      {cufManual && Number(cufManual) > 0 ? " · CUF ingresado a mano" : " · CUF del análisis"}
                    </div>
                    <div style={{ textAlign: "center", fontSize: "12px", fontWeight: 700, color: excedeCUF ? COLORS.rojo : COLORS.verde }}>
                      {excedeCUF
                        ? `⚠️ Te pasás del CUF — proyectás ${totalUnidades} unidades pero el máximo es ${ufMax}`
                        : `✅ Dentro del CUF — ${totalUnidades} de ${ufMax} unidades permitidas`}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          {/* Resumen del mix */}
          {(totalUnidades > 0 || totalCocheras > 0) && (
            <div style={{ marginTop: "8px", padding: "8px", background: `${COLORS.gold}10`, borderRadius: "5px", fontSize: "10.5px" }}>
              <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "4px" }}>
                {totalUnidades} unidad{totalUnidades === 1 ? "" : "es"} habitable{totalUnidades === 1 ? "" : "s"}
                {totalCocheras > 0 ? ` · ${totalCocheras} cochera${totalCocheras === 1 ? "" : "s"}` : ""}
                {totalUnidades > 0 && totalCocheras > 0 ? ` · ${(totalCocheras / totalUnidades).toFixed(1)} cochera/unidad` : ""}
              </div>
              {totalUnidades > 0 && (
                <div style={{ color: COLORS.muted }}>
                  Mix: {habitables.filter((t) => (cant[t.id] || 0) > 0).map((t) => `${pct(cant[t.id])}% ${t.label.toLowerCase()}`).join(" · ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
