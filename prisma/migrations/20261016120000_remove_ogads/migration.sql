-- Remove OGAds analytics events and collapse the session lifecycle to the
-- action-only flow.
DELETE FROM `AnalyticsEvent` WHERE `type` IN ('OGADS_START', 'OGADS_COMPLETE');

-- Widen the enum so legacy rows can be rewritten before the old values are removed.
ALTER TABLE `UnlockSession` MODIFY `status` ENUM('ACTIONS_PENDING', 'OGADS_PENDING', 'PENDING', 'VERIFIED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

UPDATE `UnlockSession` SET `status` = 'PENDING' WHERE `status` IN ('ACTIONS_PENDING', 'OGADS_PENDING');

-- AlterTable
ALTER TABLE `UnlockSession` MODIFY `status` ENUM('PENDING', 'VERIFIED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `AnalyticsEvent` MODIFY `type` ENUM('VIEW', 'UNLOCK_START', 'ACTION_DONE', 'UNLOCK_COMPLETE') NOT NULL;

-- DropIndex
DROP INDEX `UnlockSession_ogadsClickId_key` ON `UnlockSession`;

-- DropIndex
DROP INDEX `UnlockSession_ogadsClickId_idx` ON `UnlockSession`;

-- AlterTable
ALTER TABLE `UnlockSession`
    DROP COLUMN `ogadsClickId`,
    DROP COLUMN `ogadsStatus`,
    DROP COLUMN `ogadsOfferId`,
    DROP COLUMN `ogadsPayout`,
    DROP COLUMN `ogadsVerifiedAt`,
    DROP COLUMN `ogadsStartedAt`;

-- DropTable
DROP TABLE `OgadsTask`;

-- DropTable
DROP TABLE `OgadsPostback`;
