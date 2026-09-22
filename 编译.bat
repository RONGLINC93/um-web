@echo off
rem ===========================================================================
rem  Build the production bundle into dist/ (vue-cli build).
rem  Double-click to run. Result: dist/ folder, then run the server script to serve it.
rem  NOTE: keep this file ASCII-only; batch parsing of non-ASCII is fragile.
rem ===========================================================================
setlocal
set "NODE_OPTIONS=--openssl-legacy-provider"
set "PORT=9520"
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies, first run needs network...
  call npm install
  if errorlevel 1 goto fail
)

echo Building production bundle...
call npm run build
if errorlevel 1 goto fail

echo.
echo Build done. dist/ is ready - now double-click the run script to serve it.
echo.
pause
exit /b 0

:fail
echo.
echo Build failed. See output above.
echo.
pause
exit /b 1
