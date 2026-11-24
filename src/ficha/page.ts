/**
 * REQ-10859 · Ficha única, ola 7: la página de un tour con la plantilla nueva (plan §2: «las tres páginas de ficha
 * eligen plantilla por bandera»; §7: Tangol primero). Raíz del dominio: orquesta y no calcula. Pasos:
 * 1. trae el modelo común con `loadTourFicha` (REQ-10844: esquema, mínimo de calidad, ruta pública);
 * 2. resuelve las banderas del entorno una sola vez (`pageFlags`) para que ningún bloque lea `process.env`;
 * 3. arma orden, props de los 21 bloques y panel con `fichaPageViews` (REQ-10858).
 * Recibe la base, las banderas, las reseñas, los tipos de cambio y el país del visitante por parámetro (DIP); el
 * número de WhatsApp sale de `WHATSAPP_NUMBER`. Lo que llega vacío (reseñas, transporte, otras experiencias) deja su
 * bloque fuera: nunca «N/D». Las otras experiencias de la ciudad las lee la ruta con `loadOtherExperiences` (REQ-10862)
 * y llegan en `others`. Si el modelo no se arma, devuelve null y la página pinta la plantilla de hoy.
 */
import type { FxRates } from "@/trips/lib/money";
import { fichaUnicaOn, fichaUnicaProviderFor } from "./lib/flags";
import { fxTableFromMxn } from "./lib/local-price";
import type { FichaLang, FichaModel } from "./lib/model";
import type { TransferCardView } from "@/trips/lib/transfer-card";
import { fichaPageViews, transportCardsFrom, type FichaPageViews, type PageViewFlags, type PageViewsInput } from "./lib/page-views";
import { leerPrefill, type Query } from "./lib/prefill";
import type { OthersResult } from "./others";
import { loadTourFicha, type TourFichaDeps } from "./source-tour";
import { loadTripFicha, type TripFichaDeps } from "./source";

export type Env = Record<string, string | undefined>;

/** Banderas del panel y de los bloques, resueltas una vez por petición. */
// REQ-10859
export function pageFlags(env: Env): PageViewFlags {
  const on = (k: string) => env[k] === "true";
  return {
    bookings: on("BOOKINGS_ENABLED"),
    paidTours: on("PAID_TOURS_ENABLED"),
    directPurchase: env.BIGBUS_OCTO_ENABLED === "true" || env.BIGBUS_OCTO_ENABLED === "live",
    milaEnabled: on("FICHA_MILA_ENABLED"),
    freetourFaqEnabled: on("FICHA_UNICA_FREETOUR_ENABLED"),
    cartEnabled: on("CART_ADD_ENABLED"),
    cardHold: on("STRIPE_HOLD_ENABLED"),
    freetourGuarantees: false,
  };
}

/** ¿Esta petición de un tour va con la plantilla nueva? (bandera del proveedor y host de la petición). */
// REQ-10859
export function tourUsesFichaUnica(env: Env, providerId: string | null | undefined, host: string | null | undefined): boolean {
  const p = fichaUnicaProviderFor("tour", providerId);
  return p !== null && fichaUnicaOn(env, p, host);
}

export interface TourFichaPageExtras {
  query: Query;
  reviews: PageViewsInput["reviews"];
  fx: FxRates | null;
  /** País del visitante (cabecera del borde), fuera del HTML en caché. */
  visitorCountry: string | null;
  /** REQ-10860: franja de transporte de hoy (`transportForPlace`) y tarjeta de Kiwitaxi (`transferCard`), si llegan. */
  transport?: ReadonlyArray<{ id: string; path: string; title: string; image: string | null }>;
  kiwitaxi?: TransferCardView | null;
  /** REQ-10862: experiencias de pago y gratis de la ciudad (`loadOtherExperiences`) para el bloque 20; sin ellas, el bloque no sale. */
  others?: OthersResult | null;
}

export interface TourFichaPage { ficha: FichaModel; path: string; page: FichaPageViews }

// REQ-10859
export async function loadTourFichaPage(deps: TourFichaDeps, slug: string, lang: FichaLang, x: TourFichaPageExtras): Promise<TourFichaPage | null> {
  const { load, path } = await loadTourFicha(deps, slug, lang);
  if (!load.ok || !path) return null;
  const f = load.ficha;
  const page = fichaPageViews({
    f,
    prefill: leerPrefill(x.query, f),
    whatsapp: deps.env.WHATSAPP_NUMBER?.trim() || null,
    visitorCountry: x.visitorCountry,
    fx: fxTableFromMxn(x.fx),
    flags: pageFlags(deps.env),
    reviews: x.reviews,
    transport: transportCardsFrom(x.transport ?? []), // REQ-10860
    kiwitaxi: x.kiwitaxi ?? null,
    others: x.others ?? { paid: [], free: [], includePaid: true }, // REQ-10862
  });
  return { ficha: f, path, page };
}

/**
 * REQ-10870 · Ola 7, plan §7: «encendido en viajes y Big Bus». La ficha de un viaje de agencia o de Big Bus (tabla
 * `Trip`) con la plantilla única, tras `FICHA_UNICA_TRIP_ENABLED` ("preview" solo en versiones sin tráfico). Misma
 * orquestación que el tour: el modelo sale de `loadTripFicha` (REQ-10836: visibilidad, esquema, mínimo de calidad),
 * las banderas se resuelven una vez y `fichaPageViews` arma bloques y panel. El control del panel lo decide el
 * modelo (`purchaseMode` buy → caja de compra solo con BIGBUS_OCTO_ENABLED; el resto, formulario de cotización), nunca
 * el proveedor (INC-020). Si el modelo no se arma, null y la página pinta la plantilla de hoy (`TripDetailView`).
 */
// REQ-10870
export function tripUsesFichaUnica(env: Env, host: string | null | undefined): boolean {
  return fichaUnicaOn(env, "trip", host);
}

export interface TripFichaPage extends TourFichaPage {
  /** Agencia dueña del viaje (null = propio). */
  agencyId: string | null;
}

// REQ-10870
export async function loadTripFichaPage(deps: TripFichaDeps, slug: string, lang: FichaLang, x: TourFichaPageExtras): Promise<TripFichaPage | null> {
  const { load, path, agencyId } = await loadTripFicha(deps, slug, lang);
  if (!load.ok || !path) return null;
  const f = load.ficha;
  const page = fichaPageViews({
    f,
    prefill: leerPrefill(x.query, f),
    whatsapp: deps.env.WHATSAPP_NUMBER?.trim() || null,
    visitorCountry: x.visitorCountry,
    fx: fxTableFromMxn(x.fx),
    flags: pageFlags(deps.env),
    reviews: x.reviews,
    transport: transportCardsFrom(x.transport ?? []),
    kiwitaxi: x.kiwitaxi ?? null,
    others: x.others ?? { paid: [], free: [], includePaid: true },
  });
  return { ficha: f, path, page, agencyId };
}
