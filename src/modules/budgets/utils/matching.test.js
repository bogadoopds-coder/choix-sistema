import { describe, it, expect } from "vitest";
import { normalizarTexto, calcularSimilaridad, buscarEnAprendidos } from "./parseUtils";

describe("normalizarTexto", () => {
  it("mayusculas, sin tildes, sin simbolos", () => {
    expect(normalizarTexto("Mosaico granítico 30x30 (fondo gris)")).toBe("MOSAICO GRANITICO 30X30 FONDO GRIS");
  });
  it("colapsa espacios multiples", () => {
    expect(normalizarTexto("  Revoque   interior  ")).toBe("REVOQUE INTERIOR");
  });
});

describe("calcularSimilaridad", () => {
  it("identicos dan 1", () => {
    expect(calcularSimilaridad("Revoque interior completo", "Revoque interior completo")).toBe(1);
  });
  it("distintos dan 0", () => {
    expect(calcularSimilaridad("Pintura latex muros", "Mosaico granitico")).toBe(0);
  });
});

describe("buscarEnAprendidos - la memoria de precios", () => {
  const aprendidos = [
    { descripcion: "MOSAICO GRANITICO 30X30 FONDO GRIS", unidad: "m2", precioUnitario: 12647.54 },
    { descripcion: "Revoque interior completo a la cal", unidad: "m2", precioUnitario: 9107.53 },
    { descripcion: "Item con precio invalido", unidad: "u", precioUnitario: 0 },
  ];

  it("match EXACTO aunque cambien tildes y mayusculas", () => {
    const r = buscarEnAprendidos("Mosaico granítico 30x30 fondo gris", "m2", aprendidos);
    expect(r).not.toBeNull();
    expect(r.metodo).toBe("exacto");
    expect(r.precioUnitario).toBe(12647.54);
  });

  it("match FUZZY cuando la descripcion es parecida (>= 70%)", () => {
    const r = buscarEnAprendidos("Revoque interior completo cal reforzado", "m2", aprendidos);
    expect(r).not.toBeNull();
    expect(r.metodo).toBe("fuzzy");
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.precioUnitario).toBe(9107.53);
  });

  it("NO matchea un item distinto", () => {
    expect(buscarEnAprendidos("Ascensor electrico 630kg", "gl", aprendidos)).toBeNull();
  });

  it("ignora aprendidos con precio 0 aunque la descripcion coincida", () => {
    expect(buscarEnAprendidos("Item con precio invalido", "u", aprendidos)).toBeNull();
  });

  it("devuelve null con lista vacia o ausente", () => {
    expect(buscarEnAprendidos("Lo que sea", "m2", [])).toBeNull();
    expect(buscarEnAprendidos("Lo que sea", "m2", null)).toBeNull();
  });
});
