param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $Args
)

$crgExe = Join-Path $PSScriptRoot "..\venv\Scripts\code-review-graph.exe"
if (-not (Test-Path $crgExe)) {
  throw "code-review-graph executable not found at $crgExe"
}

& $crgExe @Args
exit $LASTEXITCODE
