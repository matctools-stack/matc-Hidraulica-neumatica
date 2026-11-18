@echo off
setlocal
cd /d "%~dp0"
title Fluid Circuit Studio - Execucao Desktop

where node >nul 2>&1
if errorlevel 1 goto :no_node

if exist "package.json" goto :have_pkg

echo [AVISO] Arquivo package.json nao encontrado nesta pasta.
set "FOUND_ZIP="

for /f "delims=" %%Z in ('dir /b /o-d "%USERPROFILE%\Downloads\FluidCircuitStudio-Windows*.zip" 2^>nul') do (
  set "FOUND_ZIP=%USERPROFILE%\Downloads\%%Z"
  goto :do_extract
)

for /f "delims=" %%Z in ('dir /b /o-d "%USERPROFILE%\Desktop\FluidCircuitStudio-Windows*.zip" 2^>nul') do (
  set "FOUND_ZIP=%USERPROFILE%\Desktop\%%Z"
  goto :do_extract
)

echo [ERRO] Extraia TODO o conteudo do .ZIP para uma pasta antes de executar este script.
pause
exit /b 1

:do_extract
set "TARGET_DIR=C:\FluidCircuitStudio"
echo Extraindo "%FOUND_ZIP%" para "%TARGET_DIR%"...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%FOUND_ZIP%' -DestinationPath '%TARGET_DIR%' -Force"
if not exist "%TARGET_DIR%\package.json" goto :extract_failed
cd /d "%TARGET_DIR%"

:have_pkg
if exist "node_modules\electron" goto :launch
echo Instalando runtime Electron pela primeira vez...
call npm install --no-save --legacy-peer-deps electron
if errorlevel 1 goto :electron_err

:launch
echo Iniciando Fluid Circuit Studio em modo Desktop nativo...
call npx electron .
exit /b 0

:no_node
echo [ERRO] Node.js nao encontrado. Instale o Node.js LTS em: https://nodejs.org/
pause
exit /b 1

:extract_failed
echo [ERRO] Extraia o .ZIP manualmente para C:\FluidCircuitStudio e tente novamente.
pause
exit /b 1

:electron_err
echo [ERRO] Falha ao instalar o Electron.
pause
exit /b 1
