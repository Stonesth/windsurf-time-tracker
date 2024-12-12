# Time Tracker Frontend

## Vue d'ensemble
Application de suivi du temps conçue pour les windsurfeurs afin de suivre leurs sessions et leur progression.

## Fonctionnalités
- 🔐 Authentification utilisateur
- ⏱️ Suivi du temps en temps réel
- 📊 Visualisation des données
- 🎯 Gestion des projets et tâches
- 📈 Rapports et analyses
- 🌍 Support multilingue (FR/EN)
- 📱 Interface responsive

## Stack Technique
- React.js avec TypeScript
- Vite pour le build
- Firebase (Auth & Firestore)
- Material-UI
- Victory pour les graphiques
- i18next pour l'internationalisation
- React Router pour la navigation
- date-fns pour la gestion des dates

## Prérequis
- Node.js (v16+)
- npm ou yarn
- Compte Firebase

## Installation

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration Firebase
1. Créer un projet Firebase sur [https://console.firebase.google.com/]
2. Copier `.env.example` vers `.env`
3. Mettre à jour `.env` avec votre configuration Firebase

### 3. Lancer l'application
```bash
npm run dev
```

## Variables d'Environnement
- `VITE_FIREBASE_API_KEY`: Clé API Firebase
- `VITE_FIREBASE_AUTH_DOMAIN`: Domaine d'authentification
- `VITE_FIREBASE_PROJECT_ID`: ID du projet
- `VITE_FIREBASE_STORAGE_BUCKET`: Bucket de stockage
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: ID d'expéditeur
- `VITE_FIREBASE_APP_ID`: ID de l'application

## Structure du Projet
```
src/
├── assets/          # Images et ressources statiques
├── components/      # Composants React réutilisables
├── contexts/        # Contextes React (Auth, Projects, etc.)
├── hooks/          # Hooks personnalisés
├── lib/            # Configuration (Firebase, etc.)
├── locales/        # Fichiers de traduction
├── pages/          # Composants de pages
├── types/          # Types TypeScript
└── utils/          # Fonctions utilitaires
```

## Scripts Disponibles
- `npm run dev` : Lance le serveur de développement
- `npm run build` : Compile l'application pour la production
- `npm run preview` : Prévisualise la version de production
- `npm run lint` : Vérifie le code avec ESLint
- `npm run format` : Formate le code avec Prettier

## Déploiement
Le déploiement est géré via Firebase Hosting. Pour déployer :
1. `npm run build`
2. `firebase deploy --only hosting`

## Contribution
1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Créer une Pull Request

## Licence
MIT
