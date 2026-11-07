/**
 * REQ-520: de cada fuente de datos (tour del catálogo en /tours, tour del inicio, tarjeta de /destinos y
 * La Primera Pieza, viaje propio o de agencia) al mismo ExperienceCardModel. Puro; los tipos se importan sin código.
 */
import type { Tour } from "@/types";
import type { HomeTour } from "@/home/load";
import type { TourCardModel } from "@/destinations/lib/catalog";
import type { TripCard } from "@/trips/public-load";
import { nameIn } from "@/home/lib/destinations";
import { cardDuration, cardPrice, experienceCard, type ExperienceCardModel, type PriceParts } from "./experience-card";

/** /tours: el formato y la etiqueta de precio llegan armados de la acción del servidor (fetchTours). */
export function fromCatalogTour(t: Tour, o: { lang: string; formato?: string | null; priceLabel?: PriceParts | null; highlight?: string | null }): ExperienceCardModel {
  return experienceCard({
    key: t.id, href: `/tours/${t.id}`, title: t.title, image: t.images.find((x) => x && x.trim()) ?? t.titleImageURL ?? null,
    city: t.destination, duration: cardDuration({ raw: t.duration }, o.lang), description: o.highlight ? `“${o.highlight}”` : t.brief,
    formato: o.formato, rating: t.rating, reviews: t.reviewsNumber, provider: t.provider,
    price: cardPrice({ free: t.price === 0, label: o.priceLabel ?? null, price: t.price, currency: t.currency }, o.lang),
  }, o.lang);
}

/** Inicio («Los más elegidos», «Excursiones de un día»). */
export function fromHomeTour(t: HomeTour, o: { lang: string; priceLabel?: PriceParts | null }): ExperienceCardModel {
  return experienceCard({
    key: t.id, href: `/tours/${t.id}`, title: nameIn(t.titles, o.lang), image: t.image,
    city: nameIn(t.cityNames, o.lang), duration: cardDuration({ minutes: t.durationMinutes ?? null, raw: t.duration }, o.lang),
    description: t.quote ? `“${t.quote}”` : t.briefs ? nameIn(t.briefs, o.lang) || null : null,
    formato: t.formato, rating: t.rating, reviews: t.reviews, provider: t.provider ?? null,
    price: cardPrice({ free: t.isFree, label: o.priceLabel ?? null, price: t.price, currency: t.currency }, o.lang),
  }, o.lang);
}

/** /destinos y /la-primera-pieza (componente de servidor, español; el precio ya viene armado). */
export function fromDestinationTour(t: TourCardModel, o: { price: PriceParts | null; city?: string | null }): ExperienceCardModel {
  const lang = "es";
  // Viajes: priceLabel ya dice «Desde MXN $…» (src/destinations/load.ts).
  const price = t.kind === "own"
    ? (t.priceLabel ? { text: t.priceLabel, free: false } : null)
    : cardPrice({ free: t.isFreeTour, label: o.price, price: t.price, currency: t.currency }, lang);
  return experienceCard({
    key: t.id, href: t.href, title: t.title, image: t.image, city: t.city ?? o.city ?? null,
    duration: cardDuration({ raw: t.duration, days: t.durationDays ?? null }, lang), description: t.summary ?? null,
    formato: t.formato, rating: t.rating, reviews: t.reviews, provider: t.provider, price,
  }, lang);
}

/** Viajes propios y de agencias (Big Bus, Extime, Exotic Escapes…): proveedor = agencia; sin agencia, Travel Puzzle (REQ-148). */
export function fromTripCard(t: TripCard, lang: string, from: string): ExperienceCardModel {
  const price = t.price ? { text: t.price.original ? `${from} ${t.price.main} · ${t.price.original}` : `${from} ${t.price.main}`, free: false } : null;
  return experienceCard({
    key: t.id, href: t.path, title: t.title, image: t.image, city: t.cities[0] ?? t.places ?? null,
    duration: cardDuration({ days: t.durationDays }, lang), description: t.summary || null,
    formato: t.formato, rating: null, reviews: 0, provider: t.provider ?? null, price,
  }, lang);
}
