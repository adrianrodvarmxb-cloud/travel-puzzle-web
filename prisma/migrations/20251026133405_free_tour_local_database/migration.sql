/*
  Warnings:

  - You are about to drop the column `description` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Tour` table. All the data in the column will be lost.
  - You are about to alter the column `externalId` on the `Tour` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Int`.
  - You are about to alter the column `images` on the `Tour` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Json`.
  - A unique constraint covering the columns `[externalId]` on the table `Tour` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categoryId` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cityId` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `countryId` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `includes` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `meetingPoint` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCurrency` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceValue` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerPhone` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerTitle` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `titleImageURL` to the `Tour` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Tour` DROP COLUMN `description`,
    DROP COLUMN `destination`,
    DROP COLUMN `price`,
    DROP COLUMN `provider`,
    DROP COLUMN `title`,
    ADD COLUMN `POIs` JSON NULL,
    ADD COLUMN `categoryId` INTEGER NOT NULL,
    ADD COLUMN `cityId` INTEGER NOT NULL,
    ADD COLUMN `countryId` INTEGER NOT NULL,
    ADD COLUMN `duration` VARCHAR(20) NOT NULL,
    ADD COLUMN `includes` JSON NOT NULL,
    ADD COLUMN `meetingPoint` JSON NOT NULL,
    ADD COLUMN `priceCurrency` VARCHAR(3) NOT NULL,
    ADD COLUMN `priceValue` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `providerPhone` VARCHAR(50) NOT NULL,
    ADD COLUMN `providerTitle` VARCHAR(255) NOT NULL,
    ADD COLUMN `rating` DECIMAL(3, 2) NULL,
    ADD COLUMN `reviewsNumber` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `titleImageURL` TEXT NOT NULL,
    ADD COLUMN `videoURL` TEXT NULL,
    MODIFY `externalId` INTEGER NOT NULL,
    MODIFY `images` JSON NOT NULL;

-- CreateTable
CREATE TABLE `Country` (
    `id` INTEGER NOT NULL,
    `code` VARCHAR(2) NOT NULL,

    UNIQUE INDEX `Country_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CountryTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `countryId` INTEGER NOT NULL,
    `language` VARCHAR(2) NOT NULL,
    `name` VARCHAR(255) NOT NULL,

    INDEX `CountryTranslation_language_idx`(`language`),
    UNIQUE INDEX `CountryTranslation_countryId_language_key`(`countryId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `id` INTEGER NOT NULL,
    `countryId` INTEGER NOT NULL,

    INDEX `City_countryId_idx`(`countryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CityTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `cityId` INTEGER NOT NULL,
    `language` VARCHAR(2) NOT NULL,
    `name` VARCHAR(255) NOT NULL,

    INDEX `CityTranslation_language_idx`(`language`),
    UNIQUE INDEX `CityTranslation_cityId_language_key`(`cityId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TourTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `tourId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(2) NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `brief` TEXT NOT NULL,
    `description` TEXT NOT NULL,
    `url` TEXT NOT NULL,

    INDEX `TourTranslation_language_idx`(`language`),
    INDEX `TourTranslation_title_idx`(`title`),
    UNIQUE INDEX `TourTranslation_tourId_language_key`(`tourId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SyncMetadata` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(100) NOT NULL,
    `lastSyncAt` DATETIME(3) NOT NULL,
    `toursCount` INTEGER NOT NULL,
    `status` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `SyncMetadata_provider_key`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Tour_externalId_key` ON `Tour`(`externalId`);

-- CreateIndex
CREATE INDEX `Tour_cityId_idx` ON `Tour`(`cityId`);

-- CreateIndex
CREATE INDEX `Tour_countryId_idx` ON `Tour`(`countryId`);

-- CreateIndex
CREATE INDEX `Tour_categoryId_idx` ON `Tour`(`categoryId`);

-- CreateIndex
CREATE INDEX `Tour_isActive_idx` ON `Tour`(`isActive`);

-- CreateIndex
CREATE INDEX `Tour_priceValue_idx` ON `Tour`(`priceValue`);

-- AddForeignKey
ALTER TABLE `CountryTranslation` ADD CONSTRAINT `CountryTranslation_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CityTranslation` ADD CONSTRAINT `CityTranslation_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tour` ADD CONSTRAINT `Tour_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tour` ADD CONSTRAINT `Tour_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourTranslation` ADD CONSTRAINT `TourTranslation_tourId_fkey` FOREIGN KEY (`tourId`) REFERENCES `Tour`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
