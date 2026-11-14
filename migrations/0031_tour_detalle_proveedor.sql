-- REQ-10512 (sync enriquecido de Tangol, PO 13 nov 2026 16:00; frente #533). Es la 0031: la 0030 la ocupa la
-- rama feat/mila-acceso-catalogo (proveedor_condiciones).
--
-- Agrega a "Tour" lo que el detalle del proveedor ya trae y la tabla no tenía dónde guardar:
--   "excludes"           TEXT  JSON string[]  — «No incluye» (DetNoIncluye de Tangol); «Incluye» ya tenía la columna "includes".
--   "cancellationPolicy" TEXT                 — política de cancelación tal como la manda el proveedor, sin su nombre (REQ-3372).
--   "availabilityRules"  TEXT  JSON           — días de operación, anticipación (HoursBooking), vigencia de tarifas y bloqueos
--                                               (REQ-10513; sin un solo campo de dinero, REQ-1543).
-- Solo agrega columnas con NULL por omisión: no toca filas, índices ni otras tablas. Los tours de Freetour quedan en NULL.
--
-- NO se declaran en prisma/schema.prisma a propósito (mismo criterio que la 0014): Prisma lee todas las columnas del
-- modelo en /tours y en la ficha, y si el código llegara antes que la migración la página fallaría con «no such column».
-- Solo las escribe el SQL del sync de Tangol (src/tangol/lib/extra-sql.ts) con UPDATE por (proveedor, número).
--
-- NO APLICADA. Aplicarla en producción es candado del PO: casilla «migraciones» del deploy, sola en su deploy, con el
-- punto de regreso de D1 (Time Travel) que el workflow anota antes (REQ-3323). El SQL del sync de Tangol falla si se
-- aplica antes que esta migración (cada archivo corre completo o no corre; no deja nada a medias).
--
-- ADD COLUMN no es idempotente en SQLite: el registro de migraciones de wrangler la corre una sola vez.
--
-- Plan de regreso: nadie lee estas columnas todavía; basta con dejarlas de escribir. Para quitarlas del todo (D1 soporta
-- DROP COLUMN):
--   ALTER TABLE "Tour" DROP COLUMN "availabilityRules";
--   ALTER TABLE "Tour" DROP COLUMN "cancellationPolicy";
--   ALTER TABLE "Tour" DROP COLUMN "excludes";
-- No hay datos que recuperar: se vuelven a llenar con la siguiente corrida del sync.

ALTER TABLE "Tour" ADD COLUMN "excludes" TEXT;
ALTER TABLE "Tour" ADD COLUMN "cancellationPolicy" TEXT;
ALTER TABLE "Tour" ADD COLUMN "availabilityRules" TEXT;
