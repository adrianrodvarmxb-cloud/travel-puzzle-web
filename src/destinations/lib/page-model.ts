/**
 * Modelo de cada página de destinos (Olas 4, 5 y 6): title, H1, canonical, robots, migas, JSON-LD,
 * «Actividades destacadas», FAQ y textos de la ficha. Puro: recibe el árbol de catalog.ts.
 * FREETOUR nunca se menciona al cliente (regla del PO).
 */
import { operatedByFor, tourDescription, tourLabels, tourTitleByFormat } from "@/taxonomy/lib/copy";
import { allTours, type CityNode, type CountryNode, type TourCardModel } from "./catalog";
import { ROUTES } from "./routes";
import { itemListJsonLd } from "@/seo/lib/itemlist";
import { canonicalUrl, featuredActivities } from "@/seo/lib/hub";
import { freeToursCityTitle, hubTitle, tourTitle } from "@/seo/lib/titles";
import { breadcrumbJsonLd, faqJsonLd, touristDestinationJsonLd } from "@/seo/lib/jsonld";
import { clip } from "@/seo/lib/meta";
import { PRIMERA_PIEZA_LABEL } from "@/tours/lib/menu";
import { tourHeading, type TourHeading } from "@/tours/lib/title";
import { primeraPiezaBadge } from "@/tours/lib/badge";
import { eventNotice } from "@/tours/lib/notice";
import { operatedBy } from "@/tours/lib/favorite";
import type { HubGroup } from "@/companions/lib/registry";
import type { SitemapInput } from "@/seo/lib/sitemaps";
import { enBreve, fichaJsonLd, guideLanguagesLabel, nextAvailability, type FichaInput } from "@/seo/lib/ficha-ld";
import { indexableEnrichment } from "@/seo/lib/enrichment";
import { fichaFacets } from "@/seo/lib/taxonomy-facets";
import { cardDuration } from "@/tours/lib/experience-card";
import { freshSummary } from "@/departures/lib/summary";

/** REQ-571: el resumen de salidas solo cuenta si es reciente (misma regla que los filtros, freshSummary). */
const fresh = (syncedAt: string | Date | null | undefined, today: string) =>
  !!syncedAt && freshSummary({ languages: [], dates: [] }, syncedAt instanceof Date ? syncedAt.toISOString() : String(syncedAt), new Date(`${today}T12:00:00Z`)) !== null;

// REQ-102: entrada de los sitemaps a partir del árbol (solo lo publicado; buildSitemaps filtra lo indexable).
export function sitemapInput(tree: CountryNode[], siteUrl: string): SitemapInput {
  return {
    siteUrl,
    countries: tree.map((c) => ({ slug: c.slug, indexable: c.indexable })),
    cities: tree.flatMap((c) => c.cities.map((ci) => ({ countrySlug: c.slug, slug: ci.slug, indexable: ci.indexed, guideUpdatedAt: ci.guideUpdatedAt }))),
    tours: tree.flatMap((c) =>
      c.cities.flatMap((ci) => allTours(ci).map((t) => ({ countrySlug: c.slug, citySlug: ci.slug, slug: t.href.split("/").pop() ?? null, status: "active" as const, contentUpdatedAt: t.updatedAt })))
    ),
  };
}

export interface Crumb { name: string; href: string }
export interface PageMeta { title: string; description: string; canonical: string; index: boolean }
export type Featured = ReturnType<typeof featuredActivities>;

const HOME: Crumb = { name: "Inicio", href: "/" };
const DESTINOS: Crumb = { name: "Destinos", href: ROUTES.destinos };
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const crumbsLd = (site: string, crumbs: Crumb[]) => breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: canonicalUrl(site, c.href) })));
const hubTours = (tours: TourCardModel[]) => tours.map((t) => ({ id: t.id, title: t.title, href: t.href, reviews: t.reviews, rating: t.rating, active: true }));
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
// REQ-582: ItemList de lo que lista la página (null si no hay nada; se filtra abajo).
const listLd = (site: string, name: string, items: { title?: string; name?: string; href: string }[]) =>
  itemListJsonLd({ siteUrl: site, name, items: items.map((i) => ({ name: i.title ?? i.name ?? "", href: i.href })) });
const present = <T,>(xs: (T | null)[]): T[] => xs.filter((x): x is T => x !== null);

// REQ-088 REQ-099 REQ-100 REQ-101: hub de la colección, free tours agrupados por país.
export function primeraPiezaPage(tree: CountryNode[], siteUrl: string, perCountry = 6) {
  const groups = tree
    .map((c) => {
      const free = c.cities.flatMap((ci) => ci.freeTours).sort((a, b) => b.reviews - a.reviews);
      return { country: c.name, href: c.href, indexable: c.indexable, total: free.length, tours: free.slice(0, perCountry) };
    })
    .filter((g) => g.total > 0);
  const crumbs = [HOME, { name: PRIMERA_PIEZA_LABEL, href: ROUTES.primeraPieza }];
  const countries = groups.length;
  return {
    meta: {
      title: hubTitle(PRIMERA_PIEZA_LABEL),
      description: clip(`Free tours con guías locales en ${plural(countries, "país", "países")}: reservar es gratis y al final le das al guía lo que consideres justo.`),
      canonical: canonicalUrl(siteUrl, ROUTES.primeraPieza),
      index: groups.some((g) => g.indexable),
    } satisfies PageMeta,
    h1: PRIMERA_PIEZA_LABEL,
    crumbs,
    featured: featuredActivities(hubTours(groups.flatMap((g) => g.tours))),
    groups,
    jsonLd: present([crumbsLd(siteUrl, crumbs), listLd(siteUrl, PRIMERA_PIEZA_LABEL, groups.flatMap((g) => g.tours))]),
  };
}

// REQ-088 REQ-091 REQ-099 REQ-100 REQ-101: hub de los países indexables.
export function destinosPage(tree: CountryNode[], siteUrl: string) {
  const shown = tree.filter((c) => c.indexable);
  const crumbs = [HOME, DESTINOS];
  const tours = shown.flatMap((c) => c.cities.flatMap(allTours));
  return {
    meta: {
      title: hubTitle(DESTINOS.name),
      description: clip(`Free tours, experiencias y traslados en ${shown.length ? list(shown.slice(0, 5).map((c) => c.name)) : "todo el mundo"}, con guías locales y un asesor en español por WhatsApp.`),
      canonical: canonicalUrl(siteUrl, ROUTES.destinos),
      index: shown.length > 0,
    } satisfies PageMeta,
    h1: DESTINOS.name,
    crumbs,
    featured: featuredActivities(hubTours(tours)),
    countries: shown.map((c) => ({ name: c.name, href: c.href, cities: c.cities.length, tours: c.cities.reduce((n, ci) => n + ci.activeTours, 0) })),
    jsonLd: present([crumbsLd(siteUrl, crumbs), listLd(siteUrl, DESTINOS.name, shown)]),
  };
}

// REQ-088 REQ-091 REQ-099 REQ-100 REQ-101
export function countryPage(country: CountryNode, siteUrl: string) {
  const crumbs = [HOME, DESTINOS, { name: country.name, href: country.href }];
  return {
    meta: {
      title: hubTitle(country.name),
      description: clip(`Free tours y tours en ${list(country.cities.slice(0, 3).map((c) => c.name))}${country.cities.length > 3 ? " y más ciudades" : ""} de ${country.name}, con guías locales.`),
      canonical: canonicalUrl(siteUrl, country.href),
      index: country.indexable,
    } satisfies PageMeta,
    h1: country.name,
    crumbs,
    featured: featuredActivities(hubTours(country.cities.flatMap(allTours))),
    cities: country.cities.map((c) => ({ name: c.name, href: c.href, free: c.freeTours.length, tours: c.paidTours.length + c.ownTrips.length })),
    jsonLd: present([touristDestinationJsonLd({ name: country.name, url: canonicalUrl(siteUrl, country.href), countryCode: country.iso2 }), crumbsLd(siteUrl, crumbs), listLd(siteUrl, `Destinos en ${country.name}`, country.cities)]),
  };
}

// REQ-100: 3 a 5 preguntas con datos reales de la ciudad (sin prometer lo que no existe).
export function cityFaq(city: CityNode): { q: string; a: string }[] {
  const free = city.freeTours.length;
  const tours = city.paidTours.length + city.ownTrips.length;
  return [
    ...(free ? [{ q: `¿Qué es un free tour en ${city.name}?`, a: "Es un recorrido con un guía local en el que reservar es gratis; al final le das al guía lo que consideres justo." }] : []),
    { q: `¿Cuántas experiencias hay en ${city.name}?`, a: `Hoy hay ${plural(free, "free tour", "free tours")} y ${plural(tours, "tour", "tours")} en ${city.name} en Travel Puzzle.` },
    {
      q: "¿Puedo cancelar mi reserva?",
      a: "Los free tours se cancelan gratis en cualquier momento; si tu grupo paga tarifa fija, la cancelación con reembolso es hasta 24 h antes. Los tours de pago tienen cancelación con reembolso hasta 24 h antes.",
    },
    { q: "¿Me ayudan con el resto del viaje?", a: "Sí. Un asesor de Travel Puzzle te ayuda en español por WhatsApp con traslados y otras experiencias." },
  ];
}

// REQ-088 REQ-089 REQ-099 REQ-100 REQ-101
export function cityPage(country: CountryNode, city: CityNode, siteUrl: string) {
  const crumbs = [HOME, DESTINOS, { name: country.name, href: country.href }, { name: city.name, href: city.href }];
  const faq = cityFaq(city);
  const sameAsCountry = fold(city.name) === fold(country.name);
  const title = city.freeTours.length ? freeToursCityTitle(city.name) : hubTitle(sameAsCountry ? `${city.name}, ${country.name}` : city.name);
  const tours = city.paidTours.length + city.ownTrips.length;
  return {
    meta: {
      title,
      description: clip(`${plural(city.freeTours.length, "free tour", "free tours")} y ${plural(tours, "tour", "tours")} en ${city.name}, ${country.name}, con guías locales. Reserva en línea o con un asesor por WhatsApp.`),
      canonical: canonicalUrl(siteUrl, city.href),
      index: city.indexed && country.indexable,
    } satisfies PageMeta,
    h1: city.name,
    crumbs,
    featured: featuredActivities(hubTours(allTours(city))),
    faq,
    jsonLd: [
      touristDestinationJsonLd({ name: `${city.name}, ${country.name}`, url: canonicalUrl(siteUrl, city.href), countryCode: country.iso2 }),
      crumbsLd(siteUrl, crumbs),
      ...[faqJsonLd(faq)].filter((x): x is NonNullable<typeof x> => !!x),
      ...present([listLd(siteUrl, `Experiencias en ${city.name}`, [...city.freeTours, ...city.paidTours, ...city.ownTrips])]),
    ],
  };
}

export interface TourPageModel {
  meta: PageMeta;
  crumbs: Crumb[];
  heading: TourHeading;
  badge: string | null;
  notice: string[];
  operatedBy: string;
  jsonLd: unknown[];
  /** T5 (REQ-415): etiquetas de formato fuera de la foto; vacío con TAXONOMY_LABELS_ENABLED apagada. */
  labels: string[];
  /** REQ-578: datos clave calculados en el servidor (el HTML inicial los trae sin JS). */
  facts: { duration: string | null; guideLanguages: string | null };
  /** REQ-570: el proveedor permite contenido indexable nuevo. */
  enrichment: boolean;
  /** REQ-577: «En breve» (null en FREETOUR). */
  enBreve: string | null;
  /** REQ-581: tipo principal y etiquetas visibles (vacío en FREETOUR). */
  facets: { tipo: string | null; etiquetas: string[] };
}

/** REQ-571…578: datos de la fila del tour que la ficha ya carga (Prisma). Sin ellos, el proveedor se asume FREETOUR (lo más restrictivo). */
export interface TourDetailFacts {
  providerId?: string | null;
  guideLanguages?: unknown;
  departureDates?: unknown;
  /** Fecha del último sync de salidas: con un resumen viejo no se afirma disponibilidad (REQ-049). */
  departuresSyncedAt?: string | Date | null;
  meetingPoint?: { title?: string | null; address?: string | null; lat?: number | null; lng?: number | null } | null;
  categoryId?: number | null;
  durationMinutes?: number | null;
}

// REQ-094 REQ-095 REQ-096 REQ-097 REQ-098 REQ-099 REQ-100: ficha bajo /destinos.
// REQ-570…578, REQ-581: marcado ["Product","TouristTrip"], datos de servidor, «En breve» y facetas según el interruptor del proveedor.
export function tourPage({ country, city, tour, siteUrl, lang, image, labels = false, detail = null, today = null }: { country: CountryNode; city: CityNode; tour: TourCardModel; siteUrl: string; lang: string; image?: string | null; labels?: boolean; detail?: TourDetailFacts | null; today?: string | null }): TourPageModel {
  const crumbs = [HOME, DESTINOS, { name: country.name, href: country.href }, { name: city.name, href: city.href }, { name: tour.title, href: tour.href }];
  // Dos tours con el mismo título real en la ciudad: el proveedor los distingue (title único, REQ-099).
  const twins = allTours(city).filter((t) => t.id !== tour.id && fold(t.title) === fold(tour.title)).length > 0;
  const shownTitle = twins && tour.provider ? `${tour.title} (${tour.provider})` : tour.title;
  // Sin evento elegido: aviso y insignia del sync de hoy. La ficha los recalcula con el evento en vivo (REQ-095/096).
  const notice = eventNotice({ fullPricePerGroup: tour.isFreeTour ? {} : { "1": tour.price }, currency: "EUR", rates: null, lang }).lines;
  // T5 (REQ-415, REQ-416, G-T9): con TAXONOMY_LABELS_ENABLED y formato, el copy y el title dependen del formato.
  const tax = labels && tour.formato ? { formato: tour.formato, guia: tour.guiaEnPersona !== false } : null;
  const by = tax ? operatedByFor(tour.provider, tax.guia, operatedBy(tour.provider, lang)) : operatedBy(tour.provider, lang);
  const provider = detail?.providerId?.trim() || "freetour";
  const enrichment = indexableEnrichment(provider);
  const duration = cardDuration({ raw: tour.duration }, lang);
  // REQ-588 (auditoría FREETOUR #212 y PO 22:29): sin enriquecimiento, ni idiomas ni punto de encuentro en el marcado,
  // y el idioma del guía no sale del servidor (la ficha lo pinta en el cliente con data-nosnippet).
  const langs = enrichment ? guideLanguagesLabel(detail?.guideLanguages, lang) : [];
  const facets = enrichment ? fichaFacets({ proveedor: provider, categoriaId: detail?.categoryId ?? null, precio: tour.isFreeTour ? 0 : tour.price, durationMinutes: detail?.durationMinutes ?? null, titulo: tour.title }, lang) : { tipo: null, etiquetas: [] };
  const mp = detail?.meetingPoint?.title?.trim() ? detail.meetingPoint : null;
  const ficha: FichaInput = {
    provider, lang, url: canonicalUrl(siteUrl, tour.href), name: tour.title, images: [image ?? tour.image],
    operator: tour.provider, free: tour.isFreeTour, price: tour.isFreeTour ? 0 : tour.price, currency: tour.currency,
    availability: today && fresh(detail?.departuresSyncedAt, today) ? nextAvailability(detail?.departureDates, today) : null,
    duration, languages: langs, place: `${city.name}, ${country.name}`,
    meetingPoint: mp && enrichment ? { name: mp.title!.trim(), address: mp.address ?? null, lat: mp.lat ?? null, lng: mp.lng ?? null } : null,
    tipo: facets.tipo, etiquetas: facets.etiquetas,
  };
  return {
    facts: { duration, guideLanguages: langs.length ? langs.join(", ") : null },
    enrichment,
    enBreve: enBreve(ficha),
    facets,
    meta: {
      title: (tax && tourTitleByFormat({ title: shownTitle, city: city.name, isFreeTour: tour.isFreeTour, formato: tax.formato })) || tourTitle({ title: shownTitle, city: city.name, isFreeTour: tour.isFreeTour }),
      description: clip(tax ? tourDescription({ formato: tax.formato, guiaEnPersona: tax.guia, isFreeTour: tour.isFreeTour, city: city.name, notice: notice[0] ?? null }) : `${tour.isFreeTour ? "Free tour" : "Tour"} en ${city.name} con un guía local. ${notice[0] ?? ""}`),
      canonical: canonicalUrl(siteUrl, tour.href),
      index: city.indexed && country.indexable,
    },
    crumbs,
    heading: tourHeading({ title: tour.title, provider: tour.provider, isFreeTour: tour.isFreeTour }),
    badge: primeraPiezaBadge({ isFreeTour: tour.isFreeTour, fullPricePerGroup: {}, groupSize: 1 }),
    notice,
    operatedBy: by,
    labels: tax ? tourLabels(tax.formato, lang, tour.atributos ?? []) : [], // REQ-544: chips de atributos fuera de la foto
    jsonLd: [
      // REQ-571…574: reemplaza a productJsonLd (EUR fijo y AggregateRating del proveedor); productJsonLd queda sin uso, no se borra.
      fichaJsonLd(ficha),
      crumbsLd(siteUrl, crumbs),
    ],
  };
}

export interface TransportCard { id: string; title: string; description: string; chargedByLabel: string; price: string | null; href: string; label: string; external: boolean }

// REQ-088: sección Traslados de la ciudad desde el registro de complementos (src/companions), sin código por proveedor.
export function cityTransportCards(groups: HubGroup[], cityName: string, transfersVisible: boolean): TransportCard[] {
  const here = fold(cityName);
  return groups
    .filter((g) => g.group === "transporte")
    .flatMap((g) => g.cards)
    .flatMap((c): TransportCard[] => {
      if (c.cta.kind === "widget") return transfersVisible ? [{ ...pick(c), href: "/traslados", label: c.cta.label, external: false }] : [];
      if (!c.cities.some((x) => fold(x) === here)) return [];
      return [{ ...pick(c), href: c.cta.url, label: c.cta.label, external: true }];
    });
}
const pick = (c: HubGroup["cards"][number]) => ({ id: c.id, title: c.title, description: c.description, chargedByLabel: c.chargedByLabel, price: c.price });

export interface GoneView { title: string; cityName: string; cityHref: string }
export const GONE_PATH = "/tour-retirado";
const DEST_HREF = /^\/destinos(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// REQ-092: a dónde reescribe el middleware un tour removed (la página lleva el header del sitio y responde 410).
// Solo el id: la página lee título y ciudad de la base (un texto en la URL lo podría armar cualquiera; preview PR #128).
export function goneRewritePath(tourId: string): string {
  return `${GONE_PATH}?${new URLSearchParams({ id: tourId }).toString()}`;
}

export interface GonePlace {
  status: "active" | "missing" | "removed";
  title: string;
  cityName: string;
  countrySlug: string | null;
  citySlug: string | null;
  cityLive: boolean;
}

const GONE_FIXED: GoneView = { title: "Esta experiencia", cityName: "otros destinos", cityHref: ROUTES.destinos };

// REQ-092: lo que muestra la página 410, desde la fila de la base. Sin tour o si no está retirado: texto fijo.
export function goneViewFromPlace(p: GonePlace | null): GoneView {
  if (!p || p.status !== "removed") return GONE_FIXED;
  const href = p.cityLive && p.countrySlug && p.citySlug ? `${ROUTES.destinos}/${p.countrySlug}/${p.citySlug}` : "";
  const live = DEST_HREF.test(href);
  return {
    title: p.title.trim().slice(0, 160) || GONE_FIXED.title,
    cityName: live ? p.cityName.trim().slice(0, 120) || GONE_FIXED.cityName : GONE_FIXED.cityName,
    cityHref: live ? href : ROUTES.destinos,
  };
}

/**
 * Oculto (no se usa desde el preview del PR #128): leía título y ciudad de ?t= y ?c=, que cualquiera puede armar.
 * Se conserva por la regla de no borrar código; la página usa goneViewFromPlace.
 */
export function goneView(sp: Record<string, string | string[] | undefined>): GoneView {
  const href = one(sp.h);
  return {
    title: one(sp.t).trim().slice(0, 160) || "Esta experiencia",
    cityName: one(sp.c).trim().slice(0, 120) || "otros destinos",
    cityHref: DEST_HREF.test(href) ? href : ROUTES.destinos,
  };
}
