-- Duración en minutos para ordenar y filtrar /tours (punto 10, nov 2026).
-- Aditiva: el código anterior la ignora. Se llena con lo existente; la sincronización diaria la mantiene.
ALTER TABLE "Tour" ADD COLUMN "durationMinutes" INTEGER;

UPDATE "Tour"
SET "durationMinutes" =
  CAST(substr("duration", 1, instr("duration", ':') - 1) AS INTEGER) * 60
  + CAST(substr("duration", instr("duration", ':') + 1) AS INTEGER)
WHERE instr("duration", ':') > 1
  AND CAST(substr("duration", instr("duration", ':') + 1) AS INTEGER) BETWEEN 0 AND 59;

UPDATE "Tour" SET "durationMinutes" = NULL WHERE "durationMinutes" <= 0;

CREATE INDEX "Tour_durationMinutes_idx" ON "Tour"("durationMinutes");
