-- REQ-3422 (Big Bus por Ventrata OCTO, ola 3): apartados y compras directas confirmadas con el operador.
-- Una fila por compra: liga la solicitud (TripRequest) y el pago (Payment) con la reserva OCTO (uuid nuestro).
-- Solo agrega una tabla y sus índices. No toca filas ni columnas existentes. Idempotente.
--
-- Candado: el merge NO aplica migraciones (REQ-3323). Se aplica a mano con «Publicar en Cloudflare» → Run workflow
-- con «migraciones» marcado, que antes anota el punto de regreso de D1. Ojo: ese paso aplica TODAS las pendientes
-- (hoy también la 0026 de Tangol). Requiere OK explícito del PO.
-- Plan de regreso: DROP TABLE IF EXISTS "OctoBooking";
CREATE TABLE IF NOT EXISTS "OctoBooking" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL DEFAULT 'bigbus-octo',
  "requestId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "uuid" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "availabilityId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ON_HOLD',
  "supplierReference" TEXT,
  "delivery" TEXT,
  "expiresAt" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "OctoBooking_uuid_key" ON "OctoBooking"("uuid");
CREATE INDEX IF NOT EXISTS "OctoBooking_requestId_idx" ON "OctoBooking"("requestId");
CREATE INDEX IF NOT EXISTS "OctoBooking_paymentId_idx" ON "OctoBooking"("paymentId");

-- REQ-3415: plan del catálogo de Big Bus (qué producto va con qué ciudad, solo precios retail, sin net).
-- Lo escribe el cron diario y lo lee la ficha. No es el archivo crudo (ese vive en R2 privado, REQ-747).
-- Plan de regreso: DROP TABLE IF EXISTS "OctoCatalogPlan";
CREATE TABLE IF NOT EXISTS "OctoCatalogPlan" (
  "provider" TEXT NOT NULL PRIMARY KEY,
  "plan" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
