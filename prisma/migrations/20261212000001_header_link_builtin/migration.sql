-- Mark the five seeded public menus as built-in so their catalog label stays
-- read-only in the admin editor. Admin-created rows (even keyed ones) stay editable.

ALTER TABLE `HeaderLink` ADD COLUMN `builtIn` BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE `HeaderLink` SET `builtIn` = TRUE WHERE `id` LIKE 'seed\_%';
