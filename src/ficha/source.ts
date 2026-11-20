/**
 * REQ-10836 · Fuente del modelo de la ficha para viajes publicados (raíz del dominio: orquesta, no calcula).
 * Decisión 39 (REQ-10616): lo que Mila lee del catálogo sale del modelo común, no de consultas propias. Pasos:
 * 1. pide el viaje publicado por slug a la dependencia inyectada (en producción, `loadTripBySlug`, con su caché y
 *    sus interruptores de visibilidad: un viaje apagado no existe para nadie);
 * 2. arma el modelo con `tripFichaModel` (REQ-10835);
 * 3. lo pasa por `loadFicha` (REQ-10827): esquema, mínimo de calidad y hora de lectura.
 * Recibe la base, las banderas y el reloj por parámetro (DIP); nunca importa Prisma ni lee `process.env` aquí.
 */
import { loadFicha, loadFlags, type LoadResult } from "./load";
import { tripFichaModel, type TripFichaSource } from "./lib/trip-input";
import type { FichaLang } from "./lib/model";
import { tripPath } from "@/trips/lib/public";

export interface TripFichaDeps {
  /** Viaje publicado y visible, o null. */
  tripBySlug(slug: string): Promise<TripFichaSource | null>;
  env: Record<string, string | undefined>;
  now: () => Date;
  log?: (event: { kind: "invalid" | "hidden"; reason: string }) => void;
}

export interface TripFichaLoaded {
  load: LoadResult;
  /** Agencia dueña del viaje (null = propio): la ventana del agente filtra por proveedor encendido (REQ-148). */
  agencyId: string | null;
  /** Ruta pública de la ficha (`/viajes/<destino>/<slug>`), la misma de las tarjetas; null si no se encontró. */
  path: string | null;
}

// REQ-10836
export async function loadTripFicha(deps: TripFichaDeps, slug: string, lang: FichaLang): Promise<TripFichaLoaded> {
  let agencyId: string | null = null;
  let path: string | null = null;
  const source = async () => {
    const s = await deps.tripBySlug(slug);
    if (!s) return null;
    agencyId = (s.trip as { agencyId?: string | null }).agencyId ?? null;
    path = tripPath(s.trip);
    return tripFichaModel(s, { lang, env: deps.env, siteUrl: deps.env.SITE_URL ?? "https://travelpuzzle.com.mx" });
  };
  const load = await loadFicha({ source, flags: loadFlags(deps.env), now: deps.now, log: deps.log });
  return { load, agencyId, path };
}

/** Dependencias reales (D1 por Prisma con la caché y los interruptores de /viajes). */
// REQ-10836
export async function tripFichaDeps(): Promise<TripFichaDeps> {
  const { loadTripBySlug } = await import("@/trips/public-load");
  return {
    tripBySlug: async (slug) => {
      const d = await loadTripBySlug(slug);
      return d ? { trip: d.trip, translations: d.translations, agencyName: d.agencyName } : null;
    },
    env: process.env as Record<string, string | undefined>,
    now: () => new Date(),
    log: (e) => console.warn(`[ficha] viaje descartado (${e.kind}):`, e.reason),
  };
}
