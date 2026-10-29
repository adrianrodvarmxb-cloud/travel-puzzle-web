import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function upsertCity(
  id: number,
  countryId: number,
  translations?: Record<string, string> | null
) {
  return prisma.city.upsert({
    where: { id },
    update: {
      countryId,
      ...(translations !== undefined && {
        translations: translations as Prisma.InputJsonValue
      }),
    },
    create: {
      id,
      countryId,
      ...(translations && {
        translations: translations as Prisma.InputJsonValue
      }),
    },
  });
}

export async function getAllCities(language: string = 'en') {
  return prisma.city.findMany({
    include: {
      country: true, // Both City and Country now have translations as JSON fields
    },
    orderBy: { id: 'asc' },
  });
}

export async function getCitiesByCountry(countryId: number, language: string = 'en') {
  return prisma.city.findMany({
    where: { countryId },
    orderBy: { id: 'asc' },
  });
}

export async function getCityById(id: number, language: string = 'en') {
  return prisma.city.findUnique({
    where: { id },
    include: {
      country: true, // Country now has translations as JSON field
    },
  });
}

