@echo off
set "PORT=9520"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT%"') do echo PID=%%a
echo OK
