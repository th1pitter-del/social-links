-- Offers rendered as an unlock step. The session keeps the offers it showed so
-- the visitor sees the same list on every reload; each click-through becomes a
-- row that the OGAds postback credits.
ALTER TABLE `UnlockSession` ADD COLUMN `ogadsOffers` JSON NULL;

CREATE TABLE `OgadsOfferClick` (
  `id` VARCHAR(191) NOT NULL,
  `unlockSessionId` VARCHAR(191) NOT NULL,
  `offerId` VARCHAR(191) NOT NULL,
  `offerName` VARCHAR(191) NULL,
  `status` ENUM('PENDING', 'CREDITED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
  `payout` DECIMAL(10, 4) NULL,
  `clickCount` INTEGER NOT NULL DEFAULT 0,
  `firstClickedAt` DATETIME(3) NULL,
  `creditedAt` DATETIME(3) NULL,
  `rawPostback` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `OgadsOfferClick_unlockSessionId_offerId_key`(`unlockSessionId`, `offerId`),
  INDEX `OgadsOfferClick_status_creditedAt_idx`(`status`, `creditedAt`),
  INDEX `OgadsOfferClick_creditedAt_idx`(`creditedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OgadsOfferClick`
  ADD CONSTRAINT `OgadsOfferClick_unlockSessionId_fkey`
  FOREIGN KEY (`unlockSessionId`) REFERENCES `UnlockSession`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
