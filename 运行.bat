@echo off
rem ===========================================================================
rem  Serve the prebuilt dist/ statically. Run 编译.bat first if dist/ is missing.
rem  Double-click to run. Stop the server window with Ctrl+C.
rem ===========================================================================
setlocal
set "PORT=9520"
cd /d "%~dp0"

rem Free port %PORT% if a server is already running, then start a fresh one
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%PORT%" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

if not exist dist (
  echo [dist] not found. Please run 编译.bat first to build the project.
  echo.
  pause
  exit /b 1
)

echo Serving dist/ at http://localhost:%PORT%  (Ctrl+C to stop)
start "" cmd /c "timeout /t 1 >nul && start "" http://localhost:%PORT%"
node serve-dist.js
if errorlevel 1 goto fail
exit /b 0

:fail
echo.
echo Failed. See output above.
echo.
pause
exit /b 1
