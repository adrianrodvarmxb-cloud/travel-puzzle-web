import { NextResponse } from 'next/server';
import { getPrisma, getD1 } from '@/lib/prisma';
import { createFreetourApi } from '@/freetour/api';
import { resolveFreetourConfig } from '@/freetour/lib/hosts';
import { runSyncStep } from '@/catalog/sync';
import { createCatalogRepo } from '@/catalog/repository';
import { refreshStaleReviews } from '@/reviews/service';
import { createReviewRepo } from '@/reviews/repository';
import { runDeparturesStep } from '@/departures/sync';
import { createDeparturesRepo } from '@/departures/repository';
import { freetourSource } from '@/departures/sources/freetour';
import countries from '../../../../../data/countries.json';

export const dynamic = 'force-dynamic';

/**
 * Un paso de la sincronización diaria del catálogo (una página por llamada).
 * La llama el cron del Worker (worker.ts) con CRON_SECRET.
 * Antes escribía data/tours.json, que en Cloudflare no persiste; ahora guarda en D1.
 * Cuando el catálogo del día ya terminó, usa los minutos libres para traer las
 * reseñas reales de los tours más reseñados (5 por llamada).
 */
const REVIEWS_PER_TICK = 5;
/** REQ-049: tours por minuto para leer salidas (~8,000 tours en un día, cada uno como máximo 1 vez cada 20 h). */
const DEPARTURES_PER_TICK = 8;
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const api = createFreetourApi({ config: resolveFreetourConfig(process.env), fetch });
    const prisma = getPrisma();
    const now = new Date();
    const result = await runSyncStep({
      api,
      repo: createCatalogRepo(prisma, getD1()),
      countries: countries as never,
      now,
    });
    if (result.action === 'idle') {
      const reviews = await refreshStaleReviews({ batch: REVIEWS_PER_TICK }, { api, repo: createReviewRepo(prisma, getD1()), now });
      // REQ-049: salidas (idiomas y fechas) escalonadas; Freetour pide leer /tours/{id}/events de forma periódica.
      const departures = process.env.DEPARTURES_SYNC_ENABLED === 'true'
        ? await runDeparturesStep({ source: freetourSource(api), repo: createDeparturesRepo(getD1() as never), now, batch: DEPARTURES_PER_TICK }).catch((e) => ({ error: (e as Error).message }))
        : 'off';
      return NextResponse.json({ success: true, ...result, reviews, departures });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Cron sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
