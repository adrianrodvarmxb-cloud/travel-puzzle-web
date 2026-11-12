-- REQ-1623 (Tangol ola 2, gate A): el número externo de un tour es único POR PROVEEDOR, no en toda la tabla.
-- 0001 creó "Tour_externalId_key" (solo externalId) y 0015 agregó el compuesto ("providerId","externalId") (REQ-085),
-- pero el viejo nunca se quitó: un tour de Tangol con el mismo TourId que uno de Freetour no se podía insertar.
-- Solo quita el índice viejo. No toca filas, columnas ni otras tablas. Idempotente.
--
-- Candado: aplicar en producción requiere OK explícito del PO y respaldo previo (dump de Tour en tmp/).
-- Plan de regreso: CREATE UNIQUE INDEX "Tour_externalId_key" ON "Tour"("externalId");
--   (solo funciona mientras no haya dos proveedores con el mismo externalId; por eso se revierte ANTES de cargar Tangol).
DROP INDEX IF EXISTS "Tour_externalId_key";
