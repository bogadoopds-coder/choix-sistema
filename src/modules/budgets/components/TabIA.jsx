import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { uid } from "../../../utils/id";
import { COLORS, S } from "../../../styles/theme";
import { sendChat } from "../../../services/ai/chatClient";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { extraerTextoPDF, parsearTextoPDFProvincial, detectarCómputoEnTexto, buscarEnAprendidos, RUBROS_MAP } from "../utils/parseUtils";
import { findBestBaseMatch, guardarPreciosAprendidos, CHANDIAS_COMPRIMIDO } from "../utils/priceUtils";
import { CHANDIAS_RENDIMIENTOS } from "../../../data/chandiasRendimientos";

export function TabIA({ proyecto, addItems, BASE, preciosAprendidos, setPreciosAprendidos, detectarFormatoCómputo, parseComputeInteligente }) {
  const [pliego, setPliego] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [fileWarning, setFileWarning] = useState("");
  const [usarPreciosPliego, setUsarPreciosPliego] = useState(true);
  const [usarAgente, setUsarAgente] = useState(true);
  const fileRef = useRef(null);

  function pliegoTienePrecios() {
    if (!pliego || typeof pliego !== "string") return false;
    const lines = pliego.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.some((line) => {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 5) return false;
      const n = parseFloat(String(cols[4]).replace(",", "."));
      return Number.isFinite(n) && n > 0;
    });
  }

  function obtenerRendimientosChandias(descripcion, unidad) {
    const desc = descripcion.toLowerCase();
    const ch = CHANDIAS_RENDIMIENTOS;

    // Hormigon armado
    if ((desc.includes("losa") || desc.includes("losa llena") || desc.includes("losa premold")) && unidad === "m3")
      return { ...ch.hormigon_armado_por_m3.materiales_base, ...ch.hormigon_armado_por_m3.losas, tipo: "hormigon_losas" };
    if ((desc.includes("columna") || desc.includes("tronco")) && unidad === "m3")
      return { ...ch.hormigon_armado_por_m3.materiales_base, ...ch.hormigon_armado_por_m3.columnas, tipo: "hormigon_columnas" };
    if ((desc.includes("viga") && !desc.includes("cinta")) && unidad === "m3")
      return { ...ch.hormigon_armado_por_m3.materiales_base, ...ch.hormigon_armado_por_m3.vigas, tipo: "hormigon_vigas" };
    if ((desc.includes("viga cinta") || desc.includes("encadenado") || desc.includes("dintel")) && unidad === "m3")
      return { ...ch.hormigon_armado_por_m3.materiales_base, ...ch.hormigon_armado_por_m3.encadenados, tipo: "hormigon_encadenados" };
    if (desc.includes("tabique") && unidad === "m3")
      return { ...ch.hormigon_armado_por_m3.materiales_base, ...ch.hormigon_armado_por_m3.tabiques, tipo: "hormigon_tabiques" };
    if (desc.includes("escalera") && unidad === "m3")
      return { ...ch.hormigon_armado_por_m3.materiales_base, ...ch.hormigon_armado_por_m3.escalera, tipo: "hormigon_escalera" };
    if ((desc.includes("base") || desc.includes("fundacion") || desc.includes("fundación") || desc.includes("pilotine")) && unidad === "m3")
      return { ...ch.hormigon_armado_por_m3.materiales_base, ...ch.hormigon_armado_por_m3.bases, tipo: "hormigon_bases" };

    // Mamposteria
    if ((desc.includes("ladrillo cerámico") || desc.includes("ceramico")) && desc.includes("18x18x33") && unidad === "m2")
      return { ...ch.mamposteria_por_m2.hueco_18x18x33, tipo: "mamposteria_18x18" };
    if ((desc.includes("ladrillo cerámico") || desc.includes("ceramico")) && desc.includes("12x18x33") && unidad === "m2")
      return { ...ch.mamposteria_por_m2.hueco_12x18x33, tipo: "mamposteria_12x18" };
    if ((desc.includes("ladrillo cerámico") || desc.includes("ceramico")) && desc.includes("8x18x33") && unidad === "m2")
      return { ...ch.mamposteria_por_m2.hueco_8x18x33, tipo: "mamposteria_8x18" };
    if ((desc.includes("ladrillo común") || desc.includes("ladrillo comun")) && unidad === "m3")
      return { ...ch.mamposteria_por_m2.ladrillo_comun_30cm, tipo: "mamposteria_comun" };

    // Revoques
    if ((desc.includes("revoque exterior") || desc.includes("revoque ext")) && unidad === "m2")
      return { litros_mortero: ch.revoques_por_m2.exterior_comun_litros, oficial_h: ch.revoques_por_m2.oficial_h, ayudante_h: ch.revoques_por_m2.ayudante_h, tipo: "revoque_exterior" };
    if ((desc.includes("revoque interior") || desc.includes("revoque int")) && unidad === "m2")
      return { litros_mortero: ch.revoques_por_m2.interior_comun_litros, oficial_h: ch.revoques_por_m2.oficial_h, ayudante_h: ch.revoques_por_m2.ayudante_h, tipo: "revoque_interior" };

    // Contrapisos
    if (desc.includes("contrapiso") && desc.includes("arcilla") && unidad === "m2")
      return { ...ch.contrapisos_por_m2.alivianado_arcilla_expandida, tipo: "contrapiso_arcilla" };
    if (desc.includes("contrapiso") && unidad === "m2")
      return { ...ch.contrapisos_por_m2.sobre_terreno_natural_15cm, tipo: "contrapiso_tn" };
    if (desc.includes("carpeta") && unidad === "m2")
      return { ...ch.contrapisos_por_m2.carpeta_cementicia_3cm, tipo: "carpeta" };

    // Cubiertas
    if (desc.includes("membrana") && unidad === "m2")
      return { ...ch.cubiertas_por_m2.membrana_asfaltica_4mm, tipo: "membrana" };
    if (desc.includes("chapa") && unidad === "m2")
      return { ...ch.cubiertas_por_m2.chapa_sobre_estructura, tipo: "cubierta_chapa" };

    // Pisos
    if (desc.includes("mosaico") && desc.includes("granítico") && unidad === "m2")
      return { ...ch.pisos_por_m2.mosaico_granitico_30x30, tipo: "piso_mosaico" };
    if (desc.includes("cemento alisado") && unidad === "m2")
      return { ...ch.pisos_por_m2.cemento_alisado, tipo: "piso_cemento_alisado" };
    if (desc.includes("pulido") && unidad === "m2")
      return { ...ch.pisos_por_m2.pulido_granitico, tipo: "piso_pulido" };

    return null;
  }

  async function llamarAgentePliegos(textoExtraido) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Falta VITE_ANTHROPIC_API_KEY (definila en .env y rebuild).");
    }
    const CHUNK_SIZE = 5000;
    const chunks = [];
    for (let i = 0; i < textoExtraido.length; i += CHUNK_SIZE) {
      chunks.push(textoExtraido.slice(i, i + CHUNK_SIZE));
    }

    let todosItems = [];

    for (const chunk of chunks) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system:
            "Sos un experto en presupuestación de obra pública argentina. Respondés SOLO con JSON válido, sin markdown ni texto adicional.",
          messages: [
            {
              role: "user",
              content: `Extraé todos los ítems de este fragmento de cómputo y presupuesto provincial argentino. 
Devolvé ÚNICAMENTE un JSON válido sin texto adicional, con esta estructura:
{"items":[{"rubroId":"1","rubroNombre":"TRABAJOS PREPARATORIOS","codigo":"1.2","descripcion":"Cartel de obra","unidad":"m2","cantidad":12,"precioUnitario":107414.92}]}

Reglas:
- codigo siempre "rubro.item" ej: "1.2", "3.5"  
- números en formato JS (punto decimal, sin puntos de miles)
- ignorá totales de rubro, porcentajes y honorarios
- si el ítem tiene número suelto dentro de un rubro, inferí el rubro del contexto

Fragmento:
${chunk}`,
            },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 280)}`);
      }
      const data = await res.json().catch(() => ({}));
      const texto = data.content?.[0]?.text || "";
      const jsonMatch = texto.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const parsedItems = parsed?.items;
          // Algunos chunks pueden devolver "items" no como array (objeto único). Normalizamos para
          // que el merge acumulativo no descarte esos ítems y termine pareciendo que solo quedó el último chunk.
          if (Array.isArray(parsedItems)) {
            todosItems = [...todosItems, ...parsedItems];
          } else if (parsedItems && typeof parsedItems === "object") {
            todosItems = [...todosItems, parsedItems];
          }
        } catch (_) {
          /* ignorar chunk con JSON inválido */
        }
      }
      console.log(`Chunk ${chunks.indexOf(chunk) + 1}/${chunks.length}: ${todosItems.length} items acumulados`);
    }

    const items = Array.isArray(todosItems) ? todosItems : [];

    const toAdd = items
      .map((item) => {
        const codigo = String(item?.codigo ?? "").trim();
        const desc = String(item?.descripcion ?? "").trim();
        const um = String(item?.unidad ?? "").trim();
        const cantPresup = Number(item?.cantidad);
        const precioCustom = Number(item?.precioUnitario);
        if (!codigo || !desc || !um) return null;
        if (!Number.isFinite(cantPresup) || cantPresup <= 0) return null;
        if (!Number.isFinite(precioCustom) || precioCustom <= 0) return null;
        const precioBase = 0;
        const justificacion = "Importado por agente pliegos (Claude)";
        return {
          codigo,
          desc: item.descripcion,
          um: item.unidad,
          precioBase: usarPreciosPliego ? (item.precioUnitario || 0) : precioBase,
          precioCustom: usarPreciosPliego ? item.precioUnitario : null,
          cantPresup: item.cantidad || 1,
          consumidoReal: 0,
          esCustom: false,
          rubroId: item.rubroId,
          rubroNombre: item.rubroNombre,
          justificacion,
          rendimientos: obtenerRendimientosChandias(item.descripcion || "", item.unidad || ""),
        };
      })
      .filter(Boolean);

    if (toAdd.length > 0) addItems(toAdd);
    return toAdd.length;
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingPdf(true);
    setError("");
    setFileWarning("");
    const ext = file.name.split(".").pop().toLowerCase();
    try {
      if (ext === "pdf") {
        let arrayBuffer;
        try {
          arrayBuffer = await file.arrayBuffer();
        } catch (err) {
          setError("Error al leer el archivo PDF.");
          setPliego("");
          return;
        }
        let texto = "";
        let numPaginas = 0;
        try {
          const result = await extraerTextoPDF(arrayBuffer);
          texto = result.texto;
          numPaginas = result.numPaginas;
        } catch (err) {
          setError("Error al extraer texto del PDF: " + (err?.message || String(err)));
          setPliego("");
          return;
        }
        let textoFinal = texto.trim() || "";
        let itemsAgregados = 0;
        if (usarAgente) {
          try {
            itemsAgregados = await llamarAgentePliegos(textoFinal);
          } catch (err) {
            setError("Error usando agente para extraer pliego: " + (err?.message || String(err)));
          }
          setPliego("");
          if (texto.trim().length < 50) {
            setFileWarning("No se pudo extraer texto del PDF. El archivo puede ser una imagen escaneada.");
          } else {
            setFileWarning(`PDF de ${numPaginas} página(s) procesado con agente. Ítems agregados: ${itemsAgregados}.`);
            if (detectarCómputoEnTexto(texto)) {
              setFileWarning((w) => (w ? w + " " : "") + "Se detectó estructura de cómputo en el texto.");
            }
          }
          if (typeof console !== "undefined" && console.log) {
            console.log("PDF procesado con agente: " + numPaginas + " páginas, " + texto.length + " caracteres");
          }
        } else {
          const csvParseado = parsearTextoPDFProvincial(textoFinal || texto.trim());
          if (csvParseado && csvParseado.length > 50) {
            textoFinal = csvParseado;
            if (typeof console !== "undefined" && console.log) {
              console.log("PDF parseado a CSV:", csvParseado.length, "chars");
            }
          }
          setPliego(textoFinal);
          if (texto.trim().length < 50) {
            setFileWarning("No se pudo extraer texto del PDF. El archivo puede ser una imagen escaneada.");
          } else {
            setFileWarning("PDF de " + numPaginas + " página(s) procesado localmente.");
            if (detectarCómputoEnTexto(texto)) {
              setFileWarning((w) => (w ? w + " " : "") + "Se detectó estructura de cómputo en el texto.");
            }
          }
          if (typeof console !== "undefined" && console.log) {
            console.log("PDF procesado localmente: " + numPaginas + " páginas, " + texto.length + " caracteres");
          }
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
        const esCómputo = detectarFormatoCómputo(wb);
        if (esCómputo) {
          text = parseComputeInteligente(wb);
        }
        if (!text) {
          (wb.SheetNames || []).forEach((sname) => {
            text += "--- Hoja: " + sname + " ---\n";
            try {
              text += XLSX.utils.sheet_to_csv(wb.Sheets[sname] || {}) + "\n";
            } catch (_) {
              text += "\n";
            }
          });
        }
        setPliego(text || "");
        if (esCómputo) {
          setFileWarning("Excel interpretado como cómputo de obra.");
        } else if (text && detectarCómputoEnTexto(text)) {
          setFileWarning((w) => (w ? w + " " : "") + "Se detectó estructura de cómputo en el texto.");
        }
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
      let currentRubroNombre = "";
      let currentRubroId = null;
      const normalizeName = (s) =>
        String(s || "")
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
      const findRubroIdByName = (nombre) => {
        const target = normalizeName(nombre);
        const match = Object.keys(RUBROS_MAP).find((k) => normalizeName(RUBROS_MAP[k]) === target);
        return match || null;
      };
      for (const line of lines) {
        // 1. Rubros: guardar contexto y saltar
        if (line.startsWith("RUBRO:")) {
          const nombre = line.slice("RUBRO:".length).trim();
          currentRubroNombre = nombre;
          currentRubroId = findRubroIdByName(nombre);
          continue;
        }

        // 2. Líneas CSV del PDF (tienen comas) → procesar como ítems
        if (line.includes(",")) {
          const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
          if (cols.length < 2) continue;
          const [c0, c1, c2, c3, c4] = cols;
          if (!c1 || c1.length < 4) continue;
          if (/contemplan el retiro|contemplan carga|incluye colocaci[oó]n|incluyen colocaci[oó]n|manos necesarias/i.test(c1)) continue;
          const cant = parseFloat(String(c3).replace(",", ".")) || parseFloat(String(c2).replace(",", ".")) || 1;
          const precioCol = cols.length >= 5 ? parseFloat(String(c4).replace(",", ".")) : parseFloat(String(c4).replace(",", ".")) || parseFloat(String(c3).replace(",", ".")) || 0;

          if (/^\d+$/.test(c0)) {
            const umStr = (c2 && String(c2).trim()) || "";
            const hasUnit = /^(m2|m²|m3|m³|ml|u|un|kg|tn|gl|dia|mes|nº|n°)$/i.test(umStr.replace(/\s/g, ""));
            if (!hasUnit || cant <= 0) continue;
          }

          if (c1) {
            if (cols.length >= 5) {
              const desc = c1;
              const um = (c2 && String(c2).trim()) || "UN";
              const numero = c0 || "CUSTOM-IMP";

              if (usarPreciosPliego && Number.isFinite(precioCol) && precioCol > 0) {
                toAdd.push({
                  codigo: numero,
                  desc,
                  um,
                  precioBase: 0,
                  precioCustom: precioCol,
                  cantPresup: cant,
                  consumidoReal: 0,
                  esCustom: true,
                  justificacion: "Precio del pliego original",
                  rubroId: currentRubroId,
                  rubroNombre: currentRubroNombre,
                });
              } else {
                const aprendido = buscarEnAprendidos(desc, um, preciosAprendidos);
                let match;
                let precioBase = 0;
                let codigo = numero;
                let justificacion = "Sin match en base";
                if (aprendido) {
                  precioBase = Number(aprendido.precioUnitario);
                  justificacion = aprendido.metodo === "fuzzy" ? `Precio aprendido fuzzy (${aprendido.score}%)` : "Precio aprendido (pliego anterior)";
                } else {
                  match = findBestBaseMatch(desc, um, BASE);
                  precioBase = (match && match.precio != null) ? match.precio : 0;
                  codigo = match && match.codigo ? match.codigo : numero;
                  justificacion = match && match.precio != null ? "Precio de base" : "Sin match en base";
                }
                toAdd.push({
                  codigo,
                  desc,
                  um,
                  precioBase,
                  precioCustom: null,
                  cantPresup: cant,
                  consumidoReal: 0,
                  esCustom: false,
                  justificacion,
                  rubroId: currentRubroId,
                  rubroNombre: currentRubroNombre,
                });
              }
            } else {
              toAdd.push({
                codigo: c0 || "CUSTOM-IMP",
                desc: c1,
                um: (c2 && String(c2).trim()) || "UN",
                precioBase: precioCol,
                precioCustom: null,
                cantPresup: cant,
                consumidoReal: 0,
                esCustom: true,
                justificacion: "Importado desde Excel",
                rubroId: currentRubroId,
                rubroNombre: currentRubroNombre,
              });
            }
          }
        }
      }
      if (toAdd.length > 0) {
        addItems(toAdd);
        const conPrecio = toAdd.filter((it) => it.precioCustom != null && it.precioCustom > 0).map((it) => ({
          descripcion: it.desc,
          unidad: it.um || "",
          precioUnitario: it.precioCustom,
        }));
        if (conPrecio.length > 0) {
          guardarPreciosAprendidos(conPrecio).then(() => {
            getDoc(doc(db, "configuracion", "preciosAprendidos")).then((snap) => {
              const data = snap.exists() ? snap.data() : {};
              setPreciosAprendidos(Array.isArray(data.items) ? data.items : []);
            }).catch(() => {});
          });
        }
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

  const RUBRO_NORMALIZE = {
    "movimiento de suelos": "Movimiento de suelo", "movimientos de suelo": "Movimiento de suelo", "movimientos de suelos": "Movimiento de suelo",
    "estructura h a": "Estructura resistente", "estructura ha": "Estructura resistente", "hormigon armado": "Estructura resistente",
    "mamposteria": "Albañilería", "albañileria": "Albañilería", "hormigon": "Hormigón", "concreto": "Hormigón",
    "revoque": "Revoques", "revoques": "Revoques", "carpeta": "Carpeta y contrapiso", "contrapiso": "Carpeta y contrapiso",
    "pintura": "Pinturas", "pinturas": "Pinturas", "ceramica": "Cerámica", "revestimiento": "Revestimientos", "revestimientos": "Revestimientos",
    "instalacion": "Instalaciones", "instalaciones": "Instalaciones", "terminacion": "Terminaciones", "terminaciones": "Terminaciones",
    "información general": "Otros", "informacion general": "Otros", "documento principal": "Otros", "general": "Otros", "otros": "Otros",
  };
  const RUBRO_ORDER = [
    "Movimiento de suelo", "Estructura resistente", "Albañilería", "Hormigón", "Carpeta y contrapiso",
    "Revoques", "Revestimientos", "Pinturas", "Cerámica", "Terminaciones", "Instalaciones", "Otros",
  ];

  function normalizeRubroName(raw) {
    if (raw == null || typeof raw !== "string") return "Otros";
    const t = raw.trim().replace(/\s+/g, " ");
    if (!t) return "Otros";
    const lower = t.toLowerCase();
    const canonical = RUBRO_NORMALIZE[lower];
    if (canonical) return canonical;
    if (/movimiento\s+de\s+suelo/i.test(lower)) return "Movimiento de suelo";
    if (/estructura\s+(resistente|h\s*a|ha)/i.test(lower) || /hormigon\s+armado/i.test(lower)) return "Estructura resistente";
    if (/albañileria|mamposteria/i.test(lower)) return "Albañilería";
    if (/revoque/i.test(lower)) return "Revoques";
    if (/pintura/i.test(lower)) return "Pinturas";
    if (/revestimiento/i.test(lower)) return "Revestimientos";
    if (/instalacion/i.test(lower)) return "Instalaciones";
    if (/terminacion/i.test(lower)) return "Terminaciones";
    if (/carpeta|contrapiso/i.test(lower)) return "Carpeta y contrapiso";
    if (/ceramica/i.test(lower)) return "Cerámica";
    if (/hormigon|concreto/i.test(lower)) return "Hormigón";
    if (/informacion\s+general|documento\s+principal/i.test(lower)) return "Otros";
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  function normalizeItemDescription(desc) {
    if (desc == null || typeof desc !== "string") return "";
    let s = desc.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ");
    s = s.replace(/\b(m2|m3|ml|m\s*2|m\s*3|\bu\b|n°|kg|tn|gl|dia|mes|unidad|un\.?|m²|m³)\b/gi, " ").replace(/\s+/g, " ").trim();
    s = s.replace(/[.,;:]+$/, "").trim();
    return s;
  }

  function normalizeUnit(um) {
    if (um == null || typeof um !== "string") return "u";
    const t = um.trim().toLowerCase().replace(/\s+/g, "").replace(/²/g, "2").replace(/³/g, "3");
    if (t === "m2") return "m2";
    if (t === "m3") return "m3";
    if (t === "ml") return "ml";
    if (t === "u" || t === "un" || t === "unidad") return "u";
    if (t === "kg") return "kg";
    if (t === "tn") return "tn";
    if (t === "gl") return "gl";
    if (t === "dia") return "dia";
    if (t === "mes") return "mes";
    return t || "u";
  }

  function structurePliegoRubros(rubros, logPrefix = "AI/Pliego") {
    if (!Array.isArray(rubros) || rubros.length === 0) return { rubros: [], namesBefore: [], namesAfter: [] };
    const namesBefore = rubros.map((r) => (r && r.nombre) || "General");
    const byCanonical = new Map();
    const seen = new Set();
    let duplicatesCount = 0;
    const normalizedSamples = [];
    for (let i = 0; i < rubros.length; i++) {
      const rubro = rubros[i];
      const rawName = (rubro && rubro.nombre) || "General";
      const canonical = normalizeRubroName(rawName);
      if (!byCanonical.has(canonical)) byCanonical.set(canonical, { nombre: canonical, items: [] });
      const items = Array.isArray(rubro.items) ? rubro.items : [];
      for (const it of items) {
        if (!it || typeof it !== "object") continue;
        const rawDesc = (it.d != null ? String(it.d) : it.descripcion != null ? String(it.descripcion) : "").trim();
        const rawUm = (it.u != null && String(it.u).trim()) ? String(it.u).trim() : (it.unidad != null && String(it.unidad).trim()) || "UN";
        const normDesc = normalizeItemDescription(rawDesc);
        const normUm = normalizeUnit(rawUm);
        if (normalizedSamples.length < 5) normalizedSamples.push({ raw: rawDesc, normalized: normDesc, unit: normUm });
        const key = `${normDesc}|${normUm}`;
        if (seen.has(key)) { duplicatesCount++; continue; }
        seen.add(key);
        byCanonical.get(canonical).items.push(it);
      }
    }
    const namesAfter = [...byCanonical.keys()];
    const ordered = [];
    for (const name of RUBRO_ORDER) {
      if (byCanonical.has(name)) ordered.push(byCanonical.get(name));
    }
    for (const name of byCanonical.keys()) {
      if (!RUBRO_ORDER.includes(name)) ordered.push(byCanonical.get(name));
    }
    if (typeof console !== "undefined" && console.log) {
      console.log(`[${logPrefix}] Rubro names before normalization:`, namesBefore);
      console.log(`[${logPrefix}] Rubro names after normalization:`, namesAfter);
      console.log(`[${logPrefix}] Duplicates detected:`, duplicatesCount);
    }
    return { rubros: ordered, namesBefore, namesAfter };
  }

  function mergePliegoResults(partials, obraFallback) {
    const seen = new Set();
    const byCanonical = new Map();
    const namesBefore = [];
    let duplicatesCount = 0;
    for (const p of partials) {
      if (!p || !Array.isArray(p.rubros)) continue;
      for (const rubro of p.rubros) {
        const rawName = (rubro && rubro.nombre) || "General";
        namesBefore.push(rawName);
        const canonical = normalizeRubroName(rawName);
        if (!byCanonical.has(canonical)) byCanonical.set(canonical, { nombre: canonical, items: [] });
        const items = Array.isArray(rubro.items) ? rubro.items : [];
        for (const it of items) {
          if (!it || typeof it !== "object") continue;
          const rawDesc = (it.d != null ? String(it.d) : it.descripcion != null ? String(it.descripcion) : "").trim();
          const rawUm = (it.u != null && String(it.u).trim()) ? String(it.u).trim() : (it.unidad != null && String(it.unidad).trim()) || "UN";
          const normDesc = normalizeItemDescription(rawDesc);
          const normUm = normalizeUnit(rawUm);
          const key = `${normDesc}|${normUm}`;
          if (seen.has(key)) { duplicatesCount++; continue; }
          seen.add(key);
          byCanonical.get(canonical).items.push(it);
        }
      }
    }
    const namesAfter = [...byCanonical.keys()];
    const ordered = [];
    for (const name of RUBRO_ORDER) {
      if (byCanonical.has(name)) ordered.push(byCanonical.get(name));
    }
    for (const name of byCanonical.keys()) {
      if (!RUBRO_ORDER.includes(name)) ordered.push(byCanonical.get(name));
    }
    if (typeof console !== "undefined" && console.log) {
      console.log("[AI/Pliego] Merge: final rubro count =", ordered.length);
    }
    const obra = (partials[0] && partials[0].obra) || obraFallback;
    return { obra, rubros: ordered };
  }

  function extractAndParseJson(raw) {
    if (!raw || typeof raw !== "string") return null;
    let s = raw.trim();
    if (s.startsWith("```")) {
      s = s.replace(/^```(?:json)?\s*[\r\n]*/, "").trim();
      s = s.replace(/\s*```\s*$/, "").trim();
    }
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace <= firstBrace) return null;
    let jsonStr = s.slice(firstBrace, lastBrace + 1);
    function tryParse(str) {
      try { return JSON.parse(str); } catch (_) { return null; }
    }
    let parsed = tryParse(jsonStr);
    if (parsed !== null) return parsed;
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
      if (discardPatterns.some((p) => lower.includes(p))) { discarded.push(line); continue; }
      const matchesKeep = hasItemNumber(line) || unitRegex.test(line) || isRubroTitle(line) || hasTechnicalKeyword(line);
      if (matchesKeep) kept.push(line);
      else discarded.push(line);
    }
    const filteredText = kept.join("\n").trim();
    if (typeof console !== "undefined" && console.log) {
      console.log("[AI/Pliego] Preprocess: original lines =", lines.length, "| kept =", kept.length);
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
Tenés acceso a los rendimientos del Chandías (resumidos abajo) para estimar precios de tareas compuestas. Para cada ítem, estimá un precio en ARS (marzo 2026): sumá materiales + mano de obra. Usá precios de mercado argentino. Nunca dejes precio en 0.

${CHANDIAS_COMPRIMIDO}

Respondé ÚNICAMENTE con un único objeto JSON válido. No incluyas texto antes ni después, ni backticks ni explicaciones.
Formato compacto (claves cortas): n=numero, d=descripcion, u=unidad, c=cantidad, p=precio_unitario.

{"obra":"nombre breve","rubros":[{"nombre":"Rubro","items":[{"n":"1.1","d":"Descripción del ítem","u":"m2","c":100,"p":5500}]}]}

IMPORTANTE: Extraer TODOS los ítems del texto, no solo los primeros. Si el texto tiene 100 ítems, devolver los 100. Usar formato JSON compacto sin espacios extras.

IMPORTANTE: Extraé TODOS los ítems individuales del pliego, tal como aparecen. NO resumas ni agrupes múltiples ítems en uno solo. Cada línea del pliego que tenga descripción + unidad + cantidad debe ser un ítem separado.

Si un ítem es una tarea compuesta (ej: "Contrapiso armado esp 12cm", "Revoque interior completo"), extraelo TAL CUAL aparece en el pliego con su descripción, unidad y cantidad originales.

NO agrupes rubros enteros en un solo ítem genérico. Por ejemplo, si el pliego tiene 20 ítems de instalación eléctrica, extraé los 20 ítems individuales, NO un solo ítem "Instalación eléctrica completa".

Máximo 50 ítems POR CHUNK. Si hay más, priorizá los de mayor monto.

Reglas:
- obra: string. rubros: array con "nombre" e "items".
- Cada ítem: n (numero), d (descripcion), u (unidad), c (cantidad), p (precio ARS). Opcional: observaciones.
- Agrupá por rubros lógicos. Entre 1 y 15 rubros. Respuesta: solo el JSON, nada más.`;

  async function runOneChunkAnalysis(chunkText, chunkIndex, totalChunks) {
    const chunkInfo = totalChunks > 1 ? `${chunkIndex + 1} de ${totalChunks}` : "";
    const content = pliegoPromptPrefix(chunkInfo) + chunkText + pliegoPromptSuffix;
    const data = await sendChat({ messages: [{ role: "user", content }] });
    if (data?.error) {
      if (typeof console !== "undefined" && console.warn) console.warn("[AI/Pliego] Chunk", chunkIndex + 1, "sendChat error:", data.error);
      return null;
    }
    const txt = (Array.isArray(data?.content) ? data.content.map((c) => (c && c.text) || "").join("") : (data?.content && typeof data.content === "string" ? data.content : "") || "").trim();
    const parsed = extractAndParseJson(txt);
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
    try {
      if (!chunkMode) {
        const data = await sendChat({ messages: [{ role: "user", content: pliegoPromptPrefix(null) + text + pliegoPromptSuffix }] });
        rawResponse = data;
        if (data?.error) {
          setError("Error al analizar: " + (typeof data.error === "string" ? data.error : (data.error?.message || "Error del servidor")));
          setLoading(false);
          return;
        }
        const content = data?.content;
        const txt = (Array.isArray(content) ? content.map((c) => (c && c.text) || "").join("") : (content && typeof content === "string" ? content : "") || "").trim();
        if (!txt) {
          setError("La IA no devolvió texto. Revisá la consola (F12) para ver la respuesta.");
          setLoading(false);
          return;
        }
        const parsed = extractAndParseJson(txt);
        if (parsed === null) {
          setError("No se encontró JSON válido en la respuesta. Revisá la consola.");
          setLoading(false);
          return;
        }
        const rubrosRaw = parsed.rubros;
        if (!Array.isArray(rubrosRaw) || rubrosRaw.length === 0) {
          setError("La IA devolvió JSON pero sin rubros válidos (rubros debe ser un array no vacío).");
          setLoading(false);
          return;
        }
        const { rubros } = structurePliegoRubros(rubrosRaw, "AI/Pliego Single");
        setResultado({ obra: parsed.obra || proyecto.nombre, rubros });
      } else {
        const chunks = splitIntoChunks(text);
        const partials = [];
        for (let i = 0; i < chunks.length; i++) {
          const parsed = await runOneChunkAnalysis(chunks[i], i, chunks.length);
          if (parsed && Array.isArray(parsed.rubros) && parsed.rubros.length > 0) partials.push(parsed);
        }
        const merged = mergePliegoResults(partials, proyecto.nombre);
        if (merged.rubros.length === 0) {
          setError("No se obtuvieron rubros válidos de ningún fragmento. Revisá la consola.");
          setLoading(false);
          return;
        }
        setResultado(merged);
      }
    } catch (e) {
      setError("Error al analizar: " + (e?.message || String(e)));
    }
    setLoading(false);
  }

  const MAX_IMPORT_ITEMS = 200;

  function confirmarItems() {
    const rubros = Array.isArray(resultado?.rubros) ? resultado.rubros : [];
    const flattened = rubros.flatMap((rubro) =>
      (Array.isArray(rubro?.items) ? rubro.items : []).map((item) => {
        if (item == null || typeof item !== "object") return null;
        const desc = (item.d != null ? String(item.d) : item.descripcion != null ? String(item.descripcion) : "").trim();
        const um = (item.u != null && String(item.u).trim()) ? String(item.u).trim() : (item.unidad != null && String(item.unidad).trim()) ? String(item.unidad).trim() : "UN";
        const precioRaw = item.p ?? item.precio_unitario;
        const precioUnitario = typeof precioRaw === "number" ? precioRaw : parseFloat(precioRaw);
        const usaPrecioIA = Number.isFinite(precioUnitario) && precioUnitario > 0;
        const aprendido = buscarEnAprendidos(desc, um, preciosAprendidos);
        let match;
        let matched = false;
        let precioBase = 0;
        let baseCodigo;
        let matchInfo = { matched: false, palabrasBuscadas: [], mejorCandidato: "", overlapMejor: 0, minRequerido: 0 };
        if (aprendido) {
          precioBase = Number(aprendido.precioUnitario);
          matched = true;
          baseCodigo = "APRENDIDO";
        } else {
          match = findBestBaseMatch(desc, um, BASE);
          matched = match && match.codigo;
          precioBase = matched ? match.precio : 0;
          baseCodigo = matched ? match.codigo : undefined;
          matchInfo = match?.matchInfo ?? matchInfo;
        }
        const observaciones = item.observaciones != null ? String(item.observaciones) : "";
        const justifAprendido = aprendido ? (aprendido.metodo === "fuzzy" ? `Precio aprendido fuzzy (${aprendido.score}%)` : "Precio aprendido (pliego anterior)") : observaciones;
        return {
          codigo: (matched ? baseCodigo : "CUSTOM-IMP") + "-" + uid(),
          baseCodigo: matched ? baseCodigo : undefined,
          desc,
          um,
          precioBase,
          precioCustom: usaPrecioIA ? precioUnitario : null,
          cantPresup: Number(item.c ?? item.cantidad) || 0,
          consumidoReal: 0,
          esCustom: !matched || usaPrecioIA,
          justificacion: usaPrecioIA ? "Precio estimado por IA (Chandías + mercado)" : justifAprendido,
          matchInfo,
        };
      })
    ).filter((r) => r != null && r.desc != null && String(r.desc).trim().length > 0);
    const toAdd = flattened.slice(0, MAX_IMPORT_ITEMS);
    if (toAdd.length === 0) {
      setError("No hay ítems válidos para agregar.");
      return;
    }
    try {
      addItems(toAdd);
      setResultado(null);
      setPliego("");
      setError("");
    } catch (err) {
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
        <div style={{ marginTop: "8px", marginBottom: "6px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
            <input
              type="checkbox"
              checked={usarAgente}
              onChange={(e) => setUsarAgente(e.target.checked)}
              style={{ accentColor: COLORS.gold, marginTop: "2px" }}
              disabled={loadingPdf}
            />
            <span>
              <span style={{ fontWeight: 600 }}>Usar agente para PDF</span>
              <div style={{ color: COLORS.muted, fontSize: "11px", marginTop: "2px" }}>Extrae ítems con un endpoint netlify en vez del parser local.</div>
            </span>
          </label>
        </div>
      </div>
      <textarea
        style={{ ...S.input, height: "140px", resize: "vertical", lineHeight: "1.5" }}
        placeholder="Ej: Construcción de aulas modulares prefabricadas de 7x9m..."
        value={pliego}
        onChange={(e) => setPliego(e.target.value)}
      />
      {pliegoTienePrecios() && (
        <div style={{ marginTop: "10px", marginBottom: "6px" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", fontSize: "12px" }}>
            <input type="checkbox" checked={usarPreciosPliego} onChange={(e) => setUsarPreciosPliego(e.target.checked)} style={{ accentColor: COLORS.gold, marginTop: "2px" }} />
            <span>
              <span style={{ fontWeight: 600 }}>Usar precios del documento</span>
              <div style={{ color: COLORS.muted, fontSize: "11px", marginTop: "2px" }}>Activado: importa con precios originales. Desactivado: busca precios actualizados en la base.</div>
            </span>
          </label>
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
        <button style={S.btn()} onClick={analizarPliego} disabled={loading || !pliego.trim()}>
          {loading ? "Analizando..." : "🤖 ANALIZAR CON IA"}
        </button>
        <button style={{ ...S.btn("gold") }} onClick={importarDesdeExcel} disabled={!pliego.trim()}>
          {usarPreciosPliego ? "📥 IMPORTAR CON PRECIOS DEL PLIEGO" : "📥 IMPORTAR Y BUSCAR PRECIOS EN BASE"}
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
                        <td style={{ ...S.td, fontSize: "12px", maxWidth: "220px" }}><div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.d ?? item.descripcion}>{item.d ?? item.descripcion}</div></td>
                        <td style={{ ...S.td, textAlign: "center", color: COLORS.muted, whiteSpace: "nowrap" }}>{item.u ?? item.unidad}</td>
                        <td style={{ ...S.td, textAlign: "right", fontWeight: 700 }}>{item.c ?? item.cantidad}</td>
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
