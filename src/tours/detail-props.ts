/**
 * Datos de la ficha de un tour para TourDetailClient. Lo comparten /tours/[id] (hoy) y la ficha nueva de
 * /destinos/{pais}/{ciudad}/{slug}. Movido tal cual desde app/tours/[id]/page.tsx: el resultado es el mismo.
 */
import { fetchTourById } from '@/actions/tours';
import { cached, cacheKey } from '@/cache/edge';
import { withRetry } from '@/tours/lib/d1-load';
import { transformDBTourToUITour } from '@/lib/db/tour-transformer';
import type { TourWithRelations } from '@/lib/db/repositories/tour-repository';
import { loadTourReviews } from '@/reviews/load';
import { withoutPlatformMentions } from '@/reviews/lib/platform-mention';
import { isPrimeraPiezaEnabled } from '@/tours/lib/menu';
import { contactFromEnv } from '@/booking/tour-summary';
import { cityLabel, transportForPlace } from '@/trips/cross-sell';
import { crossSellDeps } from '@/trips/cross-sell-deps';
import type { SupportedLanguage } from '@/types';
import { getD1 } from '@/lib/prisma';
import { loadPracticalInfo } from '@/tours/practical-load';
import { freetourSourceId } from '@/tours/lib/provider-source';

export async function loadTourDetailProps(tourId: string, language: SupportedLanguage) {
    const tourData = await fetchTourById(tourId, language);
    if (!tourData) return null;

    // Transform DB tour to UI tour format
    const initialTour = transformDBTourToUITour(tourData as unknown as TourWithRelations, language);

    // Reseñas reales de Freetour (caché de 7 días en D1)
    // REQ-032: caché compartida 1 h; si falla, la ficha sigue sin reseñas (regla 7).
    // REQ-10578: solo los tours de FREETOUR tienen reseñas en esa caché; otro proveedor con el mismo número no consulta.
    const sourceId = freetourSourceId((tourData as { providerId?: string | null }).providerId, (tourData as { externalId: number }).externalId);
    const { reviews, total } = sourceId === null ? { reviews: [], total: 0 } : await cached(cacheKey('tour-reviews', { externalId: sourceId, language }), { ttlSec: 3600, staleSec: 86400 },
        () => withRetry(() => loadTourReviews(sourceId, language, 30)))
        .catch((e) => { console.error('[reseñas]', (e as Error).message); return { reviews: [], total: 0 }; });

    const env = process.env as Record<string, string | undefined>;
    // REQ-171: no se pintan reseñas que nombran la plataforma (la base no cambia; el total y la calificación
    // siguen siendo los del proveedor). Aplica a /destinos y a /tours (mismo componente). Desde el 6 nov 2026
    // el PO lo pidió en producción sin esperar la bandera; true lo devuelve a depender de PRIMERA_PIEZA_ENABLED.
    const REVIEW_FILTER_ONLY_WITH_FLAG = false;
    const shown = !REVIEW_FILTER_ONLY_WITH_FLAG || isPrimeraPiezaEnabled(env.PRIMERA_PIEZA_ENABLED) ? withoutPlatformMentions(reviews) : reviews;
    // REQ-005/006: transporte de la misma ciudad o país (vacío si TRANSPORT_ENABLED está apagado). Si falla, la ficha sigue.
    const rel = tourData as unknown as { city?: { translations?: unknown }; country?: { code?: string } };
    const place = { city: cityLabel(rel.city?.translations, 'es'), country: rel.country?.code ?? null };
    const items = await transportForPlace(place, language, crossSellDeps()).catch((e) => { console.error('[venta cruzada]', (e as Error).message); return []; });
    const crossSell = items.length ? { city: cityLabel(rel.city?.translations, language) ?? place.city ?? '', items } : null;
    // REQ-10536…10539: Condiciones, Antes de ir y detalles prácticos (columnas 0031/0032, SQL aparte). Si falla, null
    // y la ficha sigue sin esos bloques (regla 7); se validan antes de salir al cliente (regla 8).
    const practical = await Promise.resolve()
        .then(() => loadPracticalInfo(getD1() as never, (tourData as { id: string }).id, language, env))
        .catch((e) => { console.error('[ficha] datos prácticos:', (e as Error).message); return null; });
    return {
        tourId,
        initialTour,
        initialTourData: tourData as unknown as TourWithRelations,
        initialLanguage: language,
        reviews: shown,
        reviewsTotal: total,
        bookingsEnabled: env.BOOKINGS_ENABLED === 'true',
        paidEnabled: env.PAID_TOURS_ENABLED === 'true',
        whatsapp: contactFromEnv(env).whatsapp,
        crossSell,
        practical,
    };
}
