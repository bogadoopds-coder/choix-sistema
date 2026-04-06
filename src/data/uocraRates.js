export const UOCRA_RATES_DEFAULT = {
  vigencia: "2026-02",
  zona: "A",
  oficial_hora: 936,
  medioOficial_hora: 865,
  ayudante_hora: 796,
  fuenteUrl: "https://www.uocra.org"
};

export function mergeUocraRates(partial) {
  return { ...UOCRA_RATES_DEFAULT, ...(partial || {}) };
}

export function laborCostFromRendimientosUocra(rendimientos, cantidad, rates) {
  if (!rendimientos || !cantidad) return 0;
  const r = rates || UOCRA_RATES_DEFAULT;
  const oficial = (rendimientos.oficial_h || 0) * r.oficial_hora;
  const medioOficial = (rendimientos.medio_oficial_h || rendimientos.medioOficial_h || 0) * r.medioOficial_hora;
  const ayudante = (rendimientos.ayudante_h || 0) * r.ayudante_hora;
  return (oficial + medioOficial + ayudante) * cantidad;
}
