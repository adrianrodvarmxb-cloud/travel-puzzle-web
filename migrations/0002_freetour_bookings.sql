-- CreateTable
CREATE TABLE "FreetourBooking" (
    "refNumber" TEXT NOT NULL PRIMARY KEY,
    "tourExternalId" INTEGER,
    "eventId" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "eventDate" TEXT,
    "eventUtcDate" TEXT,
    "language" TEXT,
    "status" TEXT NOT NULL,
    "manageToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FreetourBooking_manageToken_key" ON "FreetourBooking"("manageToken");

-- CreateIndex
CREATE INDEX "FreetourBooking_email_idx" ON "FreetourBooking"("email");

-- CreateIndex
CREATE INDEX "FreetourBooking_eventId_idx" ON "FreetourBooking"("eventId");

