@echo off
rem ===========================================================================
rem  发布.bat - Create GitHub Release and upload assets (win-zip / fpk)
rem  Logic is implemented in Node.js: scripts\release.js (reads token from .env)
rem  Version and tag come from package.json: v<version>
rem ===========================================================================
chcp 65001 >nul
setlocal
set "NODE_OPTIONS=--openssl-legacy-provider"
cd /d "%~dp0"

rem When launched from this release flow, packaging scripts skip their interactive pause
set "UM_NO_PAUSE=1"

if not exist .env (
  echo   ERROR: .env file not found.
  echo   Create .env in project root, for example:
  echo     GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  echo     GITHUB_REPO_URL=https://github.com/RONGLINC93/um-web.git
  echo.
  pause
  exit /b 1
)

rem --- Step 0: package first (fpk builds dist via npm run build, then win-zip reuses it) ---
echo === Step 0: Build packages (fpk / win-zip) ===
echo.

echo [A] Build fnOS fpk ...
call 打包fpk.bat < nul
if not "%ERRORLEVEL%"=="0" (
  echo   ERROR: fpk build failed.
  pause
  exit /b 1
)

echo [B] Build Windows zip ...
call 打包win-zip.bat < nul
if not "%ERRORLEVEL%"=="0" (
  echo   ERROR: win-zip build failed.
  pause
  exit /b 1
)

rem --- Step 1: publish to GitHub Release ---
node scripts\release.js > 发布日志.txt 2>&1
set "RC=%ERRORLEVEL%"

echo.
type 发布日志.txt
echo.
if not "%RC%"=="0" (
  echo   Publish failed, exit code %RC%. See 发布日志.txt for details.
  pause
  exit /b %RC%
)

echo   Publish finished. See 发布日志.txt for details.
pause
exit /b 0
