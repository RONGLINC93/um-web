@echo off
rem ===========================================================================
rem  发布.bat - 在 GitHub 创建 Release 并上传附件（win-zip / fpk）
rem  实际逻辑由 Node.js 实现: scripts\release.js（自动读取根目录 .env 中的令牌）
rem  版本号与 tag 取自 package.json: v<version>
rem ===========================================================================
chcp 65001 >nul
setlocal
set "NODE_OPTIONS=--openssl-legacy-provider"
cd /d "%~dp0"

if not exist .env (
  echo   ERROR: 缺少 .env 文件。
  echo   请在项目根目录创建 .env，内容例如：
  echo     GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  echo     GITHUB_REPO_URL=https://github.com/RONGLINC93/um-web.git
  echo.
  pause
  exit /b 1
)

node scripts\release.js
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
  echo   发布失败，退出码 %RC%。请查看上面的错误信息。
  pause
  exit /b %RC%
)

pause
exit /b 0
