// REQ-10872: ciudad del catálogo de un viaje (por nombre, misma regla que /destinos y el mapa). npx vitest run src/ficha/lib/trip-city.test.ts
import { describe, expect, it } from "vitest";
import { tripCityIdFor, type CatalogCityRef } from "./trip-city";

const cities: CatalogCityRef[] = [
  { id: 1, iso2: "AR", translations: { es: "Buenos Aires", en: "Buenos Aires" } },
  { id: 2, iso2: "AR", translations: { es: "Bariloche", en: "San Carlos de Bariloche" } },
  { id: 3, iso2: "CN", translations: JSON.stringify({ es: "Pekín", en: "Beijing" }) },
  { id: 4, iso2: "MX", translations: { es: "Buenos Aires" } }, // homónima en otro país: no cuenta
];

describe("REQ-10872: tripCityIdFor", () => {
  it("REQ-10872: la primera ciudad del viaje que existe en el catálogo del país, sin acentos ni mayúsculas, en cualquier idioma", () => {
    expect(tripCityIdFor({ countries: ["AR"], cities: ["bariloche", "Buenos Aires"] }, cities)).toBe(2);
    expect(tripCityIdFor({ countries: ["cn"], cities: ["beijing"] }, cities)).toBe(3);
    expect(tripCityIdFor({ countries: ["AR", "CL"], cities: ["Santiago", "BUENOS AIRES"] }, cities)).toBe(1);
  });

  it("REQ-10872: el país del viaje manda: la homónima de otro país no cuenta y sin país no hay ciudad", () => {
    expect(tripCityIdFor({ countries: ["AR"], cities: ["Buenos Aires"] }, cities)).toBe(1);
    expect(tripCityIdFor({ countries: ["MX"], cities: ["Buenos Aires"] }, cities)).toBe(4);
    expect(tripCityIdFor({ countries: [], cities: ["Buenos Aires"] }, cities)).toBeNull();
  });

  it("REQ-10872: nombre con nota o con palabra extra del proveedor (REQ-1606): el exacto gana sobre el recortado", () => {
    expect(tripCityIdFor({ countries: ["CN"], cities: ["Beijing (solo)"] }, cities)).toBe(3);
    expect(tripCityIdFor({ countries: ["CN"], cities: ["Beijing Solo"] }, cities)).toBe(3);
    const two: CatalogCityRef[] = [{ id: 9, iso2: "CN", translations: { es: "Beijing Solo" } }, ...cities];
    expect(tripCityIdFor({ countries: ["CN"], cities: ["Beijing Solo"] }, two)).toBe(9);
  });

  it("REQ-10872: sin ciudad del catálogo, null: nunca se inventa una ciudad ni se toma la primera del país", () => {
    expect(tripCityIdFor({ countries: ["AR"], cities: ["Ushuaia"] }, cities)).toBeNull();
    expect(tripCityIdFor({ countries: ["AR"], cities: [] }, cities)).toBeNull();
    expect(tripCityIdFor({ countries: ["AR"], cities: ["Buenos Aires"] }, [])).toBeNull();
  });
});
