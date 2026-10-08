@echo off
title Dr. NAM Virtual Secret Lab - Chemistry with Dr. NAM
cd /d "%~dp0"
echo Starting Dr. NAM Virtual Secret Lab...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1"
