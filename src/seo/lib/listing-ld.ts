/**
 * REQ-582: ItemList de /tours y de los carruseles del inicio, con las mismas URLs y títulos que pintan sus tarjetas
 * (card-sources.ts), resueltas a la URL canónica final. Puro.
 */
import type { HomeDayTrip, HomeTour } from "@/home/load";
import type { TripCard } from "@/trips/public-load";
import { itemListJsonLd } from "./itemlist";

const NAMES = { es: { featured: "Los más elegidos", dayTrips: "Excursiones de un día" }, en: { featured: "Travelers' top picks", dayTrips: "Day trips" } };
const titleIn = (t: HomeTour, lang: string) => t.titles[lang] ?? t.titles.es ?? t.titles.en ?? "";

// REQ-582
export function homeItemLists({ siteUrl, lang, featured, dayTrips, resolve }: { siteUrl: string; lang: string; featured: HomeTour[]; dayTrips: HomeDayTrip[]; resolve?: Map<string, string> }) {
  const n = lang === "es" ? NAMES.es : NAMES.en;
  const feat = itemListJsonLd({ siteUrl, name: n.featured, resolve, items: featured.map((t) => ({ name: titleIn(t, lang), href: `/tours/${t.id}` })) });
  const day = itemListJsonLd({ siteUrl, name: n.dayTrips, resolve, items: dayTrips.map((d) => (d.type === "tour" ? { name: titleIn(d.tour, lang), href: `/tours/${d.tour.id}` } : { name: d.trip.title, href: d.trip.path })) });
  return [feat, day].filter((x): x is NonNullable<typeof x> => x !== null);
}

// REQ-582
export function toursItemList({ siteUrl, name, tours, trips, resolve }: { siteUrl: string; name: string; tours: { id: string; title: string }[]; trips: Pick<TripCard, "title" | "path">[]; resolve?: Map<string, string> }) {
  return itemListJsonLd({ siteUrl, name, resolve, items: [...tours.map((t) => ({ name: t.title, href: `/tours/${t.id}` })), ...trips.map((t) => ({ name: t.title, href: t.path }))] });
}
