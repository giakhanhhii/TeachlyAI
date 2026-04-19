# In mọi dòng liên quan TCP 8000 + tên process (nếu PID còn sống).
# Chạy: powershell -ExecutionPolicy Bypass -File scripts/show_port_8000.ps1
# Có thể thêm tham số cổng:  powershell ... -File scripts/show_port_8000.ps1 8000

param(
    [int]$Port = 8000
)

Write-Host "=== netstat (LISTEN / chứa :$Port ) ===" -ForegroundColor Cyan
netstat -ano | findstr ":$Port "

Write-Host "`n=== Get-NetTCPConnection (LocalPort $Port) ===" -ForegroundColor Cyan
$rows = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $rows) {
    Write-Host "(Không có bản ghi — cổng $Port có thể đang trống.)"
    exit 0
}

$pids = $rows | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -gt 0 }
foreach ($procId in $pids) {
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($p) {
        $path = try {
            (Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue).ExecutablePath
        } catch { $null }
        Write-Host "`nPID $procId  $($p.ProcessName)" -ForegroundColor Green
        if ($path) { Write-Host "  Path: $path" }
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue).CommandLine
        if ($cmd) { Write-Host "  Cmd:  $($cmd.Substring(0, [Math]::Min(200, $cmd.Length)))..." }
    }
    else {
        Write-Host "`nPID $procId — KHÔNG còn process (dòng TCP 'ma' / stale trên Windows)." -ForegroundColor Yellow
    }
}

Write-Host "`n--- Gợi ý ---" -ForegroundColor Cyan
Write-Host "1) Dừp process:  powershell -ExecutionPolicy Bypass -File scripts/kill_port_8000.ps1"
Write-Host "2) Nếu vẫn LISTEN mà PID không tồn tại: khởi động lại Docker Desktop hoặc máy."
Write-Host "3) PowerShell Admin (tùy chọn):  Restart-Service winnat -Force   (có thể giúp sau Docker/Hyper-V)"
