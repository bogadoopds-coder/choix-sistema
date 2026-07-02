import { useState, useRef, useEffect } from "react";
import { sendChat } from "../../services/ai/chatClient";
import { COLORS, FONTS } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { getObras } from "../../services/obrasRepo";

const SYSTEM_PROMPT = `Sos "Choix Constructora", una app conversacional de gestión de obra para constructoras en Argentina.

IDENTIDAD Y DOMINIO:
- Especialista en construcción, licitaciones, pliegos, cómputos, presupuestos, compras, certificaciones, QA/QC, SHyMA
- Normativa: Nación Argentina, CABA, PBA
- Temperatura baja (0.3): respuestas técnicas, precisas, sin especulación

ESTILO DE RESPUESTA — SIEMPRE en Markdown estructurado tipo app:
- Usar tarjetas con encabezado emoji + título
- Tablas para ítems/listas
- Checklists para verificaciones
- Botones simulados: [Acción]
- KPIs con semáforos: 🔴 🟡 🟢
- NUNCA texto corrido largo sin estructura

VALIDACIONES AUTOMÁTICAS:
- IDs: OBR-001, PAR-YYYY-MM-DD-##, RFI-###, OC-###, CERT-YYYY-MM-OBR-###, NC-###, SH-###
- Fechas: YYYY-MM-DD
- OC total = Σ(cant × unit) + IVA 21%
- Certificación neta = Σ(items) + variaciones – retenciones
- KPIs: SPI = EV/PV, CPI = EV/AC → < 0.95 🔴 | 0.95–0.99 🟡 | ≥ 1.00 🟢

COMANDOS SLASH:
/nuevo_parte → formulario parte diario
/nuevo_RFI → formulario RFI
/nueva_orden_compra → formulario OC con tabla items
/nueva_certificacion → formulario certificación con cálculo neto
/nueva_incidencia_SH → formulario SHyMA
/nueva_NC → formulario no conformidad
/dashboard_obra {ID} → tablero completo de obra
/buscar {query} → tabla de resultados filtrados

PLANTILLAS:

Parte Diario:
🧾 Parte Diario — {OBRA} — {fecha}
- Clima: {condición, temp °C}
- Personal: Total {n} | {oficios}
- Actividades: {frente} | {descripción} | {%avance}
- Materiales: {listado}
- Incidencias: {detalle}
[Guardar parte] [Agregar foto] [Generar PDF]

RFI:
❓ RFI-{ID} — {OBRA}
- Disciplina: {Arquitectura/Estructura/MEP}
- Consulta: {texto}
- Impacto: {días} días | $\{monto\}
- Estado: 🟡 Abierto
[Enviar] [Añadir comentario] [Vincular a cambio] [Cerrar]

Orden de Compra:
📦 OC-{n} — {Proveedor}
| Ítem | UM | Cant | $Unit | $Total |
Subtotal / IVA 21% / Total
Estado: 🟡 En aprobación
[Enviar a aprobación] [Adjuntar cotización]

Certificación:
📈 Certificación — {OBRA} — Periodo {AAAAMM}
| WBS | Descripción | UM | Cant | Precio | Monto |
Neto a certificar = Σ + variaciones − retenciones
[Exportar PDF] [Enviar a cliente]

Dashboard:
🏗️ Dashboard — {OBRA}
- Avance físico: {%} | Curva S: {status}
- RFIs abiertos: {n} | OCs pendientes: {n}
- Certificación en curso: $\{monto\}
- Incidencias SHyMA: {n} 🔴/{n} 🟡
- NC Calidad: {n} abiertas

COMPORTAMIENTO:
- Si faltan datos → devolver mini-formulario en tarjeta
- Recordar dentro de la sesión los registros creados
- Si el usuario escribe "agregar 500 kg φ8 a $1.10" → parsear y añadir como ítem OC
- Fuera del dominio construcción/licitaciones → redirigir amablemente
- Siempre proponer siguiente acción con botones [Acción]`;

const QUICK_CMDS = [
  { label: "📋 Parte diario", cmd: "/nuevo_parte" },
  { label: "❓ RFI", cmd: "/nuevo_RFI" },
  { label: "📦 Orden de compra", cmd: "/nueva_orden_compra" },
  { label: "📈 Certificación", cmd: "/nueva_certificacion" },
  { label: "🦺 SH", cmd: "/nueva_incidencia_SH" },
  { label: "✅ No conformidad", cmd: "/nueva_NC" },
  { label: "🏗️ Dashboard", cmd: "/dashboard_obra OBR-001" },
];

function MarkdownRenderer({ text }) {
  const renderInline = (t) => {
    const parts = t.split(/(\*\*.*?\*\*|`.*?`)/);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color: "#fff", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={{ background: "#ffffff15", padding: "1px 5px", borderRadius: "3px", fontSize: "0.78rem", color: COLORS.teal }}>{p.slice(1, -1)}</code>;
      return p;
    });
  };
  const renderLine = (line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} style={{ color: COLORS.teal, fontSize: "0.85rem", fontWeight: 700, margin: "10px 0 4px", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: FONTS.heading }}>{line.slice(4)}</h3>;
    if (line.startsWith("## ")) return <h2 key={i} style={{ color: COLORS.teal, fontSize: "1rem", fontWeight: 700, margin: "14px 0 6px", borderBottom: `1px solid ${COLORS.teal}40`, paddingBottom: "4px", fontFamily: FONTS.heading }}>{line.slice(3)}</h2>;
    if (line.startsWith("# ")) return <h1 key={i} style={{ color: COLORS.teal, fontSize: "1.1rem", fontWeight: 800, margin: "16px 0 8px", fontFamily: FONTS.heading }}>{line.slice(2)}</h1>;
    if (line.startsWith("|")) {
      const cells = line.split("|").filter((c) => c.trim() !== "");
      if (cells.every((c) => /^[-:\s]+$/.test(c))) return null;
      return <tr key={i}>{cells.map((c, j) => <td key={j} style={{ padding: "4px 10px", borderBottom: "1px solid #ffffff10", fontSize: "0.8rem", color: "#ddd", whiteSpace: "nowrap" }}>{renderInline(c.trim())}</td>)}</tr>;
    }
    if (line.startsWith("- [ ]") || line.startsWith("- [x]")) {
      const checked = line.startsWith("- [x]");
      return <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", margin: "2px 0", fontSize: "0.82rem", color: "#ccc" }}><span style={{ color: checked ? "#22c55e" : "#666" }}>{checked ? "✅" : "⬜"}</span>{line.slice(6)}</div>;
    }
    if (line.startsWith("- ")) return <div key={i} style={{ display: "flex", gap: "8px", margin: "2px 0", fontSize: "0.82rem", color: COLORS.muted }}><span style={{ color: COLORS.teal, marginTop: "1px" }}>▸</span><span>{renderInline(line.slice(2))}</span></div>;
    if (/\[.*?\]/.test(line) && !line.startsWith("|")) {
      const parts = line.split(/(\[.*?\])/);
      return <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "8px 0" }}>{parts.map((p, j) => p.startsWith("[") && p.endsWith("]") ? <span key={j} style={{ background: COLORS.tealDim, border: `1px solid ${COLORS.teal}60`, color: COLORS.teal, padding: "3px 10px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>{p.slice(1, -1)}</span> : p ? <span key={j} style={{ fontSize: "0.82rem", color: COLORS.muted }}>{p}</span> : null)}</div>;
    }
    if (line.trim() === "") return <div key={i} style={{ height: "6px" }} />;
    return <div key={i} style={{ fontSize: "0.82rem", color: "#ccc", margin: "2px 0", lineHeight: "1.5" }}>{renderInline(line)}</div>;
  };
  const lines = text.split("\n");
  const elements = [];
  let tableRows = [];
  lines.forEach((line, i) => {
    if (line.startsWith("|")) {
      const el = renderLine(line, i);
      if (el) tableRows.push(el);
    } else {
      if (tableRows.length > 0) {
        elements.push(<div key={`t${i}`} style={{ overflowX: "auto", margin: "8px 0" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{tableRows}</tbody></table></div>);
        tableRows = [];
      }
      elements.push(renderLine(line, i));
    }
  });
  if (tableRows.length > 0) elements.push(<div key="tend" style={{ overflowX: "auto", margin: "8px 0" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>{tableRows}</tbody></table></div>);
  return <div>{elements}</div>;
}

export default function ChatModule({ initCmd }) {
  const { orgId } = useAuth();
  const [obrasReales, setObrasReales] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!orgId) return;
    getObras(orgId).then((obras) => {
      if (!cancelled) setObrasReales(Array.isArray(obras) ? obras : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [orgId]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRefChat = useRef(null);

  async function handleFileAttach(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingFile(true);
    const ext = file.name.split(".").pop().toLowerCase();
    try {
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
        const txt = data.content?.map((c) => c.text || "").join("").trim();
        setAttachedFile({ name: file.name, content: txt, type: "pdf" });
      } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        let text = "";
        wb.SheetNames.forEach((name) => {
          const ws = wb.Sheets[name];
          text += "--- Hoja: " + name + " ---\n";
          text += XLSX.utils.sheet_to_csv(ws) + "\n";
        });
        setAttachedFile({ name: file.name, content: text, type: "excel" });
      } else if (ext === "docx") {
        const mammoth = await import("https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.esm.js");
        const ab = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: ab });
        setAttachedFile({ name: file.name, content: result.value, type: "word" });
      } else {
        const text = await file.text();
        setAttachedFile({ name: file.name, content: text, type: "text" });
      }
    } catch (err) {
      setAttachedFile({ name: file.name, content: `[Error leyendo archivo: ${err.message}]`, type: "error" });
    }
    setLoadingFile(false);
    e.target.value = "";
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function buildSystemConDatos() {
    const resumen = obrasReales.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      nombre: o.nombre,
      cliente: o.cliente,
      iccPct: o.iccPct,
      totalItems: Array.isArray(o.items) ? o.items.length : 0,
      itemsSinRendimientos: Array.isArray(o.items)
        ? o.items.filter((i) => i.rendimientos === null || i.rendimientos === undefined).length
        : 0,
      certificaciones: Array.isArray(o.certificaciones) ? o.certificaciones.length : 0,
      requerimientos: Array.isArray(o.reqs) ? o.reqs.length : 0,
    }));
    return SYSTEM_PROMPT + `

DATOS REALES DE LAS OBRAS DE ESTA ORGANIZACIÓN (fuente de verdad — usá SIEMPRE estos datos, no inventes obras ni números que no estén acá):
${JSON.stringify(resumen, null, 2)}

Si el usuario pregunta por sus obras, ítems, certificaciones o requerimientos, respondé en base a estos datos reales. Si un dato no está acá, decí que no lo tenés a mano en este resumen — no lo inventes.`;
  }

  async function sendMessage(text) {
    const msgText = ((text || input) || "").trim();
    if (!msgText && !attachedFile) return;
    setInput("");

    let userContent = msgText;
    let displayMsg = msgText;
    if (attachedFile) {
      const fileNote = `[📎 ${attachedFile.name}]

${attachedFile.content}

`;
      userContent = fileNote + (msgText || "Analizá este archivo y respondé en base a él.");
      displayMsg = (msgText || "Analizá este archivo") + ` 📎 ${attachedFile.name}`;
      setAttachedFile(null);
    }

    const newMessages = [...messages, { role: "user", content: userContent }];
    const displayMessages = [...messages, { role: "user", content: displayMsg }];
    setMessages(displayMessages);
    setLoading(true);
    try {
      const data = await sendChat({ messages: newMessages, system: buildSystemConDatos() });
      const reply = data.content?.map((c) => c.text || "").join("") || data.reply || "Error en la respuesta.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Error de conexión." }]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (initCmd) setTimeout(() => sendMessage(initCmd), 100);
  }, []);

  const TEAL = COLORS.teal;
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.bg }}>
      <div style={{ padding: "10px 14px", display: "flex", gap: "6px", flexWrap: "wrap", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.card }}>
        {QUICK_CMDS.map((q) => (
          <button
            key={q.cmd}
            onClick={() => sendMessage(q.cmd)}
            disabled={loading}
            style={{ background: COLORS.subtle, border: `1px solid ${COLORS.teal}30`, color: COLORS.muted, padding: "4px 10px", borderRadius: "4px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={(e) => { e.target.style.borderColor = TEAL; e.target.style.color = TEAL; }}
            onMouseLeave={(e) => { e.target.style.borderColor = `${COLORS.teal}30`; e.target.style.color = COLORS.muted; }}
          >
            {q.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "60px", opacity: 0.5 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🤖</div>
            <div style={{ fontSize: "0.9rem", color: COLORS.muted, fontFamily: FONTS.heading }}>Agente Praxia listo</div>
            <div style={{ fontSize: "0.75rem", color: COLORS.mutedDim, marginTop: "6px" }}>Usá los comandos rápidos o escribí lo que necesitás</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: "12px" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0, marginRight: "8px", marginTop: "2px", color: COLORS.bg, fontWeight: 700, fontFamily: FONTS.heading }}>P</div>
            )}
            <div style={{ maxWidth: "85%", background: msg.role === "user" ? COLORS.tealDim : COLORS.card, border: `1px solid ${msg.role === "user" ? `${COLORS.teal}40` : COLORS.border}`, borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "10px 14px" }}>
              {msg.role === "user" ? <div style={{ fontSize: "0.82rem", color: COLORS.text }}>{msg.content}</div> : <MarkdownRenderer text={msg.content} />}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: COLORS.bg, fontWeight: 700 }}>P</div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "12px 12px 12px 2px", padding: "10px 16px", display: "flex", gap: "5px" }}>
              {[0, 1, 2].map((j) => <div key={j} style={{ width: "6px", height: "6px", borderRadius: "50%", background: TEAL, animation: "bounce 1s infinite", animationDelay: `${j * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.card }}>
        {attachedFile && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: COLORS.subtle, borderRadius: "6px", padding: "6px 10px", marginBottom: "8px", fontSize: "11px" }}>
            <span style={{ color: COLORS.teal }}>📎</span>
            <span style={{ color: COLORS.text, flex: 1 }}>{attachedFile.name}</span>
            <span style={{ color: COLORS.muted }}>({attachedFile.type})</span>
            <button onClick={() => setAttachedFile(null)} style={{ background: "none", border: "none", color: COLORS.rojo, cursor: "pointer", fontSize: "14px", padding: "0" }}>×</button>
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <input ref={fileRefChat} type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.txt" style={{ display: "none" }} onChange={handleFileAttach} />
          <button
            onClick={() => fileRefChat.current.click()}
            disabled={loadingFile}
            title="Adjuntar PDF, Excel o Word"
            style={{ background: COLORS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "10px 12px", color: loadingFile ? COLORS.mutedDim : COLORS.muted, cursor: "pointer", fontSize: "16px", flexShrink: 0 }}
          >
            {loadingFile ? "⏳" : "📎"}
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribí un comando o adjuntá un archivo... (Enter para enviar)"
            rows={1}
            style={{ flex: 1, background: COLORS.subtle, border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "10px 14px", color: COLORS.text, fontSize: "0.82rem", fontFamily: "inherit", resize: "none", outline: "none", lineHeight: "1.5", maxHeight: "120px", overflowY: "auto" }}
            onFocus={(e) => (e.target.style.borderColor = TEAL)}
            onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || (!input.trim() && !attachedFile)}
            style={{
              background: loading || (!input.trim() && !attachedFile) ? COLORS.subtle : TEAL,
              border: "none",
              borderRadius: "8px",
              padding: "10px 16px",
              color: loading || (!input.trim() && !attachedFile) ? COLORS.mutedDim : COLORS.bg,
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: loading || (!input.trim() && !attachedFile) ? "not-allowed" : "pointer",
              fontFamily: FONTS.heading,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "..." : "ENVIAR ▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
