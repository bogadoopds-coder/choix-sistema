import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { ars } from "../../utils/format";
import { uid } from "../../utils/id";
import { precioVigente, semaforo } from "../../utils/budgets";
import { COLORS, S } from "../../styles/theme";
import { sendChat } from "../../services/ai/chatClient";

// ─── SELECTOR BASE ────────────────────────────────────────────────────────────
function SelectorBase({ BASE, onAdd, existentes }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(new Set());

  const results = useMemo(() => {
    if (q.length < 2) return [];
    return BASE.filter((b) => b.desc.toLowerCase().includes(q.toLowerCase()) || b.codigo.includes(q)).slice(0, 40);
  }, [q, BASE]);

  function toggle(codigo) {
    setSel((s) => {
      const ns = new Set(s);
      ns.has(codigo) ? ns.delete(codigo) : ns.add(codigo);
      return ns;
    });
  }

  function confirmar() {
    const items = BASE.filter((b) => sel.has(b.codigo)).map((b) => ({
      codigo: b.codigo,
      desc: b.desc,
      um: b.um,
      precioBase: b.precio,
      precioCustom: null,
      cantPresup: 1,
      consumidoReal: 0,
      esCustom: false,
    }));
    onAdd(items);
  }

  return (
    <div style={{ background: COLORS.subtle, borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
        <input style={{ ...S.input, maxWidth: "320px" }} placeholder="Buscar en base (948 ítems)..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {sel.size > 0 && (
          <button style={S.btn("gold", true)} onClick={confirmar}>
            Agregar {sel.size} ítem{sel.size !== 1 ? "s" : ""}
          </button>
        )}
      </div>
      <div style={{ maxHeight: "260px", overflowY: "auto" }}>
        {results.map((b) => {
          const ya = existentes.includes(b.codigo);
          const checked = sel.has(b.codigo);
          return (
            <div
              key={b.codigo}
              onClick={() => !ya && toggle(b.codigo)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 8px",
                borderRadius: "5px",
                cursor: ya ? "default" : "pointer",
                background: checked ? COLORS.goldDim : "transparent",
                opacity: ya ? 0.4 : 1,
                marginBottom: "2px",
              }}
            >
              <input type="checkbox" checked={checked || ya} readOnly style={{ accentColor: COLORS.gold }} />
              <span style={{ color: COLORS.muted, fontSize: "10px", minWidth: "80px" }}>{b.codigo}</span>
              <span style={{ flex: 1, fontSize: "12px" }}>{b.desc}</span>
              <span style={{ color: COLORS.muted, fontSize: "10px" }}>{b.um}</span>
              <span style={{ color: COLORS.gold, fontSize: "11px", fontWeight: 700, minWidth: "90px", textAlign: "right" }}>{ars(b.precio)}</span>
              {ya && <span style={S.tag(COLORS.muted)}>YA</span>}
            </div>
          );
        })}
        {q.length >= 2 && results.length === 0 && <div style={{ color: COLORS.muted, padding: "12px", textAlign: "center" }}>Sin resultados</div>}
        {q.length < 2 && <div style={{ color: COLORS.muted, padding: "12px", textAlign: "center", fontSize: "11px" }}>Escribí al menos 2 caracteres para buscar</div>}
      </div>
    </div>
  );
}

// ─── TAB PRESUPUESTO ──────────────────────────────────────────────────────────
function TabPresupuesto({ proyecto, iccFactor, addItems, updateItem, removeItem, preciosActualizados, BASE }) {
  const [search, setSearch] = useState("");
  const [showSelector, setShowSelector] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customItem, setCustomItem] = useState({ desc: "", um: "UN", cantPresup: "1", precioCustom: "" });

  const total = proyecto.items.reduce((s, i) => s + i.cantPresup * (i.precioCustom ?? precioVigente(i.baseCodigo ?? i.codigo, i.precioBase, preciosActualizados)) * iccFactor, 0);

  function addCustom() {
    if (!customItem.desc) return;
    addItems([
      {
        codigo: "CUSTOM-" + uid(),
        desc: customItem.desc,
        um: customItem.um,
        precioBase: 0,
        precioCustom: parseFloat(customItem.precioCustom) || 0,
        cantPresup: parseFloat(customItem.cantPresup) || 1,
        consumidoReal: 0,
        esCustom: true,
      },
    ]);
    setCustomItem({ desc: "", um: "UN", cantPresup: "1", precioCustom: "" });
    setShowCustom(false);
  }

  const filtered = proyecto.items.filter((i) => (i.desc && i.desc.toLowerCase().includes(search.toLowerCase())) || (i.codigo && i.codigo.includes(search)));

  return (
    <div style={{ ...S.panel }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
        <input style={{ ...S.input, maxWidth: "280px" }} placeholder="Buscar ítem..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button style={S.btn("gold", true)} onClick={() => setShowSelector(!showSelector)}>
          + DE BASE
        </button>
        <button style={S.btn("blue", true)} onClick={() => setShowCustom(!showCustom)}>
          + ÍTEM CUSTOM
        </button>
        <span style={{ marginLeft: "auto", fontWeight: 700, color: COLORS.gold, fontSize: "14px" }}>{ars(total)}</span>
      </div>

      {showSelector && <SelectorBase BASE={BASE} onAdd={(items) => { addItems(items); setShowSelector(false); }} existentes={proyecto.items.map((i) => i.codigo)} />}

      {showCustom && (
        <div style={{ background: COLORS.subtle, borderRadius: "8px", padding: "12px", marginBottom: "12px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: "200px" }}>
            <label style={S.label}>Descripción</label>
            <input style={S.input} value={customItem.desc} onChange={(e) => setCustomItem((c) => ({ ...c, desc: e.target.value }))} />
          </div>
          <div style={{ width: "80px" }}>
            <label style={S.label}>UM</label>
            <select style={S.input} value={customItem.um} onChange={(e) => setCustomItem((c) => ({ ...c, um: e.target.value }))}>
              {["UN", "KG", "M2", "M3", "LTS", "GL"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <div style={{ width: "90px" }}>
            <label style={S.label}>Cantidad</label>
            <input style={S.input} type="number" value={customItem.cantPresup} onChange={(e) => setCustomItem((c) => ({ ...c, cantPresup: e.target.value }))} />
          </div>
          <div style={{ width: "130px" }}>
            <label style={S.label}>Precio unit ($)</label>
            <input style={S.input} type="number" value={customItem.precioCustom} onChange={(e) => setCustomItem((c) => ({ ...c, precioCustom: e.target.value }))} />
          </div>
          <button style={S.btn("gold", true)} onClick={addCustom}>Agregar</button>
          <button style={S.btn("", true)} onClick={() => setShowCustom(false)}>✕</button>
        </div>
      )}

      {proyecto.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: COLORS.muted }}>Sin ítems. Agregá desde la base o usá la IA para leer un pliego.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Código", "Descripción", "UM", "Cant. Presup.", "P. Base", "P. Custom", "P. Final+ICC", "Consumido", "Semáf.", ""].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const codigoBase = item.baseCodigo ?? item.codigo;
                const pVigente = precioVigente(codigoBase, item.precioBase, preciosActualizados);
                const precio = item.precioCustom ?? pVigente;
                const precioFinal = precio * iccFactor;
                const subtotal = (item.cantPresup ?? 0) * precioFinal;
                const sem = semaforo(item.consumidoReal, item.cantPresup);
                const tieneActualizacion = codigoBase && preciosActualizados?.[codigoBase]?.length > 0;
                return (
                  <tr key={item.codigo}>
                    <td style={{ ...S.td, color: COLORS.muted, fontSize: "11px", whiteSpace: "nowrap" }}>{item.codigo}</td>
                    <td style={{ ...S.td, maxWidth: "220px" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px" }} title={item.desc}>{item.desc}</div>
                      {item.esCustom && <span style={S.tag(COLORS.purple)}>CUSTOM</span>}
                    </td>
                    <td style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>{item.um}</td>
                    <td style={S.td}>
                      <input type="number" style={{ ...S.input, width: "80px", textAlign: "right" }} value={item.cantPresup} onChange={(e) => updateItem(item.codigo, { cantPresup: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td style={{ ...S.td, fontSize: "11px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ color: tieneActualizacion ? COLORS.verde : COLORS.muted }}>
                        {ars(pVigente)}
                        {tieneActualizacion && <span title="Precio actualizado manualmente" style={{ marginLeft: "4px" }}>✎</span>}
                      </div>
                      {tieneActualizacion && <div style={{ color: COLORS.muted, fontSize: "10px", textDecoration: "line-through" }}>{ars(item.precioBase)}</div>}
                    </td>
                    <td style={S.td}>
                      <input
                        type="number"
                        placeholder="—"
                        style={{ ...S.input, width: "100px", textAlign: "right", color: item.precioCustom != null ? COLORS.gold : COLORS.muted }}
                        value={item.precioCustom ?? ""}
                        onChange={(e) => updateItem(item.codigo, { precioCustom: e.target.value === "" ? null : parseFloat(e.target.value) })}
                      />
                    </td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: COLORS.gold, whiteSpace: "nowrap" }}>{ars(subtotal)}</td>
                    <td style={S.td}>
                      <input type="number" placeholder="0" style={{ ...S.input, width: "80px", textAlign: "right" }} value={item.consumidoReal ?? ""} onChange={(e) => updateItem(item.codigo, { consumidoReal: parseFloat(e.target.value) || 0 })} />
                    </td>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      {sem ? <span style={{ fontSize: "16px" }} title={`${((item.consumidoReal / item.cantPresup) * 100).toFixed(0)}% consumido`}>{sem === "verde" ? "🟢" : sem === "amarillo" ? "🟡" : "🔴"}</span> : <span style={{ color: COLORS.muted }}>—</span>}
                    </td>
                    <td style={S.td}>
                      <button style={{ ...S.btn("red", true), padding: "2px 7px" }} onClick={() => removeItem(item.codigo)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${COLORS.border}` }}>
                <td colSpan={6} style={{ ...S.td, fontWeight: 700, color: COLORS.muted, fontSize: "11px", textAlign: "right", paddingTop: "12px" }}>TOTAL PRESUPUESTO</td>
                <td style={{ ...S.td, fontWeight: 800, color: COLORS.gold, fontSize: "15px", paddingTop: "12px", whiteSpace: "nowrap" }}>{ars(proyecto.items.reduce((s, i) => s + (i.cantPresup ?? 0) * (i.precioCustom ?? precioVigente(i.baseCodigo ?? i.codigo, i.precioBase, preciosActualizados)) * iccFactor, 0))}</td>
                <td style={S.td} />
                <td colSpan={2} style={S.td} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── TAB SEMÁFORO ─────────────────────────────────────────────────────────────
function TabSemaforo({ proyecto, iccFactor, updateItem, preciosActualizados }) {
  const items = proyecto.items;
  const rojos = items.filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "rojo");
  const amarillos = items.filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "amarillo");
  const verdes = items.filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "verde");
  const sinDato = items.filter((i) => !semaforo(i.consumidoReal, i.cantPresup));

  if (items.length === 0) return <div style={{ ...S.panel, color: COLORS.muted, textAlign: "center", padding: "40px" }}>No hay ítems en el presupuesto</div>;

  function SemGroup({ label, color, emoji, list }) {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 700, color, marginBottom: "8px", fontSize: "12px" }}>{emoji} {label} ({list.length})</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Código", "Descripción", "UM", "Presup.", "Consumido", "% Uso"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((item) => {
              const pct = item.consumidoReal && item.cantPresup ? (item.consumidoReal / item.cantPresup * 100).toFixed(1) : "—";
              return (
                <tr key={item.codigo}>
                  <td style={{ ...S.td, color: COLORS.muted, fontSize: "11px" }}>{item.codigo}</td>
                  <td style={{ ...S.td, fontSize: "12px", maxWidth: "250px" }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.desc}>{item.desc}</div></td>
                  <td style={{ ...S.td, textAlign: "center", color: COLORS.muted }}>{item.um}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{item.cantPresup}</td>
                  <td style={S.td}>
                    <input type="number" style={{ ...S.input, width: "80px", textAlign: "right" }} value={item.consumidoReal ?? ""} placeholder="0" onChange={(e) => updateItem(item.codigo, { consumidoReal: parseFloat(e.target.value) || 0 })} />
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    <span style={{ fontWeight: 700, color, padding: "2px 8px", background: `${color}15`, borderRadius: "4px" }}>{pct}{pct !== "—" ? "%" : ""}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
        {[
          ["🔴", COLORS.rojo, rojos.length, "Sobre rendimiento"],
          ["🟡", COLORS.amarillo, amarillos.length, "En límite"],
          ["🟢", COLORS.verde, verdes.length, "OK"],
          ["⚪", COLORS.muted, sinDato.length, "Sin datos"],
        ].map(([e, c, n, l]) => (
          <div key={l} style={{ ...S.panel, flex: 1, minWidth: "100px", textAlign: "center", padding: "12px" }}>
            <div style={{ fontSize: "22px" }}>{e}</div>
            <div style={{ fontWeight: 800, fontSize: "20px", color: c }}>{n}</div>
            <div style={{ color: COLORS.muted, fontSize: "10px" }}>{l}</div>
          </div>
        ))}
      </div>
      <SemGroup label="SOBRE RENDIMIENTO — Acción requerida" color={COLORS.rojo} emoji="🔴" list={rojos} />
      <SemGroup label="EN LÍMITE — Monitorear" color={COLORS.amarillo} emoji="🟡" list={amarillos} />
      <SemGroup label="OK — Dentro del presupuesto" color={COLORS.verde} emoji="🟢" list={verdes} />
      <SemGroup label="SIN CONSUMO CARGADO" color={COLORS.muted} emoji="⚪" list={sinDato} />
    </div>
  );
}

// ─── Construction filler words to remove before word-based matching
const STOPWORDS = new Set(["de", "del", "para", "segun", "incluye", "tipo", "obra"]);

// ─── Normalize text: lowercase, remove accents, remove symbols (Ø ° . , ( ) / etc.), collapse spaces
function normalizeForMatch(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[Ø°º.,()\/\[\]\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Tokenize into words (normalized, no stopwords)
function tokenizeForMatch(s) {
  const n = normalizeForMatch(s);
  if (!n) return [];
  return n.split(/\s+/).filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

// ─── Word overlap count (intersection size)
function wordOverlapCount(wordsA, wordsB) {
  const setB = new Set(wordsB);
  return wordsA.filter((w) => setB.has(w)).length;
}

// ─── Find best base-price match: word-similarity + same-unit preference; highest overlap wins.
function findBestBaseMatch(desc, um, BASE) {
  if (!BASE || !Array.isArray(BASE) || BASE.length === 0) return null;
  const tokensDesc = tokenizeForMatch(desc);
  if (tokensDesc.length === 0) return null;
  const nUm = normalizeForMatch(um) || "un";
  const minOverlap = Math.min(2, tokensDesc.length);

  const scored = [];
  for (const b of BASE) {
    const tokensBase = tokenizeForMatch(b.desc);
    const overlap = wordOverlapCount(tokensDesc, tokensBase);
    if (overlap < minOverlap) continue;
    scored.push({
      base: b,
      overlap,
      sameUnit: normalizeForMatch(b.um) === nUm,
    });
  }
  if (scored.length === 0) return null;
  scored.sort((a, b) => {
    if (a.sameUnit !== b.sameUnit) return b.sameUnit ? 1 : -1;
    return b.overlap - a.overlap;
  });
  const best = scored[0];
  return best ? { codigo: best.base.codigo, precio: best.base.precio } : null;
}

// ─── TAB IA / PLIEGO ──────────────────────────────────────────────────────────
function TabIA({ proyecto, addItems, BASE }) {
  const [pliego, setPliego] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [fileWarning, setFileWarning] = useState("");
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingPdf(true);
    setError("");
    setFileWarning("");
    const ext = file.name.split(".").pop().toLowerCase();
    try {
      if (ext === "pdf") {
        const base64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => {
            const dataUrl = r.result;
            if (!dataUrl || typeof dataUrl !== "string") {
              rej(new Error("No se pudo leer el archivo"));
              return;
            }
            const part = dataUrl.split(",")[1];
            if (!part) rej(new Error("Formato de archivo inválido"));
            else res(part);
          };
          r.onerror = () => rej(new Error("Error leyendo PDF"));
          r.readAsDataURL(file);
        });
        const data = await sendChat({
          messages: [
            {
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
                { type: "text", text: "Extraé el texto completo de este pliego de obra o especificación técnica. Devolvé solo el texto, sin comentarios." },
              ],
            },
          ],
          max_tokens: 8192,
        });
        if (data && data.error) {
          const errMsg = typeof data.error === "string" ? data.error : (data.error?.message || "Error del servidor");
          setError("Error al leer PDF: " + errMsg);
          setPliego("");
          return;
        }
        const content = data?.content;
        const txt = (Array.isArray(content) ? content.map((c) => (c && c.text) || "").join("") : (content && typeof content === "string" ? content : "") || "").trim();
        setPliego(txt || "");
        if (data.stop_reason === "max_tokens") {
          setFileWarning("Advertencia: la respuesta podría estar truncada por límite de longitud.");
        } else if (txt.length > 0 && txt.length < 300) {
          setFileWarning("Texto muy breve; si el PDF tiene más contenido, es posible que no se haya extraído todo.");
        } else {
          setFileWarning("");
        }
      } else if (ext === "xlsx" || ext === "xls") {
        const ab = await file.arrayBuffer();
        let wb;
        try {
          wb = XLSX.read(ab, { type: "array" });
        } catch (ex) {
          setError("Error al leer Excel: " + (ex?.message || String(ex)));
          setPliego("");
          return;
        }
        let text = "";
        (wb.SheetNames || []).forEach((sname) => {
          text += "--- Hoja: " + sname + " ---\n";
          try {
            text += XLSX.utils.sheet_to_csv(wb.Sheets[sname] || {}) + "\n";
          } catch (_) {
            text += "\n";
          }
        });
        setPliego(text || "");
      } else if (ext === "csv") {
        const text = await file.text();
        setPliego(text != null ? String(text) : "");
      } else if (ext === "docx") {
        const mammoth = await import("https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.esm.js");
        const ab = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: ab });
        setPliego((result && result.value) || "");
        setFileWarning("");
      } else {
        const text = await file.text();
        setPliego(text != null ? String(text) : "");
        setFileWarning("");
      }
    } catch (err) {
      setError("Error al leer archivo: " + (err?.message || String(err)));
      setPliego("");
      setFileWarning("");
    } finally {
      setLoadingPdf(false);
    }
    if (e.target && e.target.value) e.target.value = "";
  }

  /**
   * Parse a single line as "<description> <unit> <quantity>".
   * Unit: m2, m3, ml, un (case-insensitive). Quantity: last number (allows . or , as decimal).
   * Returns { desc, um, cant } or null if line does not match; invalid lines are skipped, no throw.
   */
  function parsePliegoLine(line) {
    if (line == null || typeof line !== "string") return null;
    const normalized = line.trim().replace(/\s+/g, " ");
    if (!normalized) return null;
    const match = normalized.match(/\s+(m2|m3|ml|un)\s+(\d+(?:[.,]\d+)?)\s*$/i);
    if (!match) return null;
    const qtyStr = match[2].replace(",", ".");
    const quantity = parseFloat(qtyStr);
    if (Number.isNaN(quantity) || quantity < 0) return null;
    const desc = normalized.slice(0, match.index).trim();
    if (!desc) return null;
    return {
      desc,
      um: match[1].toUpperCase(),
      cant: quantity,
    };
  }

  function importarDesdeExcel() {
    try {
      const text = pliego != null ? String(pliego) : "";
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const toAdd = [];
      for (const line of lines) {
        const parsed = parsePliegoLine(line);
        if (parsed) {
          toAdd.push({
            codigo: "CUSTOM-IMP",
            desc: parsed.desc,
            um: parsed.um,
            precioBase: 0,
            precioCustom: null,
            cantPresup: parsed.cant,
            consumidoReal: 0,
            esCustom: true,
            justificacion: "Importado desde pliego",
          });
          continue;
        }
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        if (cols.length < 2) continue;
        const [c0, c1, c2, c3, c4] = cols;
        const cant = parseFloat(String(c3).replace(",", ".")) || parseFloat(String(c2).replace(",", ".")) || 1;
        const precio = parseFloat(String(c4).replace(",", ".")) || parseFloat(String(c3).replace(",", ".")) || 0;
        if (c1 && c1.length > 2) {
          toAdd.push({
            codigo: c0 || "CUSTOM-IMP",
            desc: c1,
            um: (c2 && String(c2).trim()) || "UN",
            precioBase: precio,
            precioCustom: null,
            cantPresup: cant,
            consumidoReal: 0,
            esCustom: true,
            justificacion: "Importado desde Excel",
          });
        }
      }
      if (toAdd.length > 0) {
        addItems(toAdd);
        setPliego("");
        setResultado(null);
        setError("");
      } else {
        setError("No se pudieron detectar ítems. Usá líneas «descripción unidad cantidad» (ej: Platea de fundación m3 1.10) o CSV con columnas: Código, Descripción, UM, Cantidad, Precio");
      }
    } catch (e) {
      setError("Error al importar: " + (e && e.message ? e.message : String(e)));
    }
  }

  const CHUNK_THRESHOLD = 2500;
  const CHUNK_MAX_SIZE = 3800;

  /**
   * Detect Excel/tabular content: many short lines, commas/semicolons, tabs, or spreadsheet-like rows.
   * When true, chunk mode is forced to avoid fragile single-call JSON parsing.
   */
  function looksLikeExcelOrTabular(text) {
    if (!text || typeof text !== "string") return false;
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 3) return false;
    const avgLineLen = text.length / Math.max(lines.length, 1);
    if (lines.length >= 5 && avgLineLen < 80) return true;
    const commas = (text.match(/,/g) || []).length;
    const semicolons = (text.match(/;/g) || []).length;
    const separatorRatio = (commas + semicolons) / Math.max(text.length, 1);
    if (separatorRatio > 0.02) return true;
    const linesWithSep = lines.filter((l) => /[,;\t]/.test(l)).length;
    if (linesWithSep >= Math.ceil(lines.length / 2) && lines.length >= 3) return true;
    return false;
  }

  /**
   * Split text into chunks by complete lines. No line is cut in the middle.
   * Each chunk is at most CHUNK_MAX_SIZE characters.
   */
  function splitIntoChunks(text) {
    if (!text || text.length <= CHUNK_THRESHOLD) return [text].filter(Boolean);
    const lines = text.split(/\r?\n/);
    const chunks = [];
    let current = [];
    let currentLen = 0;
    for (const line of lines) {
      const lineLen = line.length + 1;
      if (currentLen + lineLen > CHUNK_MAX_SIZE && current.length > 0) {
        chunks.push(current.join("\n"));
        current = [line];
        currentLen = lineLen;
      } else {
        current.push(line);
        currentLen += lineLen;
      }
    }
    if (current.length > 0) chunks.push(current.join("\n"));
    return chunks;
  }

  /**
   * Merge partial results: combine rubros and dedupe items by (desc, unidad, cantidad).
   */
  function mergePliegoResults(partials, obraFallback) {
    const seen = new Set();
    const rubrosMap = new Map();
    for (const p of partials) {
      if (!p || !Array.isArray(p.rubros)) continue;
      const obra = p.obra || obraFallback;
      for (const rubro of p.rubros) {
        const name = (rubro && rubro.nombre) || "General";
        if (!rubrosMap.has(name)) rubrosMap.set(name, { nombre: name, items: [] });
        const items = Array.isArray(rubro.items) ? rubro.items : [];
        for (const it of items) {
          if (!it || typeof it !== "object") continue;
          const desc = (it.descripcion != null ? String(it.descripcion) : "").trim().toLowerCase();
          const um = (it.unidad != null && String(it.unidad).trim()) || "UN";
          const cant = Number(it.cantidad) || 0;
          const key = `${desc}|${um}|${cant}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rubrosMap.get(name).items.push(it);
        }
      }
    }
    const obra = (partials[0] && partials[0].obra) || obraFallback;
    return { obra, rubros: [...rubrosMap.values()] };
  }

  /**
   * Extracts and optionally repairs JSON from AI response text.
   * - Strips ```json ... ``` and ``` ... ``` wrappers
   * - Ignores text before/after; extracts span from first { to last }
   * - Returns the largest (outermost) JSON object as string
   * - If parse fails, tries to balance missing closing braces/brackets
   */
  function extractAndParseJson(raw) {
    if (!raw || typeof raw !== "string") return null;
    let s = raw.trim();
    // Strip markdown code block: remove leading ```json or ``` (and optional newline/whitespace)
    if (s.startsWith("```")) {
      s = s.replace(/^```(?:json)?\s*[\r\n]*/, "").trim();
      // Remove trailing ``` only when it's at the end (avoids cutting JSON that contains backticks)
      s = s.replace(/\s*```\s*$/, "").trim();
    }
    // Extract largest JSON object: from first { to last }
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) return null;
    let jsonStr = s.slice(firstBrace, lastBrace + 1);

    function tryParse(str) {
      try {
        return JSON.parse(str);
      } catch (_) {
        return null;
      }
    }

    let parsed = tryParse(jsonStr);
    if (parsed !== null) return parsed;

    // Repair: balance missing closing braces/brackets (ignore inside double-quoted strings)
    let depthObj = 0;
    let depthArr = 0;
    let inStr = false;
    let escape = false;
    for (let i = 0; i < jsonStr.length; i++) {
      const c = jsonStr[i];
      if (inStr) {
        if (escape) { escape = false; continue; }
        if (c === "\\") { escape = true; continue; }
        if (c === '"') { inStr = false; continue; }
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === "{") depthObj++;
      else if (c === "}") depthObj--;
      else if (c === "[") depthArr++;
      else if (c === "]") depthArr--;
    }
    const closing = "]".repeat(Math.max(0, depthArr)) + "}".repeat(Math.max(0, depthObj));
    if (closing) {
      parsed = tryParse(jsonStr + closing);
      if (parsed !== null) return parsed;
    }
    return null;
  }

  /**
   * Preprocess pliego text before AI: keep ONLY lines that match useful computation patterns.
   * Aggressive: discard everything that is not rubro title, numbered item, or row with units/technical content.
   */
  function preprocessPliegoForAnalysis(rawText) {
    if (!rawText || typeof rawText !== "string") return "";
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const discardPatterns = [
      "ministerio", "provincia", "gobierno", "expediente", "artículo", "if-2023", "página",
      "digitally signed", "firma", "aclaracion", "responsable", "referencia", "gedo",
      "fecha computo", "hoja adicional", "la plata", "buenos aires",
      "planilla resumen", "plan de trabajos", "plazo de ejecucion", "% incidencia", "% de avance",
      "monto de inversión", "subtotal", "presupuesto total", "precio por m2 de edificación",
    ];
    const hasItemNumber = (l) => /^\d+\.\d+[\s.)\-]|^\d+[\s.)\-]/.test(l);
    const unitRegex = /\b(m2|m3|ml|m\s*2|m\s*3|\bu\b|n°|kg|tn|gl|dia|mes|unidad|un\.?)\b/i;
    const isRubroTitle = (l) => {
      if (l.length > 70) return false;
      return /^(estructura|albañileria|pinturas?|revestimientos?|instalaciones?|hormigon|excavacion|ceramica|mamposteria|contrapiso|carpeta|revoque|terminacion|obras)\b/i.test(l)
        || /^[A-ZÁÉÍÓÚÑ\s\-]{4,60}$/.test(l);
    };
    const hasTechnicalKeyword = (l) => /\b(revoque|hormigon|excavacion|pintura|ceramica|mamposteria|contrapiso|carpeta|losa|viga|columna|platea|fundacion|muro|tabique|revestimiento|enduido|membrana|aislante|placa|cielorraso|ceramico|relleno|caño|cañeria|instalacion|puerta|ventana|abertura|pilotine|viga|mampuesto)\b/i.test(l);
    const kept = [];
    const discarded = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (discardPatterns.some((p) => lower.includes(p))) {
        discarded.push(line);
        continue;
      }
      const matchesKeep = hasItemNumber(line) || unitRegex.test(line) || isRubroTitle(line) || hasTechnicalKeyword(line);
      if (matchesKeep) kept.push(line);
      else discarded.push(line);
    }
    const filteredText = kept.join("\n").trim();
    if (typeof console !== "undefined" && console.log) {
      console.log("[AI/Pliego] Preprocess: original lines =", lines.length, "| kept =", kept.length, "| discarded =", discarded.length);
      if (kept.length > 0) console.log("[AI/Pliego] First 10 kept:", kept.slice(0, 10));
      if (discarded.length > 0) console.log("[AI/Pliego] First 10 discarded:", discarded.slice(0, 10));
    }
    return filteredText;
  }

  const pliegoPromptPrefix = (chunkInfo) =>
    `Sos un ingeniero de obra argentino. Analizá el siguiente pliego/descripción de obra y extraé los rubros e ítems con cantidades.
${chunkInfo ? `(Fragmento ${chunkInfo} del pliego.)` : ""}

OBRA: ${proyecto.nombre} (${proyecto.codigo})
CLIENTE: ${proyecto.cliente}

DESCRIPCIÓN / PLIEGO:
`;

  const pliegoPromptSuffix = `
Respondé ÚNICAMENTE con un único objeto JSON válido. No incluyas texto antes ni después, ni backticks ni explicaciones.
Formato exacto (respeta los nombres de campos):

{"obra":"nombre breve de la obra","rubros":[{"nombre":"Nombre del rubro","items":[{"descripcion":"Descripción del ítem","unidad":"UN","cantidad":0,"observaciones":"cálculo o justificación"}]}]}

Reglas:
- obra: string con el nombre de la obra.
- rubros: array de objetos; cada uno tiene "nombre" (string) e "items" (array).
- Cada ítem tiene: descripcion (string), unidad (string: UN, M2, M3, KG, LTS, etc.), cantidad (número), observaciones (string).
- Agrupá por rubros lógicos (ej. "Estructura", "Instalaciones", "Terminaciones"). Entre 1 y 15 rubros.
- Cantidades conservadoras y realistas. Máximo 50 ítems en total.
- Respuesta: solo el JSON, nada más.`;

  async function runOneChunkAnalysis(chunkText, chunkIndex, totalChunks) {
    const chunkInfo = totalChunks > 1 ? `${chunkIndex + 1} de ${totalChunks}` : "";
    const content = pliegoPromptPrefix(chunkInfo) + chunkText + pliegoPromptSuffix;
    const data = await sendChat({
      messages: [{ role: "user", content }],
    });
    if (data?.error) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[AI/Pliego] Chunk", chunkIndex + 1, "sendChat error:", data.error);
      }
      return null;
    }
    const txt = (Array.isArray(data?.content) ? data.content.map((c) => (c && c.text) || "").join("") : (data?.content && typeof data.content === "string" ? data.content : "") || "").trim();
    if (typeof console !== "undefined" && console.log) {
      console.log("[AI/Pliego] Chunk", chunkIndex + 1, "raw AI response length =", txt.length, "| first 400 chars:", txt.slice(0, 400));
    }
    const parsed = extractAndParseJson(txt);
    if (typeof console !== "undefined" && console.log) {
      const rubrosCount = parsed && Array.isArray(parsed.rubros) ? parsed.rubros.length : 0;
      const itemsCount = parsed && Array.isArray(parsed.rubros) ? parsed.rubros.reduce((s, r) => s + (Array.isArray(r.items) ? r.items.length : 0), 0) : 0;
      console.log("[AI/Pliego] Chunk", chunkIndex + 1, "JSON parsing succeeded =", parsed !== null, "| rubros =", rubrosCount, "| items extracted =", itemsCount);
    }
    return parsed;
  }

  async function analizarPliego() {
    if (!(pliego || "").trim()) return;
    const rawText = pliego.trim();
    const text = preprocessPliegoForAnalysis(rawText) || rawText;
    setLoading(true);
    setError("");
    setResultado(null);
    let rawResponse = null;
    const forceTabularChunk = looksLikeExcelOrTabular(text);
    const chunkMode = text.length > CHUNK_THRESHOLD || forceTabularChunk;
    if (typeof console !== "undefined" && console.log) {
      console.log("[AI/Pliego] pliego text length (for analysis) =", text.length, "| chunk mode triggered =", chunkMode, "(threshold =", CHUNK_THRESHOLD, "| force tabular =", forceTabularChunk, ")");
    }
    try {
      if (!chunkMode) {
        if (typeof console !== "undefined" && console.log) {
          console.log("[AI/Pliego] Single-call path: sending request...");
        }
        const data = await sendChat({
          messages: [
            {
              role: "user",
              content: pliegoPromptPrefix(null) + text + pliegoPromptSuffix,
            },
          ],
        });
        rawResponse = data;
        if (data?.error) {
          const errMsg = typeof data.error === "string" ? data.error : (data.error?.message || "Error del servidor");
          setError("Error al analizar: " + errMsg);
          setLoading(false);
          return;
        }
        const content = data?.content;
        const txt = (Array.isArray(content) ? content.map((c) => (c && c.text) || "").join("") : (content && typeof content === "string" ? content : "") || "").trim();
        if (typeof console !== "undefined" && console.log) {
          console.log("[AI/Pliego] Raw AI response:", txt);
        }
        if (!txt) {
          setError("La IA no devolvió texto. Revisá la consola (F12) para ver la respuesta.");
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[AI/Pliego] Respuesta sin contenido utilizable:", data);
          }
          setLoading(false);
          return;
        }
        const parsed = extractAndParseJson(txt);
        if (typeof console !== "undefined" && console.log) {
          console.log("[AI/Pliego] Single-call: JSON parsing succeeded =", parsed !== null, parsed !== null ? "| rubros count =" : "", parsed !== null ? (parsed.rubros && parsed.rubros.length) : "");
        }
        if (parsed === null) {
          setError("No se encontró JSON válido en la respuesta. Revisá la consola.");
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[AI/Pliego] No se pudo extraer/parsear JSON. Texto (primeros 800):", txt.slice(0, 800));
          }
          setLoading(false);
          return;
        }
        const rubros = parsed.rubros;
        if (!Array.isArray(rubros) || rubros.length === 0) {
          setError("La IA devolvió JSON pero sin rubros válidos (rubros debe ser un array no vacío). Revisá la consola.");
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[AI/Pliego] JSON parseado sin rubros válidos:", parsed);
          }
          setLoading(false);
          return;
        }
        setResultado({ obra: parsed.obra || proyecto.nombre, rubros });
      } else {
        const chunks = splitIntoChunks(text);
        if (typeof console !== "undefined" && console.log) {
          console.log("[AI/Pliego] Chunked analysis: number of chunks =", chunks.length, "| chunk sizes =", chunks.map((c) => c.length));
        }
        const partials = [];
        for (let i = 0; i < chunks.length; i++) {
          const parsed = await runOneChunkAnalysis(chunks[i], i, chunks.length);
          const itemCount = parsed && Array.isArray(parsed.rubros) ? parsed.rubros.reduce((s, r) => s + (Array.isArray(r.items) ? r.items.length : 0), 0) : 0;
          if (typeof console !== "undefined" && console.log) {
            console.log("[AI/Pliego] Chunk", i + 1, "summary: items in this chunk =", itemCount, "| parse ok =", parsed !== null);
          }
          if (parsed && Array.isArray(parsed.rubros) && parsed.rubros.length > 0) partials.push(parsed);
        }
        const merged = mergePliegoResults(partials, proyecto.nombre);
        const finalCount = (merged.rubros || []).reduce((s, r) => s + (Array.isArray(r.items) ? r.items.length : 0), 0);
        if (typeof console !== "undefined" && console.log) {
          console.log("[AI/Pliego] Merged result: partials count =", partials.length, "| final rubros =", (merged.rubros || []).length, "| final item count =", finalCount);
        }
        if (merged.rubros.length === 0) {
          setError("No se obtuvieron rubros válidos de ningún fragmento. Revisá la consola.");
          setLoading(false);
          return;
        }
        setResultado(merged);
      }
    } catch (e) {
      setError("Error al analizar: " + (e?.message || String(e)));
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[AI/Pliego] Error o respuesta cruda:", e?.message, rawResponse ?? "no response");
      }
    }
    setLoading(false);
  }

  const MAX_IMPORT_ITEMS = 200;

  function confirmarItems() {
    const rubros = Array.isArray(resultado?.rubros) ? resultado.rubros : [];
    if (typeof console !== "undefined" && console.log) {
      console.log("[AI/Pliego] confirmarItems: rubros count =", rubros.length);
    }
    const flattened = rubros.flatMap((rubro) =>
      (Array.isArray(rubro?.items) ? rubro.items : []).map((item) => {
        if (item == null || typeof item !== "object") return null;
        const desc = item.descripcion != null ? String(item.descripcion) : "";
        const um = (item.unidad != null && String(item.unidad).trim()) || "UN";
        const match = findBestBaseMatch(desc, um, BASE);
        if (match && typeof console !== "undefined" && console.log) {
          console.log("[AI/Pliego] Matched:", desc.slice(0, 50), "→", match.codigo, "P.BASE:", match.precio);
        } else if (!match && desc.trim().length > 0 && typeof console !== "undefined" && console.log) {
          console.log("[AI/Pliego] Unmatched:", desc.slice(0, 50), "(P.BASE = 0)");
        }
        return {
          codigo: (match ? match.codigo : "CUSTOM-IMP") + "-" + uid(),
          baseCodigo: match ? match.codigo : undefined,
          desc: desc,
          um: um,
          precioBase: match ? match.precio : 0,
          precioCustom: null,
          cantPresup: Number(item.cantidad) || 0,
          consumidoReal: 0,
          esCustom: !match,
          justificacion: item.observaciones != null ? String(item.observaciones) : "",
        };
      })
    ).filter((r) => r != null && r.desc != null && String(r.desc).trim().length > 0);
    const toAdd = flattened.slice(0, MAX_IMPORT_ITEMS);
    if (flattened.length > MAX_IMPORT_ITEMS && typeof console !== "undefined" && console.warn) {
      console.warn("[AI/Pliego] Import capped at", MAX_IMPORT_ITEMS, "items (total was", flattened.length, ")");
    }
    if (typeof console !== "undefined" && console.log) {
      console.log("[AI/Pliego] confirmarItems: flattened count =", flattened.length, ", toAdd count =", toAdd.length, ", first item =", toAdd[0] ? { codigo: toAdd[0].codigo, desc: (toAdd[0].desc || "").slice(0, 40), um: toAdd[0].um } : null);
    }
    if (toAdd.length === 0) {
      setError("No hay ítems válidos para agregar.");
      return;
    }
    try {
      addItems(toAdd);
      if (typeof console !== "undefined" && console.log) {
        console.log("[AI/Pliego] addItems called with", toAdd.length, "items");
      }
      setResultado(null);
      setPliego("");
      setError("");
    } catch (err) {
      if (typeof console !== "undefined" && console.error) {
        console.error("[AI/Pliego] confirmarItems error:", err);
      }
      setError("Error al agregar ítems: " + (err && err.message ? err.message : String(err)));
    }
  }

  return (
    <div style={S.panel}>
      <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "4px", fontSize: "12px" }}>🤖 ANÁLISIS DE PLIEGO CON IA</div>
      <div style={{ color: COLORS.muted, fontSize: "11px", marginBottom: "10px" }}>Pegá el texto del pliego, o subí un PDF directamente. La IA identificará los materiales necesarios con cantidades estimadas.</div>

      <div style={{ marginBottom: "10px" }}>
        <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.txt" style={{ display: "none" }} onChange={handleFile} />
        <button style={{ ...S.btn("blue"), display: "flex", alignItems: "center", gap: "6px" }} onClick={() => fileRef.current.click()} disabled={loadingPdf}>
          {loadingPdf ? "⏳ Leyendo archivo..." : "📎 SUBIR PDF / EXCEL / WORD"}
        </button>
        {pliego && <div style={{ fontSize: "10px", color: COLORS.verde, marginTop: "4px" }}>✓ Texto cargado ({pliego.length} caracteres)</div>}
        {fileWarning && <div style={{ fontSize: "11px", color: COLORS.gold, marginTop: "6px" }}>⚠ {fileWarning}</div>}
      </div>
      <textarea
        style={{ ...S.input, height: "140px", resize: "vertical", lineHeight: "1.5" }}
        placeholder="Ej: Construcción de aulas modulares prefabricadas de 7x9m..."
        value={pliego}
        onChange={(e) => setPliego(e.target.value)}
      />
      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
        <button style={S.btn()} onClick={analizarPliego} disabled={loading || !pliego.trim()}>
          {loading ? "Analizando..." : "🤖 ANALIZAR CON IA"}
        </button>
        <button style={{ ...S.btn("gold") }} onClick={importarDesdeExcel} disabled={!pliego.trim()}>
          📥 IMPORTAR ÍTEMS DIRECTO (Excel)
        </button>
      </div>
      {error && <div style={{ color: COLORS.rojo, marginTop: "10px", fontSize: "12px" }}>{error}</div>}

      {resultado && resultado.rubros && (
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontWeight: 700, marginBottom: "10px", color: COLORS.gold, fontSize: "12px" }}>
            {resultado.obra ? `Obra: ${resultado.obra}` : "Resultado del análisis"}
          </div>
          <div style={{ maxHeight: "360px", overflowY: "auto", marginBottom: "12px" }}>
            {resultado.rubros.map((rubro, ri) => (
              <div key={ri} style={{ marginBottom: "14px" }}>
                <div style={{ fontWeight: 600, color: COLORS.gold, fontSize: "11px", marginBottom: "6px", paddingBottom: "4px", borderBottom: `1px solid ${COLORS.border}` }}>
                  {rubro.nombre || `Rubro ${ri + 1}`}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["Descripción", "Unidad", "Cantidad", "Observaciones"].map((h) => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(rubro.items) ? rubro.items : []).map((item, ii) => (
                      <tr key={ii}>
                        <td style={{ ...S.td, fontSize: "12px", maxWidth: "220px" }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.descripcion}>{item.descripcion}</div></td>
                        <td style={{ ...S.td, textAlign: "center", color: COLORS.muted, whiteSpace: "nowrap" }}>{item.unidad}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{item.cantidad}</td>
                        <td style={{ ...S.td, fontSize: "11px", color: COLORS.muted, maxWidth: "180px" }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.observaciones}>{item.observaciones}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={S.btn("gold")} onClick={confirmarItems}>CONFIRMAR Y AGREGAR AL PRESUPUESTO</button>
            <button style={S.btn()} onClick={() => setResultado(null)}>Descartar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────
function TabConfig({ proyecto, updateProyecto }) {
  const [form, setForm] = useState({ ...proyecto });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={{ ...S.panel, maxWidth: "480px" }}>
      <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "16px", fontSize: "12px" }}>CONFIGURACIÓN DE OBRA</div>
      <div style={{ display: "grid", gap: "14px" }}>
        {[["Código", "codigo", "text"], ["Nombre", "nombre", "text"], ["Cliente", "cliente", "text"], ["Fecha inicio", "fechaInicio", "date"], ["Fecha fin", "fechaFin", "date"]].map(([l, k, t]) => (
          <div key={k}>
            <label style={S.label}>{l}</label>
            <input style={S.input} type={t} value={form[k] || ""} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
        <div>
          <label style={S.label}>Ajuste ICC ({form.iccPct}%)</label>
          <input style={S.input} type="range" min="0" max="60" step="0.5" value={form.iccPct} onChange={(e) => set("iccPct", parseFloat(e.target.value))} />
          <div style={{ color: COLORS.gold, fontSize: "11px", marginTop: "3px" }}>×{(1 + form.iccPct / 100).toFixed(3)} sobre precios ago-2025</div>
        </div>
      </div>
      <button style={{ ...S.btn(), marginTop: "16px" }} onClick={() => updateProyecto(proyecto.id, form)}>GUARDAR CAMBIOS</button>
    </div>
  );
}

// ─── VISTA PROYECTO (exported as ProjectView) ──────────────────────────────────
export default function ProjectView({ proyecto, updateProyecto, preciosActualizados, BASE }) {
  const [tab, setTab] = useState("presupuesto");
  const iccFactor = 1 + proyecto.iccPct / 100;

  function addItems(newItems) {
    const safe = Array.isArray(newItems) ? newItems.filter((i) => i != null && i.codigo != null && String(i.codigo).trim() !== "") : [];
    const existing = new Set((proyecto.items || []).map((i) => i && i.codigo).filter(Boolean));
    const toAdd = safe.filter((i) => !existing.has(i.codigo));
    updateProyecto(proyecto.id, { items: [...(proyecto.items || []), ...toAdd] });
  }
  function updateItem(codigo, patch) {
    updateProyecto(proyecto.id, { items: proyecto.items.map((i) => (i.codigo === codigo ? { ...i, ...patch } : i)) });
  }
  function removeItem(codigo) {
    updateProyecto(proyecto.id, { items: proyecto.items.filter((i) => i.codigo !== codigo) });
  }

  const totalPresup = proyecto.items.reduce((s, i) => s + (i.cantPresup ?? 0) * (i.precioCustom ?? precioVigente(i.baseCodigo ?? i.codigo, i.precioBase, preciosActualizados)) * iccFactor, 0);
  const alertasRojo = proyecto.items.filter((i) => semaforo(i.consumidoReal, i.cantPresup) === "rojo").length;

  return (
    <div>
      <div style={{ ...S.panel, marginBottom: "14px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "16px" }}>{proyecto.codigo}</span>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>{proyecto.nombre}</span>
            </div>
            <div style={{ color: COLORS.muted, fontSize: "11px", marginTop: "3px" }}>{proyecto.cliente} · {proyecto.fechaInicio} → {proyecto.fechaFin} · ICC +{proyecto.iccPct}%</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: COLORS.muted, letterSpacing: "0.08em" }}>TOTAL PRESUPUESTO</div>
            <div style={{ fontWeight: 800, color: COLORS.gold, fontSize: "22px" }}>{ars(totalPresup)}</div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "4px" }}>
              <span style={S.tag(COLORS.blue)}>{proyecto.items.length} ítems</span>
              {alertasRojo > 0 && <span style={S.tag(COLORS.rojo)}>⚠ {alertasRojo} sobre rendimiento</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "14px" }}>
        {[["presupuesto", "📋 Presupuesto"], ["semaforo", "🚦 Semáforo"], ["ia", "🤖 IA / Pliego"], ["config", "⚙ Config"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...S.btn(tab === t ? "gold" : "", true), borderRadius: "6px 6px 0 0" }}>{l}</button>
        ))}
      </div>

      {tab === "presupuesto" && <TabPresupuesto proyecto={proyecto} iccFactor={iccFactor} addItems={addItems} updateItem={updateItem} removeItem={removeItem} preciosActualizados={preciosActualizados} BASE={BASE} />}
      {tab === "semaforo" && <TabSemaforo proyecto={proyecto} iccFactor={iccFactor} updateItem={updateItem} preciosActualizados={preciosActualizados} />}
      {tab === "ia" && <TabIA proyecto={proyecto} addItems={addItems} BASE={BASE} />}
      {tab === "config" && <TabConfig proyecto={proyecto} updateProyecto={updateProyecto} />}
    </div>
  );
}
