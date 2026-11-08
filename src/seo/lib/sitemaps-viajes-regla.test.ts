import { describe, expect, it } from "vitest";
import { viajesSitemapTrips, type ViajeRow } from "./sitemaps-viajes";

// REQ-1345 (INC-008), test de regla: sitemap-viajes.xml lista solo los viajes SIN ciudad en /destinos (REQ-584); los
// demás salen en sitemap-tours-{país}.xml. En producción (7 nov 2026) los 236 publicados sin transporte tienen URL
// (14 en viajes + 222 en tours-{país}); «solo 14» no es un faltante. La regla: ninguno queda fuera de ambos.
const row = (id: string, kind = "circuito"): ViajeRow => ({ id, slug: `v-${id}`, kind, countries: ["CN"], updatedAt: "2026-11-07" });

describe("REQ-1345: todo viaje publicado visible tiene URL en algún sitemap", () => {
  it("REQ-1345: los ubicados en /destinos no se duplican en viajes; los demás sí están; nadie se queda fuera", () => {
    const rows = [...Array.from({ length: 222 }, (_, i) => row(`d${i}`)), ...Array.from({ length: 14 }, (_, i) => row(`v${i}`)), row("bus", "transporte")];
    const placed = new Set(rows.filter((r) => r.id.startsWith("d")).map((r) => r.id));
    const visible = (k: string) => k !== "transporte";
    const enViajes = viajesSitemapTrips(rows, placed, visible);
    expect(enViajes).toHaveLength(14);
    const cubiertos = new Set([...placed, ...enViajes.map((t) => rows.find((r) => t.path.endsWith(r.slug))!.id)]);
    const faltan = rows.filter((r) => visible(r.kind ?? "") && !cubiertos.has(r.id));
    expect(faltan).toEqual([]);
  });
});
