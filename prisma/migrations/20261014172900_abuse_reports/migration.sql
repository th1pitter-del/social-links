-- CreateTable
CREATE TABLE `AbuseReport` (
    `id` VARCHAR(191) NOT NULL,
    `linkId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `reason` ENUM('SPAM', 'MALWARE', 'ILLEGAL', 'COPYRIGHT', 'IMPERSONATION', 'OTHER') NOT NULL,
    `details` TEXT NOT NULL,
    `reporterEmail` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `resolutionNote` TEXT NULL,
    `reporterIpHash` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AbuseReport_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `AbuseReport_linkId_idx`(`linkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AbuseReport` ADD CONSTRAINT `AbuseReport_linkId_fkey` FOREIGN KEY (`linkId`) REFERENCES `Link`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
