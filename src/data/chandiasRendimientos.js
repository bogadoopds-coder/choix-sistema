export const CHANDIAS_RENDIMIENTOS = {
  "fuente": "Chandías - Cómputos y Presupuestos, 10ma Ed.",
  "hormigon_armado_por_m3": {
    "materiales_base": { "cemento_kg": 300, "arena_gruesa_m3": 0.65, "piedra_partida_m3": 0.65 },
    "bases": { "hierro_tn": 0.060, "oficial_h": 6.15, "ayudante_h": 11.30, "encofrado_tablas_m2": 2.50 },
    "columnas": { "hierro_tn": 0.085, "oficial_h": 14.35, "ayudante_h": 17.10, "encofrado_tablas_m2": 3.00 },
    "losas": { "hierro_tn": 0.080, "oficial_h": 19.15, "ayudante_h": 18.05, "encofrado_tablas_m2": 3.50 },
    "vigas": { "hierro_tn": 0.180, "oficial_h": 32.15, "ayudante_h": 18.30, "encofrado_tablas_m2": 3.30 },
    "dinteles": { "hierro_tn": 0.060, "oficial_h": 37.00, "ayudante_h": 21.90, "encofrado_tablas_m2": 3.30 },
    "tabiques": { "hierro_tn": 0.070, "oficial_h": 30.00, "ayudante_h": 25.00, "encofrado_tablas_m2": 2.50 },
    "encadenados": { "hierro_tn": 0.050, "oficial_h": 25.00, "ayudante_h": 12.50 },
    "escalera": { "hierro_tn": 0.080, "oficial_h": 25.00, "ayudante_h": 20.00 },
    "nota": "Hierro promedio 60-70 kg/m3. H° por m2 cubierta: 0.13-0.20 m3"
  },
  "mamposteria_por_m2": {
    "ladrillo_comun_15cm": { "ladrillos_u": 63, "mortero_litros": 30, "oficial_h": 0.95, "ayudante_h": 0.65 },
    "ladrillo_comun_30cm": { "ladrillos_u": 126, "mortero_litros": 60, "oficial_h": 1.50, "ayudante_h": 1.00 },
    "hueco_8x18x33": { "ladrillos_u": 16.5, "mortero_kg": 41, "oficial_h": 0.45, "ayudante_h": 0.40 },
    "hueco_12x18x33": { "ladrillos_u": 16.5, "mortero_kg": 58, "oficial_h": 0.74, "ayudante_h": 0.50 },
    "hueco_18x18x33": { "ladrillos_u": 16.5, "mortero_kg": 74, "oficial_h": 1.12, "ayudante_h": 0.75 },
    "portante_mortero": { "cemento_kg": 1.05, "cal_hidraulica_kg": 1.31, "arena_m3": 0.012 },
    "tabique_durlock_simple": { "placa_yeso_m2": 2.2, "perfil_ml": 3.0, "tornillos_u": 30, "masilla_kg": 0.5, "oficial_h": 0.60, "ayudante_h": 0.40 }
  },
  "revoques_por_m2": {
    "exterior_comun_litros": 23, "interior_comun_litros": 20, "simil_piedra_litros": 25, "impermeable_litros": 25,
    "enlucido_litros": 10, "azotado_impermeable_litros": 5,
    "oficial_h": 0.95, "ayudante_h": 0.65,
    "yeso_enlucido_5mm_kg": 5, "yeso_sobre_hueco_kg": 7, "yeso_cielorraso_kg": 13,
    "monocapa_kg": 12
  },
  "contrapisos_por_m2": {
    "sobre_terreno_natural_15cm": { "hormigon_pobre_m3": 0.15, "oficial_h": 0.40, "ayudante_h": 0.40 },
    "sobre_losa_8cm": { "hormigon_pobre_m3": 0.08, "oficial_h": 0.30, "ayudante_h": 0.30 },
    "alivianado_arcilla_expandida": { "arcilla_expandida_m3": 0.08, "cemento_kg": 20, "oficial_h": 0.35, "ayudante_h": 0.35 },
    "carpeta_cementicia_2cm": { "cemento_kg": 8, "arena_m3": 0.015, "oficial_h": 0.25, "ayudante_h": 0.20 },
    "carpeta_cementicia_3cm": { "cemento_kg": 12, "arena_m3": 0.022, "oficial_h": 0.30, "ayudante_h": 0.25 }
  },
  "cubiertas_por_m2": {
    "membrana_asfaltica_4mm": { "membrana_m2": 1.20, "imprimacion_kg": 0.40, "gas_kg": 0.12, "oficial_h": 0.30, "ayudante_h": 0.30 },
    "cubierta_plana_completa": { "baldosas_u": 25, "membrana_m2": 0.88, "imprimacion_kg": 0.40, "eps_m2": 1, "cemento_kg": 12, "cal_hidraulica_kg": 5, "cal_aerea_kg": 7, "arena_m3": 0.05, "cascotes_m3": 0.06 },
    "chapa_sobre_estructura": { "chapa_m2": 1.10, "perfil_c_ml": 1.5, "tornillos_u": 8, "oficial_h": 0.50, "ayudante_h": 0.50 },
    "aislacion_termica_eps_50mm": { "eps_m2": 1.05, "oficial_h": 0.15, "ayudante_h": 0.15 },
    "aislacion_granulado_volcanico_10cm": { "cemento_kg": 25, "granulado_m3": 0.105 }
  },
  "pisos_por_m2": {
    "mosaico_granitico_30x30": { "mosaicos_u": 11, "mortero_asiento_kg": 15, "oficial_h": 0.80, "ayudante_h": 0.50 },
    "ceramico_30x30": { "ceramicos_u": 11, "adhesivo_kg": 5, "oficial_h": 0.60, "ayudante_h": 0.40 },
    "cemento_alisado": { "cemento_kg": 15, "arena_m3": 0.02, "oficial_h": 0.50, "ayudante_h": 0.30 },
    "pulido_granitico": { "oficial_h": 0.40, "ayudante_h": 0.20, "nota": "Solo pulido, sin piso" }
  },
  "cielorrasos_por_m2": {
    "aplicado_sobre_losa": { "mezcla_litros": 15, "oficial_h": 0.80, "ayudante_h": 0.50 },
    "durlock_suspendido": { "placa_yeso_m2": 1.10, "perfil_ml": 3.5, "tornillos_u": 25, "masilla_kg": 0.5, "cinta_ml": 1.5, "oficial_h": 0.70, "ayudante_h": 0.50 },
    "durlock_humedad": { "placa_yeso_rh_m2": 1.10, "perfil_ml": 3.5, "tornillos_u": 25, "masilla_kg": 0.5, "oficial_h": 0.75, "ayudante_h": 0.55 }
  },
  "excavaciones_por_m3": {
    "manual_terreno_normal": { "oficial_h": 2.50, "ayudante_h": 2.50 },
    "mecanica": { "maquina_h": 0.15, "ayudante_h": 0.50 },
    "relleno_compactacion": { "oficial_h": 0.80, "ayudante_h": 0.80, "nota": "Con compactador mecánico" }
  },
  "pinturas_por_m2": {
    "latex_interior_2_manos": { "pintura_litros": 0.22, "oficial_h": 0.15, "ayudante_h": 0.08 },
    "latex_exterior_2_manos": { "pintura_litros": 0.29, "oficial_h": 0.18, "ayudante_h": 0.10 },
    "esmalte_sintetico_3_manos": { "esmalte_litros": 0.27, "fondo_litros": 0.10, "oficial_h": 0.35, "ayudante_h": 0.15 },
    "antioxido_2_manos": { "antioxido_litros": 0.22, "oficial_h": 0.20, "ayudante_h": 0.10 }
  },
  "instalaciones_nota": "Las instalaciones (eléctrica, sanitaria, gas, AA) se cotizan generalmente como global o por boca/punto. Los valores dependen fuertemente del proyecto específico.",
  "instalacion_electrica_por_boca": {
    "boca_luz_nueva": { "cable_ml": 15, "caño_ml": 5, "caja_u": 1, "oficial_h": 2.5, "ayudante_h": 1.5 },
    "boca_toma_nueva": { "cable_ml": 12, "caño_ml": 4, "caja_u": 1, "oficial_h": 2.0, "ayudante_h": 1.2 }
  },
  "instalacion_sanitaria_referencias": {
    "caneria_pvc_por_ml": { "oficial_h": 0.50, "ayudante_h": 0.30 },
    "artefacto_colocacion": { "oficial_h": 2.00, "ayudante_h": 1.50, "nota": "Promedio por artefacto" },
    "camara_inspeccion": { "oficial_h": 8.00, "ayudante_h": 6.00 }
  },
  "zocalo_por_ml": {
    "granitico": { "oficial_h": 0.30, "ayudante_h": 0.15 },
    "cemento_alisado": { "oficial_h": 0.25, "ayudante_h": 0.12 }
  },
  "marmoleria_por_m2": {
    "mesada_granito": { "oficial_h": 1.50, "ayudante_h": 1.00 },
    "umbral_solia_por_ml": { "oficial_h": 0.40, "ayudante_h": 0.25 }
  }
};
