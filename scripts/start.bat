@echo off
echo Starting Minutes AI...

start "Backend" cmd /k "cd /d C:\Users\DELL\Desktop\APMS.ai\TECHNICAL\MINUTES.AI\backend && C:\Users\DELL\AppData\Local\Programs\Python\Python310\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

start "Frontend" cmd /k "cd /d C:\Users\DELL\Desktop\APMS.ai\TECHNICAL\MINUTES.AI\frontend && npm run dev"

timeout /t 3 /nobreak >nul

start "ngrok" cmd /k "C:\Users\DELL\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe start minutesai"

echo All 3 terminals launched!
pause
