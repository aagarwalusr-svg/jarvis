@echo off
cd /d "%~dp0"
if not exist "runtime\venv\Scripts\python.exe" (
 echo Run setup.ps1 with Claude Code first.
 pause
 exit /b 1
)
"runtime\venv\Scripts\python.exe" studio.py launch --comfy "runtime\ComfyUI" --python "%~dp0runtime\venv\Scripts\python.exe"
pause
