-- Gestor de viajes ola 1b (punto 17, gates G-J, nov 2026). Solo agrega columnas; no toca datos existentes.
ALTER TABLE "Agency" ADD COLUMN "initials" TEXT;
CREATE UNIQUE INDEX "Agency_initials_key" ON "Agency"("initials");

ALTER TABLE "Trip" ADD COLUMN "seq" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Trip" ADD COLUMN "codeLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Trip" ADD COLUMN "category" TEXT;
ALTER TABLE "Trip" ADD COLUMN "highlights" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Trip" ADD COLUMN "importantInfo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Trip" ADD COLUMN "whatToBring" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Trip" ADD COLUMN "accessibility" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Trip" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "Trip" ADD COLUMN "flightsIncluded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Trip" ADD COLUMN "languages" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Trip" ADD COLUMN "minPax" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "maxPax" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "options" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Trip" ADD COLUMN "extras" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Trip" ADD COLUMN "availability" JSONB NOT NULL DEFAULT '{"weekdays":[],"slots":[],"closedDates":[],"seasons":[]}';
ALTER TABLE "Trip" ADD COLUMN "minNoticeHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "Trip" ADD COLUMN "cancellation" JSONB NOT NULL DEFAULT '{"type":"standard","tiers":[]}';
ALTER TABLE "Trip" ADD COLUMN "endPoint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Trip" ADD COLUMN "videoUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Trip" ADD COLUMN "videoCaption" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Trip" ADD COLUMN "translations" JSONB NOT NULL DEFAULT '{}';
CREATE INDEX "Trip_code_seq_idx" ON "Trip"("seq");
