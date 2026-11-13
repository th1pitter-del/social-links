-- Backup and update bookkeeping. The archives themselves live in BACKUP_DIR,
-- outside the web root; these tables only record what was produced, who asked
-- for it, and how a long-running operation ended.

CREATE TABLE `SystemBackup` (
  `id` VARCHAR(191) NOT NULL,
  `kind` ENUM('DATABASE', 'FILES', 'FULL') NOT NULL,
  `status` ENUM('PENDING', 'RUNNING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `filename` VARCHAR(191) NULL,
  `sizeBytes` BIGINT NULL,
  `checksum` VARCHAR(191) NULL,
  `appCommit` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdByName` VARCHAR(191) NULL,
  `createdByEmail` VARCHAR(191) NULL,
  `error` TEXT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  `restoredAt` DATETIME(3) NULL,

  INDEX `SystemBackup_status_startedAt_idx`(`status`, `startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemUpdate` (
  `id` VARCHAR(191) NOT NULL,
  `isRollback` BOOLEAN NOT NULL DEFAULT false,
  `fromCommit` VARCHAR(191) NOT NULL,
  `toCommit` VARCHAR(191) NOT NULL,
  `status` ENUM('INSTALLING', 'INSTALLED', 'FAILED', 'ROLLED_BACK') NOT NULL DEFAULT 'INSTALLING',
  `changelog` TEXT NULL,
  `backupId` VARCHAR(191) NULL,
  `actorEmail` VARCHAR(191) NULL,
  `error` TEXT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  `restoredAt` DATETIME(3) NULL,

  INDEX `SystemUpdate_status_startedAt_idx`(`status`, `startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SystemOperation` (
  `id` VARCHAR(191) NOT NULL,
  `type` ENUM('BACKUP', 'RESTORE', 'UPDATE', 'ROLLBACK') NOT NULL,
  `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `backupId` VARCHAR(191) NULL,
  `safetyBackupId` VARCHAR(191) NULL,
  `updateId` VARCHAR(191) NULL,
  `phase` VARCHAR(191) NULL,
  `message` TEXT NULL,
  `actorEmail` VARCHAR(191) NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,

  INDEX `SystemOperation_status_startedAt_idx`(`status`, `startedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
