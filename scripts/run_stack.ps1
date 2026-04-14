param(
  [int]$Port = 0,
  [switch]$Reload,
  [switch]$KillExisting
)
# Teachly: API + static frontend on one port (FastAPI mounts frontend/).
# Usage (repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/run_stack.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/run_stack.ps1 -Port 8010
#   powershell -ExecutionPolicy Bypass -File scripts/run_stack.ps1 -KillExisting
$ErrorActionPreference = "Stop"

$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Get-PythonExe {
  $venvPy = Join-Path $Root "venv\Scripts\python.exe"
  if (Test-Path $venvPy) { return $venvPy }
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return $py.Source }
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) { return $python.Source }
  throw "Khong tim thay Python. Cai dat Python hoac tao venv: python -m venv venv"
}

function Get-ListenerPid([int]$listenPort) {
  $line = netstat -ano | Select-String ":$listenPort\s" | Select-String "LISTENING" | Select-Object -First 1
  if (-not $line) { return $null }
  $parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
  $listenPid = [int]$parts[-1]
  if ($listenPid -le 0) { return $null }
  return $listenPid
}

function Test-Health([int]$listenPort) {
  $base = "http://127.0.0.1:$listenPort"
  try {
    $h = Invoke-RestMethod -Uri "$base/api/health" -TimeoutSec 3 -ErrorAction Stop
    if ($h.ok -eq $true) { return @{ Ok = $true; Detail = "api/health ok" } }
    return @{ Ok = $false; Detail = "api/health JSON khong co ok:true" }
  }
  catch {
    return @{ Ok = $false; Detail = $_.Exception.Message }
  }
}

function Wait-Health([int]$listenPort, [int]$MaxAttempts = 50) {
  for ($i = 0; $i -lt $MaxAttempts; $i++) {
    $r = Test-Health $listenPort
    if ($r.Ok) { return $r }
    Start-Sleep -Milliseconds 200
  }
  return Test-Health $listenPort
}

$Py = Get-PythonExe
Write-Host "Python: $Py" -ForegroundColor DarkGray

$chosenPort = $Port
if ($chosenPort -le 0) {
  foreach ($p in 8000..8015) {
    $pidListen = Get-ListenerPid $p
    if ($null -eq $pidListen) {
      $chosenPort = $p
      break
    }
  }
  if ($chosenPort -le 0) { throw "Khong tim thay cong trong trong khoang 8000-8015" }
}

$existing = Get-ListenerPid $chosenPort
if ($null -ne $existing) {
  if ($KillExisting) {
    Write-Host "Dang tat process PID $existing dang chiem cong $chosenPort..." -ForegroundColor Yellow
    Stop-Process -Id $existing -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
  }
  else {
    throw "Cong $chosenPort dang duoc su dung (PID $existing). Chay lai voi -KillExisting hoac -Port <khac>."
  }
}

$logDir = Join-Path $Root ".teachly_logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$outLog = Join-Path $logDir "uvicorn_$chosenPort.out.log"
$errLog = Join-Path $logDir "uvicorn_$chosenPort.err.log"

$uvicornArgs = @("-m", "uvicorn", "src.api_server:app", "--host", "127.0.0.1", "--port", "$chosenPort")
if ($Reload) { $uvicornArgs = @("-m", "uvicorn", "src.api_server:app", "--reload", "--host", "127.0.0.1", "--port", "$chosenPort") }

Write-Host "Khoi dong uvicorn tren cong $chosenPort ..." -ForegroundColor Cyan
$proc = Start-Process -FilePath $Py -ArgumentList $uvicornArgs -WorkingDirectory $Root -PassThru `
  -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog

$health = Wait-Health $chosenPort
if (-not $health.Ok) {
  Write-Host ""
  Write-Host "LOI: Khong ket noi duoc API (connection failed / sai server)." -ForegroundColor Red
  Write-Host "  Chi tiet: $($health.Detail)" -ForegroundColor Red
  if (Test-Path $errLog) {
    Write-Host "  Log stderr (cuoi file):" -ForegroundColor Yellow
    Get-Content $errLog -Tail 30 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
  }
  if (Test-Path $outLog) {
    Write-Host "  Log stdout (cuoi file):" -ForegroundColor Yellow
    Get-Content $outLog -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
  }
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  }
  exit 1
}

Write-Host ""
Write-Host "OK: Backend + frontend cung origin." -ForegroundColor Green
Write-Host "  Hub:    http://127.0.0.1:$chosenPort/main_hub.html" -ForegroundColor Green
Write-Host "  Chat:   http://127.0.0.1:$chosenPort/chatbot_ui.html" -ForegroundColor Green
Write-Host "  Health: http://127.0.0.1:$chosenPort/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "Log: $outLog | $errLog" -ForegroundColor DarkGray
Write-Host "Dung server: Stop-Process -Id $($proc.Id)   hoac   .\scripts\stop_stack.ps1 -Port $chosenPort" -ForegroundColor DarkGray
Write-Host ""

try {
  Wait-Process -Id $proc.Id
}
finally {
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  }
}
