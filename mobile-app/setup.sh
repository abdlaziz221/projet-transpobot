#!/bin/bash

# Script pour configurer rapidement l'environnement mobile

set -e

echo "🚀 Configuration TranspoBot Mobile App"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer en premier."
    exit 1
fi

echo "✅ Node.js détecté: $(node --version)"

# Check if Expo CLI is installed
if ! command -v expo &> /dev/null; then
    echo "📦 Installation d'Expo CLI..."
    npm install -g expo-cli
fi

echo "✅ Expo CLI détecté: $(expo --version)"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Création du fichier .env..."
    
    # Détecter l'IP locale
    if [[ "$OSTYPE" == "darwin"* ]]; then
        LOCAL_IP=$(ipconfig getifaddr en0)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    else
        LOCAL_IP="192.168.1.100"
    fi
    
    # Créer le .env
    cat > .env << EOF
# API Configuration
EXPO_PUBLIC_API_URL=http://$LOCAL_IP:8000/api

# Environment
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_DEBUG=true

# Version
EXPO_PUBLIC_VERSION=1.0.0
EOF
    
    echo "✅ .env créé avec IP locale: $LOCAL_IP"
    echo "   ⚠️  Vérifiez que l'adresse IP est correcte!"
    echo "   Modifiez avec: nano .env"
else
    echo "✅ Fichier .env détecté"
fi

# Install dependencies
echo ""
echo "📦 Installation des dépendances..."
npm install

echo ""
echo "✨ Configuration complète!"
echo ""
echo "🎯 Prochaines étapes:"
echo "   1. Vérifiez l'URL API dans .env"
echo "   2. Lancez le backend: cd ../backend && python -m uvicorn app:app --reload"
echo "   3. Lancez l'app: npm start"
echo "   4. Scannez le QR code avec Expo Go"
echo ""
echo "📚 Documentation:"
echo "   - README.md pour un aperçu"
echo "   - CONFIGURATION.md pour les configurations avancées"
echo ""
