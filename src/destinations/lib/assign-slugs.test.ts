import { describe, it, expect } from "vitest";
import { assignTourSlugs, assignCitySlugs, type ExistingTour, type IncomingTour, type CityInput } from "./assign-slugs";

const ex = (id: string, externalId: number, slug: string | null): ExistingTour => ({ id, providerId: "freetour", externalId, slug });
const inc = (externalId: number, title: string, id?: string): IncomingTour => ({ providerId: "freetour", externalId, title, id });

describe("assignTourSlugs", () => {
  it("REQ-086: genera el slug de los tours sin slug", () => {
    const r = assignTourSlugs([], [inc(1, "Free Tour de Lima", "u1")]);
    expect(r).toEqual([{ key: "freetour:1", id: "u1", slug: "free-tour-de-lima", source: "new" }]);
  });

  it("REQ-086: nunca regenera un slug guardado, aunque cambie el título", () => {
    const r = assignTourSlugs([ex("u1", 1, "free-tour-de-lima")], [inc(1, "Free Tour de Lima Colonial y Barranco")]);
    expect(r[0]).toMatchObject({ id: "u1", slug: "free-tour-de-lima", source: "kept" });
  });

  it("REQ-086: un tour que reaparece conserva su slug y su tour_uid", () => {
    // Estaba desactivado (no vino en el sync) y vuelve a aparecer en la API con el mismo external_id.
    const existing = [ex("u1", 1, "free-tour-de-lima"), ex("u2", 2, "tour-de-cusco")];
    const r = assignTourSlugs(existing, [inc(2, "Tour de Cusco"), inc(1, "Free tour de Lima (nuevo)")]);
    expect(r.find((a) => a.key === "freetour:1")).toMatchObject({ id: "u1", slug: "free-tour-de-lima", source: "kept" });
  });

  it("REQ-086: un tour nuevo con el mismo título recibe un sufijo corto, sin tocar el guardado", () => {
    const r = assignTourSlugs([ex("u1", 1, "free-tour-de-lima")], [inc(1, "Free Tour de Lima"), inc(2, "Free Tour de Lima", "u2")]);
    expect(r.map((a) => a.slug)).toEqual(["free-tour-de-lima", "free-tour-de-lima-2"]);
  });

  it("REQ-086: no repite slugs dentro de la misma corrida y el orden de la API no cambia el resultado", () => {
    const a = assignTourSlugs([], [inc(5, "Tour Roma"), inc(3, "Tour Roma"), inc(4, "Tour Roma")]);
    const b = assignTourSlugs([], [inc(4, "Tour Roma"), inc(5, "Tour Roma"), inc(3, "Tour Roma")]);
    const byKey = (r: typeof a) => Object.fromEntries(r.map((x) => [x.key, x.slug]));
    expect(byKey(a)).toEqual({ "freetour:3": "tour-roma", "freetour:4": "tour-roma-2", "freetour:5": "tour-roma-3" });
    expect(byKey(b)).toEqual(byKey(a));
  });

  it("REQ-085: un tour sin letras en el título usa el slug de reserva del tour_uid, nunca el external_id", () => {
    const r = assignTourSlugs([], [inc(987654, "Ταξίδι", "cuid_x")]);
    expect(r[0].slug).toMatch(/^tour-[a-z0-9]{7}$/);
    expect(r[0].slug).not.toContain("987654");
    expect(r[0].source).toBe("fallback");
  });

  it("REQ-086: sin título ni tour_uid, queda pendiente (no se inventa)", () => {
    const r = assignTourSlugs([], [inc(7, "")]);
    expect(r[0]).toMatchObject({ slug: null, source: "pending" });
  });
});

const city = (id: number, countryId: number, name: string, extra: Partial<CityInput> = {}): CityInput => ({
  id, countryId, name, slug: null, stateCode: null, ...extra,
});

describe("assignCitySlugs", () => {
  it("REQ-087: una ciudad sin homónimas usa su nombre", () => {
    expect(assignCitySlugs([city(1, 99, "Ciudad de México")])).toEqual([{ id: 1, slug: "ciudad-de-mexico", source: "new" }]);
  });

  it("REQ-087: dos ciudades con el mismo nombre en un país llevan el código de estado", () => {
    const r = assignCitySlugs([
      city(1, 99, "San José del Cabo", { stateCode: "BCS" }),
      city(2, 99, "San José del Cabo", { stateCode: "SON" }),
      city(3, 50, "San José del Cabo"), // otro país: no es homónima
    ]);
    expect(r).toEqual([
      { id: 1, slug: "san-jose-del-cabo-bcs", source: "new" },
      { id: 2, slug: "san-jose-del-cabo-son", source: "new" },
      { id: 3, slug: "san-jose-del-cabo", source: "new" },
    ]);
  });

  it("REQ-087: san-jose-bcs (ejemplo del diccionario)", () => {
    const r = assignCitySlugs([city(1, 99, "San José", { stateCode: "BCS" }), city(2, 99, "San José", { stateCode: "NL" })]);
    expect(r[0].slug).toBe("san-jose-bcs");
  });

  it("REQ-087: homónima sin código de estado queda pendiente para revisión", () => {
    const r = assignCitySlugs([city(1, 99, "León", { stateCode: "GTO" }), city(2, 99, "León")]);
    expect(r).toEqual([
      { id: 1, slug: "leon-gto", source: "new" },
      { id: 2, slug: null, source: "pending", reason: "homónima sin código de estado" },
    ]);
  });

  it("REQ-086/087: un slug de ciudad guardado no cambia; la homónima nueva lleva el estado", () => {
    const r = assignCitySlugs([
      city(1, 99, "Valladolid", { slug: "valladolid" }),
      city(2, 99, "Valladolid", { stateCode: "YUC" }),
    ]);
    expect(r).toEqual([
      { id: 1, slug: "valladolid", source: "kept" },
      { id: 2, slug: "valladolid-yuc", source: "new" },
    ]);
  });

  it("REQ-087: mismo nombre y mismo estado → sufijo corto para no chocar", () => {
    const r = assignCitySlugs([city(1, 99, "Santa Ana", { stateCode: "SON" }), city(2, 99, "Santa Ana", { stateCode: "SON" })]);
    expect(r.map((x) => x.slug)).toEqual(["santa-ana-son", "santa-ana-son-2"]);
  });

  it("REQ-087: ciudad sin nombre utilizable queda pendiente", () => {
    expect(assignCitySlugs([city(1, 99, "")])[0]).toMatchObject({ slug: null, source: "pending" });
  });
});
