# Merge origin/main into branch more-ui-features while keeping your local data_output.
# Run from repo root AFTER closing Cursor (or any app) that has files under data_output open.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/merge_main_into_more_ui_keep_data_output.ps1

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$backup = Join-Path (Split-Path $repoRoot -Parent) "A20_data_output_merge_backup"
if (Test-Path $backup) {
  Remove-Item $backup -Recurse -Force
}

Write-Host "==> Backing up data_output -> $backup"
if (Test-Path "data_output") {
  New-Item -ItemType Directory -Path $backup -Force | Out-Null
  robocopy "data_output" $backup /E /COPY:DAT /R:2 /W:2 | Out-Null
  if ($LASTEXITCODE -gt 8) { throw "robocopy backup failed with code $LASTEXITCODE" }
}

Write-Host "==> Removing repo data_output (so git can materialize files from merge)"
if (Test-Path "data_output") {
  attrib -r -s -h /s /d "data_output\*" 2>$null
  Remove-Item -LiteralPath "data_output" -Recurse -Force
}

Write-Host "==> git fetch + pull more-ui-features + merge main"
git fetch origin
git pull --no-rebase origin more-ui-features
git merge --no-edit origin/main

Write-Host "==> Restoring your data_output from backup (overwrites same paths from git)"
if (Test-Path $backup) {
  New-Item -ItemType Directory -Path "data_output" -Force | Out-Null
  robocopy $backup "data_output" /E /COPY:DAT /R:2 /W:2 | Out-Null
  if ($LASTEXITCODE -gt 8) { throw "robocopy restore failed with code $LASTEXITCODE" }
}

Write-Host "==> Stop tracking data_output again if merge re-introduced tracked files"
$tracked = git ls-files "data_output"
if ($tracked) {
  git rm -r --cached data_output 2>$null
  git commit -m "chore: keep data_output untracked after merge (local RAG)"
}

Write-Host "Done. Branch: $(git branch --show-current)  Latest: $(git log -1 --oneline)"
