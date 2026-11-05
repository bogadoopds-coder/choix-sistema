import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { COLORS, S } from "../../styles/theme";
import { useAuth } from "../../auth/AuthContext";
import { db } from "../../firebase";
import { getDesarrollos, getClientes, getBoletos, getCuotas } from "../../services/desarrollosRepo";
import { getContratos, saveContrato, deleteContrato, getEgresos, saveEgreso, deleteEgreso, getIngresos, saveIngreso, deleteIngreso, getAportantes, saveAportante, deleteAportante, getAportesCaja, saveAporteCaja, deleteAporteCaja } from "../../services/financieroRepo";

const RUBROS = ["Movimiento de suelo", "Estructura", "Hormigón", "Albañilería", "Instalación eléctrica",
  "Instalación sanitaria", "Instalación termomecánica", "Carpinterías", "Pintura",
  "Yeso/Durlock", "Cubiertas", "Zinguería", "Vidrios", "Ascensores", "Corralón", "Otro"];

const FORM_CTR_VACIO = { nombre: "", rubro: "", montoTotal: "", moneda: "ARS", fechaContrato: "", avancePct: "0", estado: "activo", notas: "", itemsAcopio: [] };

export default function FinancieroModule({ BASE = [] }) {
  const { orgId } = useAuth();
  const [desarrollos, setDesarrollos] = useState([]);
  const [devId, setDevId] = useState("");
  const [tab, setTab] = useState("contratos");
  const [contratos, setContratos] = useState([]);
  const [form, setForm] = useState(FORM_CTR_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    getDesarrollos(orgId).then((lista) => {
      setDesarrollos(lista);
      if (lista.length && !devId) setDevId(lista[0].id);
      setReady(true);
    }).catch(() => setReady(true));
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !devId) { setContratos([]); return; }
    getContratos(orgId, devId).then(setContratos).catch(() => setContratos([]));
  }, [orgId, devId]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function guardar() {
    setError("");
    if (!form.nombre.trim()) { setError("El contratista necesita un nombre."); return; }
    if (!(Number(form.montoTotal) > 0)) { setError("El monto del contrato debe ser mayor a cero."); return; }
    setGuardando(true);
    try {
      await saveContrato(orgId, devId, {
        ...(editandoId ? { id: editandoId } : {}),
        nombre: form.nombre.trim(),
        rubro: form.rubro || "Otro",
        montoTotal: Number(form.montoTotal),
        moneda: form.moneda,
        fechaContrato: form.fechaContrato || "",
        avancePct: Number(form.avancePct) || 0,
        estado: form.estado,
        notas: form.notas.trim(),
        itemsAcopio: (form.itemsAcopio || []).map((it) => ({
          k: it.k,
          codigo: it.codigo || "",
          desc: (it.desc || "").trim(),
          um: (it.um || "UN").trim() || "UN",
          cant: Number(it.cant) || 0,
        })).filter((it) => it.desc),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_CTR_VACIO); setEditandoId(null);
      setContratos(await getContratos(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }

  function editar(c) {
    setEditandoId(c.id);
    setForm({ nombre: c.nombre, rubro: c.rubro, montoTotal: String(c.montoTotal),
      moneda: c.moneda, fechaContrato: c.fechaContrato || "", avancePct: String(c.avancePct), estado: c.estado, notas: c.notas || "",
      itemsAcopio: (c.itemsAcopio || []).map((it) => ({ ...it, cant: it.cant === 0 || it.cant ? String(it.cant) : "" })) });
  }

  async function borrar(c) {
    if (!window.confirm(`¿Borrar el contrato de ${c.nombre}?`)) return;
    try { await deleteContrato(orgId, devId, c.id); setContratos(await getContratos(orgId, devId)); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }

  const fmt = (n, m) => (m === "USD" ? "USD " : "$ ") + Number(n || 0).toLocaleString("es-AR");

  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: COLORS.muted }}>Cargando...</div>;

  const TABS = [
    { id: "contratos", label: "📑 Contratos" },
    { id: "egresos", label: "📤 Egresos" },
    { id: "ingresos", label: "📥 Ingresos" },
    { id: "arqueo", label: "⚖️ Arqueo" },
    { id: "aportantes", label: "🤝 Financiamiento" },
    { id: "posicion", label: "📊 Posición" },
  ];

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>💰 SALUD FINANCIERA</span>
        <select style={{ ...S.input, width: "auto", minWidth: "200px" }} value={devId} onChange={(e) => setDevId(e.target.value)}>
          {desarrollos.length === 0 && <option value="">— No hay desarrollos —</option>}
          {desarrollos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </div>

      {desarrollos.length === 0 && (
        <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>
          Primero creá un desarrollo en el módulo 🏢 Desarrollos. La salud financiera se lleva por desarrollo.
        </div>
      )}

      {devId && (
        <>
          <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ ...S.btn(tab === t.id ? "gold" : "blue", tab !== t.id), cursor: "pointer", fontSize: "12px", padding: "6px 12px" }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "contratos" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
              <div style={S.panel}>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
                  {editandoId ? "Editar contrato" : "Nuevo contrato"}
                </div>
                {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}
                <label style={S.label}>Contratista</label>
                <input style={S.input} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Hormigones del Sur SRL" />
                <label style={S.label}>Rubro</label>
                <select style={S.input} value={form.rubro} onChange={(e) => set("rubro", e.target.value)}>
                  <option value="">— Elegir —</option>
                  {RUBROS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ flex: 2 }}>
                    <label style={S.label}>Monto del contrato</label>
                    <input style={S.input} type="number" value={form.montoTotal} onChange={(e) => set("montoTotal", e.target.value)} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Moneda</label>
                    <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <label style={S.label}>Fecha del contrato</label>
                <input style={S.input} type="date" value={form.fechaContrato} onChange={(e) => set("fechaContrato", e.target.value)} />
                <label style={S.label}>Avance de obra (%)</label>
                <input style={S.input} type="number" min="0" max="100" value={form.avancePct} onChange={(e) => set("avancePct", e.target.value)} />
                <label style={S.label}>Estado</label>
                <select style={S.input} value={form.estado} onChange={(e) => set("estado", e.target.value)}>
                  <option value="activo">Activo</option>
                  <option value="terminado">Terminado</option>
                  <option value="rescindido">Rescindido</option>
                </select>
                <label style={S.label}>Notas</label>
                <input style={S.input} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Condiciones, forma de pago, etc." />
                <ItemsAcopioEditor items={form.itemsAcopio} setItems={(itemsAcopio) => set("itemsAcopio", itemsAcopio)} BASE={BASE} />
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
                    {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar contrato"}
                  </button>
                  {editandoId && <button style={{ ...S.btn("blue", true), cursor: "pointer" }} onClick={() => { setEditandoId(null); setForm(FORM_CTR_VACIO); setError(""); }}>Cancelar</button>}
                </div>
              </div>

              <div style={S.panel}>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
                  Contratistas ({contratos.length})
                </div>
                {contratos.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no cargaste contratos para este desarrollo.</div>}
                {contratos.map((c) => (
                  <div key={c.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>{c.nombre}</div>
                        <div style={{ fontSize: "11px", color: COLORS.muted }}>
                          {c.rubro} · {fmt(c.montoTotal, c.moneda)} · avance {c.avancePct}% · {c.estado}
                          {(c.itemsAcopio || []).length > 0 ? ` · ${c.itemsAcopio.length} material${c.itemsAcopio.length === 1 ? "" : "es"} en acopio` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => editar(c)}>Editar</button>
                        <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(c)}>✕</button>
                      </div>
                    </div>
                    {((c.itemsAcopio || []).length > 0 || (c.entregas || []).length > 0) && (
                      <SeguimientoAcopio
                        contrato={c}
                        orgId={orgId}
                        devId={devId}
                        onSaved={async () => setContratos(await getContratos(orgId, devId))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "egresos" && <TabEgresos orgId={orgId} devId={devId} contratos={contratos} fmt={fmt} />}
          {tab === "ingresos" && <TabIngresos orgId={orgId} devId={devId} fmt={fmt} />}
          {tab === "arqueo" && <TabArqueo orgId={orgId} devId={devId} fmt={fmt} />}
          {tab === "aportantes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <TabAportantes orgId={orgId} devId={devId} />
              <TabAportesCaja orgId={orgId} devId={devId} fmt={fmt} />
            </div>
          )}
          {tab === "posicion" && <TabPosicion orgId={orgId} devId={devId} fmt={fmt} />}
        </>
      )}
    </div>
  );
}

// ─── Picker de material: busca en la base de precios o permite texto libre ───
function MaterialPicker({ BASE = [], onPick }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const resultados = q.length >= 2
    ? BASE.filter((b) => (b.desc || "").toLowerCase().includes(q.toLowerCase()) || String(b.codigo || "").includes(q)).slice(0, 8)
    : [];
  return (
    <div>
      <div style={{ position: "relative" }}>
        <input style={{ ...S.input, margin: 0 }} value={q} placeholder="Buscar material en la base, o escribir uno nuevo…"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {open && resultados.length > 0 && (
          <div style={{ position: "absolute", top: "100%", zIndex: 5, left: 0, right: 0, marginTop: "2px", background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: "6px", maxHeight: "180px", overflowY: "auto" }}>
            {resultados.map((b) => (
              <div key={b.codigo} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick({ codigo: b.codigo, desc: b.desc, um: b.um || "UN" }); setQ(""); setOpen(false); }}
                style={{ padding: "6px 8px", cursor: "pointer", fontSize: "11px", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.muted, marginRight: "6px" }}>{b.codigo}</span>{b.desc} <span style={{ color: COLORS.muted }}>({b.um})</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {q.trim().length >= 2 && (
        <div style={{ marginTop: "4px" }}>
          <button type="button" style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "10px", padding: "2px 8px" }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onPick({ codigo: "", desc: q.trim(), um: "UN" }); setQ(""); setOpen(false); }}>
            + Agregar "{q.trim()}" como material nuevo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Editor de materiales acopiados (dentro del formulario de contrato) ───
function ItemsAcopioEditor({ items, setItems, BASE }) {
  const nuevoKey = () => "ai" + Math.random().toString(36).slice(2, 8);
  function agregar(mat) { setItems([...(items || []), { k: nuevoKey(), codigo: mat.codigo, desc: mat.desc, um: mat.um, cant: "" }]); }
  function setCant(k, v) { setItems((items || []).map((it) => (it.k === k ? { ...it, cant: v } : it))); }
  function setUm(k, v) { setItems((items || []).map((it) => (it.k === k ? { ...it, um: v } : it))); }
  function quitar(k) { setItems((items || []).filter((it) => it.k !== k)); }
  return (
    <div style={{ marginTop: "8px", padding: "10px", background: COLORS.subtle, borderRadius: "6px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.gold, marginBottom: "6px" }}>Materiales acopiados</div>
      {(items || []).length === 0 && <div style={{ fontSize: "10.5px", color: COLORS.muted, marginBottom: "6px" }}>Agregá los materiales de este acopio con su cantidad total.</div>}
      {(items || []).map((it) => (
        <div key={it.k} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px", fontSize: "11px" }}>
          <span style={{ flex: 1, color: COLORS.text, minWidth: 0 }}>{it.codigo ? <span style={{ color: COLORS.muted, marginRight: "6px" }}>{it.codigo}</span> : null}{it.desc}</span>
          <input type="number" min="0" value={it.cant} onChange={(e) => setCant(it.k, e.target.value)} placeholder="cant."
            style={{ ...S.input, width: "72px", margin: 0, padding: "3px 6px", textAlign: "center" }} />
          <input value={it.um} onChange={(e) => setUm(it.k, e.target.value)} placeholder="UN"
            style={{ ...S.input, width: "52px", margin: 0, padding: "3px 6px", textAlign: "center" }} />
          <button type="button" onClick={() => quitar(it.k)} style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "2px 7px" }}>✕</button>
        </div>
      ))}
      <div style={{ marginTop: "6px" }}>
        <MaterialPicker BASE={BASE} onPick={agregar} />
      </div>
    </div>
  );
}

// ─── Seguimiento de acopio: entregas registradas y saldo por entregar ───
function SeguimientoAcopio({ contrato, orgId, devId, onSaved }) {
  const [abierto, setAbierto] = useState(false);
  const [reg, setReg] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [remito, setRemito] = useState("");
  const [cant, setCant] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorEntrega, setErrorEntrega] = useState("");
  const items = contrato.itemsAcopio || [];
  const entregas = contrato.entregas || [];
  const entregadoDe = (k) => entregas.reduce((s, e) => s + (((e.lineas || []).find((l) => l.k === k) || {}).cant || 0), 0);
  const nf = (n) => Number(n || 0).toLocaleString("es-AR");
  async function registrar() {
    const lineas = items.map((it) => ({ k: it.k, cant: Number(cant[it.k]) || 0 })).filter((l) => l.cant > 0);
    if (lineas.length === 0) { setErrorEntrega("Indicá la cantidad de al menos un material."); return; }
    setErrorEntrega("");
    setGuardando(true);
    try {
      const nuevasEntregas = [...entregas, { id: "ent" + Math.random().toString(36).slice(2, 8), fecha, remito: remito.trim(), lineas }];
      await saveContrato(orgId, devId, { id: contrato.id, entregas: nuevasEntregas });
      setReg(false); setRemito(""); setCant({});
      await onSaved();
    } catch (e) { setErrorEntrega("No se pudo guardar la entrega."); }
    setGuardando(false);
  }
  const todoEntregado = items.length > 0 && items.every((it) => entregadoDe(it.k) >= Number(it.cant));
  return (
    <div style={{ marginTop: "8px", padding: "10px", background: COLORS.subtle, borderRadius: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: abierto ? "8px" : "0" }}>
        <button type="button" onClick={() => setAbierto((a) => !a)} style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "10.5px", padding: "3px 9px" }}>
          📦 {abierto ? "Ocultar entregas" : "Entregas del acopio"}
        </button>
        {items.length > 0 && (
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: todoEntregado ? COLORS.verde : COLORS.amarillo }}>
            {todoEntregado ? "✅ Todo entregado" : "⏳ Falta entregar material"}
          </span>
        )}
      </div>
      {abierto && (
        <>
          {items.map((it) => {
            const ent = entregadoDe(it.k);
            const falta = Math.max(0, Number(it.cant) - ent);
            const pct = Number(it.cant) > 0 ? Math.min(100, (ent / Number(it.cant)) * 100) : 0;
            return (
              <div key={it.k} style={{ marginBottom: "7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px", gap: "8px" }}>
                  <span style={{ color: COLORS.text }}>{it.desc}</span>
                  <span style={{ color: COLORS.muted, textAlign: "right" }}>
                    entregado {nf(ent)} / {nf(it.cant)} {it.um} · <b style={{ color: falta > 0 ? COLORS.amarillo : COLORS.verde }}>falta {nf(falta)}</b>
                  </span>
                </div>
                <div style={{ height: "7px", background: COLORS.border, borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: falta > 0 ? COLORS.amarillo : COLORS.verde }} />
                </div>
              </div>
            );
          })}
          {entregas.length > 0 && (
            <div style={{ marginTop: "8px", borderTop: `1px solid ${COLORS.border}`, paddingTop: "6px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 700, color: COLORS.gold, marginBottom: "4px" }}>Entregas registradas</div>
              {entregas.map((e) => (
                <div key={e.id} style={{ fontSize: "10.5px", color: COLORS.muted, marginBottom: "3px" }}>
                  {e.fecha}{e.remito ? " · Remito " + e.remito : ""} · {(e.lineas || []).map((l) => {
                    const it = items.find((x) => x.k === l.k);
                    return (it ? it.desc : l.k) + " " + nf(l.cant) + (it ? " " + it.um : "");
                  }).join(" · ")}
                </div>
              ))}
            </div>
          )}
          {reg ? (
            <div style={{ marginTop: "8px", borderTop: `1px solid ${COLORS.border}`, paddingTop: "8px" }}>
              <div style={{ display: "flex", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
                <div>
                  <label style={S.label}>Fecha</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ ...S.input, margin: 0, width: "140px" }} />
                </div>
                <div>
                  <label style={S.label}>N° de remito</label>
                  <input value={remito} onChange={(e) => setRemito(e.target.value)} placeholder="opcional" style={{ ...S.input, margin: 0, width: "120px" }} />
                </div>
              </div>
              {items.map((it) => {
                const falta = Math.max(0, Number(it.cant) - entregadoDe(it.k));
                return (
                  <div key={it.k} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", fontSize: "11px" }}>
                    <span style={{ flex: 1, color: COLORS.text }}>{it.desc} <span style={{ color: COLORS.muted }}>(falta {nf(falta)} {it.um})</span></span>
                    <input type="number" min="0" value={cant[it.k] || ""} onChange={(e) => setCant((c) => ({ ...c, [it.k]: e.target.value }))} placeholder="0"
                      style={{ ...S.input, width: "80px", margin: 0, padding: "3px 6px", textAlign: "center" }} />
                  </div>
                );
              })}
              {errorEntrega && <div style={{ fontSize: "11px", color: COLORS.rojo, marginTop: "4px" }}>{errorEntrega}</div>}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button type="button" onClick={registrar} disabled={guardando} style={{ ...S.btn(), cursor: "pointer", fontSize: "11px", padding: "4px 10px" }}>
                  {guardando ? "Guardando…" : "Guardar entrega"}
                </button>
                <button type="button" onClick={() => { setReg(false); setCant({}); setRemito(""); setErrorEntrega(""); }} style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "4px 10px" }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setReg(true)} style={{ ...S.btn("gold", true), cursor: "pointer", fontSize: "11px", padding: "4px 10px", marginTop: "8px" }}>
              + Registrar entrega
            </button>
          )}
        </>
      )}
    </div>
  );
}

const CATEGORIAS_EGRESO = [
  { id: "contratista", label: "Contratista" },
  { id: "material", label: "Material" },
  { id: "terreno", label: "Terreno" },
  { id: "impuesto", label: "Impuesto" },
  { id: "honorarios", label: "Honorarios" },
  { id: "servicios", label: "Servicios" },
  { id: "comision", label: "Comisión" },
  { id: "financiero", label: "Financiero" },
  { id: "imprevisto", label: "Imprevisto" },
  { id: "otro", label: "Otro" },
];

const ESTADOS_FISCAL = [
  { id: "con_factura", label: "Con factura" },
  { id: "sin_factura", label: "Sin factura" },
  { id: "pendiente", label: "Pendiente" },
];

const FORM_EGR_VACIO = { categoria: "contratista", contratoId: "", concepto: "", monto: "", moneda: "ARS", tc: "", estadoFiscal: "con_factura", fecha: new Date().toISOString().slice(0, 10), medioPago: "transferencia", notas: "" };

function TabEgresos({ orgId, devId, contratos, fmt }) {
  const [egresos, setEgresos] = useState([]);
  const [form, setForm] = useState(FORM_EGR_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId || !devId) { setEgresos([]); return; }
    getEgresos(orgId, devId).then(setEgresos).catch(() => setEgresos([]));
  }, [orgId, devId]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function guardar() {
    setError("");
    if (!form.concepto.trim()) { setError("El egreso necesita un concepto."); return; }
    if (!(Number(form.monto) > 0)) { setError("El monto debe ser mayor a cero."); return; }
    if (form.categoria === "contratista" && !form.contratoId) { setError("Elegí a qué contrato corresponde el pago."); return; }
    setGuardando(true);
    try {
      await saveEgreso(orgId, devId, {
        ...(editandoId ? { id: editandoId } : {}),
        categoria: form.categoria,
        contratoId: form.categoria === "contratista" ? form.contratoId : "",
        concepto: form.concepto.trim(),
        monto: Number(form.monto),
        moneda: form.moneda,
        tc: form.moneda === "ARS" ? (Number(form.tc) || 0) : 0,
        estadoFiscal: form.estadoFiscal,
        fecha: form.fecha,
        medioPago: form.medioPago,
        notas: form.notas.trim(),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_EGR_VACIO); setEditandoId(null);
      setEgresos(await getEgresos(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }

  function editar(e) {
    setEditandoId(e.id);
    setForm({ categoria: e.categoria, contratoId: e.contratoId || "", concepto: e.concepto,
      monto: String(e.monto), moneda: e.moneda, tc: e.tc != null ? String(e.tc) : "", estadoFiscal: e.estadoFiscal,
      fecha: e.fecha, medioPago: e.medioPago, notas: e.notas || "" });
  }

  async function borrar(e) {
    if (!window.confirm(`¿Borrar el egreso "${e.concepto}"?`)) return;
    try { await deleteEgreso(orgId, devId, e.id); setEgresos(await getEgresos(orgId, devId)); }
    catch (err) { setError("No se pudo borrar: " + err.message); }
  }

  const nombreContrato = (id) => contratos.find((c) => c.id === id)?.nombre || "(contrato borrado)";
  const nombreCategoria = (id) => CATEGORIAS_EGRESO.find((c) => c.id === id)?.label || id;
  const labelFiscal = (id) => ESTADOS_FISCAL.find((f) => f.id === id)?.label || id;

  // Totales por moneda y por estado fiscal
  const tot = (mon) => egresos.filter((e) => e.moneda === mon);
  const suma = (arr) => arr.reduce((s, e) => s + (Number(e.monto) || 0), 0);
  const resumenMoneda = (mon) => {
    const arr = tot(mon);
    return {
      total: suma(arr),
      conF: suma(arr.filter((e) => e.estadoFiscal === "con_factura")),
      sinF: suma(arr.filter((e) => e.estadoFiscal === "sin_factura")),
      pend: suma(arr.filter((e) => e.estadoFiscal === "pendiente")),
    };
  };

  // Cruce pagado/resta por contrato
  const pagosDe = (ctrId) => egresos.filter((e) => e.categoria === "contratista" && e.contratoId === ctrId);
  const colorFiscal = (id) => id === "con_factura" ? COLORS.verde : id === "sin_factura" ? COLORS.amarillo : COLORS.muted;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
          {editandoId ? "Editar egreso" : "Nuevo egreso"}
        </div>
        {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}

        <label style={S.label}>Categoría</label>
        <select style={S.input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CATEGORIAS_EGRESO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        {form.categoria === "contratista" && (
          <>
            <label style={S.label}>Contrato</label>
            <select style={S.input} value={form.contratoId} onChange={(e) => set("contratoId", e.target.value)}>
              <option value="">— Elegir contrato —</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.rubro}</option>)}
            </select>
            {contratos.length === 0 && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginTop: "3px" }}>No hay contratos cargados. Cargá uno en la pestaña Contratos primero.</div>}
          </>
        )}

        <label style={S.label}>Concepto</label>
        <input style={S.input} value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Ej: Anticipo losa 2° piso" />

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Monto</label>
            <input style={S.input} type="number" value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Moneda</label>
            <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {form.moneda === "ARS" && (
            <div style={{ flex: 1 }}>
              <label style={S.label}>Dólar del día</label>
              <input style={S.input} type="number" value={form.tc} onChange={(e) => set("tc", e.target.value)} placeholder="ej 1530" />
            </div>
          )}
        </div>

        <label style={S.label}>Estado fiscal</label>
        <select style={S.input} value={form.estadoFiscal} onChange={(e) => set("estadoFiscal", e.target.value)}>
          {ESTADOS_FISCAL.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Medio</label>
            <select style={S.input} value={form.medioPago} onChange={(e) => set("medioPago", e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>

        <label style={S.label}>Notas</label>
        <input style={S.input} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Opcional" />

        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar egreso"}
          </button>
          {editandoId && <button style={{ ...S.btn("blue", true), cursor: "pointer" }} onClick={() => { setEditandoId(null); setForm(FORM_EGR_VACIO); setError(""); }}>Cancelar</button>}
        </div>
      </div>

      <div>
        {/* Resumen por moneda */}
        {["ARS", "USD"].map((mon) => {
          const r = resumenMoneda(mon);
          if (r.total === 0) return null;
          return (
            <div key={mon} style={{ ...S.panel, marginBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "6px" }}>Total egresos {mon}: {fmt(r.total, mon)}</div>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px" }}>
                <span style={{ color: COLORS.verde }}>● Con factura: {fmt(r.conF, mon)}</span>
                <span style={{ color: COLORS.amarillo }}>● Sin factura: {fmt(r.sinF, mon)}</span>
                <span style={{ color: COLORS.muted }}>● Pendiente: {fmt(r.pend, mon)}</span>
              </div>
            </div>
          );
        })}

        {/* Cruce por contrato */}
        {contratos.length > 0 && (
          <div style={{ ...S.panel, marginBottom: "10px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "8px" }}>Pagado por contrato</div>
            {contratos.map((c) => {
              const pagos = pagosDe(c.id);
              const pagado = suma(pagos);
              const conF = suma(pagos.filter((p) => p.estadoFiscal === "con_factura"));
              const sinF = suma(pagos.filter((p) => p.estadoFiscal === "sin_factura"));
              const resta = (Number(c.montoTotal) || 0) - pagado;
              return (
                <div key={c.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "6px 0", fontSize: "11px" }}>
                  <div style={{ fontWeight: 600, color: COLORS.text, fontSize: "12px" }}>{c.nombre} · {c.rubro}</div>
                  <div style={{ color: COLORS.muted }}>
                    Contrato {fmt(c.montoTotal, c.moneda)} · pagado {fmt(pagado, c.moneda)} (c/factura {fmt(conF, c.moneda)}, s/factura {fmt(sinF, c.moneda)}) · <span style={{ color: resta > 0 ? COLORS.amarillo : COLORS.verde }}>resta {fmt(resta, c.moneda)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Listado de egresos */}
        <div style={S.panel}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>Egresos ({egresos.length})</div>
          {egresos.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no cargaste egresos.</div>}
          {egresos.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((e) => (
            <div key={e.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>
                  {e.concepto} {e.categoria === "contratista" && e.contratoId ? <span style={{ color: COLORS.muted, fontWeight: 400 }}>· {nombreContrato(e.contratoId)}</span> : null}
                </div>
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  {nombreCategoria(e.categoria)} · {e.fecha} · {e.medioPago} · <span style={{ color: colorFiscal(e.estadoFiscal) }}>{labelFiscal(e.estadoFiscal)}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.text }}>{fmt(e.monto, e.moneda)}</span>
                <button style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => editar(e)}>Editar</button>
                <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(e)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CATEGORIAS_INGRESO = [
  { id: "inversor", label: "Inversor" },
  { id: "venta_cuota", label: "Venta / Cuota" },
  { id: "reserva", label: "Reserva" },
  { id: "otro", label: "Otro" },
];

const FORM_ING_VACIO = { categoria: "venta_cuota", clienteId: "", nombreLibre: "", concepto: "", monto: "", moneda: "ARS", tc: "", estadoFiscal: "con_factura", fecha: new Date().toISOString().slice(0, 10), medioPago: "transferencia", notas: "" };

function TabIngresos({ orgId, devId, fmt }) {
  const [ingresos, setIngresos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cuotasCliente, setCuotasCliente] = useState([]); // cuotas + anticipo del cliente
  const [cargandoCuotas, setCargandoCuotas] = useState(false);
  const [form, setForm] = useState(FORM_ING_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId || !devId) { setIngresos([]); return; }
    getIngresos(orgId, devId).then(setIngresos).catch(() => setIngresos([]));
  }, [orgId, devId]);

  useEffect(() => {
    if (!orgId) return;
    getClientes(orgId).then(setClientes).catch(() => setClientes([]));
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !devId || !form.clienteId || !usaCliente(form.categoria)) {
      setCuotasCliente([]);
      return;
    }
    let cancel = false;
    setCargandoCuotas(true);
    (async () => {
      try {
        const boletos = await getBoletos(orgId, devId);
        const delCliente = (boletos || []).filter((b) => b.clienteId === form.clienteId);
        const todas = [];
        for (const b of delCliente) {
          const anticipo = Number(b.anticipo || 0);
          if (anticipo > 0) {
            todas.push({
              boletoId: b.id, boletoMoneda: b.moneda,
              numero: "anticipo", esAnticipo: true,
              vencimiento: b.fecha || "",
              montoAjustado: anticipo, montoOriginal: anticipo,
              estado: "",
            });
          }
          const cuotas = await getCuotas(orgId, devId, b.id).catch(() => []);
          cuotas.forEach((c) => todas.push({ ...c, boletoId: b.id, boletoMoneda: b.moneda }));
        }
        if (!cancel) setCuotasCliente(todas);
      } catch { if (!cancel) setCuotasCliente([]); }
      if (!cancel) setCargandoCuotas(false);
    })();
    return () => { cancel = true; };
  }, [orgId, devId, form.clienteId, form.categoria]);

  function elegirCuota(cuotaKey) {
    if (!cuotaKey) return;
    const [boletoId, numero] = cuotaKey.split("|");
    const c = cuotasCliente.find((x) => x.boletoId === boletoId && String(x.numero) === numero);
    if (!c) return;
    const monto = c.montoAjustado ?? c.montoOriginal ?? "";
    setForm((f) => ({
      ...f,
      monto: monto ? String(monto) : f.monto,
      moneda: c.boletoMoneda || f.moneda,
      concepto: c.esAnticipo
        ? `Anticipo del boleto${c.vencimiento ? " (" + c.vencimiento + ")" : ""}`
        : `Cuota ${c.numero}${c.vencimiento ? " (vence " + c.vencimiento + ")" : ""}`,
    }));
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const usaCliente = (cat) => cat === "venta_cuota" || cat === "reserva";

  async function guardar() {
    setError("");
    if (!form.concepto.trim()) { setError("El ingreso necesita un concepto."); return; }
    if (!(Number(form.monto) > 0)) { setError("El monto debe ser mayor a cero."); return; }
    if (usaCliente(form.categoria) && !form.clienteId) { setError("Elegí el cliente de este ingreso."); return; }
    if (!usaCliente(form.categoria) && !form.nombreLibre.trim()) { setError("Cargá el nombre (inversor u origen del ingreso)."); return; }
    setGuardando(true);
    try {
      await saveIngreso(orgId, devId, {
        ...(editandoId ? { id: editandoId } : {}),
        categoria: form.categoria,
        clienteId: usaCliente(form.categoria) ? form.clienteId : "",
        nombreLibre: usaCliente(form.categoria) ? "" : form.nombreLibre.trim(),
        concepto: form.concepto.trim(),
        monto: Number(form.monto),
        moneda: form.moneda,
        tc: form.moneda === "ARS" ? (Number(form.tc) || 0) : 0,
        estadoFiscal: form.estadoFiscal,
        fecha: form.fecha,
        medioPago: form.medioPago,
        notas: form.notas.trim(),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_ING_VACIO); setEditandoId(null);
      setIngresos(await getIngresos(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }

  function editar(i) {
    setEditandoId(i.id);
    setForm({ categoria: i.categoria, clienteId: i.clienteId || "", nombreLibre: i.nombreLibre || "",
      concepto: i.concepto, monto: String(i.monto), moneda: i.moneda, tc: i.tc != null ? String(i.tc) : "", estadoFiscal: i.estadoFiscal,
      fecha: i.fecha, medioPago: i.medioPago, notas: i.notas || "" });
  }

  async function borrar(i) {
    if (!window.confirm(`¿Borrar el ingreso "${i.concepto}"?`)) return;
    try { await deleteIngreso(orgId, devId, i.id); setIngresos(await getIngresos(orgId, devId)); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }

  const nombreCliente = (id) => clientes.find((c) => c.id === id)?.nombre || "(cliente borrado)";
  const nombreCategoria = (id) => CATEGORIAS_INGRESO.find((c) => c.id === id)?.label || id;
  const labelFiscal = (id) => ESTADOS_FISCAL.find((f) => f.id === id)?.label || id;
  const colorFiscal = (id) => id === "con_factura" ? COLORS.verde : id === "sin_factura" ? COLORS.amarillo : COLORS.muted;

  const suma = (arr) => arr.reduce((s, i) => s + (Number(i.monto) || 0), 0);
  const resumenMoneda = (mon) => {
    const arr = ingresos.filter((i) => i.moneda === mon);
    return {
      total: suma(arr),
      conF: suma(arr.filter((i) => i.estadoFiscal === "con_factura")),
      sinF: suma(arr.filter((i) => i.estadoFiscal === "sin_factura")),
      pend: suma(arr.filter((i) => i.estadoFiscal === "pendiente")),
    };
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
          {editandoId ? "Editar ingreso" : "Nuevo ingreso"}
        </div>
        {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}

        <label style={S.label}>Categoría</label>
        <select style={S.input} value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CATEGORIAS_INGRESO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        {usaCliente(form.categoria) ? (
          <>
            <label style={S.label}>Cliente</label>
            <select style={S.input} value={form.clienteId} onChange={(e) => set("clienteId", e.target.value)}>
              <option value="">— Elegir cliente —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {form.clienteId && (
              <div style={{ marginTop: "8px" }}>
                <label style={S.label}>Traer datos de una cuota o anticipo (opcional)</label>
                {cargandoCuotas ? (
                  <div style={{ fontSize: "11px", color: COLORS.muted }}>Buscando boletos del cliente...</div>
                ) : cuotasCliente.length === 0 ? (
                  <div style={{ fontSize: "11px", color: COLORS.muted }}>Este cliente no tiene boletos con cuotas en este desarrollo. Cargá el monto a mano.</div>
                ) : (
                  <>
                    <select style={S.input} defaultValue="" onChange={(e) => { elegirCuota(e.target.value); e.target.value = ""; }}>
                      <option value="">— Elegir cuota/anticipo para autocompletar —</option>
                      {cuotasCliente.map((c) => (
                        <option key={c.boletoId + "|" + c.numero} value={c.boletoId + "|" + c.numero}>
                          {c.esAnticipo ? "Anticipo" : "Cuota " + c.numero}{c.vencimiento ? " · " + (c.esAnticipo ? "" : "vence ") + c.vencimiento : ""}{c.estado ? " · " + c.estado : ""} · {(c.boletoMoneda === "USD" ? "USD " : "$ ") + Number(c.montoAjustado ?? c.montoOriginal ?? 0).toLocaleString("es-AR")}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "3px" }}>Al elegir, se completan monto, moneda y concepto. Podés ajustarlos después. No modifica el boleto.</div>
                  </>
                )}
              </div>
            )}
            {clientes.length === 0 && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginTop: "3px" }}>No hay clientes cargados. Cargalos en el módulo 👥 Clientes.</div>}
          </>
        ) : (
          <>
            <label style={S.label}>{form.categoria === "inversor" ? "Inversor" : "Origen"}</label>
            <input style={S.input} value={form.nombreLibre} onChange={(e) => set("nombreLibre", e.target.value)} placeholder="Ej: Aporte Juan Pérez" />
          </>
        )}

        <label style={S.label}>Concepto</label>
        <input style={S.input} value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Ej: Cuota 3 depto 2B" />

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Monto</label>
            <input style={S.input} type="number" value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Moneda</label>
            <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {form.moneda === "ARS" && (
            <div style={{ flex: 1 }}>
              <label style={S.label}>Dólar del día</label>
              <input style={S.input} type="number" value={form.tc} onChange={(e) => set("tc", e.target.value)} placeholder="ej 1530" />
            </div>
          )}
        </div>

        <label style={S.label}>Estado fiscal</label>
        <select style={S.input} value={form.estadoFiscal} onChange={(e) => set("estadoFiscal", e.target.value)}>
          {ESTADOS_FISCAL.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>

        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Medio</label>
            <select style={S.input} value={form.medioPago} onChange={(e) => set("medioPago", e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>

        <label style={S.label}>Notas</label>
        <input style={S.input} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Opcional" />

        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar ingreso"}
          </button>
          {editandoId && <button style={{ ...S.btn("blue", true), cursor: "pointer" }} onClick={() => { setEditandoId(null); setForm(FORM_ING_VACIO); setError(""); }}>Cancelar</button>}
        </div>
      </div>

      <div>
        {["ARS", "USD"].map((mon) => {
          const r = resumenMoneda(mon);
          if (r.total === 0) return null;
          return (
            <div key={mon} style={{ ...S.panel, marginBottom: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "6px" }}>Total ingresos {mon}: {fmt(r.total, mon)}</div>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "11px" }}>
                <span style={{ color: COLORS.verde }}>● Con factura: {fmt(r.conF, mon)}</span>
                <span style={{ color: COLORS.amarillo }}>● Sin factura: {fmt(r.sinF, mon)}</span>
                <span style={{ color: COLORS.muted }}>● Pendiente: {fmt(r.pend, mon)}</span>
              </div>
            </div>
          );
        })}

        <div style={S.panel}>
          <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>Ingresos ({ingresos.length})</div>
          {ingresos.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no cargaste ingresos.</div>}
          {ingresos.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((i) => (
            <div key={i.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>
                  {i.concepto} <span style={{ color: COLORS.muted, fontWeight: 400 }}>· {i.clienteId ? nombreCliente(i.clienteId) : i.nombreLibre}</span>
                </div>
                <div style={{ fontSize: "11px", color: COLORS.muted }}>
                  {nombreCategoria(i.categoria)} · {i.fecha} · {i.medioPago} · <span style={{ color: colorFiscal(i.estadoFiscal) }}>{labelFiscal(i.estadoFiscal)}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.verde }}>{fmt(i.monto, i.moneda)}</span>
                <button style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => editar(i)}>Editar</button>
                <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(i)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabArqueo({ orgId, devId, fmt }) {
  const [egresos, setEgresos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [tc, setTc] = useState("");
  const [cargando, setCargando] = useState(true);
  const [analizando, setAnalizando] = useState(false);
  const [informe, setInforme] = useState("");
  const [errorIA, setErrorIA] = useState("");

  useEffect(() => {
    if (!orgId || !devId) { setEgresos([]); setIngresos([]); setCargando(false); return; }
    setCargando(true);
    Promise.all([getEgresos(orgId, devId), getIngresos(orgId, devId)])
      .then(([egs, ings]) => { setEgresos(egs); setIngresos(ings); })
      .catch(() => { setEgresos([]); setIngresos([]); })
      .finally(() => setCargando(false));
  }, [orgId, devId]);

  const suma = (arr, mon) => arr.filter((x) => x.moneda === mon).reduce((s, x) => s + (Number(x.monto) || 0), 0);
  const sumaFiscal = (arr, mon, estado) => arr.filter((x) => x.moneda === mon && x.estadoFiscal === estado).reduce((s, x) => s + (Number(x.monto) || 0), 0);

  const ingARS = suma(ingresos, "ARS"), ingUSD = suma(ingresos, "USD");
  const egrARS = suma(egresos, "ARS"), egrUSD = suma(egresos, "USD");
  const posARS = ingARS - egrARS, posUSD = ingUSD - egrUSD;

  const tcNum = Number(tc) > 0 ? Number(tc) : null;

  // Consolidado en USD (convierte ARS a USD con el TC)
  const consolidado = tcNum
    ? { ing: ingUSD + ingARS / tcNum, egr: egrUSD + egrARS / tcNum, pos: posUSD + posARS / tcNum }
    : null;

  // Egresos por categoría (consolidado a USD si hay TC, si no muestra por moneda)
  const categorias = [...new Set(egresos.map((e) => e.categoria))];
  const egrPorCategoria = categorias.map((cat) => {
    const arr = egresos.filter((e) => e.categoria === cat);
    const ars = arr.filter((e) => e.moneda === "ARS").reduce((s, e) => s + (Number(e.monto) || 0), 0);
    const usd = arr.filter((e) => e.moneda === "USD").reduce((s, e) => s + (Number(e.monto) || 0), 0);
    const usdTotal = tcNum ? usd + ars / tcNum : null;
    return { cat, ars, usd, usdTotal };
  }).sort((a, b) => {
    if (a.usdTotal != null && b.usdTotal != null) return b.usdTotal - a.usdTotal;
    return (b.ars + b.usd) - (a.ars + a.usd);
  });

  const nombreCat = (id) => (CATEGORIAS_EGRESO.find((c) => c.id === id)?.label || id);

  // Exposición documental (todo el movimiento, ambas monedas, a USD si hay TC)
  const totalMovimiento = (estado) => {
    const eA = sumaFiscal(egresos, "ARS", estado) + sumaFiscal(ingresos, "ARS", estado);
    const eU = sumaFiscal(egresos, "USD", estado) + sumaFiscal(ingresos, "USD", estado);
    return { ars: eA, usd: eU };
  };
  const conF = totalMovimiento("con_factura"), sinF = totalMovimiento("sin_factura"), pend = totalMovimiento("pendiente");

  function analizarRiesgo() {
    setErrorIA(""); setInforme(""); setAnalizando(true);
    const jobId = "job-" + Date.now();
    const arqueo = {
      contratos: (egresos.length || ingresos.length) ? undefined : undefined, // placeholder
      posicionARS: { ingresos: ingARS, egresos: egrARS, posicion: posARS },
      posicionUSD: { ingresos: ingUSD, egresos: egrUSD, posicion: posUSD },
      egresosPorCategoria: egrPorCategoria.map((c) => ({ categoria: c.cat, ars: c.ars, usd: c.usd })),
      contratosDetalle: [],
    };
    // Enriquecer con contratos y pagado/resta desde los egresos ya cargados
    const contratosMap = {};
    egresos.forEach((e) => {
      if (e.categoria === "contratista" && e.contratoId) {
        contratosMap[e.contratoId] = (contratosMap[e.contratoId] || 0) + (Number(e.monto) || 0);
      }
    });
    arqueo.exposicionDocumental = {
      conFactura: { ars: conF.ars, usd: conF.usd },
      sinFactura: { ars: sinF.ars, usd: sinF.usd },
      pendiente: { ars: pend.ars, usd: pend.usd },
    };
    fetch("/.netlify/functions/agent-financiero-background", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, jobId, desarrollo: devId, arqueo, tc: tcNum || null }),
    }).catch(() => {});
    const jobRef = doc(db, "orgs", orgId, "jobs", jobId);
    const unsub = onSnapshot(jobRef, (snap) => {
      const j = snap.data();
      if (!j) return;
      if (j.estado === "listo") { unsub(); setInforme(j.resultado || "(sin respuesta)"); setAnalizando(false); }
      else if (j.estado === "error") { unsub(); setErrorIA(j.detalle || "Error en el análisis."); setAnalizando(false); }
    });
    setTimeout(() => { try { unsub(); } catch (_) {} if (analizando) setAnalizando(false); }, 90000);
  }

  if (cargando) return <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>Calculando arqueo...</div>;

  const Bloque = ({ titulo, ing, egr, pos, mon }) => (
    <div style={{ ...S.panel, marginBottom: "12px" }}>
      <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, marginBottom: "8px" }}>{titulo}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0" }}>
        <span style={{ color: COLORS.muted }}>Ingresos</span><span style={{ color: COLORS.verde, fontWeight: 600 }}>{fmt(ing, mon)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0" }}>
        <span style={{ color: COLORS.muted }}>Egresos</span><span style={{ color: COLORS.rojo, fontWeight: 600 }}>− {fmt(egr, mon)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "8px 0 0", borderTop: `1px solid ${COLORS.border}`, marginTop: "4px" }}>
        <span style={{ color: COLORS.text, fontWeight: 700 }}>Posición</span>
        <span style={{ color: pos >= 0 ? COLORS.verde : COLORS.rojo, fontWeight: 800 }}>{fmt(pos, mon)}</span>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Bloque titulo="En Pesos (ARS)" ing={ingARS} egr={egrARS} pos={posARS} mon="ARS" />
        <Bloque titulo="En Dólares (USD)" ing={ingUSD} egr={egrUSD} pos={posUSD} mon="USD" />
      </div>

      <div style={{ ...S.panel, marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: consolidado ? "10px" : "0" }}>
          <span style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold }}>Consolidado en USD</span>
          <label style={{ fontSize: "11px", color: COLORS.muted }}>TC $/USD:</label>
          <input style={{ ...S.input, width: "110px", margin: 0 }} type="number" value={tc} onChange={(e) => setTc(e.target.value)} placeholder="ej 1480" />
        </div>
        {consolidado ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0" }}>
              <span style={{ color: COLORS.muted }}>Ingresos totales</span><span style={{ color: COLORS.verde, fontWeight: 600 }}>{fmt(Math.round(consolidado.ing), "USD")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0" }}>
              <span style={{ color: COLORS.muted }}>Egresos totales</span><span style={{ color: COLORS.rojo, fontWeight: 600 }}>− {fmt(Math.round(consolidado.egr), "USD")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", padding: "8px 0 0", borderTop: `1px solid ${COLORS.border}`, marginTop: "4px" }}>
              <span style={{ color: COLORS.text, fontWeight: 800 }}>RESULTADO</span>
              <span style={{ color: consolidado.pos >= 0 ? COLORS.verde : COLORS.rojo, fontWeight: 800 }}>{fmt(Math.round(consolidado.pos), "USD")}</span>
            </div>
            <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "6px" }}>Consolidado al TC ${Number(tc).toLocaleString("es-AR")} que ingresaste. Es un valor de referencia — el TC real de cada operación puede diferir.</div>
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: COLORS.muted }}>Ingresá un tipo de cambio para ver el resultado consolidado en una sola moneda.</div>
        )}
      </div>

      {/* Exposición documental */}
      <div style={{ ...S.panel, marginBottom: "12px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "8px" }}>Exposición documental (todo el movimiento)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "11px" }}>
          <div><div style={{ color: COLORS.verde, fontWeight: 600 }}>● Con factura</div><div style={{ color: COLORS.muted }}>{fmt(conF.ars, "ARS")}</div><div style={{ color: COLORS.muted }}>{fmt(conF.usd, "USD")}</div></div>
          <div><div style={{ color: COLORS.amarillo, fontWeight: 600 }}>● Sin factura</div><div style={{ color: COLORS.muted }}>{fmt(sinF.ars, "ARS")}</div><div style={{ color: COLORS.muted }}>{fmt(sinF.usd, "USD")}</div></div>
          <div><div style={{ color: COLORS.muted, fontWeight: 600 }}>● Pendiente</div><div style={{ color: COLORS.muted }}>{fmt(pend.ars, "ARS")}</div><div style={{ color: COLORS.muted }}>{fmt(pend.usd, "USD")}</div></div>
        </div>
      </div>

      {/* Egresos por categoría */}
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.text, marginBottom: "8px" }}>Egresos por categoría</div>
        {egrPorCategoria.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Sin egresos cargados.</div>}
        {egrPorCategoria.map((c) => (
          <div key={c.cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: "12px" }}>
            <span style={{ color: COLORS.text }}>{nombreCat(c.cat)}</span>
            <span style={{ color: COLORS.muted, textAlign: "right" }}>
              {c.ars > 0 ? fmt(c.ars, "ARS") : ""}{c.ars > 0 && c.usd > 0 ? " + " : ""}{c.usd > 0 ? fmt(c.usd, "USD") : ""}
              {c.usdTotal != null ? <span style={{ color: COLORS.gold }}> · ≈{fmt(Math.round(c.usdTotal), "USD")}</span> : null}
            </span>
          </div>
        ))}
      </div>

      <div style={{ ...S.panel, marginTop: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold }}>🤖 Análisis de riesgo (IA)</span>
          <button style={{ ...S.btn(), cursor: analizando ? "wait" : "pointer" }} disabled={analizando} onClick={analizarRiesgo}>
            {analizando ? "Analizando..." : "Analizar salud financiera"}
          </button>
        </div>
        {errorIA && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginTop: "8px", fontSize: "12px", color: COLORS.rojo }}>{errorIA}</div>}
        {informe && (
          <div style={{ marginTop: "10px", padding: "12px", background: COLORS.bg, borderRadius: "6px", border: `1px solid ${COLORS.border}`, fontSize: "12.5px", lineHeight: 1.55, color: COLORS.text, whiteSpace: "pre-wrap" }}>
            {informe}
          </div>
        )}
      </div>
    </div>
  );
}

const FORM_APT_VACIO = { nombre: "", participacion: "" };
function TabAportantes({ orgId, devId }) {
  const [aportantes, setAportantes] = useState([]);
  const [form, setForm] = useState(FORM_APT_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!orgId || !devId) { setAportantes([]); return; }
    getAportantes(orgId, devId).then(setAportantes).catch(() => setAportantes([]));
  }, [orgId, devId]);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  async function guardar() {
    setError("");
    if (!form.nombre.trim()) { setError("El aportante necesita un nombre."); return; }
    const p = Number(form.participacion);
    if (!(p > 0) || p > 100) { setError("La participación debe ser un porcentaje entre 0 y 100."); return; }
    setGuardando(true);
    try {
      await saveAportante(orgId, devId, {
        ...(editandoId ? { id: editandoId } : {}),
        nombre: form.nombre.trim(),
        participacion: p,
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_APT_VACIO); setEditandoId(null);
      setAportantes(await getAportantes(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }
  function editar(a) {
    setEditandoId(a.id);
    setForm({ nombre: a.nombre, participacion: String(a.participacion) });
  }
  async function borrar(a) {
    if (!window.confirm(`¿Borrar al aportante ${a.nombre}?`)) return;
    try { await deleteAportante(orgId, devId, a.id); setAportantes(await getAportantes(orgId, devId)); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }
  const totalPct = aportantes.reduce((s, a) => s + (Number(a.participacion) || 0), 0);
  const cierra = Math.abs(totalPct - 100) < 0.001;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
          {editandoId ? "Editar aportante" : "Nuevo aportante"}
        </div>
        {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}
        <label style={S.label}>Nombre</label>
        <input style={S.input} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Martín" />
        <label style={S.label}>Participación (%)</label>
        <input style={S.input} type="number" min="0" max="100" value={form.participacion} onChange={(e) => set("participacion", e.target.value)} placeholder="Ej: 50" />
        <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "3px" }}>El % con el que entra a participar. Cada uno debe aportar ese % de los gastos del desarrollo.</div>
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
          <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
            {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Agregar aportante"}
          </button>
          {editandoId && <button style={{ ...S.btn("blue", true), cursor: "pointer" }} onClick={() => { setEditandoId(null); setForm(FORM_APT_VACIO); setError(""); }}>Cancelar</button>}
        </div>
      </div>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>
          Aportantes ({aportantes.length})
        </div>
        {aportantes.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no cargaste aportantes para este desarrollo.</div>}
        {aportantes.map((a) => (
          <div key={a.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>{a.nombre}</div>
              <div style={{ fontSize: "11px", color: COLORS.muted }}>participación {a.participacion}%</div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button style={{ ...S.btn("blue", true), cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => editar(a)}>Editar</button>
              <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(a)}>✕</button>
            </div>
          </div>
        ))}
        {aportantes.length > 0 && (
          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700 }}>
            <span style={{ color: COLORS.text }}>Participación total</span>
            <span style={{ color: cierra ? COLORS.verde : COLORS.amarillo }}>
              {totalPct}% {cierra ? "✅" : "⚠️ debería sumar 100%"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const FORM_APC_VACIO = { aportanteId: "", monto: "", moneda: "ARS", tc: "", fecha: new Date().toISOString().slice(0, 10), concepto: "" };
function TabAportesCaja({ orgId, devId, fmt }) {
  const [aportantes, setAportantes] = useState([]);
  const [aportes, setAportes] = useState([]);
  const [form, setForm] = useState(FORM_APC_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!orgId || !devId) { setAportantes([]); setAportes([]); return; }
    getAportantes(orgId, devId).then(setAportantes).catch(() => setAportantes([]));
    getAportesCaja(orgId, devId).then(setAportes).catch(() => setAportes([]));
  }, [orgId, devId]);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  const nombre = (id) => aportantes.find((a) => a.id === id)?.nombre || "(aportante borrado)";
  async function guardar() {
    setError("");
    if (!form.aportanteId) { setError("Elegí quién hace el aporte."); return; }
    if (!(Number(form.monto) > 0)) { setError("El monto debe ser mayor a cero."); return; }
    setGuardando(true);
    try {
      await saveAporteCaja(orgId, devId, {
        aportanteId: form.aportanteId,
        monto: Number(form.monto),
        moneda: form.moneda,
        tc: form.moneda === "ARS" ? (Number(form.tc) || 0) : 0,
        fecha: form.fecha,
        concepto: form.concepto.trim(),
        creadoEn: new Date().toISOString(),
      });
      setForm(FORM_APC_VACIO);
      setAportes(await getAportesCaja(orgId, devId));
    } catch (e) { setError("No se pudo guardar: " + e.message); }
    setGuardando(false);
  }
  async function borrar(a) {
    if (!window.confirm("¿Borrar este aporte a la caja?")) return;
    try { await deleteAporteCaja(orgId, devId, a.id); setAportes(await getAportesCaja(orgId, devId)); }
    catch (e) { setError("No se pudo borrar: " + e.message); }
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "16px", alignItems: "start" }}>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px", color: COLORS.text }}>Aporte a la caja</div>
        <div style={{ fontSize: "10px", color: COLORS.muted, marginBottom: "10px" }}>Plata que cada socio pone en el fondo común. Si la caja no alcanza y alguien paga un gasto de su bolsillo, cargalo también acá como aporte suyo.</div>
        {error && <div style={{ background: "#ef444420", border: `1px solid ${COLORS.rojo}`, borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", color: COLORS.rojo }}>{error}</div>}
        <label style={S.label}>Aportante</label>
        <select style={S.input} value={form.aportanteId} onChange={(e) => set("aportanteId", e.target.value)}>
          <option value="">— Elegir —</option>
          {aportantes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        {aportantes.length === 0 && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginTop: "3px" }}>Cargá aportantes arriba primero.</div>}
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ flex: 2 }}>
            <label style={S.label}>Monto</label>
            <input style={S.input} type="number" value={form.monto} onChange={(e) => set("monto", e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Moneda</label>
            <select style={S.input} value={form.moneda} onChange={(e) => set("moneda", e.target.value)}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          {form.moneda === "ARS" && (
            <div style={{ flex: 1 }}>
              <label style={S.label}>Dólar del día</label>
              <input style={S.input} type="number" value={form.tc} onChange={(e) => set("tc", e.target.value)} placeholder="ej 1530" />
            </div>
          )}
        </div>
        <label style={S.label}>Fecha</label>
        <input style={S.input} type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
        <label style={S.label}>Concepto</label>
        <input style={S.input} value={form.concepto} onChange={(e) => set("concepto", e.target.value)} placeholder="Opcional" />
        <div style={{ marginTop: "10px" }}>
          <button style={{ ...S.btn(), cursor: "pointer" }} disabled={guardando} onClick={guardar}>
            {guardando ? "Guardando..." : "Agregar aporte"}
          </button>
        </div>
      </div>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "10px", color: COLORS.text }}>Aportes a la caja ({aportes.length})</div>
        {aportes.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Todavía no hay aportes a la caja.</div>}
        {aportes.slice().sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "")).map((a) => (
          <div key={a.id} style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: COLORS.text }}>{nombre(a.aportanteId)}</div>
              <div style={{ fontSize: "11px", color: COLORS.muted }}>{a.fecha}{a.concepto ? " · " + a.concepto : ""}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: COLORS.verde }}>{fmt(a.monto, a.moneda)}</span>
              <button style={{ background: "none", border: `1px solid ${COLORS.rojo}`, color: COLORS.rojo, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px" }} onClick={() => borrar(a)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabPosicion({ orgId, devId, fmt }) {
  const [aportantes, setAportantes] = useState([]);
  const [aportes, setAportes] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [tc, setTc] = useState("1000");
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!orgId || !devId) { setAportantes([]); setAportes([]); setIngresos([]); setEgresos([]); setCargando(false); return; }
    setCargando(true);
    Promise.all([
      getAportantes(orgId, devId).catch(() => []),
      getAportesCaja(orgId, devId).catch(() => []),
      getIngresos(orgId, devId).catch(() => []),
      getEgresos(orgId, devId).catch(() => []),
    ]).then(([ap, apc, ing, egr]) => { setAportantes(ap); setAportes(apc); setIngresos(ing); setEgresos(egr); })
      .finally(() => setCargando(false));
  }, [orgId, devId]);
  const tcRefNum = Number(tc) > 0 ? Number(tc) : 1000;
  const aUSDmov = (m) => {
    if (m.moneda === "USD") return Number(m.monto || 0);
    const t = Number(m.tc) > 0 ? Number(m.tc) : tcRefNum;
    return Number(m.monto || 0) / t;
  };
  const sumaARS = (arr) => arr.filter((x) => x.moneda === "ARS").reduce((s, x) => s + Number(x.monto || 0), 0);
  const sumaUSD = (arr) => arr.filter((x) => x.moneda === "USD").reduce((s, x) => s + Number(x.monto || 0), 0);
  const sumaCons = (arr) => arr.reduce((s, x) => s + aUSDmov(x), 0);
  const fmtUSD = (n) => "USD " + Math.round(Number(n) || 0).toLocaleString("es-AR");
  if (cargando) return <div style={{ ...S.panel, color: COLORS.muted, fontSize: "13px" }}>Calculando posición...</div>;
  const sinTC = [...aportes, ...ingresos, ...egresos].filter((m) => m.moneda === "ARS" && !(Number(m.tc) > 0)).length;
  const apoARS = sumaARS(aportes), apoUSD = sumaUSD(aportes);
  const ingARS = sumaARS(ingresos), ingUSD = sumaUSD(ingresos);
  const egrARS = sumaARS(egresos), egrUSD = sumaUSD(egresos);
  const cajaARS = apoARS + ingARS - egrARS;
  const cajaUSD = apoUSD + ingUSD - egrUSD;
  const totalAportes = sumaCons(aportes);
  const totalIngresos = sumaCons(ingresos);
  const totalEgresos = sumaCons(egresos);
  const caja = totalAportes + totalIngresos - totalEgresos;
  const filas = aportantes.map((a) => {
    const aportado = aportes.filter((x) => x.aportanteId === a.id).reduce((s, x) => s + aUSDmov(x), 0);
    const correspondia = totalAportes * (Number(a.participacion) || 0) / 100;
    const saldo = aportado - correspondia;
    return { ...a, aportado, correspondia, saldo };
  });
  const sumaPart = aportantes.reduce((s, a) => s + (Number(a.participacion) || 0), 0);
  const colA = { minWidth: "115px", textAlign: "right" }, colU = { minWidth: "95px", textAlign: "right" };
  return (
    <div>
      <div style={{ ...S.panel, marginBottom: "12px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, marginBottom: "8px" }}>Caja del desarrollo — por moneda</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "14px", fontSize: "10px", color: COLORS.muted, marginBottom: "3px" }}>
          <span style={colA}>PESOS</span><span style={colU}>DÓLARES</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0" }}>
          <span style={{ color: COLORS.muted }}>Aportes de socios</span>
          <span style={{ display: "flex", gap: "14px" }}><span style={{ ...colA, color: COLORS.text }}>{fmt(apoARS, "ARS")}</span><span style={{ ...colU, color: COLORS.text }}>{fmt(apoUSD, "USD")}</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0" }}>
          <span style={{ color: COLORS.muted }}>Ventas / ingresos</span>
          <span style={{ display: "flex", gap: "14px" }}><span style={{ ...colA, color: COLORS.text }}>{fmt(ingARS, "ARS")}</span><span style={{ ...colU, color: COLORS.text }}>{fmt(ingUSD, "USD")}</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "3px 0" }}>
          <span style={{ color: COLORS.muted }}>Gastos</span>
          <span style={{ display: "flex", gap: "14px" }}><span style={{ ...colA, color: COLORS.rojo }}>− {fmt(egrARS, "ARS")}</span><span style={{ ...colU, color: COLORS.rojo }}>− {fmt(egrUSD, "USD")}</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 0 0", borderTop: `1px solid ${COLORS.border}`, marginTop: "4px", fontWeight: 800 }}>
          <span style={{ color: COLORS.text }}>Caja disponible</span>
          <span style={{ display: "flex", gap: "14px" }}>
            <span style={{ ...colA, color: cajaARS >= 0 ? COLORS.verde : COLORS.rojo }}>{fmt(cajaARS, "ARS")}</span>
            <span style={{ ...colU, color: cajaUSD >= 0 ? COLORS.verde : COLORS.rojo }}>{fmt(cajaUSD, "USD")}</span>
          </span>
        </div>
        <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "6px" }}>Los pesos y los dólares se muestran por separado (no se suman entre sí). Esta caja se reparte entre los socios por su participación recién al cierre del desarrollo.</div>
      </div>
      <div style={{ ...S.panel, marginBottom: "12px" }}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, marginBottom: "8px" }}>Consolidado en USD (al dólar de cada día)</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}>
          <span style={{ color: COLORS.muted }}>Aportes de socios</span><span style={{ color: COLORS.verde }}>{fmtUSD(totalAportes)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}>
          <span style={{ color: COLORS.muted }}>Ventas / ingresos</span><span style={{ color: COLORS.verde }}>{fmtUSD(totalIngresos)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "2px 0" }}>
          <span style={{ color: COLORS.muted }}>Gastos</span><span style={{ color: COLORS.rojo }}>− {fmtUSD(totalEgresos)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", padding: "8px 0 0", borderTop: `1px solid ${COLORS.border}`, marginTop: "4px" }}>
          <span style={{ color: COLORS.text, fontWeight: 800 }}>Caja consolidada</span>
          <span style={{ color: caja >= 0 ? COLORS.verde : COLORS.rojo, fontWeight: 800 }}>{fmtUSD(caja)}</span>
        </div>
        <div style={{ fontSize: "10px", color: COLORS.muted, marginTop: "6px" }}>Cada movimiento se convierte a dólares con el dólar del día en que se cargó. Mover el dólar no recalcula lo viejo.</div>
        {sinTC > 0 && (
          <div style={{ fontSize: "11px", color: COLORS.amarillo, marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            ⚠️ Hay {sinTC} movimiento(s) en pesos sin dólar del día. Se calculan con este dólar de referencia:
            <input type="number" value={tc} onChange={(e) => setTc(e.target.value)} style={{ ...S.input, width: "80px", margin: 0, padding: "3px 6px", fontSize: "11px" }} />
          </div>
        )}
      </div>
      <div style={S.panel}>
        <div style={{ fontWeight: 700, fontSize: "13px", color: COLORS.gold, marginBottom: "4px" }}>Posición de cada socio</div>
        <div style={{ fontSize: "10px", color: COLORS.muted, marginBottom: "10px" }}>Compara lo que puso cada uno contra su parte (su % del total aportado). Saldo a favor = se le debe; en contra = debe. La compensación la negocian entre ustedes.</div>
        {sumaPart !== 100 && aportantes.length > 0 && <div style={{ fontSize: "11px", color: COLORS.amarillo, marginBottom: "8px" }}>⚠️ Las participaciones suman {sumaPart}%, no 100%. Corregilo en Financiamiento para que el cálculo sea correcto.</div>}
        {filas.length === 0 && <div style={{ color: COLORS.muted, fontSize: "12px" }}>Cargá aportantes y aportes en el tab 🤝 Financiamiento.</div>}
        {filas.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ color: COLORS.muted, textAlign: "right" }}>
                  <th style={{ padding: "6px 8px", textAlign: "left" }}>Socio</th>
                  <th style={{ padding: "6px 8px" }}>Particip.</th>
                  <th style={{ padding: "6px 8px" }}>Aportó</th>
                  <th style={{ padding: "6px 8px" }}>Le correspondía</th>
                  <th style={{ padding: "6px 8px" }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} style={{ borderTop: `1px solid ${COLORS.border}`, textAlign: "right" }}>
                    <td style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: COLORS.text }}>{f.nombre}</td>
                    <td style={{ padding: "6px 8px", color: COLORS.muted }}>{f.participacion}%</td>
                    <td style={{ padding: "6px 8px", color: COLORS.text }}>{fmtUSD(f.aportado)}</td>
                    <td style={{ padding: "6px 8px", color: COLORS.muted }}>{fmtUSD(f.correspondia)}</td>
                    <td style={{ padding: "6px 8px", fontWeight: 700, color: f.saldo >= 0 ? COLORS.verde : COLORS.rojo }}>
                      {f.saldo >= 0 ? "+" : "−"}{fmtUSD(Math.abs(f.saldo))} {f.saldo >= 0 ? "(se le debe)" : "(debe)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
