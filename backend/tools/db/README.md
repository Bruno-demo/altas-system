# Database Backup Hardening

This folder contains the hardened PostgreSQL protection scripts:

- `backup_altas_daily.ps1`
- `restore_test_weekly.ps1`

## What it does

1. Creates a PostgreSQL custom-format backup (`.backup`) with `pg_dump`.
2. Verifies backup integrity using `pg_restore --list`.
3. Generates SHA-256 checksum (`.sha256`).
4. Creates zipped copy (`.zip`).
5. Copies artifacts to mirror directory.
6. Applies retention cleanup:
   - daily files: 30 days
   - mirror files: 90 days
   - archived WAL files: 14 days
7. Writes success/failure status JSON files under `C:\altas-backups\pg\state`.

## Weekly restore-test (`restore_test_weekly.ps1`)

1. Finds the latest non-empty daily backup.
2. Fails fast if the latest backup is stale (`MaxBackupAgeHours`, default `36`).
3. Verifies backup readability with `pg_restore --list`.
4. Restores into a temporary database (`altas_restore_test` by default).
5. Runs sanity checks (core tables + row counts).
6. Drops the temporary restore-test database.
7. Writes status JSON files:
   - `latest_restore_test_success.json`
   - `latest_restore_test_failure.json`

## Required secret

Create password file with DB password:

`C:\altas-backups\pg\secrets\pg_backup_password.txt`

Scheduled tasks should run with a user that can read this file.
