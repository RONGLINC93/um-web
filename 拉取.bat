@echo off
rem ===========================================================================
rem  拉取.bat - 一键从 GitHub 拉取最新代码
rem  实际逻辑由 Node.js 实现: scripts\git-pull.js (自动读取根目录 .env 中的令牌)
rem ===========================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"

node scripts\git-pull.js
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" echo   操作失败，退出码 %RC%。请查看上面的错误信息。
pause
exit /b %RC%
