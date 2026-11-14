import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TOURS_MAP_SHOWS_ALL } from "./map-mode";

describe("REQ-3537: el mapa de /tours muestra todo el catálogo", () => {
  const page = readFileSync("src/components/tours/ToursPageClient.tsx", "utf8");
  it("REQ-3537: la bandera está encendida (mapa completo)", () => {
    expect(TOURS_MAP_SHOWS_ALL).toBe(true);
  });
  it("REQ-3537: /tours usa el mismo mapa que Destinos (WorldMap, fuente /api/map/cities)", () => {
    expect(page).toMatch(/import\('@\/components\/map\/WorldMap'\)/);
    expect(page).toMatch(/TOURS_MAP_SHOWS_ALL \? <WorldMap fill \/> : <ToursMap/);
  });
  it("REQ-3537: el mapa de pines por página sigue en el código, oculto y reversible", () => {
    expect(page).toMatch(/import \{ ToursMap \} from '@\/components\/tours\/ToursMap'/);
  });
});
