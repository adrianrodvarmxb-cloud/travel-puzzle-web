/**
 * Viajes publicados para el sitio: tarjetas (/tours, home) y ficha (/viajes/...).
 * Usa traducciones (respaldo en español) y tipo de cambio de Banxico con caché diaria.
 */
import { cache } from "react";
import { getPrisma } from "@/lib/prisma";
import { withRetry } from "@/tours/lib/d1-load";
import { createTripBySlugLoader, loadPublishedTripBySlug } from "./lib/trip-by-slug";
import { createTripRepo } from "./repository";
import { localized, type Translations } from "./lib/translation";
import { tripPath } from "./lib/public";
import { cardPlaces } from "./lib/geo";
import { priceDisplay, type FxRates } from "./lib/money";
import { imageUrl } from "./lib/image";
import { priceInEur } from "@/tours/lib/price-filter";
import { getFxRates } from "./fx";
import type { StoredTrip } from "./manage";
import { anyVisible, isKindVisible, visibilityFromEnv } from "./lib/visibility";
import { cached, cacheKey, POLICY } from "@/cache/edge";
import { pairById } from "./lib/cards";
import { ownTripDepartures } from "@/departures/sources/own-trips";
import { summarize, HORIZON_DAYS } from "@/departures/lib/summary";
import { policySummary } from "./lib/cancel-policy";
import { ownTripGroup } from "@/tours/lib/extra-filters";
import { isDayTripTrip } from "@/home/lib/experience-format";
import { tripFormat } from "@/tours/lib/card-format";

export const isOwnToursEnabled = (v: string | undefined) => v === "true";
/** Interruptores leídos del entorno (viajes propios y transporte por separado). */
export const siteVisibility = () => visibilityFromEnv(process.env as Record<string, string | undefined>);
/** ¿Hay algo propio visible? (solicitud y página de gracias). */
export const anyTripsVisible = () => anyVisible(siteVisibility());

const FX_KEY = "https://travelpuzzle.com.mx/__fx/banxico";
/** Caché de un día en el Cache API del Worker (en local no hay; se consulta directo). */
function fxCache() {
  const c = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  return {
    async get() { const r = await c?.match(FX_KEY); return r ? ((await r.json()) as FxRates) : null; },
    async put(rates: FxRates) { await c?.put(FX_KEY, new Response(JSON.stringify(rates), { headers: { "Cache-Control": "max-age=43200" } })); },
  };
}

export function loadFx(): Promise<FxRates | null> {
  return getFxRates({ token: process.env.BANXICO_TOKEN ?? "", fetch, cache: fxCache() });
}

export interface TripCard {
  id: string; path: string; code: string; kind: StoredTrip["kind"]; title: string; summary: string;
  image: string | null; countries: string[];
  /** REQ-004: países ya traducidos en el servidor (el navegador no usa Intl; INC-001). */
  places: string;
  /** Ciudades tal como se capturaron (venta cruzada por lugar, REQ-005). */
  cities: string[]; durationDays: number | null; price: ReturnType<typeof priceDisplay>;
  /** REQ-046: precio "Desde" en su moneda original, para el filtro de precio de /tours. */
  priceFrom: number | null;
  /** REQ-1255: precio desde, en EUR (para el rango de precio de /tours). */
  priceFromEur?: number | null;
  /** REQ-049..056: datos para los filtros estilo Civitatis (mismo modelo que Freetour). */
  languages: string[]; dates: string[]; group: string; freeCancel: boolean; private: boolean;
  hotelPickup: boolean; createdAt: number; durationMinutes: number | null;
  /** REQ-148: agencia dueña del viaje (null = Travel Puzzle), para el interruptor por proveedor del agente. */
  agencyId?: string | null;
  /** T4 y REQ-522: formato de la taxonomía (filtro de /tours y categoría de la tarjeta). */
  formato?: string;
  /** REQ-453: excursión de un día (regla mínima REQ-451 con el título en es y en), para el carrusel del home. */
  dayTrip?: boolean;
  /** REQ-524: nombre de la agencia (Big Bus, Extime, Exotic Escapes…); sin agencia, «Travel Puzzle» (REQ-148). */
  provider?: string | null;
}

/** REQ-524: viaje sin agencia = de Travel Puzzle (REQ-148). */
export const OWN_PROVIDER = "Travel Puzzle";

async function publishedRows() {
  const prisma = getPrisma();
  return prisma.trip.findMany({ where: { status: "published" }, orderBy: { updatedAt: "desc" }, take: 200, include: { agency: { select: { name: true } } } }); // REQ-524
}

export function toCard(t: StoredTrip & { translations?: unknown; createdAt?: Date | string; agencyName?: string | null }, lang: string, fx: FxRates | null, now: Date = new Date()): TripCard {
  const tr = (t.translations ?? {}) as Translations;
  const today = now.toISOString().slice(0, 10);
  const titles = [t.titleEs, localized(tr, "en", "title", t.titleEs)];
  const dayTrip = isDayTripTrip({ kind: t.kind, durationDays: t.durationDays, titles });
  const dep = summarize(ownTripDepartures({ languages: t.languages ?? [], availability: { weekdays: t.availability?.weekdays ?? [], closedDates: t.availability?.closedDates ?? [] }, minNoticeHours: t.minNoticeHours ?? 0 }, today, HORIZON_DAYS), today);
  return {
    id: t.id, path: tripPath(t), code: t.code, kind: t.kind,
    title: localized(tr, lang, "title", t.titleEs), summary: localized(tr, lang, "summary", t.summaryEs),
    image: t.images[0] ? imageUrl(t.images[0].key) : null, countries: t.countries, places: cardPlaces(t.countries, lang), cities: t.cities, durationDays: t.durationDays,
    price: priceDisplay(t.priceFrom, t.currency, fx, lang), priceFrom: t.priceFrom, priceFromEur: priceInEur(t.priceFrom, t.currency, fx),
    languages: dep.languages, dates: dep.dates, group: ownTripGroup(t.kind, t.category),
    freeCancel: policySummary(t.cancellation).kind === "free", private: t.options.some((o) => o.mode === "private"),
    hotelPickup: !!t.hotelPickup, createdAt: t.createdAt ? new Date(t.createdAt).getTime() : 0,
    durationMinutes: t.durationDays ? t.durationDays * 1440 : null,
    agencyId: (t as { agencyId?: string | null }).agencyId ?? null, // REQ-148
    dayTrip, // REQ-453
    provider: (t as { agencyId?: string | null }).agencyId ? (t.agencyName?.trim() || null) : OWN_PROVIDER, // REQ-524
    // T4 y REQ-522: formato de la taxonomía (clasificador oficial, mapeo «propios»); lo usan el filtro ?formato= de /tours
    // y la categoría de la tarjeta. Un viaje que REQ-451 ya pone en «Excursiones de un día» es excursión, no «Tour».
    formato: tripFormat({ kind: t.kind, priceFrom: t.priceFrom, durationDays: t.durationDays, titles: [t.titleEs, t.titleEn || titles[1]], dayTrip, resumen: t.summaryEs ?? "" }), // REQ-535: el resumen dice si sale de la ciudad
  };
}

/** Tarjetas de todos los viajes publicados (pocos: se filtran en el cliente). */
export async function loadTripCards(lang: string): Promise<TripCard[]> {
  const vis = siteVisibility();
  if (!anyVisible(vis)) return [];
  try {
    // REQ-047 (INC-004): con decenas de viajes, armar las tarjetas son ~N+2 consultas a D1 por visita a / y /tours.
    // Se cachean como el catálogo (REQ-032): una carga por ventana, compartida entre visitas; si falla, se sirve la última copia.
    // T4: v5 = las tarjetas llevan formato (la copia v4 de producción no lo trae). REQ-524: v6 = también el proveedor.
    // REQ-268: con la caché fría no hay copia anterior que servir; si D1 está saturada (N+2 consultas), se reintenta
    // con espera (como el catálogo, REQ-029) en vez de pintar /tours y el inicio sin viajes propios.
    return await cached(cacheKey("tripCards", { lang, own: String(vis.own), transport: String(vis.transport), v: "8" /* REQ-524 con proveedor; REQ-535/540…545 formato con el criterio del PO */ }), POLICY.toursList, () => withRetry(async () => {
      const repo = createTripRepo(getPrisma());
      const [all, fx] = await Promise.all([publishedRows(), loadFx()]);
      const rows = all.filter((r) => isKindVisible(r.kind, vis));
      const trips = await Promise.all(rows.map((r) => repo.findById(r.id)));
      // REQ-268: cada viaje con su fila por id (antes, por posición: un null corría las traducciones).
      return pairById(rows, trips as (StoredTrip | null)[]).map(({ row, trip }) => toCard({ ...trip, translations: row.translations, createdAt: row.createdAt, agencyName: row.agency?.name ?? null }, lang, fx));
    }));
  } catch (error) {
    console.error("[viajes] no se cargaron las tarjetas:", (error as Error).message);
    return [];
  }
}

/**
 * REQ-306: núcleo de la ficha con reintento ante D1 saturada y caché compartida corta (mismo patrón que el
 * árbol de destinos). La llave lleva los interruptores para que apagar un tipo no sirva una copia vieja.
 */
const tripBySlug = createTripBySlugLoader({
  load: (slug) => {
    const prisma = getPrisma();
    const repo = createTripRepo(prisma);
    return loadPublishedTripBySlug(slug, {
      vis: siteVisibility(),
      isKindVisible,
      findRowBySlug: (s) => prisma.trip.findUnique({ where: { slug: s } }),
      findTripById: (id) => repo.findById(id),
      findAgencyName: async (id) => (await prisma.agency.findUnique({ where: { id }, select: { name: true } }))?.name ?? null,
    });
  },
  key: (slug) => { const vis = siteVisibility(); return cacheKey("tripBySlug", { slug, own: String(vis.own), transport: String(vis.transport), v: "1" }); },
  cache: (key, load) => cached(key, POLICY.ownTrip, load),
  retry: (fn) => withRetry(fn),
});

/**
 * Ficha: solo publicados y con el interruptor encendido.
 * REQ-306: `cache` de React = una sola carga por petición, compartida entre generateMetadata y la página.
 */
export const loadTripBySlug = cache(async (slug: string) => {
  const vis = siteVisibility();
  if (!anyVisible(vis)) return null;
  const data = await tripBySlug(slug);
  if (!data) return null;
  return { ...data, fx: await loadFx() };
});


/** Dependencias reales de las solicitudes (D1 + Resend). */
export async function requestDeps(): Promise<import("./requests").RequestDeps> {
  const { sendEmail } = await import("@/notifications/resend");
  const prisma = getPrisma();
  const repo = createTripRepo(prisma);
  const env = process.env as Record<string, string | undefined>;
  const send = (m: { to: string; subject: string; html: string; text: string }) =>
    sendEmail({ apiKey: env.RESEND_API_KEY ?? "", fetch }, { ...m, from: env.EMAIL_FROM ?? "", replyTo: env.EMAIL_REPLY_TO });
  return {
    now: new Date(),
    random: () => crypto.randomUUID().replace(/-/g, ""),
    siteUrl: env.SITE_URL ?? "",
    whatsapp: env.WHATSAPP_NUMBER,
    async findTrip(id) {
      const t = await repo.findById(id);
      return t && t.status === "published" && isKindVisible(t.kind, siteVisibility()) ? { ...t, path: tripPath(t) } : null;
    },
    async save(row) { await prisma.tripRequest.create({ data: row as unknown as import("@prisma/client").Prisma.TripRequestUncheckedCreateInput }); },
    sendCustomer: send,
    sendTeam: (m) => send({ ...m, to: env.EMAIL_REPLY_TO ?? "info@travelpuzzle.com.mx" }),
  };
}
