-- Convert LinkAction.type from a fixed enum into a free string key so
-- administrators can add action types at runtime. Existing enum values are
-- preserved verbatim as the new keys.
ALTER TABLE `linkaction` MODIFY `type` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `ActionOption` (
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT 'link',
    `behavior` ENUM('URL', 'EMAIL') NOT NULL DEFAULT 'URL',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,
    `system` BOOLEAN NOT NULL DEFAULT false,
    `updatedBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActionOption_position_idx`(`position`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed the built-in action types.
INSERT INTO `ActionOption` (`key`, `label`, `platform`, `icon`, `behavior`, `enabled`, `position`, `system`, `updatedAt`) VALUES
    ('VISIT', 'Visit a link', NULL, 'link', 'URL', true, 0, true, NOW(3)),
    ('YOUTUBE_SUBSCRIBE', 'Subscribe on YouTube', 'YouTube', 'user_plus', 'URL', true, 1, true, NOW(3)),
    ('YOUTUBE_VIDEO', 'Watch a YouTube video', 'YouTube', 'video', 'URL', true, 2, true, NOW(3)),
    ('YOUTUBE_LIKE', 'Like a YouTube video', 'YouTube', 'thumbs_up', 'URL', true, 3, true, NOW(3)),
    ('FOLLOW', 'Follow an account', NULL, 'user_plus', 'URL', true, 4, true, NOW(3)),
    ('DISCORD_JOIN', 'Join a Discord server', 'Discord', 'message', 'URL', true, 5, true, NOW(3)),
    ('MUSIC', 'Listen to music', NULL, 'music', 'URL', true, 6, true, NOW(3)),
    ('EMAIL', 'Collect email address', NULL, 'mail', 'EMAIL', true, 7, true, NOW(3));

-- Preserve any admin edits to labels/availability made before this migration.
UPDATE `ActionOption` `o`
JOIN `ActionTypeConfig` `t` ON `t`.`type` = `o`.`key`
SET `o`.`label` = IF(`t`.`label` = '' OR `t`.`label` IS NULL, `o`.`label`, `t`.`label`),
    `o`.`enabled` = `t`.`enabled`;

-- AddForeignKey
ALTER TABLE `LinkAction` ADD CONSTRAINT `LinkAction_type_fkey` FOREIGN KEY (`type`) REFERENCES `ActionOption`(`key`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropTable
DROP TABLE `ActionTypeConfig`;
