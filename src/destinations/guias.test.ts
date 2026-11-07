import { describe, expect, it } from "vitest";
import { loadTree } from "./load";
import { loadGuides, guideFor, GUIDES_RAW } from "./guias";
import { fx, tour } from "./fixtures/destinos";
import { parseGuide, guidePlain } from "./lib/guia";
import { sampleGuide } from "./fixtures/guias";
import { ORDEN_GUIAS } from "./content/guias-orden";
import type { DestinationsRepo } from "./repository";

const repo = (tours = [tour(13, 1)]) => ({ countries: async () => fx.countries, cities: async () => fx.cities, tours: async () => tours, trips: async () => [] }) as unknown as DestinationsRepo;

describe("guías de ciudad en /destinos", () => {
  it("REQ-1228: con una guía del repo, Puebla (1 tour) pasa la regla de indexación y su `guide` es la guía; sin guía no", async () => {
    const g = parseGuide(sampleGuide({ pais: "mx", ciudad: "puebla", nombre: "Puebla", targetTerm: "guia de puebla" }));
    if (!g.ok) throw new Error(g.error);
    const vis = { own: true, transport: true } as never;
    const sin = (await loadTree(repo(), new Date("2026-11-07T12:00:00Z"), vis, { guides: [] })).flatMap((c) => c.cities).find((c) => c.slug === "puebla");
    const con = (await loadTree(repo(), new Date("2026-11-07T12:00:00Z"), vis, { guides: [g.guide] })).flatMap((c) => c.cities).find((c) => c.slug === "puebla");
    expect(sin?.indexed).toBe(false);
    expect(con).toMatchObject({ indexed: true, guide: guidePlain(g.guide), guideUpdatedAt: "2026-11-07T00:00:00.000Z" });
  });

  it("REQ-1228: una guía inválida se descarta con log y no tumba la carga; guideFor la encuentra por país y ciudad", () => {
    const logs: string[] = [];
    const ok = sampleGuide();
    expect(loadGuides([ok, { ...ok, ciudad: "Mal Slug" }] as never, (l) => logs.push(l)).length).toBe(1);
    expect(logs[0]).toMatch(/guía descartada/);
    expect(guideFor("fr", "paris", loadGuides([ok]))?.nombre).toBe("París");
    expect(GUIDES_RAW.every((x) => parseGuide(x).ok)).toBe(true);
  });

  it("REQ-1229: el orden empieza por las 37 ciudades con viaje propio, sin repetir", () => {
    expect(ORDEN_GUIAS.length).toBe(37);
    expect(new Set(ORDEN_GUIAS).size).toBe(37);
    expect(ORDEN_GUIAS.slice(0, 3)).toEqual(["fr/paris", "cn/pekin", "cn/shanghai"]);
    for (const k of ORDEN_GUIAS) expect(k).toMatch(/^[a-z]{2}\/[a-z0-9-]+$/);
  });
});
