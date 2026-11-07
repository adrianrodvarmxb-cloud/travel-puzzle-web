import { paidInRecommendations } from '@/booking/lib/flags';
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { loadMapCities, loadCityCard } from '@/map/load';
import { cached, cacheKey } from '@/cache/edge';
import { withRetry } from '@/tours/lib/d1-load';

/**
 * Datos del mapa del inicio.
 * - GET /api/map/cities           → ciudades con tours y su ubicación (caché de 1 día)
 * - GET /api/map/cities?cityId=N  → tarjeta de la ciudad: total y 3 tours (regla 60/40)
 */
export async function GET(request: NextRequest) {
  const prisma = getPrisma();
  const cityId = Number(request.nextUrl.searchParams.get('cityId'));
  if (request.nextUrl.searchParams.has('cityId')) {
    if (!Number.isInteger(cityId) || cityId <= 0) return NextResponse.json({ error: 'cityId inválido' }, { status: 400 });
    const includePaid = paidInRecommendations(process.env);
    // REQ-032: caché compartida 1 h (antes cada clic consultaba D1).
    const card = await cached(cacheKey('map-city', { cityId, includePaid }), { ttlSec: 3600, staleSec: 86400 }, () => withRetry(() => loadCityCard(cityId, { prisma, includePaid })));
    if (!card) return NextResponse.json({ error: 'sin tours' }, { status: 404 });
    return NextResponse.json(card, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
  }
  const cities = await cached('map-cities', { ttlSec: 86400, staleSec: 7 * 86400 }, () => withRetry(() => loadMapCities({ prisma }))); // REQ-032
  return NextResponse.json(cities, {
    headers: { 'Cache-Control': cities.length ? 'public, max-age=3600, s-maxage=86400' : 'no-store' },
  });
}
