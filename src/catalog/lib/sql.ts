import { upsertRows, sqlValue, type Stmt } from "@/lib/d1/batch";
import type { TourRow, TranslationRow } from "./tour-rows";

const TOUR_FIELDS = [
  "externalId", "providerTitle", "providerPhone", "priceValue", "priceCurrency", "duration", "titleImageURL",
  "categoryId", "rating", "reviewsNumber", "cityId", "countryId", "meetingPoint", "includes", "POIs", "images",
  "videoURL", "isActive", "lastSeenAt",
] as const;

/**
 * Sentencias para guardar una página de tours y sus traducciones en un solo batch.
 * Los tours nuevos reciben un id nuevo; los existentes conservan el suyo.
 */
export function tourStatements(
  rows: { tour: TourRow; translations: TranslationRow[] }[],
  now: Date,
  newId: () => string
): Stmt[] {
  const columns = ["id", ...TOUR_FIELDS, "updatedAt", "createdAt"];
  const tourRows = rows.map(({ tour }) => [newId(), ...TOUR_FIELDS.map((f) => tour[f]), now, now]);
  const update = [...TOUR_FIELDS.filter((f) => f !== "externalId"), "updatedAt"];
  const tours = upsertRows("Tour", columns, tourRows, ["externalId"], update);

  // Una sentencia por tour (6 idiomas × 7 valores = 42 parámetros).
  const translations: Stmt[] = rows
    .filter(({ translations }) => translations.length > 0)
    .map(({ tour, translations }) => ({
      sql:
        'INSERT INTO "TourTranslation" ("id", "tourId", "language", "title", "brief", "description", "url") VALUES ' +
        translations.map(() => '(?, (SELECT "id" FROM "Tour" WHERE "externalId" = ?), ?, ?, ?, ?, ?)').join(", ") +
        ' ON CONFLICT ("tourId", "language") DO UPDATE SET "title" = excluded."title", "brief" = excluded."brief",' +
        ' "description" = excluded."description", "url" = excluded."url"',
      params: translations
        .flatMap((tr) => [newId(), tour.externalId, tr.language, tr.title, tr.brief, tr.description, tr.url])
        .map(sqlValue),
    }));

  return [...tours, ...translations];
}
