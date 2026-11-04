import { getD1 } from '@/lib/prisma';
import { cached, cacheKey } from '@/cache/edge';
import { withRetry } from '@/tours/lib/d1-load';
import { toEntry, type CatalogEntry } from './lib/query';

/**
 * REQ-035: índice compacto del catálogo por idioma. Una sola consulta (JOIN, sin parámetros por id)
 * cada 30 min por centro de datos; si D1 falla se sirve la copia anterior hasta 1 día.
 */
const SQL = `
SELECT t.id, t.cityId, t.countryId, t.categoryId, t.priceValue, t.rating, t.reviewsNumber, t.durationMinutes,
       t.createdAt, t.updatedAt, tr.title, tr.brief, c.translations AS cityTr, co.translations AS countryTr
FROM Tour t
LEFT JOIN TourTranslation tr ON tr.tourId = t.id AND tr.language = ?1
LEFT JOIN City c ON c.id = t.cityId
LEFT JOIN Country co ON co.id = t.countryId
WHERE t.isActive = 1`;

export function loadCatalog(language: string): Promise<CatalogEntry[]> {
  return cached(cacheKey('catalog', { language, v: 1 }), { ttlSec: 1800, staleSec: 86400 }, () =>
    withRetry(async () => {
      const db = getD1() as unknown as { prepare(s: string): { bind(...v: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } } };
      const { results } = await db.prepare(SQL).bind(language).all();
      return results.map((r) => toEntry(r, language));
    }),
  );
}
