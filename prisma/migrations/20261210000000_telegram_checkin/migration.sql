-- A visitor's bot check-in: the /start payload they were sent with, the account
-- that actually opened the bot, and the membership status Telegram reported.
CREATE TABLE `TelegramCheckin` (
    `id` VARCHAR(191) NOT NULL,
    `unlockSessionId` VARCHAR(191) NOT NULL,
    `linkActionId` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `memberStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `TelegramCheckin_unlockSessionId_idx`(`unlockSessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TelegramCheckin` ADD CONSTRAINT `TelegramCheckin_unlockSessionId_fkey` FOREIGN KEY (`unlockSessionId`) REFERENCES `UnlockSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TelegramCheckin` ADD CONSTRAINT `TelegramCheckin_linkActionId_fkey` FOREIGN KEY (`linkActionId`) REFERENCES `LinkAction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
