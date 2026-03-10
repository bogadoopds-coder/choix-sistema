// Budget-related helper functions

// Resolves the effective price for an item: if there is a manual update, use that; otherwise use base price
export function precioVigente(codigo, precioBase, preciosActualizados) {
  const upd = preciosActualizados?.[codigo];
  if (upd && upd.length > 0) return upd[upd.length - 1].precio;
  return precioBase;
}

// Returns traffic-light status based on real consumption vs budgeted quantity
export function semaforo(consumidoReal, cantPresup) {
  if (!consumidoReal || !cantPresup || cantPresup === 0) return null;
  const pct = consumidoReal / cantPresup;
  if (pct <= 0.85) return "verde";
  if (pct <= 1.0) return "amarillo";
  return "rojo";
}

