@echo off
REM Script pour configurer l'environnement mobile sur Windows

echo.
echo 🚀 Configuration TranspoBot Mobile App
echo ======================================

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez l'installer en premier.
    echo    Téléchargez depuis: https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js détecté: %NODE_VERSION%

REM Check if Expo CLI is installed
where expo >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installation d'Expo CLI...
    call npm install -g expo-cli
    if %errorlevel% neq 0 (
        echo ❌ Erreur lors de l'installation d'Expo CLI
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('expo --version') do set EXPO_VERSION=%%i
echo ✅ Expo CLI détecté: %EXPO_VERSION%

REM Create .env file if it doesn't exist
if not exist .env (
    echo.
    echo 📝 Création du fichier .env...
    
    REM Get local IP
    for /f "tokens=2 delims=: " %%A in ('ipconfig ^| find /i "IPv4 Address"') do (
        set LOCAL_IP=%%A
        goto :FOUND_IP
    )
    
    :FOUND_IP
    if not defined LOCAL_IP (
        set LOCAL_IP=192.168.1.100
    )
    
    REM Create .env file
    (
        echo # API Configuration
        echo EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:8000/api
        echo.
        echo # Environment
        echo EXPO_PUBLIC_ENV=development
        echo EXPO_PUBLIC_DEBUG=true
        echo.
        echo # Version
        echo EXPO_PUBLIC_VERSION=1.0.0
    ) > .env
    
    echo ✅ .env créé avec IP locale: %LOCAL_IP%
    echo    ⚠️  Vérifiez que l'adresse IP est correcte dans .env!
) else (
    echo ✅ Fichier .env détecté
)

REM Install dependencies
echo.
echo 📦 Installation des dépendances...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de l'installation des dépendances
    exit /b 1
)

echo.
echo ✨ Configuration complète!
echo.
echo 🎯 Prochaines étapes:
echo    1. Vérifiez l'URL API dans .env
echo    2. Lancez le backend: cd ..\backend ^&^& python -m uvicorn app:app --reload
echo    3. Lancez l'app: npm start
echo    4. Scannez le QR code avec Expo Go (https://expo.io/client)
echo.
echo 📚 Documentation:
echo    - README.md pour un aperçu
echo    - CONFIGURATION.md pour les configurations avancées
echo.
pause
