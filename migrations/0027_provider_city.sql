-- REQ-3369 (Tangol ola 2, gate B; decisión REQ-1624 del PO): tabla de mapeo proveedor → ciudad.
-- Guarda a qué City de Travel Puzzle quedó ligado cada destino del proveedor y cómo se resolvió
-- (cruce por país + GeoNames, cruce por nombre con la regla REQ-1606, o ciudad nueva creada en el plan).
-- Así el sync no vuelve a adivinar en cada corrida y una corrección del PO queda escrita en un solo lugar.
--
-- Solo CREA una tabla y su índice: no toca City, Country, Tour ni ninguna fila existente. Idempotente
-- (IF NOT EXISTS), así que volver a correrla no hace nada.
--
-- NO APLICADA. Aplicarla en producción es candado del PO (casilla «migraciones» del deploy, sola en su
-- deploy, con respaldo previo: dump de City y ProviderCity en tmp/).
--
-- Plan de regreso: la tabla es nueva y nadie más la lee todavía, así que basta con dejarla de usar;
-- para quitarla del todo:
--   DROP INDEX IF EXISTS "ProviderCity_cityId_idx";
--   DROP TABLE IF EXISTS "ProviderCity";
-- No hay datos que recuperar: el plan se vuelve a calcular con src/tangol/lib/cities.ts.

CREATE TABLE IF NOT EXISTS "ProviderCity" (
  "provider"     TEXT NOT NULL,                    -- tangol, freetour, … (mismo valor que Tour.providerId)
  "externalId"   TEXT NOT NULL,                    -- id del destino en el proveedor (Tangol: Destination.Id)
  "cityId"       INTEGER NOT NULL REFERENCES "City"("id"),
  "providerName" TEXT NOT NULL,                    -- nombre tal cual lo da el proveedor, con su nota entre paréntesis
  "countryCode"  TEXT NOT NULL,                    -- ISO-2 que declara el proveedor
  "source"       TEXT NOT NULL CHECK ("source" IN ('geonames','nombre','nueva','manual')),
  "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("provider", "externalId")
);

-- Para leer de corrido todos los destinos que apuntan a una ciudad (y detectar duplicados a mano).
CREATE INDEX IF NOT EXISTS "ProviderCity_cityId_idx" ON "ProviderCity"("cityId");
