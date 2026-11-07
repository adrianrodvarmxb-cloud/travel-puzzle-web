/**
 * Ola R2 (REQ-551, REQ-553, REQ-554): lecturas y escrituras del recálculo CON linaje. Necesita las migraciones 0017,
 * 0022 (ProviderRecord) y 0023 (columnas de procedencia); solo se usa con TAXONOMY_LINEAGE_ENABLED="true".
 * Lee Tour, Trip, ProviderRecord y ExperienceTaxonomyOverride; escribe SOLO en ExperienceTaxonomy (REQ-409).
 */
import { runBatch, upsertRows } from "@/lib/d1/batch";
import type { TaxonomyD1 } from "./repository";
import type { TourRowForTaxonomy, TripRowForTaxonomy } from "./lib/run-plan";
import type { LineageRow, OverrideLike } from "./lib/lineage";

export interface TourWithRaw extends TourRowForTaxonomy { rawHash: string | null }
export interface TripWithOriginal extends TripRowForTaxonomy {
  provider: string | null; originalField: string | null; originalCategory: string | null;
  declaredTaxonomy: string | null; rawHash: string | null;
}
export interface OverrideRow extends OverrideLike { experienceKind: "tour" | "trip"; experienceId: string }

export interface LineageRepo {
  toursAfter(cursor: string, limit: number): Promise<TourWithRaw[]>;
  publishedTrips(): Promise<TripWithOriginal[]>;
  overrides(): Promise<OverrideRow[]>;
  writeRows(runId: string, version: string, computedAt: string, rows: LineageRow[]): Promise<void>;
}

const LATEST_TRIP = `SELECT "experienceId","provider","originalField","originalCategory","declaredTaxonomy","rawHash",
  ROW_NUMBER() OVER (PARTITION BY "experienceId" ORDER BY "lastSeenAt" DESC) AS "rn" FROM "ProviderRecord" WHERE "experienceKind"='trip'`;

export function createLineageRepo(db: TaxonomyD1): LineageRepo {
  const all = async (sql: string, ...v: unknown[]) => (await db.prepare(sql).bind(...v).all()).results;
  return {
    async toursAfter(cursor, limit) {
      return (await all(
        `SELECT t."id", t."categoryId", t."priceValue", t."durationMinutes", t."guideLanguages", t."rating", t."reviewsNumber",
                es."title" AS "titleEs", en."title" AS "titleEn", es."brief" AS "briefEs", en."brief" AS "briefEn",
                (SELECT pr."rawHash" FROM "ProviderRecord" pr WHERE pr."provider"='freetour' AND pr."externalId"=CAST(t."externalId" AS TEXT)
                  ORDER BY pr."lastSeenAt" DESC LIMIT 1) AS "rawHash"
           FROM "Tour" t
           LEFT JOIN "TourTranslation" es ON es."tourId" = t."id" AND es."language" = 'es'
           LEFT JOIN "TourTranslation" en ON en."tourId" = t."id" AND en."language" = 'en'
          WHERE t."isActive" = 1 AND t."id" > ? ORDER BY t."id" LIMIT ?`, cursor, limit,
      )) as unknown as TourWithRaw[];
    },
    async publishedTrips() {
      return (await all(
        `SELECT t."id",t."kind",t."category",t."durationDays",t."titleEs",t."titleEn",t."priceFrom",t."languages",t."options",t."flightsIncluded",
                pr."provider",pr."originalField",pr."originalCategory",pr."declaredTaxonomy",pr."rawHash"
           FROM "Trip" t LEFT JOIN (${LATEST_TRIP}) pr ON pr."experienceId" = t."id" AND pr."rn" = 1
          WHERE t."status"='published' ORDER BY t."id"`,
      )) as unknown as TripWithOriginal[];
    },
    async overrides() {
      return (await all(`SELECT "experienceKind","experienceId","axis","term","action","note","by" FROM "ExperienceTaxonomyOverride" ORDER BY "at"`)) as unknown as OverrideRow[];
    },
    async writeRows(runId, version, computedAt, rows) {
      const cols = ["experienceKind", "experienceId", "axis", "term", "ruleId", "mappingVersion", "runId", "computedAt", "origin", "sourceField", "sourceValue", "matchedTerm", "sourceRawHash"];
      const values = rows.map((r) => [r.experienceKind, r.experienceId, r.axis, r.term, r.ruleId.slice(0, 200), version, runId, computedAt, r.origin,
        r.sourceField, r.sourceValue?.slice(0, 500) ?? null, r.matchedTerm, r.sourceRawHash]);
      await runBatch(db, upsertRows("ExperienceTaxonomy", cols, values, ["experienceKind", "experienceId", "axis", "term", "runId"],
        ["ruleId", "computedAt", "origin", "sourceField", "sourceValue", "matchedTerm", "sourceRawHash"]));
    },
  };
}
