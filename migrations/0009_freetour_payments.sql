-- Tours de pago de Freetour (REQ-011/012): datos del checkout en la reserva. Solo agrega columnas (no borra nada).
ALTER TABLE "FreetourBooking" ADD COLUMN "fullPrice" REAL;
ALTER TABLE "FreetourBooking" ADD COLUMN "currency" TEXT;
ALTER TABLE "FreetourBooking" ADD COLUMN "checkoutSessionId" TEXT;
ALTER TABLE "FreetourBooking" ADD COLUMN "paymentUrl" TEXT;
ALTER TABLE "FreetourBooking" ADD COLUMN "paymentStatus" TEXT;
ALTER TABLE "FreetourBooking" ADD COLUMN "paymentExpiresAt" TEXT;
ALTER TABLE "FreetourBooking" ADD COLUMN "paymentCheckedAt" TEXT;
CREATE INDEX "FreetourBooking_paymentStatus_idx" ON "FreetourBooking"("paymentStatus");
