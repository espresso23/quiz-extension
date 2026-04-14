@echo off
echo Creating placeholder icons...
echo This script creates simple PNG icons using PowerShell

REM Create icons directory if it doesn't exist
if not exist "icons" mkdir icons

REM Create a simple SVG icon and convert to PNG using PowerShell
powershell -Command ^
"$svg = @' ^
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'> ^
  <defs> ^
    <linearGradient id='grad' x1='0%%' y1='0%%' x2='100%%' y2='100%%'> ^
      <stop offset='0%%' style='stop-color:#4a90d9;stop-opacity:1' /> ^
      <stop offset='100%%' style='stop-color:#6c5ce7;stop-opacity:1' /> ^
    </linearGradient> ^
  </defs> ^
  <rect width='128' height='128' rx='24' fill='url(#grad)'/> ^
  <text x='64' y='85' font-size='72' text-anchor='middle' fill='white' font-family='Arial'>AI</text> ^
</svg> ^
'@; ^
[System.IO.File]::WriteAllText('icons/icon.svg', $svg); ^
Write-Host 'SVG icon created. For production, convert to PNG using an image editor.'"

echo.
echo NOTE: For production use, you need to create proper PNG icons:
echo - icons/icon16.png (16x16)
echo - icons/icon48.png (48x48)  
echo - icons/icon128.png (128x128)
echo.
echo You can use https://favicon.io or any icon generator to create these.
echo The extension will work with the SVG for now, but Chrome Web Store requires PNG icons.
pause
