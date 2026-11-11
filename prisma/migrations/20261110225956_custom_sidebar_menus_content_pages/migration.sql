-- CreateTable
CREATE TABLE `CustomPage` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `featuredImage` TEXT NULL,
    `translations` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomPage_slug_key`(`slug`),
    INDEX `CustomPage_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomMenuItem` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `pageId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `labels` JSON NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT 'link',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CustomMenuItem_parentId_sortOrder_idx`(`parentId`, `sortOrder`),
    INDEX `CustomMenuItem_pageId_idx`(`pageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomMenuItem` ADD CONSTRAINT `CustomMenuItem_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `CustomMenuItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomMenuItem` ADD CONSTRAINT `CustomMenuItem_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `CustomPage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
