-- Correos automáticos ya enviados por reserva (recordatorios y reseña), para no repetirlos.
CREATE TABLE "FreetourBookingEmail" (
    "refNumber" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("refNumber", "kind")
);

-- Para buscar rápido las reservas activas por fecha del tour.
CREATE INDEX "FreetourBooking_status_eventUtcDate_idx" ON "FreetourBooking"("status", "eventUtcDate");
