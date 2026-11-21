/**
 * REQ-10844 · Fuente del modelo de la ficha para tours de Tangol (raíz del dominio: orquesta, no calcula).
 * Decisión 40 (REQ-10617): Mila ve e informa sobre los tours de Tangol desde ya; decisión 39 (REQ-10616): desde el
 * modelo común. Pasos:
 * 1. pide la fila de `Tour` por slug a la dependencia inyectada (en producción, Prisma público: el filtro de proveedores
 *    tras bandera ya viene puesto, REQ-3311; un tour apagado o retirado no existe para nadie);
 * 2. pide la fila práctica (columnas 0031/0032, SQL aparte); si falla, sigue sin ella y lo registra (regla 7);
 * 3. arma el modelo con `tourFichaModel` (REQ-10843; otro proveedor → null → not-found);
 * 4. lo pasa por `loadFicha` (REQ-10827): esquema, mínimo de calidad y hora de lectura.
 * Recibe la base, las banderas y el reloj por parámetro (DIP); nunca importa Prisma ni lee `process.env` aquí.
 */
import { loadFicha, loadFlags, type LoadResult } from "./load";
import { tourFichaModel, tourFichaPath, type TourRowWithRelations } from "./lib/tour-input";
import type { FichaLang } from "./lib/model";

export interface TourFichaDeps {
  /** Fila de `Tour` publicada (con traducciones, ciudad y país), o null. */
  tourBySlug(slug: string): Promise<TourRowWithRelations | null>;
  /** Columnas 0031/0032 del tour, o null si no están. */
  practicalRow(tourId: string): Promise<Record<string, unknown> | null>;
  env: Record<string, string | undefined>;
  now: () => Date;
  log?: (event: { kind: "invalid" | "hidden" | "practical"; reason: string }) => void;
}

export interface TourFichaLoaded {
  load: LoadResult;
  /** Proveedor de la fila (`tangol`, …); la ventana del agente filtra por proveedor encendido (REQ-148). */
  providerId: string | null;
  /** Ruta pública de la ficha (`/destinos/<pais>/<ciudad>/<slug>`); null si no se encontró o no se armó. */
  path: string | null;
}

// REQ-10844
export async function loadTourFicha(deps: TourFichaDeps, slug: string, lang: FichaLang): Promise<TourFichaLoaded> {
  let providerId: string | null = null;
  let path: string | null = null;
  const source = async () => {
    const t = await deps.tourBySlug(slug);
    if (!t) return null;
    providerId = (t.providerId ?? "").trim().toLowerCase() || null;
    let practical: Record<string, unknown> | null = null;
    try {
      practical = await deps.practicalRow(t.id);
    } catch (e) {
      deps.log?.({ kind: "practical", reason: (e as Error).message });
    }
    const model = tourFichaModel({ tour: t, practical }, { lang, env: deps.env });
    if (model) path = tourFichaPath(t);
    return model;
  };
  const load = await loadFicha({ source, flags: loadFlags(deps.env), now: deps.now, log: deps.log });
  return { load, providerId, path };
}

/** Dependencias reales (D1 por Prisma público y la lectura práctica por SQL). */
// REQ-10844
export async function tourFichaDeps(): Promise<TourFichaDeps> {
  const { getPrisma, getD1 } = await import("@/lib/prisma");
  const { scrubTourRow } = await import("@/tours/lib/provider-text");
  const { loadPracticalRow } = await import("@/tours/practical-load");
  const env = process.env as Record<string, string | undefined>;
  return {
    tourBySlug: async (slug) => {
      const row = await getPrisma().tour.findFirst({
        where: { slug, isActive: true },
        include: { translations: true, city: true, country: true },
      });
      if (!row) return null;
      // `syncStatus` (0014) no está en el esquema de Prisma: un tour retirado del catálogo no existe (misma regla que /destinos, REQ-088).
      const st = await (getD1() as { prepare(sql: string): { bind(...v: unknown[]): { first(): Promise<Record<string, unknown> | null> } } })
        .prepare('SELECT "syncStatus" FROM "Tour" WHERE "id" = ?1').bind(row.id).first().catch(() => null);
      if (st?.syncStatus === "removed") return null;
      // Decimal → número y sin el texto del proveedor que no debe viajar (REQ-1243), como la ficha pública.
      return JSON.parse(JSON.stringify(scrubTourRow(row), (_k, v) => (v && typeof v === "object" && "toNumber" in v ? (v as { toNumber(): number }).toNumber() : v))) as TourRowWithRelations;
    },
    practicalRow: (tourId) => loadPracticalRow(getD1() as never, tourId, env),
    env,
    now: () => new Date(),
    log: (e) => console.warn(`[ficha] tour (${e.kind}):`, e.reason),
  };
}
