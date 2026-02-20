param(
  [string]$PgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
  [string]$PgRestorePath = "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe",
  [string]$HostName = "localhost",
  [int]$Port = 5432,
  [string]$Username = "postgres",
  [string]$Database = "altas_local",
  [string]$BackupRoot = "C:\altas-backups\pg",
  [string]$PasswordFile = "C:\altas-backups\pg\secrets\pg_backup_password.txt",
  [int]$RetentionDays = 30,
  [int]$MirrorRetentionDays = 90,
  [int]$WalRetentionDays = 14
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param(
    [string]$Message
  )

  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$stamp] $Message"
  Add-Content -Path $script:LogFile -Value $line
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

$dailyDir = Join-Path $BackupRoot "daily"
$mirrorDir = Join-Path $BackupRoot "mirror"
$walDir = Join-Path $BackupRoot "wal"
$stateDir = Join-Path $BackupRoot "state"

foreach ($dir in @($BackupRoot, $dailyDir, $mirrorDir, $walDir, $stateDir, (Split-Path $PasswordFile -Parent))) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupFile = Join-Path $dailyDir ("{0}_{1}.backup" -f $Database, $timestamp)
$zipFile = Join-Path $dailyDir ("{0}_{1}.zip" -f $Database, $timestamp)
$logFile = Join-Path $dailyDir ("{0}_{1}.log" -f $Database, $timestamp)
$shaFile = Join-Path $dailyDir ("{0}_{1}.sha256" -f $Database, $timestamp)
$stateFile = Join-Path $stateDir "latest_success.json"
$failureFile = Join-Path $stateDir "latest_failure.json"

$script:LogFile = $logFile
New-Item -ItemType File -Path $logFile -Force | Out-Null

try {
  if (-not (Test-Path $PgDumpPath)) {
    throw "pg_dump not found at '$PgDumpPath'"
  }
  if (-not (Test-Path $PgRestorePath)) {
    throw "pg_restore not found at '$PgRestorePath'"
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

  Write-Log "=== ALTAS BACKUP START ==="
  Write-Log ("Host={0} Port={1} User={2} DB={3}" -f $HostName, $Port, $Username, $Database)
  Write-Log ("BackupFile={0}" -f $backupFile)

  $dumpExit = Invoke-NativeWithLog -FilePath $PgDumpPath -Arguments @(
    "-h", $HostName,
    "-p", "$Port",
    "-U", $Username,
    "-F", "c",
    "-b",
    "-v",
    "-f", $backupFile,
    $Database
  )
  if ($dumpExit -ne 0) {
    throw "pg_dump failed with exit code $dumpExit"
  }

  if (-not (Test-Path $backupFile)) {
    throw "Backup file was not created."
  }

  $backupSize = (Get-Item $backupFile).Length
  if ($backupSize -le 0) {
    throw "Backup file size is zero."
  }
  Write-Log ("Backup size={0} bytes" -f $backupSize)

  $verifyExit = Invoke-NativeWithLog -FilePath $PgRestorePath -Arguments @("--list", $backupFile)
  if ($verifyExit -ne 0) {
    throw "pg_restore --list verification failed with exit code $verifyExit"
  }

  $hash = Get-FileHash -Path $backupFile -Algorithm SHA256
  ("{0} *{1}" -f $hash.Hash, (Split-Path $backupFile -Leaf)) | Set-Content -Path $shaFile -Encoding ASCII

  if (Test-Path $zipFile) {
    Remove-Item -Path $zipFile -Force
  }
  Compress-Archive -Path $backupFile -DestinationPath $zipFile -CompressionLevel Optimal -Force
  if (-not (Test-Path $zipFile)) {
    throw "ZIP file was not created."
  }

  Copy-Item -Path $zipFile -Destination (Join-Path $mirrorDir (Split-Path $zipFile -Leaf)) -Force
  Copy-Item -Path $shaFile -Destination (Join-Path $mirrorDir (Split-Path $shaFile -Leaf)) -Force

  $dailyCutoff = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -Path $dailyDir -File |
    Where-Object { $_.LastWriteTime -lt $dailyCutoff -and $_.Extension -in @(".backup", ".zip", ".log", ".sha256") } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  $mirrorCutoff = (Get-Date).AddDays(-$MirrorRetentionDays)
  Get-ChildItem -Path $mirrorDir -File |
    Where-Object { $_.LastWriteTime -lt $mirrorCutoff } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  $walCutoff = (Get-Date).AddDays(-$WalRetentionDays)
  Get-ChildItem -Path $walDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $walCutoff } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  $state = [ordered]@{
    status = "ok"
    timestamp = (Get-Date).ToString("o")
    database = $Database
    backupFile = $backupFile
    zipFile = $zipFile
    sizeBytes = $backupSize
    sha256 = $hash.Hash
  }
  ($state | ConvertTo-Json -Depth 4) | Set-Content -Path $stateFile -Encoding UTF8

  Write-Log ("Backup OK: {0}" -f $zipFile)
  Write-Log "=== ALTAS BACKUP END ==="
  exit 0
}
catch {
  Write-Log ("Backup FAILED: {0}" -f $_.Exception.Message)
  $failure = [ordered]@{
    status = "failed"
    timestamp = (Get-Date).ToString("o")
    database = $Database
    message = $_.Exception.Message
    logFile = $logFile
  }
  ($failure | ConvertTo-Json -Depth 4) | Set-Content -Path $failureFile -Encoding UTF8
  exit 1
}
finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}
