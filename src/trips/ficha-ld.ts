/**
 * REQ-10870 · Marcado Product+TouristTrip y «En breve» de la ficha de un viaje, en un solo lugar para las dos
 * plantillas (la de hoy, `TripDetailView`, y la única, `TripFichaUnica`): mismo JSON-LD con cualquiera de las dos,
 * como en Tangol (REQ-10859: «el JSON-LD es el mismo»). Movido tal cual desde `TripDetailView` (REQ-576/577/581,
 * REQ-10728); sin cambios de contenido. Corre en el servidor (usa `Intl.DisplayNames` para los idiomas, como antes).
 */
import { tripCopy } from "@/trips/lib/copy";
import { durationLabel, isAudioGuided } from "@/trips/lib/trip-facts";
import { countryName } from "@/trips/lib/geo";
import { imageUrl } from "@/trips/lib/image";
import { localized } from "@/trips/lib/translation";
import { OWN_PROVIDER, toCard, type loadTripBySlug } from "@/trips/public-load";
import { etiquetasIncluidoFicha } from "@/taxonomy/lib/incluido-ficha"; // REQ-10728
import { enBreve } from "@/seo/lib/ficha-ld";
import { tripFichaInput } from "@/seo/lib/trip-ficha";
import { canonicalUrl } from "@/seo/lib/hub";
import { SITE_URL_DEFAULT } from "@/destinations/load";

export type TripLdData = NonNullable<Awaited<ReturnType<typeof loadTripBySlug>>>;

export interface TripFichaLd {
  ficha: ReturnType<typeof tripFichaInput> & { images: string[]; cancellation: string | null };
  breve: string | null;
  /** Lo que la ficha de hoy también usa: tarjeta, duración, idiomas y operador (para no calcularlos dos veces). */
  card: ReturnType<typeof toCard>;
  duration: string | null;
  isAudio: boolean;
  languageNames: string[];
  agencyId: string | null;
  operator: string | null;
}

// REQ-10870
export function tripFichaLd(o: { data: TripLdData; path: string; lang: string; env: Record<string, string | undefined>; cancellation?: string | null }): TripFichaLd {
  const { trip, translations: tr, fx } = o.data;
  const lang = o.lang;
  const c = tripCopy(lang);
  const L = (key: string, es: string) => localized(tr, lang, key, es);
  const duration = durationLabel(trip, c);
  const isAudio = isAudioGuided(trip);
  const card = toCard({ ...trip, translations: tr }, lang, fx);
  // REQ-576/577/581: marcado Product+TouristTrip, «En breve», tipo y etiquetas, con los mismos textos que se ven aquí.
  // Idiomas: los mismos nombres de la lista visible (Intl en el servidor, como hoy).
  const languageNames = trip.languages.map((l) => new Intl.DisplayNames([lang], { type: "language" }).of(l) ?? l);
  const agencyId = (trip as { agencyId?: string | null }).agencyId ?? null;
  const operator = o.data.agencyName?.trim() || (agencyId ? null : OWN_PROVIDER);
  const ficha = {
    ...tripFichaInput({
      trip: { ...trip, agencyId }, lang, url: canonicalUrl(o.env.SITE_URL || SITE_URL_DEFAULT, o.path), title: card.title, summary: card.summary || null,
      operator, duration, languageNames, languagesTitle: isAudio ? (lang === "es" ? "Audioguía" : "Audio guide") : null, priceText: card.price ? `${c.from} ${card.price.main}${card.price.original ? ` · ${card.price.original}` : ""}` : null,
      places: [trip.cities.join(", "), trip.countries.map((x) => countryName(x, lang)).join(", ")].filter(Boolean).join(" · ") || null,
      includes: trip.includes.map((x, i) => L(`includes.${i}`, x)), formato: card.formato ?? null,
      // REQ-10728 / REQ-10733: etiquetas «incluido» con cantidad (regla firmada), tras INCLUIDO_ETIQUETAS_ENABLED; se calculan sobre los textos originales del proveedor.
      incluido: etiquetasIncluidoFicha({ includes: trip.includes, itinerary: trip.itinerary, durationDays: trip.durationDays ?? undefined }, lang, o.env),
    }),
    images: trip.images.map((im) => imageUrl(im.key)),
    cancellation: o.cancellation ?? null,
  };
  return { ficha, breve: enBreve(ficha), card, duration, isAudio, languageNames, agencyId, operator };
}
