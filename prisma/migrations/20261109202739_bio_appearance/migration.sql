-- AlterTable
ALTER TABLE `profile` ADD COLUMN `accent` VARCHAR(191) NULL,
    ADD COLUMN `theme` VARCHAR(191) NOT NULL DEFAULT 'pulse';
