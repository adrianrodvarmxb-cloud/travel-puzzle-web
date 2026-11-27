/**
 * REQ-10808 · Ficha única, ola 7, bloque 1 «Migas de pan» (plan §3: país y ciudad). Puro: recibe solo país, ciudad y
 * título del modelo; los textos de «Inicio» y «Destinos» salen de los hubs en el idioma de la página (REQ-665).
 * Si un slug no es válido, la miga se corta ahí (nunca un enlace roto ni «N/D»).
 */
import type { FichaCountry, FichaLang, FichaPlace } from "./model";
import { cityPath, countryPath, ROUTES } from "@/destinations/lib/routes";
import { hubCopy } from "@/destinations/lib/hub-copy";

export interface FichaCrumb { name: string; href: string }
export interface CrumbsInput { country: FichaCountry; city: FichaPlace; title: string; lang: FichaLang }

const same = (a: string, b: string) => a.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === b.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const safe = (f: () => string): string | null => {
  try {
    return f();
  } catch {
    return null;
  }
};

// REQ-10808
export function fichaCrumbs({ country, city, title, lang }: CrumbsInput): FichaCrumb[] {
  const k = hubCopy(lang);
  const out: FichaCrumb[] = [{ name: k.home, href: "/" }, { name: k.destinos, href: ROUTES.destinos }];
  const pais = country.code.trim().toLowerCase();
  const countryHref = pais && country.name.trim() ? safe(() => countryPath(pais)) : null;
  if (countryHref) {
    out.push({ name: country.name, href: countryHref });
    const cityHref = city.slug && city.name.trim() ? safe(() => cityPath(pais, city.slug)) : null;
    // REQ-10894: ciudad-estado (Singapur › Singapur): una sola miga, la de la ciudad con su ruta; nunca dos iguales seguidas.
    if (cityHref && same(city.name, country.name)) out[out.length - 1] = { name: city.name, href: cityHref };
    else if (cityHref) out.push({ name: city.name, href: cityHref });
  }
  // La última miga es la ficha (sin enlace al pintarse); su href es el de la ciudad o el último válido.
  if (title.trim()) out.push({ name: title, href: `${out[out.length - 1].href}#ficha` });
  return out;
}
