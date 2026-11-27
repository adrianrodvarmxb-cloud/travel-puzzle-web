// REQ-10763 (REQ-10761, REQ-10576): la respuesta OCTO de cada producto de Big Bus es su documento original.
import { describe, expect, it } from "vitest";
import { bigBusRawItems } from "./raw-items";
import { productSchema } from "./schemas";
import { sampleProduct } from "./fixtures";

const map = { NYC: ["new york"], LON: ["london"] };
const tripIdFor = (ref: string) => `bbt-${ref.toLowerCase()}`;

describe("REQ-10763: la respuesta OCTO como original de Big Bus", () => {
  it("REQ-10763: cada producto va íntegro con su id, ligado al viaje de su ciudad (experienceId) y con el nombre original", () => {
    const raw = [{ ...sampleProduct(), id: "p1", internalName: "New York Discover", extra: { net: 12 } }];
    const items = bigBusRawItems({ raw, parsed: raw.map((r) => productSchema.parse(r)), map, tripIdFor });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: "p1",
      experience: { kind: "trip", id: "bbt-nyc" },
      sourceRef: "NYC",
      schemaOk: true,
      original: { field: "internalName", value: "New York Discover" },
    });
    // íntegro: lo que la ficha descarta (p. ej. netos) sí va a la copia privada
    expect((items[0].body as { extra: unknown }).extra).toEqual({ net: 12 });
  });
  it("REQ-10763: sin ciudad que coincida (o ambigua) no se inventa liga: el registro se guarda sin viaje", () => {
    const raw = [{ ...sampleProduct(), id: "p2", internalName: "Paris Discover" }, { ...sampleProduct(), id: "p3", internalName: "New York and London combo" }];
    const items = bigBusRawItems({ raw, parsed: raw.map((r) => productSchema.parse(r)), map, tripIdFor });
    expect(items.map((i) => i.experience)).toEqual([null, null]);
    expect(items.map((i) => i.sourceRef)).toEqual([null, null]);
  });
  it("REQ-10763: lo que no pasó el esquema también se archiva (schemaOk false), con su id si lo trae; sin id, externalId null", () => {
    const raw = [{ id: "roto", internalName: 7 }, { nada: true }];
    const items = bigBusRawItems({ raw, parsed: [], map, tripIdFor });
    expect(items).toEqual([
      expect.objectContaining({ externalId: "roto", schemaOk: false, experience: null, original: null }),
      expect.objectContaining({ externalId: null, schemaOk: false }),
    ]);
  });
});
