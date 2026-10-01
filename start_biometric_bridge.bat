@echo off
title Green Arrow HR - Biometric Live Bridge
echo ===================================================
echo   Green Arrow HR - Biometric Sync Bridge
echo   Connecting to Ektefa Biometric Terminal (192.168.8.110)
echo   Streaming punches to Cloud Server in real time...
echo ===================================================
cd /d "%~dp0\.."
node scripts\device_live_bridge.cjs
pause
