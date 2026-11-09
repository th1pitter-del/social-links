-- Header menu sub-links: a link can point at a top-level menu item as its parent.
-- Children are removed with their parent, so the menu never keeps orphans.

ALTER TABLE `HeaderLink` ADD COLUMN `parentId` VARCHAR(191) NULL;

CREATE INDEX `HeaderLink_parentId_position_idx` ON `HeaderLink`(`parentId`, `position`);

ALTER TABLE `HeaderLink` ADD CONSTRAINT `HeaderLink_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `HeaderLink`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
