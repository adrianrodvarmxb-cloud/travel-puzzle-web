import { describe, it, expect } from "vitest";
import { destinationTree, findCity } from "./catalog";
import { fx, tour } from "../fixtures/destinos";
import { cityPage, countryPage, destinosPage, primeraPiezaPage, tourPage, cityTransportCards, goneRewritePath, goneViewFromPlace, sitemapInput } from "./page-model";
import { buildSitemaps } from "@/seo/lib/sitemaps";
import { findDuplicateTitles } from "@/seo/lib/titles";

const site = "https://travelpuzzle.com.mx";
const now = new Date("2026-11-05T12:00:00Z");
const tours = [
  tour(10, 1, { title: "Centro Histórico", reviews: 900, provider: "Guía Ana" }),
  tour(10, 1, { title: "Coyoacán", reviews: 500 }),
  tour(10, 1, { title: "Xochimilco en trajinera", price: 25, reviews: 300 }),
  tour(10, 1, { title: "Lucha libre", reviews: 50 }),
  tour(11, 1, { title: "Oaxaca mágico", reviews: 40 }),
  tour(20, 2, { title: "Cusco colonial", reviews: 700 }),
];
const tree = destinationTree({ ...fx, tours, trips: [], now });
const cdmx = findCity(tree, "mx", "ciudad-de-mexico")!;
const oax = findCity(tree, "mx", "oaxaca")!;

describe("REQ-099: titles y H1 por página", () => {
  it("REQ-099: hubs empiezan por la sección; ciudad con free tours usa el patrón firmado", () => {
    expect(primeraPiezaPage(tree, site).meta.title).toBe("La Primera Pieza | Travel Puzzle");
    expect(destinosPage(tree, site).meta.title).toBe("Destinos | Travel Puzzle");
    expect(countryPage(tree[0], site).meta.title).toBe("México | Travel Puzzle");
    expect(cityPage(cdmx.country, cdmx.city, site).meta.title).toBe("Free tours en Ciudad de México: tú decides cuánto vale | Travel Puzzle");
    expect(cityPage(cdmx.country, cdmx.city, site).h1).toBe("Ciudad de México");
  });

  it("REQ-099: ficha de free tour y de pago", () => {
    const free = tourPage({ country: cdmx.country, city: cdmx.city, tour: cdmx.city.freeTours[0], siteUrl: site, lang: "es" });
    expect(free.meta.title).toBe("Centro Histórico – Free tour en Ciudad de México | Travel Puzzle");
    const paid = tourPage({ country: cdmx.country, city: cdmx.city, tour: cdmx.city.paidTours[0], siteUrl: site, lang: "es" });
    expect(paid.meta.title).toBe("Xochimilco en trajinera – Tour en Ciudad de México | Travel Puzzle");
  });

  it("REQ-099: ningún title se repite entre las páginas generadas", () => {
    const pages = [
      { url: "/la-primera-pieza", title: primeraPiezaPage(tree, site).meta.title },
      { url: "/destinos", title: destinosPage(tree, site).meta.title },
      ...tree.flatMap((c) => [
        { url: c.href, title: countryPage(c, site).meta.title },
        ...c.cities.flatMap((ci) => [
          { url: ci.href, title: cityPage(c, ci, site).meta.title },
          ...[...ci.freeTours, ...ci.paidTours].map((t) => ({ url: t.href, title: tourPage({ country: c, city: ci, tour: t, siteUrl: site, lang: "es" }).meta.title })),
        ]),
      ]),
    ];
    expect(findDuplicateTitles(pages)).toEqual([]);
  });

  it("REQ-099: una ciudad con el mismo nombre que su país no repite el title del país", () => {
    const t = destinationTree({
      countries: [{ id: 5, code: "pa", iso2: "PA", translations: { es: "Panamá" } }],
      cities: [{ id: 50, countryId: 5, translations: { es: "Panamá" }, slug: "panama", guide: null, guideUpdatedAt: null, indexableSince: null, failingSince: null }],
      tours: [tour(50, 5, { price: 10 })],
      trips: [],
      now,
    });
    expect(cityPage(t[0], t[0].cities[0], site).meta.title).not.toBe(countryPage(t[0], site).meta.title);
  });
});

describe("REQ-089/091: robots por página", () => {
  it("REQ-089: ciudad indexada = index; ciudad que no cumple = noindex (pero la página existe)", () => {
    expect(cityPage(cdmx.country, cdmx.city, site).meta.index).toBe(true);
    expect(cityPage(oax.country, oax.city, site).meta.index).toBe(false);
  });
  it("REQ-089: la ficha de un tour en una ciudad noindex también va en noindex", () => {
    expect(tourPage({ country: oax.country, city: oax.city, tour: oax.city.freeTours[0], siteUrl: site, lang: "es" }).meta.index).toBe(false);
  });
  it("REQ-091: país sin ciudades indexadas = noindex; /destinos solo lista países indexables", () => {
    const only = destinationTree({ ...fx, tours: [tour(11, 1), tour(20, 2)], trips: [], now });
    expect(countryPage(only.find((c) => c.slug === "mx")!, site).meta.index).toBe(false);
    expect(destinosPage(only, site).countries.map((c) => c.href)).toEqual(["/destinos/pe"]);
  });
});

describe("REQ-100: JSON-LD y migas", () => {
  const types = (ld: unknown[]) => ld.map((x) => (x as { "@type": string })["@type"]);

  it("REQ-100: ciudad = TouristDestination (ISO-2) + BreadcrumbList + FAQPage con 3 a 5 preguntas", () => {
    const p = cityPage(cdmx.country, cdmx.city, site);
    expect(types(p.jsonLd)).toEqual(["TouristDestination", "BreadcrumbList", "FAQPage"]);
    expect((p.jsonLd[0] as { address: { addressCountry: string } }).address.addressCountry).toBe("MX");
    expect(p.faq.length).toBeGreaterThanOrEqual(3);
    expect(p.faq.length).toBeLessThanOrEqual(5);
    expect(p.crumbs.map((c) => c.name)).toEqual(["Inicio", "Destinos", "México", "Ciudad de México"]);
  });

  it("REQ-100: país = TouristDestination + BreadcrumbList; hubs = BreadcrumbList", () => {
    expect(types(countryPage(tree[0], site).jsonLd)).toEqual(["TouristDestination", "BreadcrumbList"]);
    expect(types(destinosPage(tree, site).jsonLd)).toEqual(["BreadcrumbList"]);
    expect(types(primeraPiezaPage(tree, site).jsonLd)).toEqual(["BreadcrumbList"]);
  });

  it("REQ-100: ficha = Product + Offer en EUR (0 en free tour) + BreadcrumbList con URLs absolutas", () => {
    const p = tourPage({ country: cdmx.country, city: cdmx.city, tour: cdmx.city.freeTours[0], siteUrl: site, lang: "es" });
    expect(types(p.jsonLd)).toEqual(["Product", "BreadcrumbList"]);
    expect((p.jsonLd[0] as { offers: { price: number; priceCurrency: string } }).offers).toMatchObject({ price: 0, priceCurrency: "EUR" });
    const crumbs = (p.jsonLd[1] as { itemListElement: { item: string }[] }).itemListElement;
    expect(crumbs.at(-1)!.item).toBe(`${site}/destinos/mx/ciudad-de-mexico/${cdmx.city.freeTours[0].href.split("/").pop()}`);
  });

  it("REQ-100: las respuestas del FAQ no mencionan a FREETOUR", () => {
    for (const { q, a } of cityPage(cdmx.country, cdmx.city, site).faq) expect(`${q} ${a}`).not.toMatch(/freetour/i);
  });
});

describe("REQ-101: Actividades destacadas y canonical", () => {
  it("REQ-101: cada hub lleva 3 tours enlazados (más reseñas primero)", () => {
    expect(cityPage(cdmx.country, cdmx.city, site).featured!.items.map((i) => i.title)).toEqual(["Centro Histórico", "Coyoacán", "Xochimilco en trajinera"]);
    expect(destinosPage(tree, site).featured!.items).toHaveLength(3);
    expect(countryPage(tree[0], site).featured!.items).toHaveLength(3);
    expect(primeraPiezaPage(tree, site).featured!.items.every((i) => i.href.startsWith("/destinos/"))).toBe(true);
  });
  it("REQ-101: canonical propio y absoluto", () => {
    expect(cityPage(cdmx.country, cdmx.city, site).meta.canonical).toBe(`${site}/destinos/mx/ciudad-de-mexico`);
    expect(primeraPiezaPage(tree, site).meta.canonical).toBe(`${site}/la-primera-pieza`);
  });
});

describe("REQ-088: /la-primera-pieza agrupa los free tours por país", () => {
  it("REQ-088: solo free tours, por país, con enlace al país", () => {
    const p = primeraPiezaPage(tree, site);
    expect(p.groups.map((g) => g.href)).toEqual(["/destinos/mx", "/destinos/pe"]);
    expect(p.groups[0].tours.every((t) => t.isFreeTour)).toBe(true);
    expect(p.groups[0].total).toBe(4);
  });
});

describe("REQ-094/095/097/098: ficha", () => {
  it("REQ-094: H1 = título real; la colección solo nombra la insignia", () => {
    const p = tourPage({ country: cdmx.country, city: cdmx.city, tour: cdmx.city.freeTours[0], siteUrl: site, lang: "es" });
    expect(p.heading.h1).toBe("Centro Histórico");
    expect(p.heading.collection).toBe("La Primera Pieza");
  });
  it("REQ-095/097: free tour lleva insignia y aviso base; el de pago no lleva insignia y dice 24 h", () => {
    const free = tourPage({ country: cdmx.country, city: cdmx.city, tour: cdmx.city.freeTours[0], siteUrl: site, lang: "es" });
    expect(free.badge).toBe("🧩 Primera Pieza · Tú decides cuánto vale");
    expect(free.notice[0]).toMatch(/^Reservar es gratis/);
    const paid = tourPage({ country: cdmx.country, city: cdmx.city, tour: cdmx.city.paidTours[0], siteUrl: site, lang: "es" });
    expect(paid.badge).toBeNull();
    expect(paid.notice.join(" ")).toMatch(/24 h/);
  });
  it("REQ-098: «Operado por un guía local · {proveedor}» sin mencionar FREETOUR", () => {
    const p = tourPage({ country: cdmx.country, city: cdmx.city, tour: cdmx.city.freeTours[0], siteUrl: site, lang: "es" });
    expect(p.operatedBy).toBe("Operado por un guía local · Guía Ana");
    const ft = tourPage({ country: cdmx.country, city: cdmx.city, tour: { ...cdmx.city.freeTours[0], provider: "FREETOUR.com" }, siteUrl: site, lang: "es" });
    expect(ft.operatedBy).toBe("Operado por un guía local");
  });
});

describe("REQ-088: traslados en la ciudad desde el registro de complementos", () => {
  const groups = [{ group: "transporte", title: "Transporte", cards: [
    { id: "kiwitaxi", title: "Traslado", description: "d", chargedByLabel: "Lo reservas con Kiwitaxi", price: null, cta: { kind: "widget" as const, label: "Buscar traslado" as const }, cities: [] },
    { id: "bigbus", title: "Bus", description: "d", chargedByLabel: "Lo reservas con Travel Puzzle", price: "A cotizar", cta: { kind: "request" as const, label: "Pedir a Travel Puzzle" as const, url: "https://wa.me/1" }, cities: ["Londres"] },
  ] }];
  it("REQ-088: el traslado general va a /traslados; lo de solicitud solo en sus ciudades", () => {
    expect(cityTransportCards(groups, "Ciudad de México", true).map((c) => [c.id, c.href])).toEqual([["kiwitaxi", "/traslados"]]);
    expect(cityTransportCards(groups, "londres", true).map((c) => c.id)).toEqual(["kiwitaxi", "bigbus"]);
  });
  it("REQ-088: con traslados apagados solo queda lo que tiene forma real de pedirse en esa ciudad", () => {
    expect(cityTransportCards(groups, "Ciudad de México", false)).toEqual([]);
  });
});

describe("REQ-092: página 410 (con el header del sitio)", () => {
  const removed = { status: "removed" as const, title: "Tour viejo", cityName: "Ciudad de México", countrySlug: "mx", citySlug: "ciudad-de-mexico", cityLive: true };
  it("REQ-092: el middleware reescribe a /tour-retirado solo con el id (sin texto en la URL)", () => {
    const u = new URL(goneRewritePath("ck1"), "https://x");
    expect(u.pathname).toBe("/tour-retirado");
    expect(Object.fromEntries(u.searchParams)).toEqual({ id: "ck1" });
  });
  it("REQ-092: el título y la ciudad salen de la base (tour removed)", () => {
    expect(goneViewFromPlace(removed)).toEqual({ title: "Tour viejo", cityName: "Ciudad de México", cityHref: "/destinos/mx/ciudad-de-mexico" });
  });
  it("REQ-092: sin tour, o si el tour sigue activo, se usa el texto fijo (nunca un parámetro)", () => {
    const fixed = { title: "Este tour", cityName: "otros destinos", cityHref: "/destinos" };
    expect(goneViewFromPlace(null)).toEqual(fixed);
    expect(goneViewFromPlace({ ...removed, status: "active" })).toEqual(fixed);
    expect(goneViewFromPlace({ ...removed, status: "missing" })).toEqual(fixed);
  });
  it("REQ-092: si la ciudad ya no tiene tours o no tiene slug, enlaza a /destinos; título vacío o largo con respaldo", () => {
    expect(goneViewFromPlace({ ...removed, cityLive: false })).toMatchObject({ cityName: "otros destinos", cityHref: "/destinos" });
    expect(goneViewFromPlace({ ...removed, citySlug: null })).toMatchObject({ cityHref: "/destinos" });
    expect(goneViewFromPlace({ ...removed, title: "  " }).title).toBe("Este tour");
    expect(goneViewFromPlace({ ...removed, title: "x".repeat(500) }).title).toHaveLength(160);
  });
});

describe("REQ-102: sitemaps desde el árbol", () => {
  it("REQ-102: solo ciudades indexadas y sus fichas, por país, con lastmod del contenido", () => {
    const { index, files } = buildSitemaps(sitemapInput(tree, site));
    expect(index).toContain(`${site}/sitemap-destinos.xml`);
    expect(index).toContain(`${site}/sitemap-tours-mx.xml`);
    expect(files["sitemap-destinos.xml"]).toContain(`${site}/destinos/mx/ciudad-de-mexico</loc>`);
    expect(files["sitemap-destinos.xml"]).not.toContain("/destinos/mx/oaxaca<");
    expect(files["sitemap-tours-mx.xml"]).not.toContain("/oaxaca/");
    expect(files["sitemap-tours-mx.xml"]).toContain("<lastmod>2026-11-02</lastmod>");
  });
});
