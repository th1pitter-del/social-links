-- Promote the free-text `platform` label on ActionOption into a first-class
-- Platform model and link the two with a foreign key.

-- CreateTable
CREATE TABLE `Platform` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT 'globe',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `system` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Platform_key_key`(`key`),
    INDEX `Platform_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the built-in platforms (mirrors prisma/seed.ts).
INSERT INTO `Platform` (`id`, `key`, `label`, `icon`, `enabled`, `position`, `system`, `createdAt`, `updatedAt`) VALUES
    ('plt_youtube', 'youtube', 'YouTube', 'video', true, 0, true, NOW(3), NOW(3)),
    ('plt_discord', 'discord', 'Discord', 'message', true, 1, true, NOW(3), NOW(3)),
    ('plt_none', 'none', 'No platform', 'globe', true, 2, true, NOW(3), NOW(3));

-- AlterTable
ALTER TABLE `actionoption` ADD COLUMN `platformId` VARCHAR(191) NULL;

-- Point existing rows at the platform they referenced by label.
UPDATE `ActionOption` `o`
JOIN `Platform` `p` ON `p`.`label` = `o`.`platform`
SET `o`.`platformId` = `p`.`id`;

-- Anything left unmapped falls back to the "none" platform.
UPDATE `ActionOption` `o`
JOIN `Platform` `p` ON `p`.`key` = 'none'
SET `o`.`platformId` = `p`.`id`
WHERE `o`.`platformId` IS NULL;

-- AlterTable
ALTER TABLE `actionoption` DROP COLUMN `platform`;

-- CreateIndex
CREATE INDEX `ActionOption_platformId_idx` ON `ActionOption`(`platformId`);

-- AddForeignKey
ALTER TABLE `ActionOption` ADD CONSTRAINT `ActionOption_platformId_fkey` FOREIGN KEY (`platformId`) REFERENCES `Platform`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
