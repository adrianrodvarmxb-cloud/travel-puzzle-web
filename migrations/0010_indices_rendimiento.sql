-- INC-003 / REQ-033: índices compuestos para las consultas más pesadas (d1 insights, 4 nov 2026).
-- Solo agrega índices (no toca datos). Reversible con DROP INDEX.
CREATE INDEX IF NOT EXISTS "Tour_isActive_reviewsNumber_idx" ON "Tour"("isActive", "reviewsNumber");
CREATE INDEX IF NOT EXISTS "Tour_isActive_countryId_idx" ON "Tour"("isActive", "countryId");
CREATE INDEX IF NOT EXISTS "Tour_isActive_cityId_idx" ON "Tour"("isActive", "cityId");
CREATE INDEX IF NOT EXISTS "Tour_isActive_rating_idx" ON "Tour"("isActive", "rating");
CREATE INDEX IF NOT EXISTS "ReviewCache_fetchedAt_idx" ON "ReviewCache"("fetchedAt");
