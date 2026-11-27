// REQ-10736: polígono del círculo de «Zona aproximada» (GeoJSON) sin dependencias de mapa. Puro.
// npx vitest run src/map/lib/zone.test.ts
import { describe, expect, it } from "vitest";
import { zoneCircle, zoneZoom } from "./zone";

describe("REQ-10736: círculo de «Zona aproximada»", () => {
  it("REQ-10736: es un polígono cerrado de 64 lados cuyos vértices están a ~radio del centro", () => {
    const c = zoneCircle({ lat: 40.4168, lng: -3.7038 }, 1500);
    expect(c.type).toBe("Feature");
    expect(c.geometry.type).toBe("Polygon");
    const ring = c.geometry.coordinates[0];
    expect(ring).toHaveLength(65);
    expect(ring[0]).toEqual(ring[64]);
    const R = 6371008.8;
    for (const [lng, lat] of ring) {
      const dLat = ((lat - 40.4168) * Math.PI) / 180;
      const dLng = ((lng + 3.7038) * Math.PI) / 180 * Math.cos((40.4168 * Math.PI) / 180);
      const d = Math.sqrt(dLat * dLat + dLng * dLng) * R;
      expect(Math.abs(d - 1500)).toBeLessThan(15);
    }
  });

  it("REQ-10736: el zoom del círculo deja ver toda la zona (más abierto que el del punto exacto, 15)", () => {
    expect(zoneZoom(1500)).toBeLessThan(15);
    expect(zoneZoom(1500)).toBeGreaterThanOrEqual(12);
    expect(zoneZoom(5000)).toBeLessThan(zoneZoom(1500));
  });
});
