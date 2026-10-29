import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function upsertCountry(
  id: number,
  code: string,
  translations?: Record<string, string> | null
) {
  return prisma.country.upsert({
    where: { id },
    update: {
      code,
      ...(translations !== undefined && { 
        translations: translations as Prisma.InputJsonValue 
      }),
    },
    create: {
      id,
      code,
      ...(translations && { 
        translations: translations as Prisma.InputJsonValue 
      }),
    },
  });
}

export async function getAllCountries(language: string = 'en') {
  return prisma.country.findMany({
    orderBy: { id: 'asc' },
  });
}

export async function getCountryById(id: number, language: string = 'en') {
  return prisma.country.findUnique({
    where: { id },
  });
}

