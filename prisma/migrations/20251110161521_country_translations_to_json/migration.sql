-- AlterTable: Add translations JSON column to Country
ALTER TABLE `Country` ADD COLUMN `translations` JSON NULL;

-- Migrate data from CountryTranslation to JSON format
-- This aggregates all translations for each country into a JSON object
UPDATE `Country` c
SET `translations` = (
  SELECT JSON_OBJECTAGG(ct.`language`, ct.`name`)
  FROM `CountryTranslation` ct
  WHERE ct.`countryId` = c.`id`
)
WHERE EXISTS (
  SELECT 1 FROM `CountryTranslation` ct WHERE ct.`countryId` = c.`id`
);

-- DropForeignKey: Remove foreign key constraint from CountryTranslation
ALTER TABLE `CountryTranslation` DROP FOREIGN KEY `CountryTranslation_countryId_fkey`;

-- DropTable: Remove CountryTranslation table
DROP TABLE `CountryTranslation`;

