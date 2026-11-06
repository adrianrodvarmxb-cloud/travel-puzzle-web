-- REQ-473 (gate G4: «geo-v2-0016.sql solo después de G3»; G3 aplicada el 6 nov 2026 13:20 UTC; REQ-134, REQ-135, REQ-142 firmados).
-- Origen: artefacto «geo-v2-ensayo» del ensayo #3 (run 42172320495, commit a81567d de #123), archivo geo-v2-0016.sql, sin cambios.
-- País y región propios de la ciudad (SCT/WLS/NIR → GB + GB-SCT/GB-WLS/GB-NIR; Hong Kong 5835 CN → HK; Tórshavn 6298 DK → FO)
-- y alias de Taipei 4200/6172 → 4200. Solo llena lo vacío (IS NULL) o inserta si no existe (INSERT OR IGNORE). Nada de DELETE ni DROP.
-- Lo aplica SOLO el workflow «Geo: escribir geonameid» con escribir_pais=true, en una corrida aparte, después de los geonameid.
-- Hoy el sitio no lee estas columnas ni CityAlias (Prisma no las declara).
UPDATE "City" SET "regionCode" = 'GB-SCT' WHERE "id" = 4842 AND "regionCode" IS NULL;
UPDATE "City" SET "countryCode" = 'GB' WHERE "id" = 4842 AND "countryCode" IS NULL;
UPDATE "City" SET "regionCode" = 'GB-SCT' WHERE "id" = 4843 AND "regionCode" IS NULL;
UPDATE "City" SET "countryCode" = 'GB' WHERE "id" = 4843 AND "countryCode" IS NULL;
UPDATE "City" SET "regionCode" = 'GB-SCT' WHERE "id" = 4844 AND "regionCode" IS NULL;
UPDATE "City" SET "countryCode" = 'GB' WHERE "id" = 4844 AND "countryCode" IS NULL;
UPDATE "City" SET "regionCode" = 'GB-NIR' WHERE "id" = 4849 AND "regionCode" IS NULL;
UPDATE "City" SET "countryCode" = 'GB' WHERE "id" = 4849 AND "countryCode" IS NULL;
UPDATE "City" SET "regionCode" = 'GB-WLS' WHERE "id" = 4858 AND "regionCode" IS NULL;
UPDATE "City" SET "countryCode" = 'GB' WHERE "id" = 4858 AND "countryCode" IS NULL;
UPDATE "City" SET "countryCode" = 'HK' WHERE "id" = 5835 AND "countryCode" IS NULL;
UPDATE "City" SET "countryCode" = 'FO' WHERE "id" = 6298 AND "countryCode" IS NULL;
INSERT OR IGNORE INTO "CityAlias" ("provider", "providerCityId", "cityId") VALUES ('freetour', 4200, 4200);
INSERT OR IGNORE INTO "CityAlias" ("provider", "providerCityId", "cityId") VALUES ('freetour', 6172, 4200);
