param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $CommandParts
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$rtkExe = Join-Path $repoRoot ".tools\rtk\rtk.exe"

if (-not (Test-Path $rtkExe)) {
  throw "RTK binary not found at $rtkExe"
}

$rawCommand = ($CommandParts -join " ").Trim()
if ([string]::IsNullOrWhiteSpace($rawCommand)) {
  throw "Usage: .\scripts\shell-smart.ps1 ""git status"""
}

function ShouldUseRtk([string] $commandText) {
  $cmd = $commandText.Trim().ToLowerInvariant()

  if ($cmd -match '^(pytest|python\s+-m\s+pytest)\b') { return $false }
  if ($cmd -match '^(npm|pnpm)\s+(run\s+)?(test|build|lint)\b') { return $false }
  if ($cmd -match '^npm\s+test\b') { return $false }
  if ($cmd -match '^npx\s+(jest|vitest|eslint|tsc|playwright|prettier|ruff|mypy)\b') { return $false }
  if ($cmd -match '^(jest|vitest|eslint|tsc|prettier|ruff|mypy|playwright|next\s+build|go\s+test|cargo\s+test|dotnet\s+test)\b') { return $false }

  if ($cmd -match '^git\s+(status|diff|log|show|branch|blame)\b') { return $true }
  if ($cmd -match '^(ls|tree|find|grep|read|diff|log|json|deps|env)\b') { return $true }
  if ($cmd -match '^gh\s+') { return $true }

  return $false
}

$rewritten = ""
if (ShouldUseRtk $rawCommand) {
  $rewritten = (& $rtkExe rewrite @CommandParts 2>$null | Out-String).Trim()
}

if (-not [string]::IsNullOrWhiteSpace($rewritten)) {
  $commandToRun = $rewritten.Trim()
} else {
  $commandToRun = $rawCommand
}

if ($commandToRun -match '^\s*rtk(?:\.exe)?\b') {
  $commandToRun = [regex]::Replace(
    $commandToRun,
    '^\s*rtk(?:\.exe)?\b',
    '& "' + ($rtkExe -replace '\\', '\\') + '"'
  )
}

Push-Location $repoRoot
try {
  powershell -NoProfile -ExecutionPolicy Bypass -Command $commandToRun
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
