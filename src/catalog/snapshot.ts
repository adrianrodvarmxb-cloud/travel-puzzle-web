import { getD1 } from '@/lib/prisma';
import { cityNamesOf } from '@/taxonomy/lib/text';
import { cached, cacheKey } from '@/cache/edge';
import { withRetry } from '@/tours/lib/d1-load';
import { toEntry, CATALOG_SHAPE, type CatalogEntry } from './lib/query';
import { catalogClassifier } from '@/taxonomy/lib/publish';
import { DEFAULT_DICTIONARY, DEFAULT_MAPPINGS } from '@/taxonomy/data';

/**
 * REQ-035: índice compacto del catálogo por idioma. Una sola consulta (JOIN, sin parámetros por id)
 * cada 30 min por centro de datos; si D1 falla se sirve la copia anterior hasta 1 día.
 */
const SQL = `
SELECT t.id, t.cityId, t.countryId, t.categoryId, t.priceValue, t.rating, t.reviewsNumber, t.durationMinutes,
       t.createdAt, t.updatedAt, t.guideLanguages, t.departureDates, t.departuresSyncedAt, tr.title, tr.brief, c.translations AS cityTr, co.translations AS countryTr
FROM Tour t
LEFT JOIN TourTranslation tr ON tr.tourId = t.id AND tr.language = ?1
LEFT JOIN City c ON c.id = t.cityId
LEFT JOIN Country co ON co.id = t.countryId
WHERE t.isActive = 1`;

export function loadCatalog(language: string): Promise<CatalogEntry[]> {
  // REQ-058: la firma de forma invalida la caché cuando cambian los campos del índice
  // T4: v3 agrega el formato de la taxonomía a cada entrada (lo usa /tours solo con TAXONOMY_FILTERS_ENABLED).
  return cached(cacheKey('catalog', { language, v: 4, shape: CATALOG_SHAPE }) /* REQ-1250: v4 = Tour / Visita guiada / Caminata */, { ttlSec: 1800, staleSec: 86400 }, () =>
    withRetry(async () => {
      const db = getD1() as unknown as { prepare(s: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } } };
      const { results } = await db.prepare(SQL).bind(language).all();
      const classify = catalogClassifier(DEFAULT_DICTIONARY, DEFAULT_MAPPINGS);
      return results.map((r) => ({
        ...toEntry(r, language),
        formato: classify({ categoryId: r.categoryId === null ? null : Number(r.categoryId), price: r.priceValue === null ? null : Number(r.priceValue), durationMinutes: r.durationMinutes === null ? null : Number(r.durationMinutes), title: String(r.title ?? ''), cities: cityNamesOf(r.cityTr) }).formato, // REQ-1253
      }));
    }),
  );
}
