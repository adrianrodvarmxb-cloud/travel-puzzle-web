-- Ola 3 «La Primera Pieza»: identidad de países, ciudades y tours (REQ-085, REQ-086, REQ-087)
-- y estado de indexación de ciudades con la regla de 14 días (REQ-090, la usa la Ola 4).
-- Solo agrega columnas, índices y un trigger; no borra ni cambia datos existentes.
-- Todas las columnas nuevas son opcionales o tienen default: el código actual las ignora.
-- Plan de regreso: docs/gates-identidad-2026-11.md.

-- País: ISO 3166-1 alfa-2 en mayúsculas (MX, PE, CN). Lo llena el script de slugs (ensayo → SQL con OK del PO).
ALTER TABLE "Country" ADD COLUMN "iso2" TEXT;
CREATE UNIQUE INDEX "Country_iso2_key" ON "Country"("iso2");

-- Ciudad: geonameid de GeoNames (cruce automático + revisión, gate 3), slug de la URL,
-- código de estado para homónimas (san-jose-bcs), guía propia y fechas del estado de indexación.
ALTER TABLE "City" ADD COLUMN "geonameid" INTEGER;
ALTER TABLE "City" ADD COLUMN "slug" TEXT;
ALTER TABLE "City" ADD COLUMN "stateCode" TEXT;
ALTER TABLE "City" ADD COLUMN "guide" TEXT;
ALTER TABLE "City" ADD COLUMN "guideUpdatedAt" DATETIME;
-- Desde cuándo la ciudad es indexable (NULL = noindex).
ALTER TABLE "City" ADD COLUMN "indexableSince" DATETIME;
-- Primer día en que una ciudad indexable dejó de cumplir la regla (NULL = cumple). Al día 14 pasa a noindex.
ALTER TABLE "City" ADD COLUMN "failingSince" DATETIME;
CREATE INDEX "City_geonameid_idx" ON "City"("geonameid");
-- El slug de ciudad es único dentro de su país (las homónimas llevan el código de estado).
CREATE UNIQUE INDEX "City_countryId_slug_key" ON "City"("countryId", "slug");

-- Tour: proveedor y slug. Todos los tours actuales son de FREETOUR.
ALTER TABLE "Tour" ADD COLUMN "providerId" TEXT NOT NULL DEFAULT 'freetour';
ALTER TABLE "Tour" ADD COLUMN "slug" TEXT;
-- Único cuando no es nulo (SQLite permite varios NULL en un índice único).
CREATE UNIQUE INDEX "Tour_slug_key" ON "Tour"("slug");
-- Llave natural (provider_id, external_id). externalId sigue siendo Int y único por sí solo.
CREATE UNIQUE INDEX "Tour_providerId_externalId_key" ON "Tour"("providerId", "externalId");

-- REQ-086: el slug de un tour se guarda una vez y nunca cambia (ni el sync ni un UPDATE a mano).
CREATE TRIGGER "Tour_slug_inmutable"
BEFORE UPDATE OF "slug" ON "Tour"
FOR EACH ROW
WHEN OLD."slug" IS NOT NULL AND NEW."slug" IS NOT OLD."slug"
BEGIN
  SELECT RAISE(ABORT, 'Tour.slug es inmutable (REQ-086)');
END;
