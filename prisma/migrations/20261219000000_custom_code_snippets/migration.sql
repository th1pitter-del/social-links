-- CreateTable
CREATE TABLE `CustomCode` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slot` VARCHAR(191) NOT NULL,
    `code` TEXT NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomCode_slot_position_idx`(`slot`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Copy the two settings values from the retired custom-code form into rows so
-- they appear in the new list and can be edited or deleted. Fixed primary keys
-- plus INSERT IGNORE keep a re-run of this migration harmless.
INSERT IGNORE INTO `CustomCode` (`id`, `name`, `slot`, `code`, `enabled`, `position`, `createdAt`, `updatedAt`)
SELECT 'legacy_header_code', 'Imported header code', 'header', `value`, TRUE, 0, NOW(3), NOW(3)
FROM `Setting`
WHERE `key` = 'ads.headScripts' AND TRIM(`value`) <> '';

INSERT IGNORE INTO `CustomCode` (`id`, `name`, `slot`, `code`, `enabled`, `position`, `createdAt`, `updatedAt`)
SELECT 'legacy_footer_code', 'Imported footer code', 'footer', `value`, TRUE, 0, NOW(3), NOW(3)
FROM `Setting`
WHERE `key` = 'ads.footerScripts' AND TRIM(`value`) <> '';
