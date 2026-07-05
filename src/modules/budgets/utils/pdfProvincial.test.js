import { describe, it, expect } from "vitest";
import { parsearTextoPDFProvincial } from "./parseUtils";

describe("parsearTextoPDFProvincial - caso real Ignacio Correas (La Plata)", () => {
  const textoPDF = [
    "1 TRABAJOS PREPARATORIOS $ 8.857.439,87 2,73%",
    "1.1 Limpieza de terreno y nivelación sin aporte de tierra m2 1167,00 $ 914,11 $ 1.066.766,37 0,33%",
    "1.2 Cartel de obra m2 12,00 $ 21.062,83 $ 252.753,96 0,08%",
    "6.2 Mosaico granítico 30x30 fondo gris m2 908,40 $ 12.647,54 $ 11.489.025,34 3,54%",
  ].join("\n");

  it("devuelve un CSV en texto", () => {
    const csv = parsearTextoPDFProvincial(textoPDF);
    expect(typeof csv).toBe("string");
    expect(csv.length).toBeGreaterThan(0);
  });

  it("extrae Limpieza de terreno con cantidad 1167 y precio 914.11 AL CENTAVO", () => {
    const csv = parsearTextoPDFProvincial(textoPDF);
    expect(csv).toContain("1.1,Limpieza de terreno y nivelación sin aporte de tierra,m2,1167,914.11");
  });

  it("extrae Cartel de obra con cantidad 12 y precio 21062.83", () => {
    const csv = parsearTextoPDFProvincial(textoPDF);
    expect(csv).toContain("1.2,Cartel de obra,m2,12,21062.83");
  });

  it("extrae Mosaico granítico con cantidad 908.4 y precio 12647.54", () => {
    const csv = parsearTextoPDFProvincial(textoPDF);
    expect(csv).toContain("6.2,Mosaico granítico 30x30 fondo gris,m2,908.4,12647.54");
  });

  it("detecta encabezados de rubro", () => {
    const csv = parsearTextoPDFProvincial(textoPDF);
    expect(csv).toContain("RUBRO:");
  });

  it("no confunde el precio total del item con el unitario", () => {
    const csv = parsearTextoPDFProvincial(textoPDF);
    expect(csv).not.toContain("1066766.37");
  });

  it("devuelve vacio ante entrada invalida", () => {
    expect(parsearTextoPDFProvincial(null)).toBe("");
    expect(parsearTextoPDFProvincial("")).toBe("");
  });
});
