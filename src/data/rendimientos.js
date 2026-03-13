// ─── RENDIMIENTOS (unidades por día) para estimar duración y MO ────────────────
// Formato: { um, desc, rendimiento, crewId? } — crewId enlaza con data/laborCosts CREWS

const RENDIMIENTOS = [
  { um: "M2", desc: "revoque", rendimiento: 15, crewId: "revoque" },
  { um: "M2", desc: "revoque fino", rendimiento: 12, crewId: "revoque" },
  { um: "M2", desc: "pintura latex", rendimiento: 25, crewId: "pintura" },
  { um: "M2", desc: "pintura", rendimiento: 22, crewId: "pintura" },
  { um: "M2", desc: "enduido", rendimiento: 20, crewId: "pintura" },
  { um: "M2", desc: "ceramico ceramica piso", rendimiento: 8, crewId: "ceramica" },
  { um: "M2", desc: "ceramico pared", rendimiento: 6, crewId: "ceramica" },
  { um: "M2", desc: "contrapiso", rendimiento: 25, crewId: "carpeta_contrapiso" },
  { um: "M2", desc: "carpeta", rendimiento: 20, crewId: "carpeta_contrapiso" },
  { um: "M2", desc: "membrana", rendimiento: 30, crewId: "instalacion" },
  { um: "M2", desc: "aislante", rendimiento: 40, crewId: "instalacion" },
  { um: "M2", desc: "placa yeso", rendimiento: 15, crewId: "revoque" },
  { um: "M2", desc: "cielorraso", rendimiento: 18, crewId: "revoque" },
  { um: "M3", desc: "hormigon concreto", rendimiento: 1.5, crewId: "hormigon" },
  { um: "M3", desc: "excavacion", rendimiento: 8, crewId: "excavacion" },
  { um: "M3", desc: "relleno", rendimiento: 15, crewId: "excavacion" },
  { um: "M3", desc: "platea", rendimiento: 1, crewId: "hormigon" },
  { um: "ML", desc: "caño instalacion", rendimiento: 20, crewId: "instalacion" },
  { um: "ML", desc: "cordon", rendimiento: 15, crewId: "hormigon" },
  { um: "UN", desc: "columna", rendimiento: 0.5, crewId: "estructura" },
  { um: "UN", desc: "viga", rendimiento: 0.3, crewId: "estructura" },
  { um: "UN", desc: "losa", rendimiento: 0.2, crewId: "hormigon" },
  { um: "UN", desc: "puerta", rendimiento: 1, crewId: "instalacion" },
  { um: "UN", desc: "ventana", rendimiento: 0.8, crewId: "instalacion" },
  { um: "UN", desc: "revestimiento", rendimiento: 2, crewId: "revoque" },
];

export { RENDIMIENTOS };
