param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $Args
)

$rtkExe = Join-Path $PSScriptRoot "..\.tools\rtk\rtk.exe"
if (-not (Test-Path $rtkExe)) {
  throw "RTK binary not found at $rtkExe"
}

& $rtkExe @Args
exit $LASTEXITCODE
