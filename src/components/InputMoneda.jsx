import { useState } from "react";
/**
 * Campo de dinero con separador de miles estilo argentino.
 * - Muestra el número formateado (1.000.000) cuando NO está en foco.
 * - Al enfocar, deja editar libremente (sin puntos de miles, coma decimal).
 * - Guarda SIEMPRE un número "limpio" vía onChange (sin puntos de miles,
 *   punto como separador decimal) — listo para Number().
 *
 * Convención argentina: el punto es separador de MILES y la coma es DECIMAL.
 * Por eso "1.000.000" se interpreta como un millón, y "1000,50" como 1000.5.
 */
export default function InputMoneda({ value, onChange, style, placeholder, disabled }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const num = value === "" || value === null || value === undefined ? "" : Number(value);
  const formateado = num === "" || Number.isNaN(num) ? "" : num.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  const display = focused ? draft : formateado;
  function limpiar(raw) {
    const soloValidos = raw.replace(/[^0-9.,]/g, "");
    const sinMiles = soloValidos.replace(/\./g, "");
    const conPunto = sinMiles.replace(",", ".");
    const partes = conPunto.split(".");
    return partes.length > 1 ? partes[0] + "." + partes.slice(1).join("") : conPunto;
  }
  function handleChange(e) {
    const raw = e.target.value;
    setDraft(raw);
    onChange(limpiar(raw));
  }
  function handleFocus() {
    setFocused(true);
    setDraft(num === "" || Number.isNaN(num) ? "" : String(num).replace(".", ","));
  }
  function handleBlur() {
    setFocused(false);
  }
  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      style={style}
    />
  );
}
