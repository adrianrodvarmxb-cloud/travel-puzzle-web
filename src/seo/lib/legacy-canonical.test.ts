import { describe, expect, it } from "vitest";
import { destinationTree } from "@/destinations/lib/catalog";
import { fx, tour } from "@/destinations/fixtures/destinos";
import { legacyTourCanonical } from "./legacy-canonical";

const t = tour(10, 1, { title: "Centro Histórico" });
const tree = destinationTree({ ...fx, tours: [t], trips: [], now: new Date("2026-11-05T12:00:00Z") });

describe("REQ-579: /tours/{id} declara el canonical final", () => {
  it("REQ-579: con ficha bajo /destinos, el canonical es esa URL", () => {
    expect(legacyTourCanonical(tree, t.id)).toMatch(/^\/destinos\/mx\/ciudad-de-mexico\/tour-\d+$/);
  });
  it("REQ-579: sin ficha (u otro id), sigue siendo /tours/{id}", () => {
    expect(legacyTourCanonical(tree, "otro")).toBe("/tours/otro");
    expect(legacyTourCanonical(null, t.id)).toBe(`/tours/${t.id}`);
  });
});
