-- Blog: categories, tags, articles, and the Blog entry in the public header menu.

CREATE TABLE `BlogCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `translations` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogCategory_slug_key`(`slug`),
    INDEX `BlogCategory_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BlogTag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `translations` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogTag_slug_key`(`slug`),
    INDEX `BlogTag_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `BlogPost` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `coverImage` TEXT NULL,
    `coverAlt` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `translations` JSON NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` TEXT NULL,
    `canonicalUrl` TEXT NULL,
    `ogImage` TEXT NULL,
    `authorId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogPost_slug_key`(`slug`),
    INDEX `BlogPost_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `BlogPost_categoryId_idx`(`categoryId`),
    INDEX `BlogPost_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_BlogPostToBlogTag` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_BlogPostToBlogTag_AB_unique`(`A`, `B`),
    INDEX `_BlogPostToBlogTag_B_index`(`B`),
    PRIMARY KEY (`A`, `B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BlogPost` ADD CONSTRAINT `BlogPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `BlogPost` ADD CONSTRAINT `BlogPost_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BlogCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `_BlogPostToBlogTag` ADD CONSTRAINT `_BlogPostToBlogTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `_BlogPostToBlogTag` ADD CONSTRAINT `_BlogPostToBlogTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `BlogTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Blog sits with the other built-in public menus, after FAQ. The external
-- utilities keep their order by shifting one slot.
UPDATE `HeaderLink` SET `position` = `position` + 1 WHERE `builtIn` = TRUE AND `position` >= 3;

INSERT INTO `HeaderLink` (`id`, `label`, `labelKey`, `url`, `icon`, `color`, `newTab`, `enabled`, `position`, `parentId`, `labels`, `builtIn`, `createdAt`, `updatedAt`)
VALUES ('seed_blog', 'Blog', 'blog', '/blog', 'newspaper', NULL, FALSE, TRUE, 3, NULL, NULL, TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `labelKey` = 'blog',
  `url` = '/blog',
  `icon` = 'newspaper',
  `builtIn` = TRUE;
