import { describe, it, expect } from "vitest";
import { summarizeInventory, formatInventory } from "./tangol-inventory.js";

const countries = { ListCountries: [{ IsoCode: "AR", Description: "Argentina", ToursQty: 10 }, { IsoCode: "PE", Description: "Perú", ToursQty: 4 }] };
const destinations = {
  AR: { ListDestinations: [{ Id: 1, Description: "Buenos Aires", CountryCode: "AR", ToursQty: 7 }, { Id: 2, Description: "Bariloche", CountryCode: "AR", ToursQty: 3 }] },
  PE: { ListDestinations: [{ Id: 3, Description: "Cusco", CountryCode: "PE", ToursQty: 4 }, { Description: "sin id" }] },
};

describe("inventario de Tangol", () => {
  it("REQ-1558: resume países y ciudades con su número de tours, de mayor a menor, y cuenta lo inválido", () => {
    const inv = summarizeInventory(countries, destinations);
    expect(inv.totalTours).toBe(14);
    expect(inv.countries.map((c) => [c.isoCode, c.toursQty])).toEqual([["AR", 10], ["PE", 4]]);
    expect(inv.countries[0].cities).toEqual([{ id: 1, name: "Buenos Aires", toursQty: 7 }, { id: 2, name: "Bariloche", toursQty: 3 }]);
    expect(inv.discarded).toBe(1);
  });

  it("REQ-1558: el texto impreso no lleva token, correo ni clave", () => {
    const txt = formatInventory(summarizeInventory(countries, destinations));
    expect(txt).toContain("Argentina (AR): 10 tours");
    expect(txt).toContain("  Buenos Aires: 7");
    expect(txt).toContain("Total: 14 tours en 2 países y 3 ciudades");
    expect(txt).not.toMatch(/@|Bearer|clave/i);
  });
});
