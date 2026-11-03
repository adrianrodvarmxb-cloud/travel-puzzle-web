import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { loadMapCities, loadCityCard } from '@/map/load';

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
    const card = await loadCityCard(cityId, { prisma, includePaid: process.env.PAID_TOURS_ENABLED === 'true' });
    if (!card) return NextResponse.json({ error: 'sin tours' }, { status: 404 });
    return NextResponse.json(card, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
  }
  const cities = await loadMapCities({ prisma });
  return NextResponse.json(cities, {
    headers: { 'Cache-Control': cities.length ? 'public, max-age=3600, s-maxage=86400' : 'no-store' },
  });
}
