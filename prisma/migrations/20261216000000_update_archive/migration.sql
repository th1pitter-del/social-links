-- Archive finished update-history entries without deleting the audit trail.
ALTER TABLE `SystemUpdate` ADD COLUMN `archivedAt` DATETIME(3) NULL;
