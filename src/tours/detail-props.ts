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
import { contactFromEnv } from '@/booking/tour-summary';
import { cityLabel, transportForPlace } from '@/trips/cross-sell';
import { crossSellDeps } from '@/trips/cross-sell-deps';
import type { SupportedLanguage } from '@/types';

export async function loadTourDetailProps(tourId: string, language: SupportedLanguage) {
    const tourData = await fetchTourById(tourId, language);
    if (!tourData) return null;

    // Transform DB tour to UI tour format
    const initialTour = transformDBTourToUITour(tourData as unknown as TourWithRelations, language);

    // Reseñas reales de Freetour (caché de 7 días en D1)
    // REQ-032: caché compartida 1 h; si falla, la ficha sigue sin reseñas (regla 7).
    const externalId = (tourData as { externalId: number }).externalId;
    const { reviews, total } = await cached(cacheKey('tour-reviews', { externalId, language }), { ttlSec: 3600, staleSec: 86400 },
        () => withRetry(() => loadTourReviews(externalId, language, 30)))
        .catch((e) => { console.error('[reseñas]', (e as Error).message); return { reviews: [], total: 0 }; });

    const env = process.env as Record<string, string | undefined>;
    // REQ-005/006: transporte de la misma ciudad o país (vacío si TRANSPORT_ENABLED está apagado). Si falla, la ficha sigue.
    const rel = tourData as unknown as { city?: { translations?: unknown }; country?: { code?: string } };
    const place = { city: cityLabel(rel.city?.translations, 'es'), country: rel.country?.code ?? null };
    const items = await transportForPlace(place, language, crossSellDeps()).catch((e) => { console.error('[venta cruzada]', (e as Error).message); return []; });
    const crossSell = items.length ? { city: cityLabel(rel.city?.translations, language) ?? place.city ?? '', items } : null;
    return {
        tourId,
        initialTour,
        initialTourData: tourData as unknown as TourWithRelations,
        initialLanguage: language,
        reviews,
        reviewsTotal: total,
        bookingsEnabled: env.BOOKINGS_ENABLED === 'true',
        paidEnabled: env.PAID_TOURS_ENABLED === 'true',
        whatsapp: contactFromEnv(env).whatsapp,
        crossSell,
    };
}
