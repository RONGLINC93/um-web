@echo off
rem ===========================================================================
rem  Build the production bundle into dist/ (vue-cli build).
rem  Double-click to run. Result: dist/ folder, then use 运行.bat to serve it.
rem ===========================================================================
setlocal
set "NODE_OPTIONS=--openssl-legacy-provider"
cd /d "%~dp0"

rem Free port %PORT% if a static server is still running (avoids dist/ file lock during build)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%PORT%" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

if not exist node_modules (
  echo Installing dependencies (first run needs network)...
  call npm install
  if errorlevel 1 goto fail
)

echo Building production bundle...
call npm run build
if errorlevel 1 goto fail

echo.
echo Build done. dist/ is ready - now double-click 运行.bat to serve it.
echo.
pause
exit /b 0

:fail
echo.
echo Build failed. See output above.
echo.
pause
exit /b 1
