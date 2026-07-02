Set sh = WScript.CreateObject("WScript.Shell")

' Start Backend (hidden)
sh.Run "cmd /c cd /d C:\Users\DELL\Desktop\APMS.ai\TECHNICAL\MINUTES.AI\backend && C:\Users\DELL\AppData\Local\Programs\Python\Python310\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload", 0, False

WScript.Sleep 4000

' Start Frontend (hidden)
sh.Run "cmd /c cd /d C:\Users\DELL\Desktop\APMS.ai\TECHNICAL\MINUTES.AI\frontend && npm run dev", 0, False

WScript.Sleep 4000

' Start ngrok (hidden)
sh.Run "C:\Users\DELL\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe start minutesai", 0, False

WScript.Sleep 6000

' Open app in browser
sh.Run "http://localhost:3000", 1, False
