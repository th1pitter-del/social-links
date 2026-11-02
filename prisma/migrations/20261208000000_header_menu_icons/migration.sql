-- Header menu links: icon, color and built-in labelKey columns,
-- plus seeding the five previously hardcoded public header menus.

ALTER TABLE `HeaderLink` ADD COLUMN `icon` VARCHAR(191) NOT NULL DEFAULT 'link';
ALTER TABLE `HeaderLink` ADD COLUMN `color` VARCHAR(191) NULL;
ALTER TABLE `HeaderLink` ADD COLUMN `labelKey` VARCHAR(191) NULL;

-- Existing admin-created links move behind the seeded built-in menus.
UPDATE `HeaderLink` SET `position` = `position` + 100 WHERE `labelKey` IS NULL;

INSERT INTO `HeaderLink` (`id`, `label`, `labelKey`, `url`, `icon`, `color`, `newTab`, `enabled`, `position`, `createdAt`, `updatedAt`)
VALUES
  ('seed_how_it_works', 'How it works', 'howItWorks', '/#how-it-works', 'listChecks', NULL, FALSE, TRUE, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('seed_features', 'Features', 'features', '/#features', 'sparkles', NULL, FALSE, TRUE, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('seed_faq', 'FAQ', 'faqShort', '/faq', 'circleHelp', NULL, FALSE, TRUE, 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('seed_video_compressor', 'Compress Video', 'videoCompressor', 'https://www.videocompressor4you.com/', 'minimize', '#5182EF', TRUE, TRUE, 3, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('seed_video_downloader', 'Download Video', 'videoDownloader', 'https://www.downloadsocialmediavideo.com/', 'download', '#4CBA95', TRUE, TRUE, 4, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
