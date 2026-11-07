-- Taxonomía T6 (plan docs/plan-taxonomia.md §6.2; REQ-421…425): facetas de circuitos en viajes propios.
-- SOLO AGREGA columnas opcionales a "Trip": "difficulty" (facil · moderada · exigente) y "accessibility" (texto) se conservan
-- tal cual. Todas aceptan NULL (= sin dato): sin dato no se muestra nada; "accessible" nunca se infiere.
-- CANDADO: la aplica el coordinador con respaldo de "Trip" antes (comandos en el PR). El código no lee estas columnas
-- hasta un PR posterior (Prisma no las conoce todavía), así que aplicarla no cambia nada visible.
-- Plan de regreso: columnas nuevas y vacías; si hiciera falta, se dejan sin uso (no se borran).

ALTER TABLE "Trip" ADD COLUMN "difficultyLevel" INTEGER CHECK ("difficultyLevel" BETWEEN 1 AND 5);   -- 1 Relajado … 5 Muy exigente
ALTER TABLE "Trip" ADD COLUMN "comfort" TEXT CHECK ("comfort" IN ('basico','esencial','confort','premium'));
ALTER TABLE "Trip" ADD COLUMN "guideType" TEXT CHECK ("guideType" IN ('guiado','semiguiado','a-tu-aire'));
ALTER TABLE "Trip" ADD COLUMN "travelerProfiles" TEXT NOT NULL DEFAULT '[]';                           -- JSON: parejas, familia, solo, 60+, 18-35, negocios
ALTER TABLE "Trip" ADD COLUMN "accessible" BOOLEAN;                                                    -- NULL = sin dato
