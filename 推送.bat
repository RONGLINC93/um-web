@echo off
rem ===========================================================================
rem  推送.bat - 一键提交并推送到 GitHub
rem  实际逻辑由 Node.js 实现: scripts\git-push.js (自动读取根目录 .env 中的令牌)
rem ===========================================================================
chcp 65001 >nul
setlocal
cd /d "%~dp0"

node scripts\git-push.js
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" echo   操作失败，退出码 %RC%。请查看上面的错误信息。
pause
exit /b %RC%
