// ─── COSTOS LABORALES (referencia tipo UOCRA) ──────────────────────────────────
// Costo diario por categoría de trabajador (ARS/día). Valores de referencia.

const WORKER_DAILY_COST = {
  oficial: 85000,
  medio_oficial: 65000,
  ayudante: 50000,
};

// Cuadrillas por tipo de tarea: id -> [{ role, qty }]
const CREWS = {
  mamposteria: [{ role: "oficial", qty: 1 }, { role: "medio_oficial", qty: 1 }, { role: "ayudante", qty: 2 }],
  revoque: [{ role: "oficial", qty: 1 }, { role: "ayudante", qty: 2 }],
  pintura: [{ role: "oficial", qty: 1 }, { role: "ayudante", qty: 1 }],
  hormigon: [{ role: "oficial", qty: 1 }, { role: "medio_oficial", qty: 1 }, { role: "ayudante", qty: 3 }],
  excavacion: [{ role: "medio_oficial", qty: 1 }, { role: "ayudante", qty: 2 }],
  ceramica: [{ role: "oficial", qty: 1 }, { role: "ayudante", qty: 1 }],
  carpeta_contrapiso: [{ role: "oficial", qty: 1 }, { role: "ayudante", qty: 2 }],
  instalacion: [{ role: "oficial", qty: 1 }, { role: "ayudante", qty: 1 }],
  estructura: [{ role: "oficial", qty: 1 }, { role: "medio_oficial", qty: 1 }, { role: "ayudante", qty: 2 }],
};

export { WORKER_DAILY_COST, CREWS };
