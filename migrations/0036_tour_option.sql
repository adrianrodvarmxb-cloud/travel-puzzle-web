-- REQ-10944 (ola 12, PR 2 «adicionales»; decisión A del PO, 26 nov 2026): las opciones de Tangol se guardan en una
-- TABLA NUEVA con su tarifa pública (RackRateAdu, nunca el neto ni la comisión: REQ-1543) y su dato de traslado
-- (con / sin / no lo dice), llenada al correr el sync (PR del sync, aparte). Una fila por (tour, código de opción).
-- La ficha única lee estas filas para poner precio y traslado a cada opción y derivar el traslado como adicional
-- (`transferAddonFromOptions`, REQ-10881); nadie la muestra mientras FICHA_ADDONS_ENABLED siga en "false".
-- Columnas:
--   id               TEXT    "<tourId>:<code>" (la llave natural, estable entre corridas del sync)
--   tourId           TEXT    Tour.id; si se borra el tour se van sus opciones (ON DELETE CASCADE)
--   code             TEXT    código de la opción en Tangol
--   description      TEXT    descripción de la opción (de ahí sale el traslado, REQ-10883)
--   startTime        TEXT    hora de salida «HH:MM» o NULL
--   currency         TEXT    moneda de la tarifa pública (ISO 4217) o NULL si no trae tarifa
--   rackAdult        REAL    tarifa PÚBLICA de adulto más baja de la opción (la que ve el cliente) o NULL
--   transferIncluded INTEGER 1 = con traslado, 0 = sin traslado, NULL = el proveedor no lo dice
--   hoursBooking     INTEGER anticipación mínima en horas o NULL
--   hoursCancelation INTEGER horas de cancelación sin cargo o NULL
--   updatedAt        TEXT    última escritura del sync (ISO 8601)
-- Las columnas NO se declaran en prisma/schema.prisma (misma regla que la 0031 y la 0032): se leen y escriben con SQL
-- aparte, así `prisma db push` del dev no las toca. Se aplica SOLA en su deploy (`migraciones: true`), con punto de
-- regreso de D1 y OK explícito del PO (candado de la decisión).
-- Plan de regreso: DROP TABLE "TourOption"; (la ficha vuelve a opciones sin precio, como hoy). Nada más cambia.

CREATE TABLE "TourOption" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tourId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "startTime" TEXT,
  "currency" TEXT,
  "rackAdult" REAL,
  "transferIncluded" INTEGER,
  "hoursBooking" INTEGER,
  "hoursCancelation" INTEGER,
  "updatedAt" TEXT NOT NULL,
  CONSTRAINT "TourOption_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TourOption_tourId_code_key" ON "TourOption" ("tourId", "code");
CREATE INDEX "TourOption_tourId_idx" ON "TourOption" ("tourId");
