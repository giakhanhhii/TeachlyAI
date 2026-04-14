@echo off
setlocal

set "SCRIPT=%~dp0..\..\scripts\log_hook.py"

if not exist "%SCRIPT%" (
  echo {"continue": true}
  exit /b 0
)

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 "%SCRIPT%"
  exit /b 0
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  python "%SCRIPT%"
  exit /b 0
)

echo {"continue": true}
exit /b 0
