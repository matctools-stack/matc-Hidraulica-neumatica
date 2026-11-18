@echo off
setlocal
cd /d "%~dp0"
title Fluid Circuit Studio - Gerador de Executavel (.EXE)

echo ============================================================
echo   Fluid Circuit Studio - Compilador Windows (.EXE)
echo   Pasta atual: %CD%
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto :no_node

if exist "package.json" goto :have_pkg

echo [AVISO] Arquivo package.json nao encontrado nesta pasta.
echo Tentando localizar e extrair FluidCircuitStudio-Windows.zip...
set "FOUND_ZIP="

for /f "delims=" %%Z in ('dir /b /o-d "%USERPROFILE%\Downloads\FluidCircuitStudio-Windows*.zip" 2^>nul') do (
  set "FOUND_ZIP=%USERPROFILE%\Downloads\%%Z"
  goto :do_extract
)

for /f "delims=" %%Z in ('dir /b /o-d "%USERPROFILE%\Desktop\FluidCircuitStudio-Windows*.zip" 2^>nul') do (
  set "FOUND_ZIP=%USERPROFILE%\Desktop\%%Z"
  goto :do_extract
)

echo.
echo [ERRO] Extraia TODO o conteudo do arquivo .ZIP para uma pasta,
echo        por exemplo C:\FluidCircuitStudio, e execute este script la.
pause
exit /b 1

:do_extract
set "TARGET_DIR=C:\FluidCircuitStudio"
echo Extraindo "%FOUND_ZIP%" para "%TARGET_DIR%"...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%FOUND_ZIP%' -DestinationPath '%TARGET_DIR%' -Force"
if not exist "%TARGET_DIR%\package.json" goto :extract_failed
cd /d "%TARGET_DIR%"
echo Extraido com sucesso. Nova pasta: %CD%
echo.

:have_pkg
echo [1/3] Instalando dependencias do projeto...
call npm install --legacy-peer-deps
if errorlevel 1 goto :npm_err

echo.
echo [2/3] Instalando Electron e Electron Builder...
call npm install -D --legacy-peer-deps electron electron-builder
if errorlevel 1 goto :electron_err

echo.
echo [3/3] Gerando executaveis Windows (.EXE Setup e Portatil)...
call npm run electron:build:win
if errorlevel 1 goto :build_err

echo.
echo ============================================================
echo   CONCLUIDO COM SUCESSO!
echo   Arquivos gerados em: %CD%\dist-desktop
echo ============================================================
if exist "dist-desktop" explorer "%CD%\dist-desktop"
pause
exit /b 0

:no_node
echo [ERRO] Node.js nao encontrado neste computador.
echo Instale o Node.js LTS em: https://nodejs.org/
pause
exit /b 1

:extract_failed
echo [ERRO] Falha ao extrair automaticamente.
echo Clique com o botao direito no .ZIP, escolha Extrair Tudo para C:\FluidCircuitStudio e tente novamente.
pause
exit /b 1

:npm_err
echo [ERRO] Falha no npm install. Verifique sua conexao com a internet.
pause
exit /b 1

:electron_err
echo [ERRO] Falha ao instalar Electron / Electron Builder.
pause
exit /b 1

:build_err
echo [ERRO] Falha na geracao do arquivo .EXE.
pause
exit /b 1
