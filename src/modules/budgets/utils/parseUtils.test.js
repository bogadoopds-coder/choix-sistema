import { describe, it, expect } from "vitest";
import { parseNumeroArgentino } from "./parseUtils";

describe("parseNumeroArgentino (formato argentino: punto de miles, coma decimal)", () => {
  it("convierte un precio con decimales", () => {
    expect(parseNumeroArgentino("12.647,54")).toBe(12647.54);
  });
  it("convierte un precio chico con decimales", () => {
    expect(parseNumeroArgentino("914,11")).toBe(914.11);
  });
  it("convierte miles sin decimales", () => {
    expect(parseNumeroArgentino("1.167,00")).toBe(1167);
  });
  it("convierte un numero simple", () => {
    expect(parseNumeroArgentino("36,00")).toBe(36);
  });
  it("convierte millones", () => {
    expect(parseNumeroArgentino("331.826.697,37")).toBe(331826697.37);
  });
  it("devuelve 0 ante vacio o basura", () => {
    expect(parseNumeroArgentino("")).toBe(0);
    expect(parseNumeroArgentino(null)).toBe(0);
    expect(parseNumeroArgentino("abc")).toBe(0);
  });
});
