@echo off
rem ===========================================================================
rem  fnOS (FeiNiu) fpk builder for 音乐解锁 (um-web legacy v1.10.8)
rem  Source lives at the project root (um/web v1.10.8, Vue2 + TS). We build it
rem  with vue-cli, then package the produced dist/ into the fpk.
rem  Usage: double-click this file, or run it from a terminal.
rem  Prereq: fnos\fnpack.exe (Windows x86)
rem  Output: <project root>\fpk\<appname>-<version>.fpk
rem  NOTE: keep this file ASCII-only, batch parsing of non-ASCII is fragile.
rem ===========================================================================
setlocal
set "NODE_OPTIONS=--openssl-legacy-provider"
set "PROJ=%~dp0"
set "FNOS=%PROJ%fnos"
set "PKG=%FNOS%\umweb"
set "WEB=%PKG%\app\web"
set "WEB_SRC=%PROJ%dist"

echo === Build fnOS fpk: 音乐解锁 (um-web legacy) ===
echo.

echo [1/6] Build web app (vue-cli build, offline)...
pushd "%PROJ%"
if not exist node_modules (
  echo   ERROR: node_modules not found. This is an OFFLINE build.
  echo   Run "npm install" once with network beforehand, then re-run without network.
  goto fail
)
call npm run build
if errorlevel 1 goto fail
popd
if not exist "%WEB_SRC%" goto fail

echo [2/6] Copy static web files (dist)...
if exist "%WEB%" rmdir /s /q "%WEB%"
mkdir "%WEB%"
xcopy "%WEB_SRC%" "%WEB%" /e /i /y /q >nul
if errorlevel 1 goto fail

echo [3/6] Sync manifest version from package.json...
powershell -NoProfile -ExecutionPolicy Bypass -File "%FNOS%\sync-version.ps1" -From "%PROJ%package.json" -Manifest "%PKG%\manifest"
if errorlevel 1 goto fail

echo [4/6] Normalize newlines to LF...
powershell -NoProfile -ExecutionPolicy Bypass -File "%FNOS%\normalize-lf.ps1" -Path "%PKG%"
if errorlevel 1 goto fail

echo [5/6] Locate fnpack...
set "FNPACK="
if exist "%FNOS%\fnpack.exe" set "FNPACK=%FNOS%\fnpack.exe"
if not defined FNPACK if exist "%PROJ%fnpack.exe" set "FNPACK=%PROJ%fnpack.exe"
if not defined FNPACK for %%I in (fnpack.exe) do if not "%%~$PATH:I"=="" set "FNPACK=%%~$PATH:I"
if not defined FNPACK goto nofnpack
echo     %FNPACK%

echo [6/6] Packing and renaming (with version)...
pushd "%PKG%"
"%FNPACK%" build
set "RC=%ERRORLEVEL%"
popd
if not "%RC%"=="0" goto fail

rem --- output folder: <project root>\fpk (created on demand) ---
set "OUTDIR=%PROJ%fpk"
if not exist "%OUTDIR%" mkdir "%OUTDIR%"
if errorlevel 1 goto fail

rem --- rename to <appname>-<version>.fpk and move it into the output folder ---
set "APPNAME="
set "VERSION="
for /f "tokens=2 delims==" %%V in ('findstr /b /c:"appname" "%PKG%\manifest"') do set "APPNAME=%%V"
for /f "tokens=2 delims==" %%V in ('findstr /b /c:"version" "%PKG%\manifest"') do set "VERSION=%%V"
set "APPNAME=%APPNAME: =%"
set "VERSION=%VERSION: =%"
if not defined APPNAME set "APPNAME=umweb"
set "BUILT=%PKG%\%APPNAME%.fpk"
set "OUTNAME=%APPNAME%.fpk"
if defined VERSION set "OUTNAME=%APPNAME%-%VERSION%.fpk"
if not exist "%BUILT%" goto fail
move /y "%BUILT%" "%OUTDIR%\%OUTNAME%" >nul
if errorlevel 1 goto fail
set "OUT=%OUTDIR%\%OUTNAME%"

echo.
echo Done: %OUT%
echo Install: upload it in the fnOS App Center, or over SSH run
echo   appcenter-cli install-fpk "%OUT%"
echo.

rem --- open the output folder and highlight the package just built ---
rem     (explorer returns a non-zero exit code even on success, so ignore it)
explorer /select,"%OUT%"

echo.
pause
exit /b 0

:nofnpack
echo.
echo fnpack.exe not found.
echo Download the Windows x86 build from
echo   https://developer.fnnas.com/docs/cli/fnpack/
echo The downloaded file has no extension - rename it to fnpack.exe and put it in:
echo   %FNOS%
echo.
pause
exit /b 1

:fail
echo.
echo Build FAILED. See the output above.
echo.
pause
exit /b 1
