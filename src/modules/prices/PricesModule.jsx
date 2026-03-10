import { useState, useMemo, useEffect } from "react";
import { ars } from "../../utils/format";
import { today } from "../../utils/date";
import { precioVigente } from "../../utils/budgets";
import { COLORS, S } from "../../styles/theme";
import { storage } from "../../services/storage";

// ─── GESTOR DE PRECIOS ────────────────────────────────────────────────────────
export function GestorPrecios({ preciosActualizados, setPreciosActualizados, BASE }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nota, setNota] = useState("");
  const [saved, setSaved] = useState(false);

  const resultados = useMemo(() => {
    if (search.length < 2) return [];
    return BASE.filter((b) => b.desc.toLowerCase().includes(search.toLowerCase()) || b.codigo.includes(search)).slice(0, 50);
  }, [search, BASE]);

  const actualizados = useMemo(() => {
    return Object.entries(preciosActualizados)
      .filter(([, hist]) => hist.length > 0)
      .map(([codigo, hist]) => {
        const base = BASE.find((b) => b.codigo === codigo);
        return { codigo, desc: base?.desc || codigo, um: base?.um || "", precioBase: base?.precio || 0, historial: hist };
      })
      .sort((a, b) => b.historial[b.historial.length - 1].fecha.localeCompare(a.historial[a.historial.length - 1].fecha));
  }, [preciosActualizados, BASE]);

  function guardarPrecio() {
    if (!selected || !nuevoPrecio) return;
    const entrada = { precio: parseFloat(nuevoPrecio), fecha: today(), nota: nota.trim() };
    setPreciosActualizados((prev) => {
      const hist = prev[selected.codigo] || [];
      return { ...prev, [selected.codigo]: [...hist, entrada] };
    });
    setSaved(true);
    setNuevoPrecio("");
    setNota("");
    setTimeout(() => setSaved(false), 2000);
  }

  function eliminarEntrada(codigo, idx) {
    setPreciosActualizados((prev) => {
      const hist = [...(prev[codigo] || [])];
      hist.splice(idx, 1);
      if (hist.length === 0) {
        const next = { ...prev };
        delete next[codigo];
        return next;
      }
      return { ...prev, [codigo]: hist };
    });
  }

  const countActualizados = Object.keys(preciosActualizados).length;

  return (
    <div>
      <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontWeight: 800, color: COLORS.gold, fontSize: "15px" }}>💲 ACTUALIZACIÓN DE PRECIOS</span>
        <span style={S.tag(COLORS.blue)}>{countActualizados} producto{countActualizados !== 1 ? "s" : ""} actualizados</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignItems: "start" }}>
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>CARGAR NUEVO PRECIO</div>
          <label style={S.label}>Buscar producto en la base</label>
          <input
            style={{ ...S.input, marginBottom: "10px" }}
            placeholder="Ej: cemento, hierro, malla..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); setSaved(false); }}
          />
          {resultados.length > 0 && !selected && (
            <div style={{ background: COLORS.subtle, borderRadius: "6px", maxHeight: "220px", overflowY: "auto", marginBottom: "10px" }}>
              {resultados.map((b) => {
                const vigente = precioVigente(b.codigo, b.precio, preciosActualizados);
                const actualizado = preciosActualizados?.[b.codigo]?.length > 0;
                return (
                  <div
                    key={b.codigo}
                    onClick={() => { setSelected(b); setSearch(b.desc); }}
                    style={{ padding: "7px 10px", cursor: "pointer", borderBottom: `1px solid ${COLORS.border}15`, display: "flex", gap: "10px", alignItems: "center" }}
                  >
                    <span style={{ color: COLORS.muted, fontSize: "10px", minWidth: "80px" }}>{b.codigo}</span>
                    <span style={{ flex: 1, fontSize: "11px" }}>{b.desc}</span>
                    <span style={{ color: actualizado ? COLORS.verde : COLORS.muted, fontSize: "11px", fontWeight: 700 }}>{ars(vigente)}</span>
                    {actualizado && <span style={S.tag(COLORS.verde)}>↑</span>}
                  </div>
                );
              })}
            </div>
          )}
          {selected && (
            <div style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: COLORS.muted, marginBottom: "2px" }}>{selected.codigo}</div>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px" }}>{selected.desc}</div>
              <div style={{ display: "flex", gap: "16px", fontSize: "11px" }}>
                <div><span style={{ color: COLORS.muted }}>Precio original (ago-25): </span><span>{ars(selected.precio)}</span></div>
                <div><span style={{ color: COLORS.muted }}>Precio vigente: </span><span style={{ color: COLORS.gold, fontWeight: 700 }}>{ars(precioVigente(selected.codigo, selected.precio, preciosActualizados))}</span></div>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gap: "10px" }}>
            <div>
              <label style={S.label}>Nuevo precio unitario ($)</label>
              <input style={S.input} type="number" placeholder="Ej: 320.00" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} disabled={!selected} />
            </div>
            <div>
              <label style={S.label}>Nota (opcional)</label>
              <input style={S.input} placeholder="Ej: Lista feb-26 proveedor X" value={nota} onChange={(e) => setNota(e.target.value)} disabled={!selected} />
            </div>
            <button style={S.btn("gold")} disabled={!selected || !nuevoPrecio} onClick={guardarPrecio}>
              {saved ? "✓ GUARDADO" : "GUARDAR PRECIO"}
            </button>
            {selected && nuevoPrecio && (
              <div style={{ fontSize: "11px", color: COLORS.muted }}>
                Variación vs original: <span style={{ color: parseFloat(nuevoPrecio) > selected.precio ? COLORS.rojo : COLORS.verde, fontWeight: 700 }}>
                  {parseFloat(nuevoPrecio) > selected.precio ? "+" : ""}{(((parseFloat(nuevoPrecio) - selected.precio) / selected.precio) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <div style={S.panel}>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: "12px", fontSize: "12px" }}>HISTORIAL DE PRECIOS ACTUALIZADOS</div>
          {actualizados.length === 0 ? (
            <div style={{ color: COLORS.muted, textAlign: "center", padding: "30px", fontSize: "12px" }}>
              Todavía no hay precios actualizados.<br />Buscá un producto a la izquierda y cargá el nuevo precio.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "500px", overflowY: "auto" }}>
              {actualizados.map((item) => {
                const vigente = item.historial[item.historial.length - 1];
                const variacion = ((vigente.precio - item.precioBase) / item.precioBase * 100).toFixed(1);
                return (
                  <div key={item.codigo} style={{ background: COLORS.subtle, borderRadius: "6px", padding: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        <div style={{ fontSize: "10px", color: COLORS.muted }}>{item.codigo} · {item.um}</div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.desc}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: COLORS.gold }}>{ars(vigente.precio)}</div>
                        <div style={{ fontSize: "10px", color: parseFloat(variacion) > 0 ? COLORS.rojo : COLORS.verde }}>{parseFloat(variacion) > 0 ? "+" : ""}{variacion}% vs original</div>
                      </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${COLORS.border}30`, paddingTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {item.historial.map((h, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                          <span style={{ color: COLORS.muted, minWidth: "80px" }}>{h.fecha}</span>
                          <span style={{ fontWeight: idx === item.historial.length - 1 ? 700 : 400, color: idx === item.historial.length - 1 ? COLORS.text : COLORS.muted }}>{ars(h.precio)}</span>
                          {h.nota && <span style={{ color: COLORS.muted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>— {h.nota}</span>}
                          {idx === item.historial.length - 1 && <span style={S.tag(COLORS.verde)}>VIGENTE</span>}
                          <button onClick={() => eliminarEntrada(item.codigo, idx)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: "11px", padding: "0 3px" }}>✕</button>
                        </div>
                      ))}
                    </div>
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

// ─── STANDALONE WRAPPER (Base Precios screen from sidebar) ─────────────────────
export function PresupuestosModulePrecios({ BASE }) {
  const [pa, setPa] = useState({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("choix_precios");
        if (r?.value) setPa(JSON.parse(r.value));
      } catch {}
      setReady(true);
    })();
  }, []);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        await storage.set("choix_precios", JSON.stringify(pa));
      } catch {}
    })();
  }, [pa, ready]);
  if (!ready) return <div style={{ padding: "40px", textAlign: "center", color: "#4a6055" }}>Cargando...</div>;
  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px", background: COLORS.bg }}>
      <GestorPrecios preciosActualizados={pa} setPreciosActualizados={setPa} BASE={BASE} />
    </div>
  );
}
