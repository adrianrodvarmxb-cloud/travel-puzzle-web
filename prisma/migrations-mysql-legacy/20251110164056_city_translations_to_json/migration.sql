-- AlterTable: Add translations JSON column to City
ALTER TABLE `City` ADD COLUMN `translations` JSON NULL;

-- Migrate data from CityTranslation to JSON format
-- This aggregates all translations for each city into a JSON object
UPDATE `City` c
SET `translations` = (
  SELECT JSON_OBJECTAGG(ct.`language`, ct.`name`)
  FROM `CityTranslation` ct
  WHERE ct.`cityId` = c.`id`
)
WHERE EXISTS (
  SELECT 1 FROM `CityTranslation` ct WHERE ct.`cityId` = c.`id`
);

-- DropForeignKey: Remove foreign key constraint from CityTranslation
ALTER TABLE `CityTranslation` DROP FOREIGN KEY `CityTranslation_cityId_fkey`;

-- DropTable: Remove CityTranslation table
DROP TABLE `CityTranslation`;

