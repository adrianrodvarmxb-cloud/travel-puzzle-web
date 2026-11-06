-- REQ-119: registro de pagos con Stripe (ola 1, gates docs/gates-stripe-2026-11.md).
-- Solo crea una tabla nueva; no toca datos existentes. Regreso: DROP TABLE "Payment";
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCentavos" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "originalAmount" REAL NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "fxRate" REAL,
    "fxCushionPct" REAL NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "paymentIntent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");
CREATE INDEX "Payment_requestId_status_idx" ON "Payment"("requestId", "status");
