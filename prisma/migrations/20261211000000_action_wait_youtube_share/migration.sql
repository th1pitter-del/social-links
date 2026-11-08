-- Click-and-wait steps: a link action may require the visitor to wait a fixed
-- number of seconds after opening it before it can be marked done. Null keeps
-- using the catalog default for that action type.
ALTER TABLE `LinkAction` ADD COLUMN `waitSeconds` INTEGER NULL;

-- The first time a visitor opens a waiting step. One row per session and
-- action, so pressing again (or reloading) cannot restart the timer.
CREATE TABLE `UnlockActionStart` (
    `id` VARCHAR(191) NOT NULL,
    `unlockSessionId` VARCHAR(191) NOT NULL,
    `linkActionId` VARCHAR(191) NOT NULL,
    `readyAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UnlockActionStart_unlockSessionId_linkActionId_key`(`unlockSessionId`, `linkActionId`),
    INDEX `UnlockActionStart_linkActionId_idx`(`linkActionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UnlockActionStart` ADD CONSTRAINT `UnlockActionStart_unlockSessionId_fkey` FOREIGN KEY (`unlockSessionId`) REFERENCES `UnlockSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnlockActionStart` ADD CONSTRAINT `UnlockActionStart_linkActionId_fkey` FOREIGN KEY (`linkActionId`) REFERENCES `LinkAction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- The built-in YouTube offer is exactly these five steps. Share joins the
-- existing rows without overwriting any administrator edit.
INSERT IGNORE INTO `ActionOption` (`key`, `label`, `platformId`, `icon`, `behavior`, `enabled`, `position`, `system`, `updatedAt`)
SELECT 'YOUTUBE_SHARE', 'Share a YouTube video', `id`, 'share', 'URL', true, 3, true, CURRENT_TIMESTAMP(3)
FROM `Platform`
WHERE `key` = 'youtube';

-- Keep the built-in ordering aligned with src/lib/action-defaults.ts.
UPDATE `ActionOption` SET `position` = 0 WHERE `key` = 'YOUTUBE_SUBSCRIBE';
UPDATE `ActionOption` SET `position` = 1 WHERE `key` = 'YOUTUBE_LIKE';
UPDATE `ActionOption` SET `position` = 2 WHERE `key` = 'YOUTUBE_COMMENT';
UPDATE `ActionOption` SET `position` = 3 WHERE `key` = 'YOUTUBE_SHARE';
UPDATE `ActionOption` SET `position` = 4 WHERE `key` = 'YOUTUBE_VIDEO';
UPDATE `ActionOption` SET `position` = 5 WHERE `key` = 'INSTAGRAM_LIKE';
UPDATE `ActionOption` SET `position` = 6 WHERE `key` = 'INSTAGRAM_FOLLOW';
UPDATE `ActionOption` SET `position` = 7 WHERE `key` = 'INSTAGRAM_COMMENT';
UPDATE `ActionOption` SET `position` = 8 WHERE `key` = 'INSTAGRAM_REEL';
UPDATE `ActionOption` SET `position` = 9 WHERE `key` = 'FACEBOOK_FOLLOW';
UPDATE `ActionOption` SET `position` = 10 WHERE `key` = 'FACEBOOK_LIKE';
UPDATE `ActionOption` SET `position` = 11 WHERE `key` = 'TIKTOK_FOLLOW';
UPDATE `ActionOption` SET `position` = 12 WHERE `key` = 'TIKTOK_LIKE';
UPDATE `ActionOption` SET `position` = 13 WHERE `key` = 'TIKTOK_COMMENT';
UPDATE `ActionOption` SET `position` = 14 WHERE `key` = 'DISCORD_JOIN';
UPDATE `ActionOption` SET `position` = 15 WHERE `key` = 'DISCORD_BOOST';
UPDATE `ActionOption` SET `position` = 16 WHERE `key` = 'SPOTIFY_TRACK';
UPDATE `ActionOption` SET `position` = 17 WHERE `key` = 'VISIT';
