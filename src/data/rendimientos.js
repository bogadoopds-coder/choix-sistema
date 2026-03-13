// ─── RENDIMIENTOS (unidades por día) para estimar duración y MO ────────────────
// Formato: { um, desc, rendimiento, crewId?, actividad? }
// actividad: true = ejecutable (obra), se calcula MO y días; actividad: false = insumo/material, no MO ni días.
// crewId enlaza con data/laborCosts CREWS (solo para actividades).

// Materiales/insumos: no crew, no rendimiento para MO/días (actividad: false).
// Incluir varias UM para que "acero", "cemento", etc. sigan siendo material aunque la partida tenga otra UM.
const MATERIALES = [
  { um: "KG", desc: "acero hierro armado", rendimiento: 0, actividad: false },
  { um: "UN", desc: "acero hierro", rendimiento: 0, actividad: false },
  { um: "KG", desc: "cemento portland", rendimiento: 0, actividad: false },
  { um: "UN", desc: "ladrillo hueco bloque", rendimiento: 0, actividad: false },
  { um: "ML", desc: "cañeria caño pvc tuberia", rendimiento: 0, actividad: false },
  { um: "UN", desc: "abertura puerta ventana marco", rendimiento: 0, actividad: false },
  { um: "M2", desc: "vidrio", rendimiento: 0, actividad: false },
  { um: "KG", desc: "cal", rendimiento: 0, actividad: false },
  { um: "M2", desc: "chapa techo", rendimiento: 0, actividad: false },
  { um: "UN", desc: "sanitario inodoro bidet", rendimiento: 0, actividad: false },
  { um: "ML", desc: "cable electrico", rendimiento: 0, actividad: false },
];

// Actividades ejecutables: tienen crew y rendimiento (actividad: true por defecto).
const ACTIVIDADES = [
  { um: "M2", desc: "revoque", rendimiento: 15, crewId: "revoque", actividad: true },
  { um: "M2", desc: "revoque fino", rendimiento: 12, crewId: "revoque", actividad: true },
  { um: "M2", desc: "pintura latex", rendimiento: 25, crewId: "pintura", actividad: true },
  { um: "M2", desc: "pintura", rendimiento: 22, crewId: "pintura", actividad: true },
  { um: "M2", desc: "enduido", rendimiento: 20, crewId: "pintura", actividad: true },
  { um: "M2", desc: "ceramico ceramica piso", rendimiento: 8, crewId: "ceramica", actividad: true },
  { um: "M2", desc: "ceramico pared", rendimiento: 6, crewId: "ceramica", actividad: true },
  { um: "M2", desc: "contrapiso", rendimiento: 25, crewId: "carpeta_contrapiso", actividad: true },
  { um: "M2", desc: "carpeta", rendimiento: 20, crewId: "carpeta_contrapiso", actividad: true },
  { um: "M2", desc: "membrana", rendimiento: 30, crewId: "instalacion", actividad: true },
  { um: "M2", desc: "aislante", rendimiento: 40, crewId: "instalacion", actividad: true },
  { um: "M2", desc: "placa yeso", rendimiento: 15, crewId: "revoque", actividad: true },
  { um: "M2", desc: "cielorraso", rendimiento: 18, crewId: "revoque", actividad: true },
  { um: "M3", desc: "hormigon concreto", rendimiento: 1.5, crewId: "hormigon", actividad: true },
  { um: "M3", desc: "excavacion", rendimiento: 8, crewId: "excavacion", actividad: true },
  { um: "M3", desc: "relleno", rendimiento: 15, crewId: "excavacion", actividad: true },
  { um: "M3", desc: "platea", rendimiento: 1, crewId: "hormigon", actividad: true },
  { um: "ML", desc: "caño instalacion", rendimiento: 20, crewId: "instalacion", actividad: true },
  { um: "ML", desc: "cordon", rendimiento: 15, crewId: "hormigon", actividad: true },
  { um: "UN", desc: "columna", rendimiento: 0.5, crewId: "estructura", actividad: true },
  { um: "UN", desc: "viga", rendimiento: 0.3, crewId: "estructura", actividad: true },
  { um: "UN", desc: "losa", rendimiento: 0.2, crewId: "hormigon", actividad: true },
  { um: "UN", desc: "puerta colocacion", rendimiento: 1, crewId: "instalacion", actividad: true },
  { um: "UN", desc: "ventana colocacion", rendimiento: 0.8, crewId: "instalacion", actividad: true },
  { um: "UN", desc: "revestimiento", rendimiento: 2, crewId: "revoque", actividad: true },
  { um: "M2", desc: "mamposteria", rendimiento: 6, crewId: "mamposteria", actividad: true },
  { um: "M2", desc: "hormigonado", rendimiento: 12, crewId: "hormigon", actividad: true },
  { um: "M2", desc: "colocacion ceramica", rendimiento: 8, crewId: "ceramica", actividad: true },
  { um: "M3", desc: "excavacion manual", rendimiento: 8, crewId: "excavacion", actividad: true },
];

// Materiales primero para que coincidan antes que actividades con palabras similares (ej. "acero" vs "hormigon").
const RENDIMIENTOS = [...MATERIALES, ...ACTIVIDADES];
export { RENDIMIENTOS };
