/** Venta cruzada por lugar: misma ciudad y, si no hay, mismo país (gate P). Puro. */

export interface Place { city: string | null; country: string | null }

// REQ-005
export function normPlace(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

// REQ-005, REQ-006, REQ-007
export function pickByPlace<T extends { cities: string[]; countries: string[] }>(items: T[], place: Place, n = 3): T[] {
  const city = place.city ? normPlace(place.city) : null;
  if (city) {
    const sameCity = items.filter((i) => i.cities.some((c) => normPlace(c) === city));
    if (sameCity.length) return sameCity.slice(0, n);
  }
  if (!place.country) return [];
  return items.filter((i) => i.countries.includes(place.country!)).slice(0, n);
}
