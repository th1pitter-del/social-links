/*
  Warnings:

  - You are about to drop the `linkfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `linkfile` DROP FOREIGN KEY `LinkFile_linkId_fkey`;

-- DropForeignKey
ALTER TABLE `linkfile` DROP FOREIGN KEY `LinkFile_ownerId_fkey`;

-- AlterTable
ALTER TABLE `link` ADD COLUMN `fileId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `linkfile`;

-- CreateTable
CREATE TABLE `StoredFile` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StoredFile_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Link_fileId_idx` ON `Link`(`fileId`);

-- AddForeignKey
ALTER TABLE `Link` ADD CONSTRAINT `Link_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `StoredFile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoredFile` ADD CONSTRAINT `StoredFile_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
