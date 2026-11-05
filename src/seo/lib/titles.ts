/** Titles por tipo de página (skill sitelinks-google): la sección primero, la marca al final. Puro. */
import { clip, SITE_META } from "./meta";

const BRAND = SITE_META.name;

// REQ-099
export const HOME_TITLE = `${BRAND} – Free tours, tours y traslados en todo el mundo`;

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

// REQ-099: description de la home con los destinos principales.
export function homeDescription(destinations: string[]): string {
  const where = destinations.length ? ` en ${list(destinations)}` : " en todo el mundo";
  return clip(`Free tours, tours y traslados${where}, con guías locales y un asesor en español por WhatsApp.`);
}

// REQ-099
export const hubTitle = (section: string) => `${section.trim()} | ${BRAND}`;
// REQ-099
export const freeToursCityTitle = (city: string) => `Free tours en ${city.trim()}: tú decides cuánto vale | ${BRAND}`;
// REQ-099
export function tourTitle({ title, city, isFreeTour }: { title: string; city: string; isFreeTour: boolean }): string {
  return `${title.trim()} – ${isFreeTour ? "Free tour" : "Tour"} en ${city.trim()} | ${BRAND}`;
}

// REQ-099: titles repetidos entre URLs distintas (sin distinguir mayúsculas ni espacios).
export function findDuplicateTitles(pages: { url: string; title: string }[]): { title: string; urls: string[] }[] {
  const by = new Map<string, string[]>();
  for (const p of pages) {
    const k = p.title.replace(/\s+/g, " ").trim().toLowerCase();
    by.set(k, [...(by.get(k) ?? []), p.url]);
  }
  return [...by].filter(([, urls]) => urls.length > 1).map(([title, urls]) => ({ title, urls }));
}
