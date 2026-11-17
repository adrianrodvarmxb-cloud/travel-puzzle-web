/**
 * «Cerca» único (ficha única, decisión 29, REQ-10607; reemplaza REQ-005 y absorbe #433): la misma regla de cercanía
 * para la franja de transporte de toda ficha (FREETOUR, Tangol, viajes de agencia y Big Bus), el carrusel y los
 * correos. Escalones, en orden: 1) misma ciudad, 2) mismo país, 3) por distancia en radios crecientes. Dentro de
 * cada escalón, lo más cercano primero cuando hay punto; sin punto no se inventa ninguno. Puro: sin base, sin red,
 * sin reloj. Reemplaza, cuando `NEARBY_UNIFIED_ENABLED` esté encendida, a `pickByPlace` (ciudad → país) y a la
 * búsqueda por cercanía de `src/companions/lib/nearby.ts`, que siguen intactos hasta entonces (no se borra código).
 */
import { distanceKm, type Point } from "./centroid";
import { normPlace } from "@/trips/lib/match";

/** REQ-10750: radios por coordenadas, en orden (los mismos que REQ-320 para no cambiar lo que hoy se ve). */
export const NEAR_RADII_KM = [300, 800] as const;
/** REQ-10750: resultados por omisión. */
export const NEAR_MAX = 3;
/** REQ-10750: ningún producto de FREETOUR se propone como «cerca» (regla B3 firmada; decisión 29). */
export const NEAR_EXCLUDED_PROVIDERS: readonly string[] = ["freetour"];

export interface NearCandidate {
  id: string;
  /** Proveedor del candidato ("freetour", "tangol", "propios", agencia…). */
  provider?: string | null;
  cities: readonly string[];
  /** ISO-2 en mayúsculas (se normaliza al comparar). */
  countries: readonly string[];
  point?: Point | null;
}

export interface NearOrigin {
  city: string | null;
  country: string | null;
  point: Point | null;
  /** Proveedor de la ficha de origen; "freetour" apaga los afiliados (Kiwitaxi) sin apagar el transporte propio. */
  provider?: string | null;
}

export interface NearOptions {
  max?: number;
  radiiKm?: readonly number[];
  /** true cuando lo que se va a mostrar es un afiliado (Kiwitaxi): nunca en una ficha de FREETOUR. */
  affiliate?: boolean;
}

export type NearTier = "city" | "country" | `radius-${number}`;
export interface NearResult<T> { tier: NearTier | null; items: T[] }

const normCountry = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();
const normProvider = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * REQ-10750: ¿puede esta ficha mostrar transporte? El propio o de agencia, en toda ficha (decisión 29);
 * un afiliado, nunca en FREETOUR (decisión 29 y REQ-10607: «Kiwitaxi nunca en FREETOUR»).
 */
export function transportAllowedFor(originProvider: string | null | undefined, opts: { affiliate: boolean }): boolean {
  if (!opts.affiliate) return true;
  return normProvider(originProvider) !== "freetour";
}

// REQ-10750
export function nearUnified<T extends NearCandidate>(candidates: readonly T[], origin: NearOrigin, opts: NearOptions = {}): NearResult<T> {
  const max = opts.max ?? NEAR_MAX;
  const radii = opts.radiiKm ?? NEAR_RADII_KM;
  if (!transportAllowedFor(origin.provider, { affiliate: opts.affiliate ?? false })) return { tier: null, items: [] };

  const usable = candidates.filter((c) => !NEAR_EXCLUDED_PROVIDERS.includes(normProvider(c.provider)));
  const dist = (c: NearCandidate): number => (origin.point && c.point ? distanceKm(origin.point, c.point) : Number.POSITIVE_INFINITY);
  const pick = (tier: NearTier, list: T[]): NearResult<T> => ({
    tier,
    items: list
      .map((c, i) => ({ c, i, d: dist(c) }))
      .sort((a, b) => a.d - b.d || a.i - b.i)
      .slice(0, max)
      .map(({ c }) => c),
  });

  const city = origin.city ? normPlace(origin.city) : "";
  if (city) {
    const sameCity = usable.filter((c) => c.cities.some((x) => normPlace(x) === city));
    if (sameCity.length) return pick("city", sameCity);
  }
  const country = normCountry(origin.country);
  if (country) {
    const sameCountry = usable.filter((c) => c.countries.some((x) => normCountry(x) === country));
    if (sameCountry.length) return pick("country", sameCountry);
  }
  if (origin.point) {
    for (const km of radii) {
      const near = usable.filter((c) => dist(c) <= km);
      if (near.length) return pick(`radius-${km}`, near);
    }
  }
  return { tier: null, items: [] };
}

export interface NearFlagsEnv {
  NEARBY_UNIFIED_ENABLED?: string;
}

/** REQ-10751: «Cerca» único en ficha, carrusel y correos; apagada, cada superficie sigue con su regla de hoy. */
export function nearbyUnifiedEnabled(env: NearFlagsEnv): boolean {
  return env.NEARBY_UNIFIED_ENABLED === "true";
}
