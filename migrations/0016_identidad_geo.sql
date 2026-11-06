-- Identidad geográfica v2 (REQ-134, REQ-135; informe «Identidad geográfica del catálogo», paso 7).
-- PROPUESTA: no se aplica sin OK del PO (candado: migración). Solo AGREGA columnas, tablas e índices; no borra ni cambia datos.
-- Todas las columnas nuevas son opcionales o tienen default: el código actual las ignora. Prisma aún no las declara
-- (se agregan al schema en el PR que las use, después de aplicar esta migración).
--
-- Plan de regreso (solo con OK del PO; antes, bookmark de D1 Time Travel):
--   DROP TABLE IF EXISTS "SlugRedirect";
--   DROP TABLE IF EXISTS "CountryOverride";
--   DROP INDEX IF EXISTS "CityAlias_cityId_idx";
--   DROP TABLE IF EXISTS "CityAlias";
--   ALTER TABLE "City" DROP COLUMN "geoLocked";
--   ALTER TABLE "City" DROP COLUMN "geoSource";
--   ALTER TABLE "City" DROP COLUMN "regionCode";
--   ALTER TABLE "City" DROP COLUMN "countryCode";
--   DELETE FROM "d1_migrations" WHERE "name" = '0016_identidad_geo.sql';

-- REQ-134: país ISO-2 propio de la ciudad cuando no sale del país de FREETOUR (SCT/WLS/NIR → GB; AN → CW/SX/BQ),
-- y subdivisión ISO 3166-2 (GB-SCT, GB-WLS, GB-NIR) para addressRegion y el hub de región.
ALTER TABLE "City" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "City" ADD COLUMN "regionCode" TEXT;
-- De dónde salió el geonameid: override | id | aproximado. geoLocked = 1: lo decidió una persona; el sync no lo cambia.
ALTER TABLE "City" ADD COLUMN "geoSource" TEXT;
ALTER TABLE "City" ADD COLUMN "geoLocked" INTEGER NOT NULL DEFAULT 0;

-- REQ-135: (proveedor, id de ciudad del proveedor) → ciudad canónica (Taipei 4200 y 6172 → 4200).
CREATE TABLE IF NOT EXISTS "CityAlias" (
    "provider" TEXT NOT NULL,
    "providerCityId" INTEGER NOT NULL,
    "cityId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("provider", "providerCityId"),
    CONSTRAINT "CityAlias_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CityAlias_cityId_idx" ON "CityAlias"("cityId");

-- REQ-134: tabla de países no ISO (copia de src/geo/data/country-overrides.csv, que es la fuente revisada por PR).
CREATE TABLE IF NOT EXISTS "CountryOverride" (
    "provider" TEXT NOT NULL,
    "providerCountryId" INTEGER NOT NULL,
    "rawCode" TEXT NOT NULL,
    "countryCode" TEXT,
    "regionCode" TEXT,
    "indexable" INTEGER NOT NULL DEFAULT 1,
    "perCity" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("provider", "providerCountryId")
);

-- REQ-135: slugs alternos que responden 301 a la canónica (taipéi codificado, taipei-2 → /destinos/taiwan/taipei).
CREATE TABLE IF NOT EXISTS "SlugRedirect" (
    "fromPath" TEXT NOT NULL PRIMARY KEY,
    "toPath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
