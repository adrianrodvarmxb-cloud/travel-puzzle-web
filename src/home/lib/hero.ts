/** Carrusel principal: fotos rescatadas que llevan a los tours reales de su ciudad. */

/** Foto y nombres (en inglés, como vienen de Freetour) de cada ciudad del carrusel. */
/** `focus`: punto de la foto que debe quedar a la vista al recortarla (CSS object-position); por defecto el centro. */
export const HERO_CITIES: { image: string; aliases: string[]; focus?: string }[] = [
  { image: "/home/hero/singapur.webp", aliases: ["singapore"], focus: "74% 50%" },
  { image: "/home/hero/venecia.webp", aliases: ["venice"], focus: "66% 50%" },
  { image: "/home/hero/cancun.webp", aliases: ["cancun", "cancún"], focus: "55% 50%" },
  { image: "/home/hero/santorini.webp", aliases: ["santorini", "fira", "oia", "thira"], focus: "72% 70%" },
  { image: "/home/hero/machu-picchu.webp", aliases: ["cusco", "cuzco", "aguas calientes", "machu picchu"], focus: "45% 55%" },
  { image: "/home/hero/tokio.webp", aliases: ["tokyo"] },
];

export interface HeroCity {
  cityId: number;
  countryId: number;
  tours: number;
  names: Record<string, string>;
}

export interface HeroSlide {
  image: string;
  focus: string;
  href: string;
  tours: number;
  names: Record<string, string>;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Una diapositiva por foto cuya ciudad tiene tours (la de más tours si hay varias); en el orden del carrusel. */
export function pickHeroSlides(cities: HeroCity[]): HeroSlide[] {
  return HERO_CITIES.flatMap(({ image, aliases, focus = "50% 50%" }) => {
    const keys = aliases.map(norm);
    const match = cities
      .filter((c) => c.tours > 0 && keys.includes(norm(c.names.en ?? "")))
      .sort((a, b) => b.tours - a.tours)[0];
    return match ? [{ image, focus, href: `/tours?countryId=${match.countryId}&cityId=${match.cityId}`, tours: match.tours, names: match.names }] : [];
  });
}

/** Nombres en inglés que hay que buscar en el catálogo para armar el carrusel. */
export const HERO_SEARCH_NAMES = HERO_CITIES.flatMap((c) => c.aliases);
