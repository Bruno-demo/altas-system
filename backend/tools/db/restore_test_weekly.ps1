param(
  [string]$PgRestorePath = "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe",
  [string]$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
  [string]$HostName = "localhost",
  [int]$Port = 5432,
  [string]$Username = "postgres",
  [string]$SourceDatabase = "altas_local",
  [string]$RestoreTestDatabase = "altas_restore_test",
  [string]$BackupRoot = "C:\altas-backups\pg",
  [string]$PasswordFile = "C:\altas-backups\pg\secrets\pg_backup_password.txt",
  [int]$MaxBackupAgeHours = 36,
  [int]$LogRetentionDays = 90,
  [switch]$KeepTestDbOnFailure
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param(
    [string]$Message
  )
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $script:LogFile -Value "[$stamp] $Message"
}

function Invoke-NativeWithLog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $outFile = [System.IO.Path]::GetTempFileName()
  $errFile = [System.IO.Path]::GetTempFileName()
  try {
    $proc = Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -PassThru `
      -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile

    if (Test-Path $outFile) {
      Get-Content -Path $outFile | ForEach-Object { Write-Log "$_" }
    }
    if (Test-Path $errFile) {
      Get-Content -Path $errFile | ForEach-Object { Write-Log "$_" }
    }
    return [int]$proc.ExitCode
  }
  finally {
    Remove-Item -Path $outFile, $errFile -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-PsqlSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Database,
    [Parameter(Mandatory = $true)]
    [string]$SqlText
  )

  $tmpSql = Join-Path $env:TEMP ("altas_restore_test_{0}.sql" -f ([guid]::NewGuid().ToString("N")))
  try {
    Set-Content -Path $tmpSql -Value $SqlText -Encoding ASCII
    $exitCode = Invoke-NativeWithLog -FilePath $PsqlPath -Arguments @(
      "-h", $HostName,
      "-p", "$Port",
      "-U", $Username,
      "-d", $Database,
      "-v", "ON_ERROR_STOP=1",
      "-f", $tmpSql
    )
    if ($exitCode -ne 0) {
      throw "psql failed for database '$Database' with exit code $exitCode"
    }
  }
  finally {
    Remove-Item -Path $tmpSql -Force -ErrorAction SilentlyContinue
  }
}

$dailyDir = Join-Path $BackupRoot "daily"
$restoreTestDir = Join-Path $BackupRoot "restore-test"
$stateDir = Join-Path $BackupRoot "state"

foreach ($dir in @($dailyDir, $restoreTestDir, $stateDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$logFile = Join-Path $restoreTestDir ("restore_test_{0}.log" -f $timestamp)
$successFile = Join-Path $stateDir "latest_restore_test_success.json"
$failureFile = Join-Path $stateDir "latest_restore_test_failure.json"

$script:LogFile = $logFile
New-Item -ItemType File -Path $logFile -Force | Out-Null

$latestBackup = $null

try {
  Write-Log "=== ALTAS WEEKLY RESTORE TEST START ==="

  if (-not (Test-Path $PgRestorePath)) {
    throw "pg_restore not found at '$PgRestorePath'"
  }
  if (-not (Test-Path $PsqlPath)) {
    throw "psql not found at '$PsqlPath'"
  }

  $password = $null
  if (Test-Path $PasswordFile) {
    $password = (Get-Content -Path $PasswordFile -Raw).Trim()
  }
  if (-not $password -and $env:BACKUP_PGPASSWORD) {
    $password = $env:BACKUP_PGPASSWORD.Trim()
  }
  if (-not $password) {
    throw "No DB password found. Set BACKUP_PGPASSWORD or create '$PasswordFile'."
  }
  $env:PGPASSWORD = $password

  $latestBackup = Get-ChildItem -Path $dailyDir -File -Filter "$($SourceDatabase)_*.backup" |
    Where-Object { $_.Length -gt 0 } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $latestBackup) {
    throw "No non-empty backup file found in '$dailyDir'."
  }

  $ageHours = [math]::Round(((Get-Date) - $latestBackup.LastWriteTime).TotalHours, 2)
  Write-Log ("Using backup: {0}" -f $latestBackup.FullName)
  Write-Log ("Backup size: {0} bytes | age: {1} hours" -f $latestBackup.Length, $ageHours)
  if ($ageHours -gt $MaxBackupAgeHours) {
    throw ("Latest backup is too old ({0}h). Expected <= {1}h." -f $ageHours, $MaxBackupAgeHours)
  }

  $verifyExit = Invoke-NativeWithLog -FilePath $PgRestorePath -Arguments @("--list", $latestBackup.FullName)
  if ($verifyExit -ne 0) {
    throw "Backup verification failed (pg_restore --list exit=$verifyExit)"
  }

  Invoke-PsqlSql -Database "postgres" -SqlText @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$RestoreTestDatabase'
  AND pid <> pg_backend_pid();
"@

  Invoke-PsqlSql -Database "postgres" -SqlText "DROP DATABASE IF EXISTS `"$RestoreTestDatabase`";"
  Invoke-PsqlSql -Database "postgres" -SqlText "CREATE DATABASE `"$RestoreTestDatabase`" OWNER `"$Username`";"

  $restoreExit = Invoke-NativeWithLog -FilePath $PgRestorePath -Arguments @(
    "-h", $HostName,
    "-p", "$Port",
    "-U", $Username,
    "-d", $RestoreTestDatabase,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    $latestBackup.FullName
  )
  if ($restoreExit -ne 0) {
    throw "Restore into '$RestoreTestDatabase' failed with exit code $restoreExit"
  }

  Invoke-PsqlSql -Database $RestoreTestDatabase -SqlText @'
DO $$
BEGIN
  IF to_regclass('public."User"') IS NULL THEN
    RAISE EXCEPTION 'Missing table: User';
  END IF;
  IF to_regclass('public."_prisma_migrations"') IS NULL THEN
    RAISE EXCEPTION 'Missing table: _prisma_migrations';
  END IF;
END $$;

SELECT 'User' AS table_name, COUNT(*) AS rows FROM "User";
SELECT '_prisma_migrations' AS table_name, COUNT(*) AS rows FROM "_prisma_migrations";
SELECT 'Sale' AS table_name, COUNT(*) AS rows FROM "Sale";
SELECT 'MotorbikePromotion' AS table_name, COUNT(*) AS rows FROM "MotorbikePromotion";
'@

  Invoke-PsqlSql -Database "postgres" -SqlText "DROP DATABASE IF EXISTS `"$RestoreTestDatabase`";"

  $state = [ordered]@{
    status = "ok"
    timestamp = (Get-Date).ToString("o")
    sourceDatabase = $SourceDatabase
    restoreTestDatabase = $RestoreTestDatabase
    backupFile = $latestBackup.FullName
    backupSizeBytes = $latestBackup.Length
    backupAgeHours = $ageHours
    logFile = $logFile
  }
  ($state | ConvertTo-Json -Depth 4) | Set-Content -Path $successFile -Encoding UTF8

  $cutoff = (Get-Date).AddDays(-$LogRetentionDays)
  Get-ChildItem -Path $restoreTestDir -File -Filter "*.log" |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  Write-Log "Restore test OK"
  Write-Log "=== ALTAS WEEKLY RESTORE TEST END ==="
  exit 0
}
catch {
  Write-Log ("Restore test FAILED: {0}" -f $_.Exception.Message)
  if (-not $KeepTestDbOnFailure) {
    try {
      Invoke-PsqlSql -Database "postgres" -SqlText @"
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$RestoreTestDatabase'
  AND pid <> pg_backend_pid();
"@
      Invoke-PsqlSql -Database "postgres" -SqlText "DROP DATABASE IF EXISTS `"$RestoreTestDatabase`";"
      Write-Log "Dropped restore test database after failure."
    }
    catch {
      Write-Log ("Cleanup after failure also failed: {0}" -f $_.Exception.Message)
    }
  }

  $failure = [ordered]@{
    status = "failed"
    timestamp = (Get-Date).ToString("o")
    sourceDatabase = $SourceDatabase
    restoreTestDatabase = $RestoreTestDatabase
    backupFile = if ($latestBackup) { $latestBackup.FullName } else { $null }
    message = $_.Exception.Message
    logFile = $logFile
  }
  ($failure | ConvertTo-Json -Depth 4) | Set-Content -Path $failureFile -Encoding UTF8
  exit 1
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
