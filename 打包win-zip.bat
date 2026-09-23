@echo off
rem ===========================================================================
rem  打包win-zip.bat - 生成 Windows 本地版分发压缩包
rem  实际逻辑由 Node.js 实现: scripts\build-win-zip.js
rem  产物: <项目根>\win-zip\音乐解锁-<version>-win.zip
rem  依赖: node_modules 已就绪(离线构建), dist 不存在时会自动执行一次构建
rem ===========================================================================
chcp 65001 >nul
setlocal
set "NODE_OPTIONS=--openssl-legacy-provider"
cd /d "%~dp0"

if not exist node_modules (
  echo   ERROR: node_modules not found. This is an OFFLINE build.
  echo   Run "npm install" once with network beforehand, then re-run without network.
  echo.
  if not defined UM_NO_PAUSE pause
  exit /b 1
)

node scripts\build-win-zip.js
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
  echo   打包失败，退出码 %RC%。请查看上面的错误信息。
  if not defined UM_NO_PAUSE pause
  exit /b %RC%
)

rem 打开产物目录（explorer 成功也可能返回非 0，忽略）
if not defined UM_NO_PAUSE if exist "%~dp0win-zip" explorer "%~dp0win-zip"

if not defined UM_NO_PAUSE pause
exit /b 0
