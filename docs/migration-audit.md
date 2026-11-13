# Prisma Migration Audit — Linux MySQL (`lower_case_table_names=0`) Compatibility

**Scope:** all 26 migrations in `prisma/migrations/`. **No migration was removed, renamed, reordered, or functionally changed** — only table-name capitalization in SQL statements was corrected. Schema and application code untouched.

## Root cause

The schema and `CREATE TABLE` statements use Prisma's default PascalCase mapping (`Link`, `LinkAction`, `ActionOption`…). Several hand-edited migrations later referenced those tables in **lowercase** (`link`, `linkaction`…). This works on Windows/dev MySQL (`lower_case_table_names=1`, case-insensitive) but fails on Linux production (`lower_case_table_names=0`, case-sensitive) with `Table 'sociallinks.link' doesn't exist`.

## Issues found and corrected (15 statements across 9 migrations)

| # | Migration | Statement | Was | Fixed to |
|---|---|---|---|---|
| 1 | `20261014220000_action_options` | L4 | `ALTER TABLE \`linkaction\` MODIFY …` | `LinkAction` |
| 2 | `20261015000000_platform_relations` | L28 | `ALTER TABLE \`actionoption\` ADD COLUMN \`platformId\`` | `ActionOption` |
| 3 | `20261015000000_platform_relations` | L42 | `ALTER TABLE \`actionoption\` DROP COLUMN \`platform\`` | `ActionOption` |
| 4 | `20261015120000_guest_links` | L5 | `ALTER TABLE \`link\` MODIFY \`ownerId\`` | `Link` |
| 5 | `20261015120000_guest_links` | L8 | `ALTER TABLE \`link\` ADD COLUMN \`guestToken\`` | `Link` |
| 6 | `20261015120000_guest_links` | L11 | `CREATE INDEX … ON \`link\`(\`guestToken\`)` | `Link` |
| 7 | `20261016004707_feature_pack…` | L2 | `ALTER TABLE \`link\` MODIFY \`contentType\`` | `Link` |
| 8 | `20261016004800_stored_files` | L8 | `ALTER TABLE \`linkfile\` DROP FOREIGN KEY \`LinkFile_linkId_fkey\`` | `LinkFile` |
| 9 | `20261016004800_stored_files` | L11 | `ALTER TABLE \`linkfile\` DROP FOREIGN KEY \`LinkFile_ownerId_fkey\`` | `LinkFile` |
| 10 | `20261016004800_stored_files` | L14 | `ALTER TABLE \`link\` ADD COLUMN \`fileId\`` | `Link` |
| 11 | `20261016004800_stored_files` | L17 | `DROP TABLE \`linkfile\`` | `LinkFile` |
| 12 | `20261027215817_admin_plugin_impersonated_by` | L2 | `ALTER TABLE \`session\` ADD COLUMN \`impersonatedBy\`` | `Session` |
| 13 | `20261109202739_bio_appearance` | L2 | `ALTER TABLE \`profile\` ADD COLUMN …` | `Profile` |
| 14 | `20261109204404_bio_link_platform` | L2 | `ALTER TABLE \`biolink\` ADD COLUMN \`platform\`` | `BioLink` |
| 15 | `20261213000000_link_theme` | L1 | `ALTER TABLE \`link\` ADD COLUMN \`theme\`` | `Link` |

All other references (`REFERENCES`, `JOIN`, `INSERT INTO`, `UPDATE`, `CREATE INDEX … ON`, `DROP INDEX … ON`, `DELETE FROM`) across the remaining 17 migrations were verified against the `CREATE TABLE` names — no further mismatches, no duplicate objects, no ordering problems.

## Production failure map

- `20261014220000` failing on `linkaction` → fix #1
- `20261015000000` failing on `actionoption` → fixes #2–3
- `20261015120000` failing on `link` → fixes #4–6
- `20261016004707` failing on `Table 'sociallinks.link' doesn't exist` → fix #7 (its `LinkFile` FKs referenced `Link` correctly, but statement #4–6/#7 order means it hit the case error first)
- Subsequent migrations (`20261016004800`, `20261027215817`, `20261109202739`, `20261109204404`, `20261213000000`) would have failed the same way further down the chain.

**Known production state (VPS):**

| Migration | Production status |
|---|---|
| `20261014220000_action_options` | Applied |
| `20261015000000_platform_relations` | Applied |
| `20261015120000_guest_links` | Applied |
| `20261016004707_feature_pack_files_bio_unlocks` | **Failed** |
| Remaining 20 migrations | Not yet applied |

**Partial-migration remediation (existing production database — data-preserving):** MySQL DDL is non-transactional, so a failed migration can leave partially created/altered objects while the migration was *not* recorded in `_prisma_migrations`. Do **not** reset or recreate the production database. Instead:

1. Run `npx prisma migrate status` to identify the first unapplied migration (per the table above: `20261016004707_feature_pack…`).
2. Inspect what the failed migration partially created. For `20261016004707` specifically: its first statement is `ALTER TABLE \`Link\` MODIFY \`contentType\` …`, which is exactly the statement that failed with `Table 'sociallinks.link' doesn't exist` — a failed first statement means this migration likely created **nothing**, so there are probably no partial objects. Verify quickly:
   ```sql
   SHOW TABLES LIKE 'LinkFile';      -- expect: empty
   SHOW TABLES LIKE 'UserUnlock';    -- expect: empty
   SHOW TABLES LIKE 'Profile';       -- expect: empty
   SHOW TABLES LIKE 'BioLink';       -- expect: empty
   SELECT contentType FROM Link LIMIT 1;  -- runs; column still ENUM('URL','TEXT')
   ```
   If any of those tables exist (i.e. the migration failed partway after creating some), drop only those — they are re-created by the fixed migration.
3. Deploy the corrected migration files (commit + push, pull on server) and re-run `npx prisma migrate deploy`. The fixed `20261016004707` and the remaining 20 migrations should apply in order.
4. If a migration appears fully applied but is marked failed in the ledger, use `npx prisma migrate resolve --applied <migration_name>` only after manually verifying the objects match the migration SQL.

Take a backup (`mysqldump`) before step 3.

## Verification

1. **Static exact-case audit:** every table reference (`ALTER TABLE`, `REFERENCES`, `JOIN`, `INSERT INTO`, `UPDATE`, `CREATE/DROP INDEX … ON`, `DELETE FROM`, `DROP TABLE`) in all 26 files now exactly matches its `CREATE TABLE` spelling — 0 lowercase references remain. This is the check that directly targets the `lower_case_table_names=0` failure mode: a reference spelled identically to its `CREATE TABLE` cannot fail case-sensitivity matching on any platform.
2. **Clean-room replay (Windows, lcfn=1):** fresh database, `prisma migrate deploy` from scratch — **all 26 migrations applied in order** (exit 0, 30 tables, complete ledger). This validates SQL syntax, statement ordering, FK dependencies, and absence of duplicate objects — **not** case sensitivity.
3. **Remaining gap — lcfn=0 end-to-end run:** not yet executed (no Docker on the dev machine; production server off-limits). Required before the production cutover: run the same replay on a throwaway database on the Ubuntu/Percona server (`lower_case_table_names=0`), e.g. `CREATE DATABASE sociallinks_migtest; … npx prisma migrate deploy` against it, then drop it. Expected to pass given (1), but it must be demonstrated, not assumed.

## Production deploy steps (fresh install)

1. Create empty database + user (`caching_sha2_password` — Prisma 7 does not support `mysql_native_password`).
2. Set `DATABASE_URL` in `.env`.
3. `npm ci && npx prisma generate`
4. `npx prisma migrate deploy` → all 26 apply.
5. `npm run build && npm start`.
