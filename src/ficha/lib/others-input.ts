/**
 * REQ-10862 · Ficha única, ola 7, bloque 20 «Otras experiencias en la ciudad» con datos reales (plan §3; REQ-10847 trae
 * la regla 60/40 y el tope por proveedor, pero la plantilla recibía listas vacías). Convierte las filas de `Tour` de la
 * misma ciudad (ya ordenadas por quien las lee: más reseñadas primero) en las tarjetas de pago y gratis que
 * `otherExperiencesBlockView` mezcla. Puro: sin I/O, sin banderas, sin reloj y con idioma fijo (INC-001).
 * Reglas que no pueden fallar aunque el llamador se equivoque: nunca la propia ficha; solo con foto https, título y ruta
 * pública; el título sin la plataforma (REQ-1246); el precio es el público «desde» de la fila (nunca neto ni margen) y,
 * sin tipo de cambio o en una moneda sin conversión, sale tal cual en su moneda, nunca inventado.
 */
import { tourPath } from "@/destinations/lib/routes";
import { tourPriceLabel } from "@/tours/lib/price-label";
import { scrubName } from "@/tours/lib/provider-text";
import type { FxRates } from "@/trips/lib/money";
import type { OtherCard } from "./cross-sell-view";
import type { FichaLang } from "./model";
import { localPriceUrl } from "./local-price";

/** Lo mínimo de una fila de `Tour` (con ciudad y país) para armar una tarjeta. */
export interface OtherTourRow {
  id: string;
  slug: string | null;
  providerId: string | null;
  priceValue: number | string | null;
  priceCurrency: string | null;
  titleImageURL: string | null;
  reviewsNumber?: number | null;
  translations: ReadonlyArray<{ language: string; title: string | null }>;
  city: { slug: string | null };
  country: { iso2: string | null };
}

export interface OtherCardsOptions {
  lang: FichaLang; excludeId: string; rates: FxRates | null;
  /** REQ-10893: con `LOCAL_CURRENCY_ENABLED`, cada tarjeta con precio lleva `localUrl` (misma regla que el panel y el bloque 12, REQ-10879). */
  localCurrency?: boolean;
}
export interface OtherCards { paid: OtherCard[]; free: OtherCard[] }

const COPY = { es: { from: "Desde", free: "Gratis" }, en: { from: "From", free: "Free" } };
const copy = (lang: FichaLang) => (lang === "es" ? COPY.es : COPY.en);

const num = (v: unknown): number => { const n = typeof v === "string" ? Number(v) : v; return typeof n === "number" && Number.isFinite(n) ? n : 0; };
const pickTitle = (rows: OtherTourRow["translations"], lang: string): string =>
  scrubName(rows.find((r) => r.language === lang && r.title)?.title ?? rows.find((r) => r.language === "es" && r.title)?.title ?? rows.find((r) => r.language === "en" && r.title)?.title ?? rows.find((r) => r.title)?.title).trim();

/** Precio público de la tarjeta: «Desde USD $45» con el formato de la ficha; sin conversión, «Desde ARS 1500». */
// REQ-10862
export function otherPriceText(price: number, currency: string | null, rates: FxRates | null, lang: FichaLang): string {
  const c = copy(lang);
  if (price <= 0) return c.free;
  const cur = (currency ?? "").trim().toUpperCase();
  const label = tourPriceLabel(price, cur, rates, lang);
  if (label) return `${c.from} ${label.main}`;
  const n = Number.isInteger(price) ? String(price) : price.toFixed(2);
  return `${c.from} ${cur ? `${cur} ${n}` : n}`;
}

/**
 * REQ-10893 (revisión visual del PO, 26-11-2026: «Desde EUR €38» en una ficha en USD). El HTML sigue en la moneda del
 * proveedor de cada tarjeta (REQ-3318, igual para todos); con la moneda local encendida, la tarjeta lleva la ruta para
 * que el navegador pida «Desde» en la moneda del visitante, como el panel y el bloque 12 (REQ-10879). Sin precio o sin
 * moneda válida, null.
 */
// REQ-10893
export function otherLocalUrl(price: number, currency: string | null, o: Pick<OtherCardsOptions, "lang" | "localCurrency">): string | null {
  const cur = (currency ?? "").trim().toUpperCase();
  if (!o.localCurrency || !(price > 0) || !/^[A-Z]{3}$/.test(cur)) return null;
  return localPriceUrl({ amount: price, currency: cur, per: "person" }, o.lang);
}

/** Filas de la ciudad → tarjetas de pago y gratis, en el orden en que llegan. */
// REQ-10862
export function otherCardsFrom(rows: ReadonlyArray<OtherTourRow>, o: OtherCardsOptions): OtherCards {
  const out: OtherCards = { paid: [], free: [] };
  for (const r of rows) {
    if (!r.id || r.id === o.excludeId) continue;
    const image = (r.titleImageURL ?? "").trim();
    if (!image.startsWith("https://")) continue;
    const title = pickTitle(r.translations, o.lang);
    if (!title) continue;
    const iso2 = (r.country.iso2 ?? "").trim().toLowerCase();
    if (!r.slug || !r.city.slug || !iso2) continue;
    const price = num(r.priceValue);
    const card: OtherCard = {
      id: r.id,
      title,
      href: tourPath(iso2, r.city.slug, r.slug),
      provider: (r.providerId ?? "").trim().toLowerCase() || null,
      imageUrl: image,
      priceText: otherPriceText(price, r.priceCurrency, o.rates, o.lang),
      localUrl: otherLocalUrl(price, r.priceCurrency, o), // REQ-10893
    };
    (price > 0 ? out.paid : out.free).push(card);
  }
  return out;
}
