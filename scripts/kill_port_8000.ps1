# Giải phóng cổng TCP 8000 (mặc định Teachly): dừng Docker compose repo này + kill mọi process đang LISTEN.
# Chạy từ PowerShell (repo root hoặc bất kỳ):
#   powershell -ExecutionPolicy Bypass -File scripts/kill_port_8000.ps1
# Xem ai đang dùng cổng (chi tiết): scripts/show_port_8000.ps1

param([int]$Port = 8000)

$ErrorActionPreference = "Continue"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Repo: $repoRoot  (target TCP port $Port)"
Write-Host "=== netstat :$Port ===" -ForegroundColor DarkGray
netstat -ano | findstr ":$Port " | findstr "LISTENING"
Push-Location $repoRoot
try {
    if (Test-Path "docker-compose.yml") {
        Write-Host "docker compose down ..."
        docker compose down 2>&1 | Write-Host
    }
}
finally {
    Pop-Location
}

# Uvicorn --reload: parent + child có thể lần lượt giữ LISTEN — lặp vài vòng.
for ($round = 1; $round -le 8; $round++) {
    $pids = @(
        Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    ) | Where-Object { $_ -and $_ -gt 0 }

    if (-not $pids -or $pids.Count -eq 0) { break }

    $alive = @()
    foreach ($procId in $pids) {
        if (Get-Process -Id $procId -ErrorAction SilentlyContinue) { $alive += $procId }
    }

    # Windows đôi khi còn dòng LISTEN với OwningProcess đã thoát (stale) — không spam kill.
    if ($alive.Count -eq 0) {
        $pj = $pids -join ", "
        Write-Warning "Cổng $Port vẫn LISTEN nhưng PID không còn process ($pj). Đợi ~60s, khởi động lại Docker Desktop hoặc máy. Chạy: scripts/show_port_8000.ps1 $Port"
        break
    }

    foreach ($procId in $alive) {
        try {
            $p = Get-Process -Id $procId -ErrorAction Stop
            Write-Host "Stop-Process -Id $procId ($($p.ProcessName)) [round $round]"
            Stop-Process -Id $procId -Force -ErrorAction Stop
        }
        catch {
            Write-Warning "Could not stop PID ${procId}: $_"
        }
    }
    Start-Sleep -Milliseconds 400
}

Start-Sleep -Milliseconds 600
$still = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($still) {
    $ghost = $true
    foreach ($row in $still) {
        if (Get-Process -Id $row.OwningProcess -ErrorAction SilentlyContinue) { $ghost = $false }
    }
    if ($ghost) {
        Write-Warning "Port ${Port}: LISTEN còn trong bảng TCP nhưng PID không tồn tại — xem thông báo 'stale' phía trên."
    }
    else {
        Write-Warning "Port $Port still has LISTENERS. Run: netstat -ano | findstr :$Port"
        $still | Select-Object LocalAddress, OwningProcess | Format-Table
    }
}
else {
    Write-Host "Port $Port is free. Start this app: python run_teachly.py"
}
