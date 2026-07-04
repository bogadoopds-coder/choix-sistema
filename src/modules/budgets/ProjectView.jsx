import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { ars } from "../../utils/format";
import { precioVigente, semaforo } from "../../utils/budgets";
import { COLORS, S } from "../../styles/theme";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { TabPresupuesto } from "./components/TabPresupuesto";
import { TabSemaforo } from "./components/TabSemaforo";
import { TabIA } from "./components/TabIA";
import { TabConfig } from "./components/TabConfig";

// ─── Detección y parseo inteligente de Excel de cómputo (usado por TabIA) ───
const IGNORAR_FILAS_COMUTO = new Set([
  "subtotal", "total", "planilla resumen", "plan de trabajo", "plan de trabajos",
  "if-20", "if-2023", "digitally signed", "firma", "pagina", "página", "gde ", "series1",
  "% de avance", "% incidencia", "monto de inversión", "honorarios",
]);

function detectarFormatoCómputo(wb) {
  if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) return false;
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return false;
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let indicadores = 0;
  const flat = aoa.slice(0, 15).flatMap((row) => (Array.isArray(row) ? row : [row]).map((c) => String(c ?? "").toLowerCase()));
  if (flat.some((c) => /computo|presupuesto|designacion/.test(c))) indicadores++;
  if (flat.some((c) => /unid|cant|precio|^\s*um\s*$|monto/.test(c))) indicadores++;
  const hasRubro = aoa.slice(0, 30).some((row) => {
    const arr = Array.isArray(row) ? row : [row];
    const a = arr[0];
    const n = typeof a === "number" ? a : parseFloat(String(a).replace(",", "."));
    const b = String(arr[1] ?? "").trim();
    if (Number.isInteger(n) && n >= 1 && n <= 200 && b.length > 0 && b.length < 80) return true;
    const dot = String(a).trim();
    if (/^\d+\.\d+$/.test(dot) && b.length > 2) return true;
    return false;
  });
  if (hasRubro) indicadores++;
  return indicadores >= 2;
}

const IGNORAR_DESC_COMUTO = /SUBTOTAL|TOTAL|PLANILLA|IF-20|Digitally|FIRMA|página|GDE|Series|% de avance|Monto de Inversión|HONORARIOS|Precio por m2/i;
const UM_REGEX = /^(m2|m²|m3|m³|ml|u|un|kg|tn|gl|dia|mes|nº|n°)$/i;

function parseComputeInteligente(wb) {
  const lineas = [];
  const rubros = [];
  const items = [];
  let currentRubroName = "";
  let currentRubroNum = "";

  for (const sname of wb.SheetNames || []) {
    const ws = wb.Sheets[sname];
    if (!ws) continue;
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (aoa.length < 2) continue;

    let pendiente = null;
    let currentSubRubro = "";

    for (let r = 0; r < aoa.length; r++) {
      const row = Array.isArray(aoa[r]) ? aoa[r] : [];
      const colA = String(row[0] ?? "").trim();
      const colB = String(row[1] ?? "").trim();
      let descRaw = String(row[2] ?? "").trim();
      if (!descRaw && (/^\d+\.\d+/.test(colA) || /^\d+$/.test(colB))) {
        descRaw = String(row[1] ?? "").trim();
      }
      const descClean = descRaw.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

      if (!descClean || descClean.length <= 3) continue;
      if (IGNORAR_DESC_COMUTO.test(descClean)) continue;

      let colUm = -1;
      let unidad = "";
      for (let c = 8; c <= 11; c++) {
        const v = String(row[c] ?? "").trim().replace(/\s/g, "");
        if (UM_REGEX.test(v)) {
          colUm = c;
          unidad = v;
          break;
        }
      }
      let cantidad = 0;
      if (colUm >= 0 && row[colUm + 1] != null) {
        const v = row[colUm + 1];
        const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
        if (Number.isFinite(n)) cantidad = n;
      }
      let precio = 0;
      for (let c = 11; c <= 14; c++) {
        const v = row[c];
        const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
        if (Number.isFinite(n) && n > 0 && n !== cantidad) {
          precio = n;
          break;
        }
      }

      const tieneNumero = /^\d+\.\d+/.test(colA) || /^\d+$/.test(colB);

      if (pendiente) {
        if (unidad && cantidad > 0) {
          const descCompleta = (pendiente.desc + " " + descClean).trim();
          const descEscaped = descCompleta.replace(/,/g, " ");
          items.push({ numero: pendiente.numero, desc: descCompleta, unidad, cantidad, precio });
          lineas.push(`${pendiente.numero},${descEscaped},${unidad},${cantidad},${precio}`);
          pendiente = null;
          continue;
        }
        if (tieneNumero) pendiente = null;
      }

      if (/^\d+$/.test(colA)) {
        currentRubroName = descClean;
        currentRubroNum = colA;
        rubros.push(currentRubroName);
        lineas.push("RUBRO: " + currentRubroName);
        continue;
      }

      if (/^\d+\.\d+$/.test(colA) && descClean.length < 50 && /[A-ZÁÉÍÓÚÑ]/.test(descClean) && !unidad && cantidad <= 0) {
        currentSubRubro = descClean;
        continue;
      }
      if (tieneNumero && (!unidad || cantidad <= 0)) {
        const numero = /^\d+\.\d+/.test(colA) ? colA : (currentRubroNum ? currentRubroNum + "." + colB : colB);
        pendiente = { numero, desc: descClean };
        continue;
      }

      if (!tieneNumero || !unidad || cantidad <= 0) continue;

      const numero = /^\d+\.\d+/.test(colA) ? colA : (currentRubroNum ? currentRubroNum + "." + colB : colB);
      const descEscaped = descClean.replace(/,/g, " ");
      items.push({ numero, desc: descClean, unidad, cantidad, precio });
      lineas.push(`${numero},${descEscaped},${unidad},${cantidad},${precio}`);
    }
  }

  if (typeof console !== "undefined" && console.log) {
    console.log("[Excel cómputo] Total rubros:", rubros.length, "| Total ítems:", items.length);
    console.log("[Excel cómputo] Primeros 10 ítems:", items.slice(0, 10).map((i) => ({ ...i })));
  }
  return lineas.join("\n");
}

// ─── VISTA PROYECTO (orquestador) ────────────────────────────────────────────
export default function ProjectView({ proyecto, updateProyecto, preciosActualizados, BASE }) {
  const [tab, setTab] = useState("presupuesto");
  const [preciosAprendidos, setPreciosAprendidos] = useState([]);
  const iccFactor = 1 + proyecto.iccPct / 100;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const docRef = doc(db, "configuracion", "preciosAprendidos");
        const snap = await getDoc(docRef);
        if (cancelled) return;
        const data = snap.exists() ? snap.data() : {};
        setPreciosAprendidos(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (!cancelled) console.error("Error cargando precios aprendidos:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function addItems(newItems) {
    const safe = Array.isArray(newItems) ? newItems.filter((i) => i != null && i.codigo != null && String(i.codigo).trim() !== "") : [];
    const existingItems = proyecto.items || [];
    const updatedItems = existingItems.map((existing) => {
      const newItem = safe.find((n) => n.codigo === existing.codigo);
      return newItem ? { ...existing, ...newItem } : existing;
    });
    const brandNewItems = safe.filter((n) => !existingItems.some((e) => e.codigo === n.codigo));
    updateProyecto(proyecto.id, { items: [...updatedItems, ...brandNewItems] });
  }
  function updateItem(codigo, patch) {
    const key = String(codigo ?? "").trim();
    updateProyecto(proyecto.id, {
      items: proyecto.items.map((i) => (String(i.codigo ?? "").trim() === key ? { ...i, ...patch } : i)),
    });
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
        {[["presupuesto", "📋 Presupuesto"], ["semaforo", "🚦 Semáforo"], ["ia", "📄 Leer proyecto"], ["config", "⚙ Config"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...S.btn(tab === t ? "gold" : "", true), borderRadius: "6px 6px 0 0" }}>{l}</button>
        ))}
      </div>

      {tab === "presupuesto" && (
        <TabPresupuesto
          proyecto={proyecto}
          iccFactor={iccFactor}
          addItems={addItems}
          updateItem={updateItem}
          updateProyecto={updateProyecto}
          removeItem={removeItem}
          preciosActualizados={preciosActualizados}
          BASE={BASE}
        />
      )}
      {tab === "semaforo" && <TabSemaforo proyecto={proyecto} iccFactor={iccFactor} updateItem={updateItem} preciosActualizados={preciosActualizados} />}
      {tab === "ia" && <TabIA proyecto={proyecto} addItems={addItems} BASE={BASE} preciosAprendidos={preciosAprendidos} setPreciosAprendidos={setPreciosAprendidos} detectarFormatoCómputo={detectarFormatoCómputo} parseComputeInteligente={parseComputeInteligente} />}
      {tab === "config" && <TabConfig proyecto={proyecto} updateProyecto={updateProyecto} />}
    </div>
  );
}
