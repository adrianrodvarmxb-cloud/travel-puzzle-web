/**
 * REQ-10859 · Ficha única, ola 7: la página de un tour con la plantilla nueva (plan §2: «las tres páginas de ficha
 * eligen plantilla por bandera»; §7: Tangol primero). Raíz del dominio: orquesta y no calcula. Pasos:
 * 1. trae el modelo común con `loadTourFicha` (REQ-10844: esquema, mínimo de calidad, ruta pública);
 * 2. resuelve las banderas del entorno una sola vez (`pageFlags`) para que ningún bloque lea `process.env`;
 * 3. arma orden, props de los 21 bloques y panel con `fichaPageViews` (REQ-10858).
 * Recibe la base, las banderas, las reseñas, los tipos de cambio y el país del visitante por parámetro (DIP); el
 * número de WhatsApp sale de `WHATSAPP_NUMBER`. Lo que llega vacío (reseñas, transporte, otras experiencias) deja su
 * bloque fuera: nunca «N/D». Si el modelo no se arma, devuelve null y la página pinta la plantilla de hoy.
 */
import type { FxRates } from "@/trips/lib/money";
import { fichaUnicaOn, fichaUnicaProviderFor } from "./lib/flags";
import { fxTableFromMxn } from "./lib/local-price";
import type { FichaLang, FichaModel } from "./lib/model";
import { fichaPageViews, type FichaPageViews, type PageViewFlags, type PageViewsInput } from "./lib/page-views";
import { leerPrefill, type Query } from "./lib/prefill";
import { loadTourFicha, type TourFichaDeps } from "./source-tour";

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
    transport: [],
    kiwitaxi: null,
    others: { paid: [], free: [], includePaid: true },
  });
  return { ficha: f, path, page };
}
