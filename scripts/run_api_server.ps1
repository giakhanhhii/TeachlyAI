# Chạy Teachly API + frontend tĩnh tại http://127.0.0.1:8000/
# Dùng khi lệnh `uvicorn` không có trên PATH — luôn gọi qua Python trong venv.
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root
$Py = Join-Path $Root "venv\Scripts\python.exe"
if (-not (Test-Path $Py)) {
  Write-Host "Chua co venv. Chay trong thu muc repo:" -ForegroundColor Yellow
  Write-Host "  python -m venv venv" -ForegroundColor Cyan
  Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
  Write-Host "  pip install -r requirements.txt" -ForegroundColor Cyan
  exit 1
}
Write-Host "Mo http://127.0.0.1:8000/ sau khi server khoi dong." -ForegroundColor Green
& $Py -m uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000
