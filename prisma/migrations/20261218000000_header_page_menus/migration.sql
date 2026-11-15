-- Replace the homepage-hash menus (How it works, Features) with real page
-- menus that carry submenus: About, How it works and Contact. The remaining
-- built-ins keep their order after them.

UPDATE `HeaderLink`
SET
  `url` = '/how-it-works',
  `icon` = 'listChecks',
  `position` = 0,
  `newTab` = FALSE,
  `enabled` = TRUE,
  `builtIn` = TRUE
WHERE `id` = 'seed_how_it_works';

DELETE FROM `HeaderLink` WHERE `id` = 'seed_features';

UPDATE `HeaderLink` SET `position` = 3 WHERE `id` = 'seed_faq';
UPDATE `HeaderLink` SET `position` = 4 WHERE `id` = 'seed_video_compressor';
UPDATE `HeaderLink` SET `position` = 5 WHERE `id` = 'seed_video_downloader';
UPDATE `HeaderLink` SET `position` = 6 WHERE `id` = 'seed_blog';

INSERT INTO `HeaderLink`
  (`id`, `label`, `labelKey`, `url`, `icon`, `color`, `newTab`, `enabled`, `position`, `parentId`, `labels`, `builtIn`, `createdAt`, `updatedAt`)
VALUES
  ('seed_about', 'About', 'about', '/about', 'users', NULL, FALSE, TRUE, 1, NULL, NULL, TRUE, NOW(3), NOW(3)),
  ('seed_contact_menu', 'Contact', 'contact', '/contact', 'info', NULL, FALSE, TRUE, 2, NULL, NULL, TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `labelKey` = VALUES(`labelKey`),
  `url` = VALUES(`url`),
  `icon` = VALUES(`icon`),
  `newTab` = VALUES(`newTab`),
  `enabled` = VALUES(`enabled`),
  `position` = VALUES(`position`),
  `parentId` = VALUES(`parentId`),
  `builtIn` = TRUE;

INSERT INTO `HeaderLink`
  (`id`, `label`, `labelKey`, `url`, `icon`, `color`, `newTab`, `enabled`, `position`, `parentId`, `labels`, `builtIn`, `createdAt`, `updatedAt`)
VALUES
  ('seed_about_story', 'Our story', 'aboutStory', '/about/story', 'sparkles', NULL, FALSE, TRUE, 0, 'seed_about', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_about_what', 'What we do', 'aboutWhat', '/about/what-we-do', 'rocket', NULL, FALSE, TRUE, 1, 'seed_about', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_about_values', 'Our values', 'aboutValues', '/about/values', 'heart', NULL, FALSE, TRUE, 2, 'seed_about', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_hiw_create', 'Create your link', 'hiwCreate', '/how-it-works/create', 'link', NULL, FALSE, TRUE, 0, 'seed_how_it_works', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_hiw_share', 'Share it anywhere', 'hiwShare', '/how-it-works/share', 'globe', NULL, FALSE, TRUE, 1, 'seed_how_it_works', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_hiw_unlock', 'Unlock a reward', 'hiwUnlock', '/how-it-works/unlock', 'gift', NULL, FALSE, TRUE, 2, 'seed_how_it_works', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_contact_support', 'Contact support', 'contactSupport', '/contact', 'mail', NULL, FALSE, TRUE, 0, 'seed_contact_menu', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_contact_report', 'Report a link', 'contactReport', '/report', 'shieldCheck', NULL, FALSE, TRUE, 1, 'seed_contact_menu', NULL, TRUE, NOW(3), NOW(3)),
  ('seed_contact_faq', 'Read the FAQ', 'contactFaq', '/faq', 'circleHelp', NULL, FALSE, TRUE, 2, 'seed_contact_menu', NULL, TRUE, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `labelKey` = VALUES(`labelKey`),
  `url` = VALUES(`url`),
  `icon` = VALUES(`icon`),
  `newTab` = VALUES(`newTab`),
  `enabled` = VALUES(`enabled`),
  `position` = VALUES(`position`),
  `parentId` = VALUES(`parentId`),
  `builtIn` = TRUE;
