import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { homeTaxonomy, loadCarouselOrder, loadHomeData } from "./load";
import type { HighlightRepo } from "@/reviews/repository";

const fail = () => Promise.reject(new Error("D1 caído"));

/** Base falsa: todo falla salvo lo que se indique. */
function fakePrisma(overrides: Record<string, Record<string, unknown>> = {}) {
  const model = (name: string) => ({ groupBy: fail, findMany: fail, count: fail, ...(overrides[name] ?? {}) });
  return { tour: model("tour"), city: model("city"), country: model("country"), $queryRaw: fail } as unknown as PrismaClient;
}

const noHighlights: HighlightRepo = { listFiveStarForTours: async () => [], listRecentFiveStar: async () => [] };

describe("datos del inicio", () => {
  it("si la base falla, el inicio no se cae: cada sección sale vacía", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await loadHomeData({ prisma: fakePrisma(), highlights: noHighlights, includePaid: false, lang: "es" });
    expect(out).toMatchObject({ hero: [], destinations: [], featured: [], continents: [], reviews: [] });
    expect(out.stats.tours).toBe(0);
  });

  it("las reseñas del inicio llevan su tour", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const review = { id: 1, tourExternalId: 99, reviewerName: "Ana", language: "Spanish", title: null, content: "Excelente recorrido por la ciudad", rate: 5, addedAt: new Date("2026-10-30") };
    const prisma = fakePrisma({
      tour: {
        findMany: async () => [{ id: "t99", externalId: 99, city: { translations: { en: "Budapest", es: "Budapest" } }, translations: [{ language: "es", title: "Recorrido por Budapest" }] }],
      },
    });
    const out = await loadHomeData({ prisma, highlights: { ...noHighlights, listRecentFiveStar: async () => [review] }, includePaid: false, lang: "es" });
    expect(out.reviews).toHaveLength(1);
    expect(out.reviews[0].tour).toEqual({ id: "t99", titles: { es: "Recorrido por Budapest" }, cityNames: { en: "Budapest", es: "Budapest" } });
  });

  it("REQ-219: la reseña cuyo tour se llama «FreeTour…» no sale; entra la siguiente", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rv = (id: number, ext: number, days: number) => ({ id, tourExternalId: ext, reviewerName: "R" + id, language: "Spanish", title: null, content: "Excelente recorrido por la ciudad", rate: 5, addedAt: new Date(Date.UTC(2026, 9, 30) - days * 86400000) });
    const tours = [
      { id: "t1", externalId: 1, city: { translations: { es: "Tokio" } }, translations: [{ language: "es", title: "FreeTour a Pie por Shinjuku" }] },
      { id: "t2", externalId: 2, city: { translations: { es: "Lima" } }, translations: [{ language: "es", title: "Recorrido por el centro de Lima" }] },
    ];
    const prisma = fakePrisma({ tour: { findMany: async () => tours } });
    const out = await loadHomeData({ prisma, highlights: { ...noHighlights, listRecentFiveStar: async () => [rv(1, 1, 0), rv(2, 2, 1)] }, includePaid: false, lang: "es" });
    expect(out.reviews.map((r) => r.tour?.id)).toEqual(["t2"]);
  });

  it("REQ-219: «Los más elegidos» no incluye tours con la marca en el título (en ningún idioma)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tour = (id: string, ext: number, title: string, en = title) => ({
      id, externalId: ext, cityId: ext, titleImageURL: "https://x/" + id + ".jpg", priceValue: 0, priceCurrency: "EUR", duration: "2", rating: 4.9, reviewsNumber: 500 - ext,
      country: { code: "MX" }, city: { translations: { es: "CDMX" } }, translations: [{ language: "es", title }, { language: "en", title: en }],
    });
    const list = [tour("a", 1, "Free Tour por el Centro"), tour("b", 2, "Recorrido por Coyoacán", "FreeTour Coyoacan"), tour("c", 3, "Recorrido por Xochimilco", "Xochimilco walk")];
    const prisma = fakePrisma({ tour: { findMany: async () => list } });
    const out = await loadHomeData({ prisma, highlights: noHighlights, includePaid: false, lang: "es" });
    expect(out.featured.map((t) => t.id)).toEqual(["c"]);
  });
});

describe("REQ-450/453: carruseles con el medidor de reseñas (CARRUSELES_HOME_ENABLED)", () => {
  const tourRow = (id: string, o: Record<string, unknown> = {}) => ({
    id, externalId: Number(id.slice(1)), cityId: Number(id.slice(1)), cityName: `City ${id}`, countryCode: "es", categoryId: 12, durationMinutes: 120,
    price: 0, rating: 4.8, reviews: 400, titleEs: `Tour ${id}`, titleEn: `Tour ${id}`, ...o,
  });
  const hydrated = (id: string) => ({
    id, externalId: Number(id.slice(1)), titleImageURL: `https://img/${id}.jpg`, priceValue: 0, priceCurrency: "EUR", duration: "2:00", rating: 4.8, reviewsNumber: 400,
    city: { translations: { es: `City ${id}` } }, translations: [{ language: "es", title: `Tour ${id}` }],
  });
  const trip = { id: "v1", path: "/viajes/paracas", code: "IWP-LIM-08", kind: "tour", title: "Paracas e Islas Ballestas desde Lima", summary: "", image: "https://img/v1.jpg", countries: ["PE"], places: "Perú", cities: ["Lima"], durationDays: 1, price: null, priceFrom: null, languages: [], dates: [], group: "excursiones", freeCancel: false, private: false, hotelPickup: false, createdAt: 0, durationMinutes: 1440, dayTrip: true, formato: "excursion-dia" } as unknown as import("@/trips/public-load").TripCard;

  function prismaWith(rows: { all: unknown[]; day: unknown[] }, titleOf: (id: string) => string = (id) => `Tour ${id}`) {
    const $queryRaw = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (strings.join("?").includes("SUM(")) return [{ s: 4800, v: 1000 }];
      return values.includes(1500) ? rows.day : rows.all; // LIMIT 1500 = consulta de excursiones (REQ-852)
    };
    const p = fakePrisma({ tour: { findMany: async (q: { where: { id: { in: string[] } } }) => q.where.id.in.map((id) => ({ ...hydrated(id), translations: [{ language: "es", title: titleOf(id) }] })) } }) as unknown as Record<string, unknown>;
    return { ...p, $queryRaw } as unknown as PrismaClient;
  }

  it("REQ-450: «Los más elegidos» sale del medidor (bayesiano) y excluye traslados y online", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prisma = prismaWith({ all: [tourRow("t1", { rating: 4.6, reviews: 20000 }), tourRow("t2", { rating: 4.95, reviews: 900 }), tourRow("t3", { categoryId: 8, rating: 5, reviews: 9000 })], day: [] });
    const out = await loadHomeData({ prisma, highlights: noHighlights, includePaid: false, lang: "es", carousels: true });
    // REQ-850 (PO 6-11 22:05): primero los Favoritos (≥4.9 y ≥180); REQ-10515 (PO 13-11 16:00): después el resto por puntaje (t1, 4.6).
    expect(out.featured.map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("REQ-270: con la taxonomía (TAXONOMY_PUBLISH_ENABLED), lo que no se publica no entra a los carruseles; sin ella, como hoy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { homeTaxonomy } = await import("./load");
    const stub = ((t: { title: string }) => ({ formato: /t1|t4/.test(t.title) ? "por-revisar" : "caminata", seccion: "experiencias", guiaEnPersona: true })) as unknown as NonNullable<ReturnType<typeof homeTaxonomy>>;
    const rows = { all: [tourRow("t1", { rating: 5, reviews: 9000 }), tourRow("t2", { rating: 4.9 })], day: [tourRow("t4", { categoryId: 4, durationMinutes: 600 }), tourRow("t5", { categoryId: 4, durationMinutes: 600 })] };
    const off = await loadHomeData({ prisma: prismaWith(rows), highlights: noHighlights, includePaid: false, lang: "es", carousels: true, taxonomy: homeTaxonomy(false) });
    expect(off.featured.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(off.dayTrips.map((d) => (d.type === "tour" ? d.tour.id : d.trip.id))).toEqual(["t4", "t5"]);
    const on = await loadHomeData({ prisma: prismaWith(rows), highlights: noHighlights, includePaid: false, lang: "es", carousels: true, taxonomy: stub });
    expect(on.featured.map((t) => t.id)).toEqual(["t2"]);
    expect(on.dayTrips.map((d) => (d.type === "tour" ? d.tour.id : d.trip.id))).toEqual(["t5"]);
  });

  it("REQ-453: «Excursiones de un día» mezcla tours con reseñas y viajes de proveedores sin reseñas (al final)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prisma = prismaWith({ all: [], day: [tourRow("t4", { categoryId: 4, durationMinutes: 600 }), tourRow("t5", { categoryId: 19, durationMinutes: 480 })] });
    const out = await loadHomeData({ prisma, highlights: noHighlights, includePaid: false, lang: "es", carousels: true, ownTrips: [trip] });
    expect(out.dayTrips.map((d) => (d.type === "tour" ? d.tour.id : d.trip.id))).toEqual(["t4", "v1"]);
  });

  it("REQ-453: con la bandera apagada no hay excursiones y «Los más elegidos» usa la regla anterior", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await loadHomeData({ prisma: fakePrisma(), highlights: noHighlights, includePaid: false, lang: "es", ownTrips: [trip] });
    expect(out.dayTrips).toEqual([]);
  });

  it("REQ-450: si el medidor falla, el inicio no se cae (excursiones vacías)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await loadHomeData({ prisma: fakePrisma(), highlights: noHighlights, includePaid: false, lang: "es", carousels: true });
    expect(out.dayTrips).toEqual([]);
    expect(out.featured).toEqual([]);
  });

  it("REQ-454: si un título en otro idioma dice «free tour», se salta y entra la siguiente", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prisma = prismaWith({ all: [tourRow("t1", { rating: 4.99 }), tourRow("t2", { rating: 4.95 }), tourRow("t3", { rating: 4.9 })], day: [] }, (id) => (id === "t1" ? "Il miglior free tour di Roma" : `Tour ${id}`));
    const out = await loadHomeData({ prisma, highlights: noHighlights, includePaid: false, lang: "es", carousels: true });
    expect(out.featured.map((t) => t.id)).toEqual(["t2", "t3"]);
  });
});

describe("REQ-454: reseñas y favoritos sin títulos que digan FreeTour (sin depender de la bandera)", () => {
  it("REQ-454: la reseña de un tour cuyo título dice «free tour» se salta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rev = (id: number) => ({ id, tourExternalId: id, reviewerName: "Ana", language: "Spanish", title: null, content: "Excelente recorrido por la ciudad", rate: 5, addedAt: new Date("2026-10-30") });
    const prisma = fakePrisma({
      tour: {
        findMany: async () => [
          { id: "a", externalId: 1, city: { translations: { es: "Roma" } }, translations: [{ language: "es", title: "Free Tour de Roma" }] },
          { id: "b", externalId: 2, city: { translations: { es: "Lima" } }, translations: [{ language: "es", title: "Lima colonial" }] },
        ],
      },
    });
    const out = await loadHomeData({ prisma, highlights: { ...noHighlights, listRecentFiveStar: async () => [rev(1), rev(2)] }, includePaid: false, lang: "es" });
    expect(out.reviews.map((r) => r.tour?.id)).toEqual(["b"]);
  });

  it("REQ-454: «Los más elegidos» con la regla anterior también se salta esos títulos", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = (id: string, title: string) => ({ id, externalId: 1, cityId: id.charCodeAt(0), titleImageURL: "https://i/x.jpg", priceValue: 0, priceCurrency: "EUR", duration: "2:00", rating: 4.9, reviewsNumber: 900, country: { code: "IT" }, city: { translations: {} }, translations: [{ language: "es", title }] });
    const prisma = fakePrisma({ tour: { findMany: async () => [t("a", "Free Tour de Roma"), t("b", "Roma antigua")] } });
    const out = await loadHomeData({ prisma, highlights: noHighlights, includePaid: false, lang: "es" });
    expect(out.featured.map((x) => x.id)).toEqual(["b"]);
  });
});

describe("REQ-453: «Excursiones de un día» no repite lo que ya está en «Los más elegidos»", () => {
  it("REQ-453: un tour que sale en ambos se queda solo en «Los más elegidos»", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const row = (id: string, o: Record<string, unknown> = {}) => ({ id, externalId: Number(id.slice(1)), cityId: Number(id.slice(1)), cityName: `C${id}`, countryCode: "jp", categoryId: 4, durationMinutes: 600, price: 0, rating: 4.9, reviews: 500, titleEs: `Excursión ${id}`, titleEn: `Day trip ${id}`, ...o });
    const $queryRaw = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (strings.join("?").includes("SUM(")) return [{ s: 4800, v: 1000 }];
      return values.includes(1500) ? [row("t1"), row("t2")] : [row("t1")];
    };
    const hydrated = (id: string) => ({ id, externalId: Number(id.slice(1)), titleImageURL: `https://img/${id}.jpg`, priceValue: 0, priceCurrency: "EUR", duration: "10:00", rating: 4.9, reviewsNumber: 500, city: { translations: {} }, translations: [{ language: "es", title: `Excursión ${id}` }] });
    const base = fakePrisma({ tour: { findMany: async (q: { where: { id: { in: string[] } } }) => q.where.id.in.map(hydrated) } }) as unknown as Record<string, unknown>;
    const out = await loadHomeData({ prisma: { ...base, $queryRaw } as unknown as PrismaClient, highlights: noHighlights, includePaid: false, lang: "es", carousels: true });
    expect(out.featured.map((t) => t.id)).toEqual(["t1"]);
    expect(out.dayTrips.map((d) => (d.type === "tour" ? d.tour.id : d.trip.id))).toEqual(["t2"]);
  });
});


// REQ-803 (C7): las reseñas de FREETOUR se muestran como reseñas de ese tour, nunca como reseñas de Travel Puzzle.
describe("REQ-803 reseñas del inicio siempre ligadas a su tour", () => {
  it("REQ-803: la reseña cuyo tour no se encuentra no sale (no queda como reseña suelta del sitio)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const rv = (id: number, ext: number) => ({ id, tourExternalId: ext, reviewerName: "R" + id, language: "Spanish", title: null, content: "Excelente recorrido por la ciudad", rate: 5, addedAt: new Date("2026-10-30") });
    const tours = [{ id: "t2", externalId: 2, city: { translations: { es: "Lima" } }, translations: [{ language: "es", title: "Recorrido por el centro de Lima" }] }];
    const prisma = fakePrisma({ tour: { findMany: async () => tours } });
    const out = await loadHomeData({ prisma, highlights: { ...noHighlights, listRecentFiveStar: async () => [rv(1, 1), rv(2, 2)] }, includePaid: false, lang: "es" });
    expect(out.reviews.map((r) => r.id)).toEqual([2]);
    expect(out.reviews.every((r) => r.tour !== null)).toBe(true);
  });
});

// REQ-10517: caracterización de punta a punta (en memoria) de los carruseles con un proveedor sin reseñas (Tangol).
describe("REQ-10517: un Tour de providerId «tangol» sin reseñas sale en los carruseles del inicio", () => {
  type Row = Record<string, unknown>;
  const ft = (i: number, o: Row = {}): Row => ({ id: `ft${i}`, externalId: i, providerId: "freetour", cityId: i, cityName: `Ciudad ${i}`, countryCode: "es", categoryId: 12, durationMinutes: 150, price: 0, rating: 4.9 + (i % 10) / 100, reviews: 200 + i, titleEs: `Recorrido ${i}`, titleEn: `Walk ${i}`, ...o });
  const tangolTour: Row = { id: "tg1", externalId: 5001, providerId: "tangol", cityId: 900, cityName: "Buenos Aires", countryCode: "ar", categoryId: 9000001, durationMinutes: 180, price: 95, rating: null, reviews: 0, titleEs: "Recorrido por San Telmo y La Boca", titleEn: "San Telmo and La Boca walk" };
  const tangolDay: Row = { id: "tg2", externalId: 5002, providerId: "tangol", cityId: 901, cityName: "Bariloche", countryCode: "ar", categoryId: 9000002, durationMinutes: 600, price: 140, rating: null, reviews: 0, titleEs: "Excursión a Cerro Catedral", titleEn: "Cerro Catedral excursion" };
  const tangolTransfer: Row = { id: "tg3", externalId: 5003, providerId: "tangol", cityId: 900, cityName: "Buenos Aires", countryCode: "ar", categoryId: 9000011, durationMinutes: 45, price: 30, rating: null, reviews: 0, titleEs: "Traslado aeropuerto Ezeiza a hotel", titleEn: "Ezeiza airport transfer" };
  const ftDay = (i: number): Row => ft(100 + i, { categoryId: 4, durationMinutes: 600, price: 60, titleEs: `Excursión ${i} desde Madrid`, titleEn: `Day trip ${i} from Madrid`, countryCode: `c${i % 15}` });

  /** Base en memoria: el SQL de candidatas devuelve las filas tal cual (el filtro lo hace la lib); la hidratación devuelve la tarjeta. */
  function memoryPrisma(all: Row[], day: Row[]) {
    const $queryRaw = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      if (strings.join("?").includes("SUM(")) return [{ s: 4800, v: 1000 }];
      return values.includes(1500) ? day : all;
    };
    const byId = new Map([...all, ...day].map((r) => [r.id as string, r]));
    const findMany = async (q: { where: { id: { in: string[] } } }) => q.where.id.in.flatMap((id) => {
      const r = byId.get(id); if (!r) return [];
      return [{ id, externalId: r.externalId, providerId: r.providerId, providerTitle: r.providerId === "tangol" ? "Travel Puzzle" : "Guía local", categoryId: r.categoryId, durationMinutes: r.durationMinutes, titleImageURL: `https://img/${id}.jpg`, priceValue: r.price, priceCurrency: "USD", duration: "3:00", rating: r.rating, reviewsNumber: r.reviews, city: { translations: { es: r.cityName } }, translations: [{ language: "es", title: r.titleEs }, { language: "en", title: r.titleEn }] }];
    });
    const base = fakePrisma({ tour: { findMany } }) as unknown as Record<string, unknown>;
    return { ...base, $queryRaw } as unknown as PrismaClient;
  }

  it("REQ-10517: loadCarouselOrder (taxonomía encendida, como en producción) devuelve el tour de Tangol en «Los más elegidos» y su excursión en «Excursiones»; el traslado no entra a ninguno", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const all = [...Array.from({ length: 40 }, (_, i) => ft(i)), tangolTour, tangolTransfer];
    const day = [...Array.from({ length: 20 }, (_, i) => ftDay(i)), tangolDay, tangolTransfer];
    const order = await loadCarouselOrder(memoryPrisma(all, day), true, [], homeTaxonomy(true));
    const elegidos = order.elegidos.map((x) => x.id);
    expect(elegidos).toContain("tg1");
    expect(elegidos.slice(0, 12)).toContain("tg1"); // REQ-10516: en la primera página
    expect(elegidos.slice(0, 12).filter((id) => id.startsWith("ft"))).toHaveLength(11);
    expect(elegidos).not.toContain("tg3");
    const excursiones = order.excursiones.map((x) => x.id);
    expect(excursiones.slice(0, 12)).toContain("tg2");
    expect(excursiones).not.toContain("tg3");
    expect(excursiones).not.toContain("tg1"); // no es excursión (3 h, red de seguridad → tour)
  });

  it("REQ-10517: la tarjeta hidratada del tour de Tangol lleva su formato por el mapeo de Tangol y no nombra al proveedor (providerTitle = marca propia)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const all = [...Array.from({ length: 5 }, (_, i) => ft(i)), tangolTour];
    const out = await loadHomeData({ prisma: memoryPrisma(all, [tangolDay]), highlights: noHighlights, includePaid: true, lang: "es", carousels: true, taxonomy: homeTaxonomy(true) });
    const tg = out.featured.find((t) => t.id === "tg1");
    expect(tg).toBeDefined();
    expect(tg!.formato).not.toBe("por-revisar");
    expect(tg!.rating).toBeNull();
    expect(tg!.reviews).toBe(0);
    expect(JSON.stringify(tg)).not.toMatch(/tangol/i);
    expect(out.dayTrips.map((d) => (d.type === "tour" ? d.tour.id : d.trip.id))).toEqual(["tg2"]);
  });
});
