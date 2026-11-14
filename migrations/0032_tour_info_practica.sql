-- REQ-10537 / REQ-10538 (ficha con todo el detalle del proveedor, PO 13 nov 2026 22:23; gate A firmado 22:40: una
-- columna por dato, no JSON). Plan: docs/plan-ficha-detalle-proveedor-2026-11.md. Frente #549.
--
-- Agrega a "Tour" lo que el detalle del proveedor ya trae y la tabla no tenía dónde guardar:
--   "endPoint"             TEXT     — punto de término (EndPoint de Tangol).
--   "whatToBring"          TEXT     — qué llevar (WhatToBring).
--   "physicalRequirements" TEXT     — requisitos físicos (PhysicalReq).
--   "difficulty"           TEXT     — dificultad (Difficulty).
--   "providerNotes"        TEXT     — otras notas del proveedor (Others).
--   "childAgeFrom"/"childAgeTo"   INTEGER — edades de niño (ChdFrom/ChdTo).
--   "infantAgeFrom"/"infantAgeTo" INTEGER — edades de infante (InfFrom/InfTo).
-- Genéricas (gate B): cualquier proveedor que traiga el dato lo llena; los tours de Freetour quedan en NULL.
-- Solo agrega columnas con NULL por omisión: no toca filas, índices ni otras tablas.
--
-- NO se declaran en prisma/schema.prisma a propósito (mismo criterio que la 0014 y la 0031): Prisma lee todas las
-- columnas del modelo en /tours y en la ficha, y si el código llegara antes que la migración la página fallaría con
-- «no such column». La ficha las lee con SQL aparte (src/tours/practical-load.ts) y, si no existen, sigue sin ellas.
-- Solo las escribe el SQL del sync de Tangol (src/tangol/lib/extra-sql.ts) con UPDATE por (proveedor, número).
--
-- NO APLICADA. Aplicarla en producción es candado del PO: casilla «migraciones» del deploy, sola en su deploy, con el
-- punto de regreso de D1 (Time Travel) que el workflow anota antes (REQ-3323). El SQL del sync de Tangol falla completo
-- (sin dejar nada a medias) si corre antes que esta migración: aplicar la 0032 ANTES de la siguiente corrida del sync.
--
-- ADD COLUMN no es idempotente en SQLite: el registro de migraciones de wrangler la corre una sola vez.
--
-- Plan de regreso: basta con dejarlas de escribir y de leer (revertir el PR). Para quitarlas del todo (D1 soporta
-- DROP COLUMN):
--   ALTER TABLE "Tour" DROP COLUMN "infantAgeTo";
--   ALTER TABLE "Tour" DROP COLUMN "infantAgeFrom";
--   ALTER TABLE "Tour" DROP COLUMN "childAgeTo";
--   ALTER TABLE "Tour" DROP COLUMN "childAgeFrom";
--   ALTER TABLE "Tour" DROP COLUMN "providerNotes";
--   ALTER TABLE "Tour" DROP COLUMN "difficulty";
--   ALTER TABLE "Tour" DROP COLUMN "physicalRequirements";
--   ALTER TABLE "Tour" DROP COLUMN "whatToBring";
--   ALTER TABLE "Tour" DROP COLUMN "endPoint";
-- No hay datos que recuperar: se vuelven a llenar con la siguiente corrida del sync.

ALTER TABLE "Tour" ADD COLUMN "endPoint" TEXT;
ALTER TABLE "Tour" ADD COLUMN "whatToBring" TEXT;
ALTER TABLE "Tour" ADD COLUMN "physicalRequirements" TEXT;
ALTER TABLE "Tour" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "Tour" ADD COLUMN "providerNotes" TEXT;
ALTER TABLE "Tour" ADD COLUMN "childAgeFrom" INTEGER;
ALTER TABLE "Tour" ADD COLUMN "childAgeTo" INTEGER;
ALTER TABLE "Tour" ADD COLUMN "infantAgeFrom" INTEGER;
ALTER TABLE "Tour" ADD COLUMN "infantAgeTo" INTEGER;
