import { describe, it, expect } from "vitest";
import { cityPoints, cardTours } from "./cities";

describe("puntos por ciudad", () => {
  it("una ciudad = un punto en la mediana de sus tours, con su conteo", () => {
    const out = cityPoints([
      { cityId: 1, coords: "41.90,12.49" },
      { cityId: 1, coords: "41.89,12.48" },
      { cityId: 1, coords: "48.0,2.0" }, // un tour mal ubicado no mueve el punto
      { cityId: 2, coords: null },
      { cityId: 3, coords: "40.41,-3.70" },
    ]);
    expect(out).toEqual([
      { cityId: 1, lat: 41.9, lng: 12.48, tours: 3 },
      { cityId: 3, lat: 40.41, lng: -3.7, tours: 1 },
    ]);
  });
});

describe("tarjeta de la ciudad: regla 60/40", () => {
  const p = (id: string) => ({ id, paid: true });
  const f = (id: string) => ({ id, paid: false });
  it("3 tours: 2 de pago y 1 gratis", () => {
    expect(cardTours([p("p1"), p("p2"), p("p3")], [f("f1"), f("f2")], true).map((x) => x.id)).toEqual(["p1", "p2", "f1"]);
  });
  it("si faltan de pago, completa con gratis", () => {
    expect(cardTours([p("p1")], [f("f1"), f("f2"), f("f3")], true).map((x) => x.id)).toEqual(["p1", "f1", "f2"]);
  });
  it("con los de pago apagados, solo gratis", () => {
    expect(cardTours([p("p1")], [f("f1"), f("f2"), f("f3")], false).map((x) => x.id)).toEqual(["f1", "f2", "f3"]);
  });
});
