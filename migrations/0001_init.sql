-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "translations" JSONB
);

-- CreateTable
CREATE TABLE "City" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "countryId" INTEGER NOT NULL,
    "translations" JSONB,
    CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" INTEGER NOT NULL,
    "providerTitle" TEXT NOT NULL,
    "providerPhone" TEXT,
    "priceValue" DECIMAL NOT NULL,
    "priceCurrency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "titleImageURL" TEXT,
    "categoryId" INTEGER NOT NULL,
    "rating" DECIMAL,
    "reviewsNumber" INTEGER NOT NULL DEFAULT 0,
    "cityId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,
    "meetingPoint" JSONB NOT NULL,
    "includes" JSONB NOT NULL,
    "POIs" JSONB,
    "images" JSONB NOT NULL,
    "videoURL" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tour_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tour_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TourTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tourId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT,
    "description" TEXT,
    "url" TEXT NOT NULL,
    CONSTRAINT "TourTranslation_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncMetadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "lastSyncAt" DATETIME NOT NULL,
    "toursCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "nextPage" INTEGER NOT NULL DEFAULT 1,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "runStartedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL NOT NULL,
    "externalUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT,
    "endpoint" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tourExternalId" INTEGER NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "rate" REAL NOT NULL,
    "addedAt" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ReviewCache" (
    "tourExternalId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "totalObjects" INTEGER NOT NULL,
    "fetchedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_externalId_key" ON "Tour"("externalId");

-- CreateIndex
CREATE INDEX "Tour_cityId_idx" ON "Tour"("cityId");

-- CreateIndex
CREATE INDEX "Tour_countryId_idx" ON "Tour"("countryId");

-- CreateIndex
CREATE INDEX "Tour_categoryId_idx" ON "Tour"("categoryId");

-- CreateIndex
CREATE INDEX "Tour_isActive_idx" ON "Tour"("isActive");

-- CreateIndex
CREATE INDEX "Tour_priceValue_idx" ON "Tour"("priceValue");

-- CreateIndex
CREATE INDEX "TourTranslation_language_idx" ON "TourTranslation"("language");

-- CreateIndex
CREATE INDEX "TourTranslation_title_idx" ON "TourTranslation"("title");

-- CreateIndex
CREATE UNIQUE INDEX "TourTranslation_tourId_language_key" ON "TourTranslation"("tourId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "SyncMetadata_provider_key" ON "SyncMetadata"("provider");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_tourId_idx" ON "Booking"("tourId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ApiProvider_name_key" ON "ApiProvider"("name");

-- CreateIndex
CREATE INDEX "Review_tourExternalId_addedAt_idx" ON "Review"("tourExternalId", "addedAt");

-- CreateIndex
CREATE INDEX "Review_rate_idx" ON "Review"("rate");

