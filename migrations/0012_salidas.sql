-- REQ-049: resumen de salidas por tour (idiomas del guía + fechas de los próximos 60 días), común a todos los proveedores.
-- Solo agrega columnas; no toca datos existentes.
ALTER TABLE "Tour" ADD COLUMN "guideLanguages" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Tour" ADD COLUMN "departureDates" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Tour" ADD COLUMN "departuresSyncedAt" DATETIME;
ALTER TABLE "Tour" ADD COLUMN "departuresCheckedAt" DATETIME;
CREATE INDEX "Tour_isActive_departuresCheckedAt_idx" ON "Tour"("isActive", "departuresCheckedAt");
