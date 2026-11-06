import { describe, expect, it } from "vitest";
import { HOME_CAROUSEL_MAX, homeCarouselTrips } from "./carousel";

const t = (id: string, kind: string) => ({ id, kind });

describe("homeCarouselTrips", () => {
  it("REQ-153: el transporte no entra al carrusel «Viajes armados por nuestros expertos»", () => {
    const out = homeCarouselTrips([t("a", "tour"), t("b", "transporte"), t("c", "circuito"), t("d", "transporte")]);
    expect(out.map((x) => x.id)).toEqual(["a", "c"]);
  });
  it("REQ-153: el tope de 9 se aplica después de filtrar (el transporte no ocupa lugares)", () => {
    const trips = [...Array.from({ length: 5 }, (_, i) => t(`bus${i}`, "transporte")), ...Array.from({ length: 12 }, (_, i) => t(`v${i}`, "tour"))];
    const out = homeCarouselTrips(trips);
    expect(out).toHaveLength(HOME_CAROUSEL_MAX);
    expect(out.every((x) => x.kind !== "transporte")).toBe(true);
    expect(out[0].id).toBe("v0");
  });
  it("REQ-153: sin transporte (bandera apagada) el resultado es el mismo de antes: los primeros 9 en orden", () => {
    const trips = Array.from({ length: 11 }, (_, i) => t(`v${i}`, i % 2 ? "circuito" : "tour"));
    expect(homeCarouselTrips(trips)).toEqual(trips.slice(0, 9));
  });
  it("REQ-153: si solo hay transporte, el carrusel queda vacío (y se oculta)", () => {
    expect(homeCarouselTrips([t("b", "transporte")])).toEqual([]);
  });
});
