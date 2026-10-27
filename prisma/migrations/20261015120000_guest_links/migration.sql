-- Allow links to be created without an account (guest flow) and record the
-- signed-cookie token that owns them until the visitor signs in.

-- AlterTable
ALTER TABLE `link` MODIFY `ownerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `link` ADD COLUMN `guestToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Link_guestToken_idx` ON `link`(`guestToken`);
