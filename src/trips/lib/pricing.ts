/** Opciones, temporadas y "Desde" (gate G, modelo Civitatis + Mega Travel). Puro. */
export interface TripOption {
  id: string;
  name: string;
  mode: "group" | "private";
  adult: number | null;
  child: number | null;
  infant: number | null;
  childAgeMin: number;
  childAgeMax: number;
}

export interface Season { name: string; from: string; to: string; supplement: number }

/** El menor precio adulto entre las opciones (precio final, con impuestos). */
export function priceFrom(options: Pick<TripOption, "adult">[]): number | null {
  const prices = options.map((o) => o.adult).filter((p): p is number => typeof p === "number" && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

/** Temporada que aplica a una fecha (YYYY-MM-DD), o null. */
export function seasonFor(date: string, seasons: Season[]): Season | null {
  return seasons.find((s) => s.from <= date && date <= s.to) ?? null;
}
