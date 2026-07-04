import { useState, useMemo, Fragment, useEffect } from "react";
import * as XLSX from "xlsx";
import { ars } from "../../../utils/format";
import { uid } from "../../../utils/id";
import { precioVigente, semaforo } from "../../../utils/budgets";
import { COLORS, S } from "../../../styles/theme";
import { flattenWithHeaders, formatPrecioARS } from "../utils/parseUtils";
import { UOCRA_RATES_DEFAULT } from "../../../data/uocraRates";
import { normalizeRendimientosDescKey } from "../../../services/storage";
import { useAuth } from "../../../auth/AuthContext";
import { getUocraRates, saveUocraRates, getRendimientos, upsertRendimientos } from "../../../services/obrasRepo";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";

/** MO UOCRA por ítem (solo oficial + ayudante, con ICC), mismo criterio que el resumen. */
function moUocraItemOficialAyudanteIcc(item, rates, iccPct) {
  const r = item.rendimientos;
  if (!r) return null;
  const o = Number(r.oficial_h) || 0;
  const a = Number(r.ayudante_h) || 0;
  if (o === 0 && a === 0) return null;
  const cant = Number(item.cantPresup) || 0;
  return (o * rates.oficial_hora + a * rates.ayudante_hora) * cant * (1 + iccPct / 100);
}

const ITEMS_IA_CHUNK = 30;

function chunkItems(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseJsonObjectFromAnthropicText(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

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

const RubroHeader = ({ data }) => (
  <tr style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}>
    <td
      colSpan={10}
      style={{
        padding: "10px 14px",
        fontWeight: "700",
        fontSize: "13px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {data.nombre}
    </td>
    <td
      style={{
        padding: "10px 14px",
        fontWeight: "700",
        fontSize: "13px",
        textAlign: "right",
        color: "#a8d4f5",
        whiteSpace: "nowrap",
      }}
    >
      {formatPrecioARS(data.precioRubro)}
    </td>
  </tr>
);

const SubrubroHeader = ({ data }) => (
  <tr style={{ backgroundColor: "#e8edf5", borderLeft: "3px solid #1e3a5f" }}>
    <td
      colSpan={11}
      style={{
        padding: "7px 14px 7px 28px",
        fontWeight: "600",
        fontSize: "12px",
        color: "#1e3a5f",
        textTransform: "uppercase",
        letterSpacing: "0.3px",
      }}
    >
      {data.subrubroId && <span style={{ marginRight: 8, opacity: 0.6 }}>{data.subrubroId}</span>}
      {data.nombre}
    </td>
  </tr>
);

export function TabPresupuesto({ proyecto, iccFactor, addItems, updateItem, updateProyecto, removeItem, preciosActualizados, BASE }) {
  const { orgId } = useAuth();
  const [search, setSearch] = useState("");
  const [showSelector, setShowSelector] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customItem, setCustomItem] = useState({ desc: "", um: "UN", cantPresup: "1", precioCustom: "" });
  const [expandedItem, setExpandedItem] = useState(null);
  const [precioDiag, setPrecioDiag] = useState({});
  const [precioApplied, setPrecioApplied] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [uocraRates, setUocraRates] = useState(() => ({ ...UOCRA_RATES_DEFAULT }));
  const [showUocraModal, setShowUocraModal] = useState(false);
  const [uocraForm, setUocraForm] = useState(() => ({ ...UOCRA_RATES_DEFAULT }));
  const [sugRendLoading, setSugRendLoading] = useState(false);
  const [sugRendError, setSugRendError] = useState(null);
  const [sugRendRows, setSugRendRows] = useState(null);
  const [sugRendSelected, setSugRendSelected] = useState(() => new Set());
  const [sugRendOk, setSugRendOk] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rates = await getUocraRates(orgId);
      if (!cancelled) setUocraRates(rates);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const iccPct = proyecto.iccPct ?? proyecto.icc ?? 0;

  const total = proyecto.items.reduce((s, i) => s + i.cantPresup * (i.precioCustom ?? precioVigente(i.baseCodigo ?? i.codigo, i.precioBase, preciosActualizados)) * iccFactor, 0);

  const totalMoUocraPresupuesto = useMemo(() => {
    let s = 0;
    for (const it of proyecto.items || []) {
      const v = moUocraItemOficialAyudanteIcc(it, uocraRates, iccPct);
      if (v != null) s += v;
    }
    return s;
  }, [proyecto.items, uocraRates, iccPct]);

  const totalMaterialesEstimado = total - totalMoUocraPresupuesto;

  const itemsSinRendimientos = useMemo(
    () =>
      (proyecto.items || []).filter(
        (it) => it.rendimientos === null || it.rendimientos === undefined
      ),
    [proyecto.items]
  );

  function exportarExcel() {
    const fecha = new Date().toLocaleDateString("es-AR");
    const iccPct = ((iccFactor - 1) * 100).toFixed(0);
    const encabezado = [["Obra", proyecto.nombre || "", "Código", proyecto.codigo || "", "Fecha", fecha, "ICC", `${iccPct}%`]];
    const cols = ["Código", "Descripción", "UM", "Cantidad", "Precio Base", "Precio Custom", "Precio Final+ICC", "Subtotal"];
    const filas = proyecto.items.map((i) => {
      const codigoBase = i.baseCodigo ?? i.codigo;
      const pBase = precioVigente(codigoBase, i.precioBase, preciosActualizados);
      const precio = i.precioCustom ?? pBase;
      const precioFinal = precio * iccFactor;
      const subtotal = (i.cantPresup ?? 0) * precioFinal;
      return [i.codigo, i.desc ?? "", i.um ?? "UN", i.cantPresup ?? 0, pBase, i.precioCustom ?? "", precioFinal, subtotal];
    });
    const aoa = [...encabezado, cols, ...filas, ["TOTAL PRESUPUESTO", "", "", "", "", "", "", total]];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Presupuesto");
    XLSX.writeFile(wb, `Presupuesto_${(proyecto.codigo || "obra").replace(/\s+/g, "_")}.xlsx`);
  }

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
  const itemsForHierarchy = filtered.map((item) => {
    const codigoBase = item.baseCodigo ?? item.codigo;
    const pVigente = precioVigente(codigoBase, item.precioBase, preciosActualizados);
    const precio = item.precioCustom ?? pVigente;
    const precioFinal = precio * iccFactor;
    const subtotal = (item.cantPresup ?? 0) * precioFinal;
    return { ...item, subtotal };
  });

  async function analizarConIA() {
    setAiError(null);
    setAiAnalysis(null);
    setAiLoading(true);
    try {
      const rows = flattenWithHeaders(itemsForHierarchy).filter((r) => r.type === "item");
      const itemsPayload = rows.map((item) => {
        const codigoBase = item.baseCodigo ?? item.codigo;
        const pVigente = precioVigente(codigoBase, item.precioBase, preciosActualizados);
        const precio = item.precioCustom ?? pVigente;
        const precioFinal = precio * iccFactor;
        return {
          codigo: item.codigo,
          desc: item.desc ?? item.descripcion ?? "",
          cantPresup: item.cantPresup ?? 0,
          consumidoReal: item.consumidoReal ?? 0,
          precioFinal,
        };
      });

      const proyectoCtx = {
        id: proyecto.id,
        nombre: proyecto.nombre,
        codigo: proyecto.codigo,
        cliente: proyecto.cliente,
      };
      const iccPct = proyecto.iccPct ?? proyecto.icc;

      const itemChunks = chunkItems(itemsPayload, ITEMS_IA_CHUNK);
      const partes = [];

      for (let i = 0; i < itemChunks.length; i++) {
        const chunk = itemChunks[i];
        const payloadJson = JSON.stringify(
          { proyecto: proyectoCtx, items: chunk, iccPct },
          null,
          2
        );
        const userContent =
          itemChunks.length > 1
            ? `Parte ${i + 1} de ${itemChunks.length} (solo estos ítems). Datos JSON:\n\n${payloadJson}\n\nRedactá el análisis según las instrucciones del sistema aplicando solo a los ítems listados.`
            : `Datos para el análisis (JSON):\n\n${payloadJson}\n\nRedactá el análisis completo según las instrucciones del sistema.`;

        const res = await fetch("/.netlify/functions/agent-presupuesto", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ proyecto: proyectoCtx, items: chunk, iccPct }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setAiError(data.error ? `Análisis: ${data.error}` : `Error ${res.status}`); return; }
        partes.push(data.analysis || "");
      }

      setAiAnalysis(partes.join("\n\n─────────────────\n\n"));
    } catch (e) {
      setAiError(e?.message || "Error al analizar");
    } finally {
      setAiLoading(false);
    }
  }

  async function guardarUocraModal() {
    try {
      const merged = await saveUocraRates(orgId, {
        vigencia: String(uocraForm.vigencia ?? "").trim() || UOCRA_RATES_DEFAULT.vigencia,
        zona: String(uocraForm.zona ?? "").trim() || UOCRA_RATES_DEFAULT.zona,
        oficial_hora: Number(uocraForm.oficial_hora) || 0,
        medioOficial_hora: Number(uocraForm.medioOficial_hora) || 0,
        ayudante_hora: Number(uocraForm.ayudante_hora) || 0,
        fuenteUrl: uocraRates.fuenteUrl || UOCRA_RATES_DEFAULT.fuenteUrl,
      });
      setUocraRates(merged);
      setShowUocraModal(false);
    } catch (e) {
      console.error(e);
    }
  }

  function sugerirRendimientosEnBackground(items) {
    return new Promise((resolve, reject) => {
      const jobId = "job-" + Date.now();
      fetch("/.netlify/functions/agent-rendimientos-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, jobId, items }),
      }).catch(() => {});
      const jobRef = doc(db, "orgs", orgId, "jobs", jobId);
      const unsub = onSnapshot(jobRef, (snap) => {
        const j = snap.data();
        if (!j) return;
        if (j.estado === "listo") {
          unsub();
          let parsed = null;
          try { parsed = JSON.parse(j.resultado || "{}"); } catch (_) {}
          resolve(parsed && Array.isArray(parsed.rendimientos) ? parsed.rendimientos : []);
        } else if (j.estado === "error") {
          unsub();
          reject(new Error(j.detalle || "Error en el especialista de rendimientos"));
        }
      }, (err) => { unsub(); reject(err); });
    });
  }

  async function sugerirRendimientos() {
    setSugRendError(null);
    setSugRendOk(null);
    setSugRendRows(null);
    setSugRendSelected(new Set());
    if (itemsSinRendimientos.length === 0) {
      setSugRendError("No hay ítems sin rendimientos (solo se considera sin datos cuando rendimientos es null o undefined).");
      return;
    }
    setSugRendLoading(true);
    try {
      const baseCentral = await getRendimientos(orgId);
      let workingItems = (proyecto.items || []).map((i) => ({ ...i }));
      let aplicadosDesdeBase = 0;
      for (let idx = 0; idx < workingItems.length; idx++) {
        const it = workingItems[idx];
        if (it.rendimientos !== null && it.rendimientos !== undefined) continue;
        const desc = it.desc ?? it.descripcion ?? "";
        const key = normalizeRendimientosDescKey(desc);
        const entry = baseCentral[key];
        if (entry?.rendimientos && typeof entry.rendimientos === "object") {
          workingItems[idx] = { ...it, rendimientos: { ...entry.rendimientos } };
          aplicadosDesdeBase += 1;
        }
      }
      if (aplicadosDesdeBase > 0 && updateProyecto) {
        updateProyecto(proyecto.id, { items: workingItems });
        console.log(
          `[Sugerir Rendimientos] Aplicados desde base centralizada: ${aplicadosDesdeBase} ítem(s) (clave por descripción)`
        );
      }

      const stillNeeding = workingItems.filter(
        (it) => it.rendimientos === null || it.rendimientos === undefined
      );
      if (stillNeeding.length === 0) {
        console.log("[Sugerir Rendimientos] Todos los ítems resueltos desde base centralizada; no se llama a la IA.");
        return;
      }

      const toProcess = stillNeeding.map((i) => ({
        codigo: i.codigo,
        desc: i.desc ?? i.descripcion ?? "",
        um: i.um ?? "UN",
      }));

      const arr = await sugerirRendimientosEnBackground(toProcess);
      const acc = [];
      for (const r of arr) {
        if (r && r.codigo != null && String(r.codigo).trim() !== "") acc.push(r);
      }
      const byCodigo = new Map();
      for (const r of acc) {
        const c = String(r.codigo ?? "").trim();
        if (c) byCodigo.set(c, r);
      }
      const merged = [...byCodigo.values()];
      if (merged.length === 0) {
        setSugRendError("No se obtuvieron rendimientos en la respuesta.");
        return;
      }
      setSugRendRows(merged);
      setSugRendSelected(new Set(merged.map((r) => String(r.codigo ?? "").trim()).filter(Boolean)));
    } catch (e) {
      setSugRendError(e?.message || "Error al sugerir rendimientos");
    } finally {
      setSugRendLoading(false);
    }
  }

  async function aplicarRendimientosSeleccionados() {
    if (!sugRendRows || !updateProyecto) return;
    const rendByCodigo = new Map();
    for (const r of sugRendRows) {
      const cod = String(r.codigo ?? "").trim();
      if (!cod || !sugRendSelected.has(cod)) continue;
      rendByCodigo.set(cod, {
        oficial_h: Number(r.oficial_h) || 0,
        ayudante_h: Number(r.ayudante_h) || 0,
        tipo: String(r.tipo || "sugerido_ia"),
        fuente: String(r.fuente || ""),
      });
    }
    if (rendByCodigo.size === 0) return;

    console.log("[Sugerir Rendimientos] Aplicar antes de guardar", {
      proyectoId: proyecto.id,
      codigos: [...rendByCodigo.keys()],
      itemsEnProyecto: (proyecto.items || []).length,
    });

    const newItems = (proyecto.items || []).map((i) => {
      const k = String(i.codigo ?? "").trim();
      const rend = rendByCodigo.get(k);
      if (!rend) return i;
      return { ...i, rendimientos: rend };
    });

    updateProyecto(proyecto.id, { items: newItems });

    console.log("[Sugerir Rendimientos] Aplicar después de guardar (updateProyecto → persistencia vía choix_proyectos)", {
      proyectoId: proyecto.id,
      codigosAplicados: [...rendByCodigo.keys()],
      totalItems: newItems.length,
    });

    const nuevosParaBase = {};
    for (const r of sugRendRows) {
      const cod = String(r.codigo ?? "").trim();
      if (!cod || !sugRendSelected.has(cod)) continue;
      const desc = String(r.desc ?? "").trim();
      const key = normalizeRendimientosDescKey(desc);
      if (!key) continue;
      nuevosParaBase[key] = {
        codigo: cod,
        rendimientos: {
          oficial_h: Number(r.oficial_h) || 0,
          ayudante_h: Number(r.ayudante_h) || 0,
          tipo: String(r.tipo || "sugerido_ia"),
          fuente: String(r.fuente || ""),
        },
      };
    }
    try {
      if (Object.keys(nuevosParaBase).length > 0) {
        await upsertRendimientos(orgId, nuevosParaBase);
        console.log(`Guardando en base centralizada: ${Object.keys(nuevosParaBase).length} rendimientos`);
      }
    } catch (e) {
      console.error("Error guardando rendimientos aprendidos:", e);
    }

    setSugRendOk(`✅ Se aplicaron ${rendByCodigo.size} rendimiento(s). Ya se reflejan en la mano de obra de los ítems.`);
    setSugRendRows(null);
    setSugRendSelected(new Set());
  }

  function toggleSugRendCodigo(codigo) {
    setSugRendSelected((prev) => {
      const next = new Set(prev);
      const c = String(codigo);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function seleccionarTodosSugRend(todos) {
    if (!sugRendRows) return;
    if (todos) {
      setSugRendSelected(new Set(sugRendRows.map((r) => String(r.codigo ?? "").trim()).filter(Boolean)));
    } else {
      setSugRendSelected(new Set());
    }
  }

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
        <button
          type="button"
          style={S.btn("", true)}
          onClick={() => {
            setUocraForm({ ...uocraRates });
            setShowUocraModal(true);
          }}
        >
          ⚙️ TASAS UOCRA
        </button>
        <span style={{ marginLeft: "auto", fontWeight: 700, color: COLORS.gold, fontSize: "14px" }}>{ars(total)}</span>
        <button style={S.btn()} onClick={exportarExcel} disabled={proyecto.items.length === 0}>📥 EXPORTAR EXCEL</button>
        <button style={S.btn("", true)} type="button" onClick={analizarConIA} disabled={proyecto.items.length === 0 || aiLoading}>
          {aiLoading ? "Analizando..." : "🤖 Analizar con IA"}
        </button>
        <button
          type="button"
          style={S.btn("", true)}
          onClick={sugerirRendimientos}
          disabled={proyecto.items.length === 0 || itemsSinRendimientos.length === 0 || sugRendLoading}
          title={
            itemsSinRendimientos.length === 0
              ? "Todos los ítems ya tienen rendimientos"
              : `${itemsSinRendimientos.length} ítem(s) sin rendimientos`
          }
        >
          {sugRendLoading ? "Sugiriendo…" : "👷 Sugerir Rendimientos"}
        </button>
      </div>
      <div style={{ fontSize: "10px", color: COLORS.muted, marginBottom: "12px", lineHeight: 1.45 }}>
        <span>
          MO UOCRA ref. {uocraRates.vigencia} · zona {uocraRates.zona} · Of. ${uocraRates.oficial_hora}/h · Medio of. ${uocraRates.medioOficial_hora}/h · Ayud. ${uocraRates.ayudante_hora}/h ·{" "}
          <a href={uocraRates.fuenteUrl} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.gold }}>
            fuente
          </a>
        </span>
        {totalMoUocraPresupuesto > 0 && (
          <span style={{ marginLeft: "10px", color: COLORS.text }}>
            Σ MO rendimientos: <strong style={{ color: COLORS.gold }}>{ars(totalMoUocraPresupuesto)}</strong>
          </span>
        )}
      </div>

      {(sugRendError || sugRendRows || sugRendOk) && (
        <div
          style={{
            background: COLORS.subtle,
            border: `1px solid ${COLORS.border}`,
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontWeight: 700, color: COLORS.gold, fontSize: "13px", marginBottom: "8px" }}>Revisión — rendimientos sugeridos</div>
          {sugRendError && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: sugRendRows ? "10px" : 0 }}>
              <div style={{ color: COLORS.rojo, fontSize: "12px", flex: 1 }}>{sugRendError}</div>
              {!sugRendRows && (
                <button type="button" style={S.btn("", true)} onClick={() => setSugRendError(null)}>
                  Cerrar
                </button>
              )}
            </div>
          )}
          {sugRendOk && (
            <div style={{ color: "#5dcaa5", fontSize: 13, marginTop: 8 }}>{sugRendOk}</div>
          )}
          {sugRendRows && sugRendRows.length > 0 && (
            <>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
                <label style={{ fontSize: "11px", color: COLORS.text, display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="checkbox"
                    checked={sugRendSelected.size === sugRendRows.length && sugRendRows.length > 0}
                    onChange={(e) => seleccionarTodosSugRend(e.target.checked)}
                    style={{ accentColor: COLORS.gold }}
                  />
                  Seleccionar todos
                </label>
                <button type="button" style={S.btn("gold", true)} onClick={aplicarRendimientosSeleccionados} disabled={sugRendSelected.size === 0}>
                  Aplicar seleccionados
                </button>
                <button
                  type="button"
                  style={S.btn("", true)}
                  onClick={() => {
                    setSugRendRows(null);
                    setSugRendSelected(new Set());
                    setSugRendError(null);
                  }}
                >
                  Cerrar
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}`, color: COLORS.muted, textAlign: "left" }}>
                      <th style={{ padding: "6px", width: "36px" }} />
                      <th style={{ padding: "6px" }}>Código</th>
                      <th style={{ padding: "6px", minWidth: "160px" }}>Descripción</th>
                      <th style={{ padding: "6px" }}>UM</th>
                      <th style={{ padding: "6px", textAlign: "right" }}>Oficial h/u</th>
                      <th style={{ padding: "6px", textAlign: "right" }}>Ayudante h/u</th>
                      <th style={{ padding: "6px" }}>Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sugRendRows.map((r) => {
                      const cod = String(r.codigo ?? "").trim();
                      const um =
                        proyecto.items.find((it) => it.codigo === cod)?.um ?? r.um ?? "—";
                      return (
                        <tr key={cod} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={{ padding: "6px" }}>
                            <input
                              type="checkbox"
                              checked={sugRendSelected.has(cod)}
                              onChange={() => toggleSugRendCodigo(cod)}
                              style={{ accentColor: COLORS.gold }}
                            />
                          </td>
                          <td style={{ padding: "6px", color: COLORS.muted, whiteSpace: "nowrap" }}>{cod}</td>
                          <td style={{ padding: "6px", color: COLORS.text }}>{r.desc ?? "—"}</td>
                          <td style={{ padding: "6px", color: COLORS.muted }}>{um}</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>{typeof r.oficial_h === "number" ? r.oficial_h.toFixed(2) : Number(r.oficial_h) || "—"}</td>
                          <td style={{ padding: "6px", textAlign: "right" }}>{typeof r.ayudante_h === "number" ? r.ayudante_h.toFixed(2) : Number(r.ayudante_h) || "—"}</td>
                          <td style={{ padding: "6px", color: COLORS.muted, fontSize: "10px" }}>{r.fuente ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

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
        <>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Código", "Descripción", "UM", "Cant. Presup.", "P. Base", "P. Custom", "P. Final+ICC", "MO", "Consumido", "Semáf.", ""].map((h) => (
                  <th key={h} style={{ ...S.th, ...(h === "Descripción" ? { minWidth: "200px", width: "200px" } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flattenWithHeaders(itemsForHierarchy).map((row, idx) => {
                if (row.type === "rubro") return <RubroHeader key={`rubro-${row.rubroId}-${idx}`} data={row} />;
                if (row.type === "subrubro") return <SubrubroHeader key={`sub-${row.subrubroId}-${idx}`} data={row} />;

                const item = row;
                const codigoBase = item.baseCodigo ?? item.codigo;
                const pVigente = precioVigente(codigoBase, item.precioBase, preciosActualizados);
                const precio = item.precioCustom ?? pVigente;
                const precioFinal = precio * iccFactor;
                const subtotal = (item.cantPresup ?? 0) * precioFinal;
                const sem = semaforo(item.consumidoReal, item.cantPresup);
                const tieneActualizacion = codigoBase && preciosActualizados?.[codigoBase]?.length > 0;
                const isExpanded = expandedItem === item.codigo;
                const mi = item.matchInfo;
                const moItem = moUocraItemOficialAyudanteIcc(item, uocraRates, iccPct);

                return (
                  <Fragment key={item.codigo || idx}>
                    <tr>
                      <td style={{ ...S.td, color: COLORS.muted, fontSize: "11px", whiteSpace: "nowrap", paddingLeft: "40px" }}>{item.codigo}</td>
                      <td
                        style={{ ...S.td, minWidth: "200px", width: "200px", cursor: "pointer", userSelect: "none" }}
                        onClick={() => setExpandedItem(isExpanded ? null : item.codigo)}
                        title="Click para ver info de matching"
                      >
                        <div style={{ fontSize: "12px", color: COLORS.text }}>{item.desc || item.descripcion || "—"}</div>
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
                    <td style={{ ...S.td, textAlign: "right", fontSize: "11px", color: moItem != null ? COLORS.text : COLORS.muted, whiteSpace: "nowrap" }}>
                      {moItem != null ? ars(moItem) : "—"}
                    </td>
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
                  {isExpanded && (
                    <tr>
                      <td colSpan={11} style={{ ...S.td, padding: "8px 12px", verticalAlign: "top", borderBottom: `1px solid ${COLORS.border}` }}>
                        <div
                          style={{
                            background: COLORS.subtle,
                            borderLeft: `4px solid ${mi?.matched ? COLORS.verde : mi && !mi.matched ? COLORS.rojo : COLORS.muted}`,
                            padding: "8px 12px",
                            fontSize: "11px",
                            color: COLORS.text,
                          }}
                        >
                          <div style={{ marginBottom: (!mi || !mi.matched || item.precioBase === 0) && !item.esCustom ? "6px" : 0 }}>
                            {mi?.matched
                              ? `✅ Matcheó con ${mi.baseCodigo ?? ""} - ${mi.baseDesc ?? ""} (${(mi.palabrasMatch || []).length} palabras coincidentes: ${(mi.palabrasMatch || []).join(", ")})`
                              : mi && !mi.matched
                              ? ((mi.palabrasBuscadas || []).length === 0
                                  ? "✏️ Ítem importado del documento — sin matching automático con la base"
                                  : `❌ Sin match. Palabras buscadas: ${(mi.palabrasBuscadas || []).join(", ")}. Mejor candidato: ${mi.mejorCandidato ?? ""} (${mi.overlapMejor ?? 0} coincidencias, mínimo requerido: ${mi.minRequerido ?? 0})`)
                              : "✏️ Ítem custom - sin matching automático"}
                          </div>
                          {item.rendimientos && (
                            <div style={{ marginTop: "8px", borderTop: `1px solid ${COLORS.border}`, paddingTop: "8px" }}>
                              <div style={{ fontWeight: 600, color: COLORS.verde, marginBottom: "4px", fontSize: "11px" }}>
                                📐 Rendimientos Chandías — {(item.rendimientos.tipo || "").replace(/_/g, " ")}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {Object.entries(item.rendimientos)
                                  .filter(([k]) => k !== "tipo" && k !== "nota")
                                  .map(([k, v]) => (
                                    <span
                                      key={k}
                                      style={{
                                        background: "#0d1f17",
                                        border: "1px solid #1e3a2a",
                                        borderRadius: "4px",
                                        padding: "2px 8px",
                                        fontSize: "10px",
                                        color: k.includes("oficial") || k.includes("ayudante") ? COLORS.gold : COLORS.text,
                                      }}
                                    >
                                      {k.replace(/_/g, " ")}: <strong>{typeof v === "number" ? v.toFixed(2) : String(v)}</strong>
                                    </span>
                                  ))}
                              </div>
                              {(() => {
                                const r = item.rendimientos;
                                const cant = Number(item.cantPresup ?? 0) || 0;
                                const oficial_h = r?.oficial_h;
                                const ayudante_h = r?.ayudante_h;
                                const medio_h = r?.medio_oficial_h ?? r?.medioOficial_h;
                                const o = Number(r?.oficial_h) || 0;
                                const a = Number(r?.ayudante_h) || 0;
                                const iccPct = proyecto.iccPct ?? proyecto.icc ?? 0;
                                const baseMoSinIcc = (o * uocraRates.oficial_hora + a * uocraRates.ayudante_hora) * cant;
                                const moUocra = baseMoSinIcc * (1 + iccPct / 100);
                                const parts = [];
                                if (typeof oficial_h === "number") parts.push(`Oficial: ${(oficial_h * cant).toFixed(2)}h`);
                                if (typeof medio_h === "number") parts.push(`Medio oficial: ${(medio_h * cant).toFixed(2)}h`);
                                if (typeof ayudante_h === "number") parts.push(`Ayudante: ${(ayudante_h * cant).toFixed(2)}h`);
                                if (parts.length === 0 && o === 0 && a === 0) return null;
                                return (
                                  <div style={{ marginTop: "4px", fontSize: "10px", color: COLORS.muted }}>
                                    {parts.length > 0 && (
                                      <div>
                                        Por {item.um} · Cant: {cant} → {parts.join(" · ")}
                                      </div>
                                    )}
                                    {(o > 0 || a > 0) && (
                                      <div style={{ marginTop: parts.length > 0 ? "4px" : 0, color: COLORS.text }}>
                                        MO UOCRA: <strong style={{ color: COLORS.gold }}>{ars(moUocra)}</strong>
                                        <span style={{ color: COLORS.muted }}>
                                          {" "}
                                          (Oficial {(o * cant).toFixed(2)}h × ${uocraRates.oficial_hora} + Ayudante {(a * cant).toFixed(2)}h × $
                                          {uocraRates.ayudante_hora} = {ars(baseMoSinIcc)} sin ICC
                                          {iccPct !== 0 ? ` · ICC ${iccPct}% incl.` : ""})
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {!item.esCustom && ((!mi || !mi.matched) || (item.precioBase ?? 0) === 0) && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                              <input
                                type="number"
                                placeholder="Precio unitario $"
                                style={{ ...S.input, width: "140px", textAlign: "right" }}
                                value={precioDiag[item.codigo] ?? ""}
                                onChange={(e) =>
                                  setPrecioDiag((prev) => ({
                                    ...prev,
                                    [item.codigo]: e.target.value,
                                  }))
                                }
                              />
                              <button
                                style={S.btn("gold", true)}
                                onClick={() => {
                                  const raw = precioDiag[item.codigo];
                                  const val = raw === "" || raw == null ? NaN : parseFloat(raw);
                                  if (!isNaN(val) && val >= 0) {
                                    updateItem(item.codigo, { precioCustom: val });
                                    setPrecioApplied(item.codigo);
                                    setTimeout(() => setPrecioApplied((prev) => (prev === item.codigo ? null : prev)), 2000);
                                  }
                                }}
                              >
                                Aplicar precio
                              </button>
                              {precioApplied === item.codigo && (
                                <span style={{ fontSize: "11px", color: COLORS.verde }}>✅ Precio aplicado</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={11} style={{ ...S.td, padding: "12px 8px", background: COLORS.subtle, borderTop: `1px solid ${COLORS.border}`, fontSize: "12px", color: COLORS.text, lineHeight: 1.6 }}>
                  <div>💰 Materiales: <strong>{ars(totalMaterialesEstimado)}</strong></div>
                  <div>
                    👷 Mano de Obra UOCRA: <strong style={{ color: COLORS.gold }}>{ars(totalMoUocraPresupuesto)}</strong>
                    <span style={{ color: COLORS.muted, fontSize: "10px", marginLeft: "6px" }}>(solo ítems con rendimientos)</span>
                  </div>
                  <div>
                    📊 Total con MO: <strong style={{ color: COLORS.gold, fontSize: "14px" }}>{ars(total)}</strong>
                  </div>
                </td>
              </tr>
              <tr style={{ borderTop: `2px solid ${COLORS.border}` }}>
                <td colSpan={6} style={{ ...S.td, fontWeight: 700, color: COLORS.muted, fontSize: "11px", textAlign: "right", paddingTop: "12px" }}>TOTAL PRESUPUESTO</td>
                <td style={{ ...S.td, fontWeight: 800, color: COLORS.gold, fontSize: "15px", paddingTop: "12px", whiteSpace: "nowrap" }}>{ars(proyecto.items.reduce((s, i) => s + (i.cantPresup ?? 0) * (i.precioCustom ?? precioVigente(i.baseCodigo ?? i.codigo, i.precioBase, preciosActualizados)) * iccFactor, 0))}</td>
                <td style={{ ...S.td, fontWeight: 700, color: COLORS.text, fontSize: "12px", paddingTop: "12px", textAlign: "right", whiteSpace: "nowrap" }}>{ars(totalMoUocraPresupuesto)}</td>
                <td style={S.td} />
                <td colSpan={2} style={S.td} />
              </tr>
            </tfoot>
          </table>
        </div>
        {(aiAnalysis !== null || aiError !== null) && (
          <div
            style={{
              marginTop: "16px",
              padding: "14px 40px 14px 14px",
              borderRadius: "8px",
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              position: "relative",
            }}
          >
            <button
              type="button"
              style={{ ...S.btn("red", true), padding: "2px 8px", position: "absolute", top: "10px", right: "10px" }}
              onClick={() => {
                setAiAnalysis(null);
                setAiError(null);
              }}
            >
              ✕
            </button>
            {aiError ? (
              <div style={{ color: COLORS.rojo, fontSize: "12px" }}>{aiError}</div>
            ) : (
              <div style={{ whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: 1.55 }}>{aiAnalysis}</div>
            )}
          </div>
        )}
        </>
      )}

      {showUocraModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="uocra-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowUocraModal(false)}
        >
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: "10px",
              padding: "20px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div id="uocra-modal-title" style={{ fontWeight: 800, fontSize: "16px", color: COLORS.gold, marginBottom: "16px" }}>
              Tasas UOCRA - Mano de Obra
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={S.label}>Vigencia (ej: 2026-02)</label>
                <input style={S.input} value={uocraForm.vigencia ?? ""} onChange={(e) => setUocraForm((f) => ({ ...f, vigencia: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Zona (ej: A)</label>
                <input style={S.input} value={uocraForm.zona ?? ""} onChange={(e) => setUocraForm((f) => ({ ...f, zona: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Oficial $/hora</label>
                <input
                  style={S.input}
                  type="number"
                  min={0}
                  value={uocraForm.oficial_hora ?? ""}
                  onChange={(e) => setUocraForm((f) => ({ ...f, oficial_hora: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>
              <div>
                <label style={S.label}>Medio Oficial $/hora</label>
                <input
                  style={S.input}
                  type="number"
                  min={0}
                  value={uocraForm.medioOficial_hora ?? ""}
                  onChange={(e) => setUocraForm((f) => ({ ...f, medioOficial_hora: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>
              <div>
                <label style={S.label}>Ayudante $/hora</label>
                <input
                  style={S.input}
                  type="number"
                  min={0}
                  value={uocraForm.ayudante_hora ?? ""}
                  onChange={(e) => setUocraForm((f) => ({ ...f, ayudante_hora: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>
              <div style={{ fontSize: "11px", color: COLORS.muted }}>
                Fuente:{" "}
                <a href="https://www.uocra.org" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.gold }}>
                  uocra.org
                </a>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px" }}>
              <button type="button" style={S.btn("", true)} onClick={() => setShowUocraModal(false)}>
                Cancelar
              </button>
              <button type="button" style={S.btn("gold", true)} onClick={guardarUocraModal}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
