-- Record whether an action completion was confirmed by a platform public record
-- (or API) rather than self-declared by the visitor, plus what the check saw.
ALTER TABLE `UnlockActionCompletion`
  ADD COLUMN `verified` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `proof` TEXT NULL;
