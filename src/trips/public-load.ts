/**
 * Viajes publicados para el sitio: tarjetas (/tours, home) y ficha (/viajes/...).
 * Usa traducciones (respaldo en español) y tipo de cambio de Banxico con caché diaria.
 */
import { getPrisma } from "@/lib/prisma";
import { createTripRepo } from "./repository";
import { localized, type Translations } from "./lib/translation";
import { tripPath } from "./lib/public";
import { cardPlaces } from "./lib/geo";
import { priceDisplay, type FxRates } from "./lib/money";
import { imageUrl } from "./lib/image";
import { getFxRates } from "./fx";
import type { StoredTrip } from "./manage";
import { anyVisible, isKindVisible, visibilityFromEnv } from "./lib/visibility";

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
}

async function publishedRows() {
  const prisma = getPrisma();
  return prisma.trip.findMany({ where: { status: "published" }, orderBy: { updatedAt: "desc" }, take: 200 });
}

export function toCard(t: StoredTrip & { translations?: unknown }, lang: string, fx: FxRates | null): TripCard {
  const tr = (t.translations ?? {}) as Translations;
  return {
    id: t.id, path: tripPath(t), code: t.code, kind: t.kind,
    title: localized(tr, lang, "title", t.titleEs), summary: localized(tr, lang, "summary", t.summaryEs),
    image: t.images[0] ? imageUrl(t.images[0].key) : null, countries: t.countries, places: cardPlaces(t.countries, lang), cities: t.cities, durationDays: t.durationDays,
    price: priceDisplay(t.priceFrom, t.currency, fx, lang),
  };
}

/** Tarjetas de todos los viajes publicados (pocos: se filtran en el cliente). */
export async function loadTripCards(lang: string): Promise<TripCard[]> {
  const vis = siteVisibility();
  if (!anyVisible(vis)) return [];
  try {
    const repo = createTripRepo(getPrisma());
    const [all, fx] = await Promise.all([publishedRows(), loadFx()]);
    const rows = all.filter((r) => isKindVisible(r.kind, vis));
    const trips = await Promise.all(rows.map((r) => repo.findById(r.id)));
    return trips.filter((t): t is StoredTrip => !!t).map((t, i) => toCard({ ...t, translations: rows[i].translations }, lang, fx));
  } catch (error) {
    console.error("[viajes] no se cargaron las tarjetas:", (error as Error).message);
    return [];
  }
}

/** Ficha: solo publicados y con el interruptor encendido. */
export async function loadTripBySlug(slug: string) {
  const vis = siteVisibility();
  if (!anyVisible(vis)) return null;
  const prisma = getPrisma();
  const row = await prisma.trip.findUnique({ where: { slug } });
  if (!row || row.status !== "published" || !isKindVisible(row.kind, vis)) return null;
  const trip = await createTripRepo(prisma).findById(row.id);
  if (!trip) return null;
  const agency = row.agencyId ? await prisma.agency.findUnique({ where: { id: row.agencyId }, select: { name: true } }) : null;
  return { trip, translations: (row.translations ?? {}) as Translations, agencyName: agency?.name ?? null, fx: await loadFx() };
}


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
