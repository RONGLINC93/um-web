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

if not exist .env (
  echo   ERROR: .env file not found.
  echo   Create .env in project root, for example:
  echo     GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  echo     GITHUB_REPO_URL=https://github.com/RONGLINC93/um-web.git
  echo.
  pause
  exit /b 1
)

node scripts\release.js > 发布日志.txt 2>&1
set "RC=%ERRORLEVEL%"

echo.
type 发布日志.txt
echo.
if not "%RC%"=="0" (
  echo   发布失败，退出码 %RC%。详情见 发布日志.txt。
  pause
  exit /b %RC%
)

echo   发布完成，详情见 发布日志.txt。
pause
exit /b 0
