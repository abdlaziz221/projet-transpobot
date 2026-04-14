#!/usr/bin/env node

/**
 * TranspoBot Mobile - Commandes de Développement
 * ================================================
 * 
 * Ce fichier documente les commandes principales pour développer
 * et déployer l'application mobile TranspoBot.
 */

// ============================================
// 🚀 DÉMARRAGE RAPIDE
// ============================================

/**
 * Windows:
 *   cd mobile-app && setup.bat
 *   npm start
 * 
 * macOS/Linux:
 *   cd mobile-app && bash setup.sh
 *   npm start
 */

// ============================================
// 📦 INSTALLATION & SETUP
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  INSTALLATION INITIALE                      │
└─────────────────────────────────────────────┘

$ npm install
  → Installe toutes les dépendances

$ npm install -g expo-cli
  → Installe Expo CLI globalement

$ cp .env.example .env
  → Crée le fichier de configuration
  → À modifier avec votre IP/URL API
`);

// ============================================
// 🎯 DÉVELOPPEMENT
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  DÉVELOPPEMENT LOCAL                        │
└─────────────────────────────────────────────┘

$ npm start
  → Lance le serveur Expo
  → Ouvre http://localhost:19002 dans le navigateur
  → Scannez le QR code avec l'app Expo Go

$ npm run android
  → Lance l'app sur un émulateur/device Android

$ npm run ios
  → Lance l'app sur un simulateur/device iOS (macOS)

$ npm run web
  → Lance l'app en mode web

$ npm run lint
  → Vérifie la qualité du code

$ npm run type-check
  → Vérifie les types TypeScript
`);

// ============================================
// 🔧 DÉVELOPPEMENT AVANCÉ
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  OPTIONS DE DÉVELOPPEMENT AVANCÉES          │
└─────────────────────────────────────────────┘

$ npm start -- --reset-cache
  → Vide le cache et recommence

$ npm start -- --tunnel
  → Utilise un tunnel (plus lent mais compatible sans réseau local)

$ npm start -- --localhost
  → Force localhost au lieu de l'adresse IP

$ npm start -- --clear
  → Vide tous les logs

// Debugging
$ npm start
  Appuyez sur 'd' → Menu de debug
  Appuyez sur 'j' → React DevTools
  Appuyez sur 'r' → Reload l'app
  Appuyez sur 'i' → iOS simulator (si dispo)
  Appuyez sur 'a' → Android emulator

// Testing
$ npm test
  → Lance les tests (si configurés)

$ npm test -- --watch
  → Tests en mode watch
`);

// ============================================
// 🏗️ BUILD & DÉPLOIEMENT
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  BUILD & DÉPLOIEMENT                        │
└─────────────────────────────────────────────┘

// Test Build Local
$ eas build --platform android --local
  → Génère un APK testé localement (nécessite Android SDK)

$ eas build --platform ios --local
  → Génère un IPA testé localement (macOS + Xcode)

// Build Cloud EAS
$ eas build --platform android
  → Build APK sur les serveurs EAS (recommandé)

$ eas build --platform ios
  → Build IPA sur les serveurs EAS

$ eas build --platform all
  → Build APK et IPA

// Preview Builds
$ eas build --platform android --split
  → Crée des APKs par architecture (x86, arm64, etc.)

// Production Releases
$ eas build --platform android --release
$ eas build --platform ios --release

// Soumettre à la plateforme
$ eas submit --platform android
  → Soumet à Google Play Store

$ eas submit --platform ios
  → Soumet à Apple App Store
`);

// ============================================
// 📝 CONFIGURATION & VARIABLES
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  CONFIGURATION DES VARIABLES D'ENVIRONNEMENT│
└─────────────────────────────────────────────┘

Fichier: .env (à la racine de mobile-app/)

Variables disponibles:
- EXPO_PUBLIC_API_URL     → URL du backend (ex: http://192.168.1.100:8000/api)
- EXPO_PUBLIC_ENV         → Environment (development, staging, production)
- EXPO_PUBLIC_DEBUG       → Activer les logs (true/false)
- EXPO_PUBLIC_VERSION     → Version de l'app

Exemple .env:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_DEBUG=true
EXPO_PUBLIC_VERSION=1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

// ============================================
// 🐛 DEBUGGING & TROUBLESHOOTING
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  DEBUGGING & RÉSOLUTION DE PROBLÈMES        │
└─────────────────────────────────────────────┘

L'app ne se lance pas:
  1. Vérifier que Node.js est installé: node --version
  2. Vérifier Expo CLI: expo --version
  3. Vider le cache: npm start -- --reset-cache
  4. Réinstaller dépendances: rm -rf node_modules && npm install

Erreur API "Cannot connect":
  1. Vérifier que le backend fonctionne
  2. Vérifier l'URL dans .env (esp. l'IP)
  3. Test: curl http://192.168.1.100:8000/api/stats
  4. Vérifier le firewall

App lente:
  1. Utiliser React DevTools (npm start → 'd' → 'j')
  2. Vérifier les rendus inutiles
  3. Profile la performance avec Chrome DevTools
  4. Réduire le nombre d'items dans les listes

Problèmes de cache:
  $ npm start -- --reset-cache
  $ rm -rf .expo-shared
  $ rm -rf node_modules/.cache

État interne corrompu:
  $ watchman watch-del-all  # si watchman installé
  $ npm install
  $ npm start -- --reset-cache
`);

// ============================================
// 📚 DOCUMENTATION
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  RESSOURCES & DOCUMENTATION                 │
└─────────────────────────────────────────────┘

Fichiers de Documentation:
  - README.md              → Vue d'ensemble et installation
  - CONFIGURATION.md       → Configurations avancées
  - BEST_PRACTICES.md      → Meilleures pratiques de dev
  - ROADMAP.md             → Planification future

Documentation Externe:
  - https://reactnative.dev/              React Native
  - https://docs.expo.dev/                Expo SDK
  - https://github.com/pmndrs/zustand     Zustand
  - https://reactnavigation.org/          React Navigation

Tools Utiles:
  - Expo Go (app mobile pour preview)
  - React DevTools
  - React Native Debugger
  - Charles Proxy (pour MITM/sniffer)
`);

// ============================================
// 🎯 WORKFLOW RECOMMANDÉ
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  WORKFLOW DE DÉVELOPPEMENT                  │
└─────────────────────────────────────────────┘

1️⃣  Démarrer le backend:
   cd backend
   python -m uvicorn app:app --reload --host 0.0.0.0

2️⃣  Configurer l'app mobile:
   cd mobile-app
   cp .env.example .env
   # Éditer .env avec l'URL gérée du backend

3️⃣  Installer les dépendances:
   npm install

4️⃣  Démarrer Expo:
   npm start

5️⃣  Ouvrir dans Expo Go:
   - Scannez le QR code sur Android/iOS
   - Ou appuyez sur 'i' pour iOS (macOS) / 'a' pour Android

6️⃣  Développer:
   - Les changements se rechargeront automatiquement
   - Appuyez sur 'r' pour force reload

7️⃣  Debugger:
   - Appuyez sur 'd' pour le menu de debug
   - Appuyez sur 'j' pour React DevTools

8️⃣  Tester avant de committer:
   npm run lint
   npm run type-check

9️⃣  Committer:
   git add .
   git commit -m "feat: description du changement"

🔟 Préparer un build:
   eas build --platform android (ou ios)
`);

// ============================================
// 📞 SUPPORT
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  SUPPORT & CONTACT                          │
└─────────────────────────────────────────────┘

Pour les problèmes:
  1. Vérifier la documentation (README.md, CONFIGURATION.md)
  2. Consulter BEST_PRACTICES.md pour les patterns
  3. Vérifier les logs: npm start → Console
  4. Rechercher sur stackoverflow.com
  5. Consulter les issues GitHub du projet

Ressources Utiles:
  - Discord Expo: https://chat.expo.dev/
  - GitHub Discussions: https://github.com/facebook/react-native/discussions
  - Stack Overflow: Tag "react-native" et "expo"

Contacter l'équipe:
  - Issues: https://github.com/abdlaziz221/projet-transpobot/issues
  - Email: support@transpobot.com
`);

// ============================================
// ✨ VERSION APP
// ============================================

console.log(`
┌─────────────────────────────────────────────┐
│  VERSION & INFORMATIONS                     │
└─────────────────────────────────────────────┘

Version App: 1.0.0
Node Version: ${process.version}
Créé: 14 avril 2026
Dernière mise à jour: 14 avril 2026
Status: En développement actif 🚀

Mainteneur: TranspoBot Team
`);

// Exporter un helper pour tests  
module.exports = {
  commands: {
    start: 'npm start',
    android: 'npm run android',
    ios: 'npm run ios',
    web: 'npm run web',
    lint: 'npm run lint',
    build: 'eas build',
  }
};
