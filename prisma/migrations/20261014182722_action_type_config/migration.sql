-- CreateTable
CREATE TABLE `ActionTypeConfig` (
    `type` ENUM('VISIT', 'YOUTUBE_SUBSCRIBE', 'YOUTUBE_VIDEO', 'YOUTUBE_LIKE', 'FOLLOW', 'DISCORD_JOIN', 'MUSIC', 'EMAIL') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
