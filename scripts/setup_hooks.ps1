# Install git pre-push hook for AI log submission on Windows
$ErrorActionPreference = "Stop"

$HOOK_FILE = ".git/hooks/pre-push"
$HOOK_CONTENT = @"
#!/bin/bash
# Submit AI logs to grading server before push
python scripts/submit_log.py
exit 0  # Never block push
"@

# Create .ai-log directory if not exists
if (-not (Test-Path ".ai-log")) {
    New-Item -ItemType Directory -Path ".ai-log" -Force | Out-Null
    Write-Host "[ai-log] Created .ai-log directory."
}

if (-not (Test-Path ".ai-log/.gitkeep")) {
    New-Item -ItemType File -Path ".ai-log/.gitkeep" -Force | Out-Null
}

# Write the hook file
# We use UTF8 without BOM to ensure compatibility with bash
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines((Resolve-Path .).Path + "/$HOOK_FILE", $HOOK_CONTENT.Split("`n"), $utf8NoBom)

Write-Host "[ai-log] Git pre-push hook installed at $HOOK_FILE."
Write-Host "[ai-log] Setup complete. Configure AI_LOG_SERVER in your .env file."
