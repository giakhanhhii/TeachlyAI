# Dung process dang LISTEN tren cong (vd. uvicorn).
param([Parameter(Mandatory = $true)][int]$Port)

$line = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING" | Select-Object -First 1
if (-not $line) {
  Write-Host "Khong co process nao LISTEN tren cong $Port." -ForegroundColor Yellow
  exit 0
}
$parts = ($line.ToString() -split "\s+") | Where-Object { $_ -ne "" }
$listenPid = [int]$parts[-1]
Write-Host "Dang dung PID $listenPid (cong $Port)..." -ForegroundColor Cyan
Stop-Process -Id $listenPid -Force -ErrorAction Stop
Write-Host "Xong." -ForegroundColor Green
