# AL-TAHS On-Prem Operations SOP

## 1) Purpose
This SOP defines how to run AL-TAHS safely in an on-prem (local) environment, prevent data loss, and recover quickly from failures.

## 2) Scope
Applies to:
- Application host PC (Windows)
- Backend/API service
- PostgreSQL database
- Local backup and restore-test automation
- LAN/VPN user access

## 3) System Profile
- Deployment type: On-prem local system
- Database: PostgreSQL (localhost:5432)
- App access: LAN/VPN users only
- Backup root: `C:\altas-backups\pg`
- Daily backup task: `altas Daily Postgres Backup`
- Weekly restore-test task: `altas Weekly Restore Test`

## 4) Daily Start Checklist (Operator)
1. Confirm host PC is powered on and stable.
2. Confirm PostgreSQL service is running.
3. Confirm backend server is running and login page is reachable.
4. Verify users can log in from LAN/VPN.
5. Check disk free space on system drive and backup drive (minimum 20% free recommended).

## 5) Daily End-of-Day Data Protection
1. Ensure scheduled task `altas Daily Postgres Backup` is enabled.
2. Confirm a fresh backup exists under `C:\altas-backups\pg\daily\`.
3. Confirm success state file updated:
   - `C:\altas-backups\pg\state\latest_success.json`
4. If failure occurred, inspect:
   - `C:\altas-backups\pg\state\latest_failure.json`
   - Latest `.log` file in `C:\altas-backups\pg\daily\`

## 6) Weekly Backup Validity Proof (Mandatory)
1. Ensure scheduled task `altas Weekly Restore Test` is enabled.
2. Confirm latest restore-test success state:
   - `C:\altas-backups\pg\state\latest_restore_test_success.json`
3. Check restore-test logs:
   - `C:\altas-backups\pg\restore-test\*.log`
4. If restore-test fails, treat as high priority and fix before business week starts.

## 7) Incident Response
### A) App unavailable
1. Check backend process and restart if needed.
2. Check PostgreSQL service status.
3. Check firewall/network reachability (LAN/VPN).
4. Review backend logs and latest backup/restore-test states.

### B) Data corruption or major error
1. Stop writes (pause app use).
2. Create emergency backup first.
3. Restore from most recent valid backup.
4. Validate core modules: POS, HR, Reports, Promotions, Sales SDC.
5. Resume service only after validation.

## 8) Restore Procedure (Standard)
1. Identify latest valid backup in `C:\altas-backups\pg\daily\`.
2. Run restore to target DB using approved restore command/script.
3. Verify:
   - Users can log in
   - Recent transactions visible
   - Key tables present
4. Record restore date/time, operator, and backup file used.

## 9) Security and Access Rules
- Keep system on private LAN/VPN only (no public exposure).
- Use role-based user accounts only; never share credentials.
- Rotate admin credentials periodically.
- Restrict backup folder access to authorized operators.
- Do not disable backup/restore-test tasks.

## 10) Change Control
Before updates (schema, dependencies, major features):
1. Take manual pre-change backup.
2. Apply change in maintenance window.
3. Run smoke test.
4. Confirm backup and restore-test still pass.
5. Document change and rollback path.

## 11) Monthly Audit Checklist
1. Verify scheduled tasks still enabled and successful.
2. Confirm restore-test logs show clean pass.
3. Review storage growth and retention behavior.
4. Test user access from at least one branch/LAN client.
5. Update SOP contacts and escalation list if changed.

## 12) Ownership and Escalation
- System Owner: __________________________
- Technical Operator: _____________________
- Backup Reviewer: ________________________
- Escalation Contact: _____________________

If backup fails for more than 1 day or restore-test fails once, escalate immediately and do not delay corrective action.
