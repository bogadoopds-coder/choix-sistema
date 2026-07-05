import { describe, it, expect } from "vitest";
import { enrichItemsWithHierarchy, groupByRubro } from "./parseUtils";

describe("enrichItemsWithHierarchy - contrato del fix de rubros (jul 2026)", () => {
  it("un item del lector CONSERVA su rubro propio (no lo pisa)", () => {
    const items = [{
      codigo: "APRENDIDO-x1",
      desc: "Mosaico granitico 30x30",
      um: "m2",
      cantidad: 10,
      precioBase: 100,
      rubroId: "pisos-zocalos",
      rubroNombre: "Pisos y zocalos",
    }];
    const out = enrichItemsWithHierarchy(items);
    expect(out[0].rubroId).toBe("pisos-zocalos");
    expect(out[0].rubroNombre).toBe("Pisos y zocalos");
  });

  it("un item legacy SIN rubro propio cae en SIN_RUBRO (comportamiento historico)", () => {
    const items = [{
      codigo: "CUSTOM-abc",
      desc: "Item viejo sin rubro",
      um: "u",
      cantidad: 1,
      precioBase: 500,
    }];
    const out = enrichItemsWithHierarchy(items);
    expect(out[0].rubroId).toBe("SIN_RUBRO");
    expect(out[0].rubroNombre).toBe("SIN RUBRO");
  });

  it("calcula el subtotal cantidad x precio", () => {
    const out = enrichItemsWithHierarchy([{
      codigo: "APRENDIDO-x2", desc: "Revoque", um: "m2",
      cantidad: 10, precioBase: 100,
      rubroId: "revoques", rubroNombre: "Revoques",
    }]);
    expect(out[0].subtotal).toBe(1000);
  });
});

describe("groupByRubro - agrupado por rubro", () => {
  it("agrupa items del mismo rubro propio y suma el precio del rubro", () => {
    const items = [
      { codigo: "APRENDIDO-a", desc: "Mosaico", um: "m2", cantidad: 10, precioBase: 100, rubroId: "pisos", rubroNombre: "Pisos" },
      { codigo: "APRENDIDO-b", desc: "Zocalo", um: "ml", cantidad: 5, precioBase: 20, rubroId: "pisos", rubroNombre: "Pisos" },
      { codigo: "CUSTOM-c", desc: "Viejo sin rubro", um: "u", cantidad: 1, precioBase: 7 },
    ];
    const grupos = groupByRubro(items);
    const pisos = grupos.find((g) => g.rubroId === "pisos");
    const sinRubro = grupos.find((g) => g.rubroId === "SIN_RUBRO");
    expect(grupos.length).toBe(2);
    expect(pisos.rubroNombre).toBe("Pisos");
    expect(pisos.items.length).toBe(2);
    expect(pisos.precioRubro).toBe(1100);
    expect(sinRubro.rubroNombre).toBe("SIN RUBRO");
  });
});
