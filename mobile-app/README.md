# 📱 TranspoBot Mobile App

Application mobile **React Native** avec Expo pour la gestion de flotte TranspoBot sur iOS et Android.

## ✨ Fonctionnalités

### 🏠 Dashboard
- **KPIs en temps réel** : Véhicules actifs, chauffeurs libres, trajets du jour
- **Recette journalière** : Affichage formaté en FCFA
- **Alertes de maintenance** : Notifications des véhicules en attente
- **Taux de ponctualité** : Performance de la flotte

### 🚗 Gestion des Trajets
- **Trajets en temps réel** : Liste des trajets ouverts, en cours, terminés
- **Filtrage intelligent** : Par statut (Ouverts, En cours, Terminés, Tous)
- **Détails complets** : Route, chauffeur, véhicule, passagers, recettes
- **Pull-to-refresh** : Mise à jour rapide des données

### 🚨 Gestion des Incidents
- **Incidents en attente** : Vue immédiate des problèmes non résolus
- **Définition de criticité** : Filtre par gravité (Critique, Moyen, Mineur)
- **Résolution rapide** : Marquer comme résolu en un clic
- **Historique complet** : Tous les incidents avec métadonnées

### 👤 Profil Utilisateur
- **Informations de compte** : Nom, rôle, statut
- **Statistiques personnelles** : Jours actifs, actions, équipes
- **Paramètres** : Sécurité, notifications, À propos
- **Déconnexion sécurisée** : Logout avec confirmation

## 🚀 Installation & Démarrage

### Prérequis
- **Node.js** ≥ 16
- **npm** ou **yarn**
- **Expo CLI** : `npm install -g expo-cli`

### Setup
```bash
cd mobile-app

# Installer les dépendances
npm install
# ou
yarn install

# Créer le fichier .env (copier de .env.example)
cp .env.example .env

# Modifier l'URL API en fonction de votre setup
# EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000/api
```

### Mode Développement
```bash
# Démarrer le serveur Expo
npm start

# Android (Emulateur ou device physique)
npm run android

# iOS (macOS uniquement)
npm run ios

# Web
npm run web
```

### Mode Production
```bash
# Build APK (Android)
eas build --platform android --release

# Build IPA (iOS - requires Apple Developer Account)
eas build --platform ios --release

# Build les deux
eas build --release
```

## 📁 Structure du Projet

```
mobile-app/
├── App.tsx                 # Entry point
├── app.json               # Configuration Expo
├── package.json           # Dépendances
├── src/
│   ├── screens/           # Écrans de l'app
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── TripsScreen.tsx
│   │   ├── IncidentsScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── navigation/        # Navigation & routing
│   │   └── AppNavigator.tsx
│   └── store.ts          # State management (Zustand)
├── assets/               # Images, icônes
└── .env                  # Variables d'environnement
```

## 🔌 Configuration API

### URL de l'API
L'app se connecte à l'API Backend via l'URL définie dans `.env` :

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api
```

### Authentification
- **Login** : `/login` (POST) → Retourne `access_token`
- **Token stocké** : AsyncStorage (persistant sur l'appareil)
- **Auto-refresh** : Token automatiquement réutilisé au démarrage

### Endpoints utilisés
- `GET /stats` - Statistiques globales
- `GET /trajets_custom` - Liste des trajets (filtrable)
- `GET /incidents_custom` - Incidents (filtrable)
- `PATCH /incidents_custom/{id}/resolve` - Marquer incident comme résolu
- `GET /me` - Infos utilisateur courant

## 🎨 Thème & Styling

### Couleurs principales
- **Primaire** : `#c4581e` (Orange)
- **Succès** : `#10b981` (Vert)
- **Danger** : `#ef4444` (Rouge)
- **Warning** : `#f59e0b` (Jaune)
- **Info** : `#3b82f6` (Bleu)

### Police
- **Titre** : Inter, poids 800
- **Texte** : Inter, poids 600
- **Petit texte** : Inter, poids 500

## 📱 Responsive Design

L'app est optimisée pour :
- **Mobiles** : 4.5" - 6.5" (Portrait)
- **Tablettes** : Landscape support
- **Écrans variés** : iPhone, Android, iPad

## 🔐 Sécurité

- **AuthStorage** : Tokens stockés localement (AsyncStorage)
- **HTTPS en production** : URL sécurisée recommandée
- **Session logout** : Suppression du token à la déconnexion
- **Permissions** : Location et Notifications (configurables)

## 📊 Performance

- **Code splitting** : Navigation lazy loading
- **Caching** : Données en mémoire avec Zustand
- **Images optimisées** : Format SVG pour les icônes
- **Bundle size** : ~4-5 MB (décompressé)

## 🐛 Debugging

### Logs en développement
```bash
npm start
# Scanner le QR code avec l'app Expo Go
# Ou accéder à http://localhost:19002
```

### Redux DevTools
L'état Zustand est accessible via console :
```javascript
// Dans le terminal de Expo
useAuthStore.getState()
useDashboardStore.getState()
```

## 🚀 Déploiement

### Google Play Store
```bash
eas build --platform android --release
eas submit --platform android
```

### Apple App Store
```bash
eas build --platform ios --release
eas submit --platform ios
```

## 📋 Checklist de déploiement

- [ ] URL API pointée vers la production
- [ ] Build de l'app complètement testée
- [ ] Notifications activées côté serveur
- [ ] Icônes et splash screen fournis
- [ ] Permissions vérifiées (iOS/Android)
- [ ] Version des dépendances à jour
- [ ] Documentation mise à jour

## 🤝 Support & Contribuer

Pour les bugs ou améliorations :
1. Créer une issue détaillée
2. Tester sur physique + émulateur
3. Soumettre un PR avec description

## 📄 License

© 2026 TranspoBot Sénégal 🇸🇳. Tous droits réservés.

---

**Dernière mise à jour** : 14 avril 2026
**Version** : 1.0.0
