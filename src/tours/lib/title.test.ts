import { describe, it, expect } from "vitest";
import { tourHeading } from "./title";

describe("REQ-094: título real y proveedor; «La Primera Pieza» solo como colección", () => {
  it("REQ-094: el H1 es el título real del proveedor, sin agregarle la colección", () => {
    const h = tourHeading({ title: "  Free Tour por el Centro Histórico de Lima ", provider: "Lima Walking Tours", isFreeTour: true });
    expect(h.h1).toBe("Free Tour por el Centro Histórico de Lima");
    expect(h.h1).not.toContain("Primera Pieza");
    expect(h.provider).toBe("Lima Walking Tours");
    expect(h.collection).toBe("La Primera Pieza");
  });
  it("REQ-094: un tour de pago no pertenece a la colección", () => {
    expect(tourHeading({ title: "Tour a Machu Picchu", provider: "Inca Trips", isFreeTour: false }).collection).toBeNull();
  });
  it("REQ-094: sin proveedor queda null (nunca se inventa)", () => {
    expect(tourHeading({ title: "X", provider: null, isFreeTour: true }).provider).toBeNull();
  });
});
