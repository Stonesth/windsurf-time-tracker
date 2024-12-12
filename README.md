# Time Tracker Application

Une application complète de suivi du temps avec un frontend React et un backend Firebase.

## Structure du Projet

```
time-tracker/
├── frontend/          # Application React/TypeScript avec Vite
└── config/           # Configuration Firebase
```

## Technologies Utilisées

### Frontend
- React avec TypeScript
- Vite pour le build
- Material-UI pour l'interface
- Firebase Authentication
- Firebase Firestore
- Victory pour les graphiques
- i18next pour l'internationalisation

## Installation

1. Cloner le repository :
```bash
git clone [URL_DU_REPO]
cd time-tracker
```

2. Installer les dépendances du frontend :
```bash
cd frontend
npm install
```

3. Configuration Firebase :

### Frontend
1. Copier `.env.example` vers `.env`
2. Mettre à jour `.env` avec vos identifiants Firebase :
   ```env
   VITE_FIREBASE_API_KEY=votre-api-key
   VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://votre-projet.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=votre-projet-id
   VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
   VITE_FIREBASE_APP_ID=votre-app-id
   ```

## Développement

### Frontend
```bash
cd frontend
npm run dev
```

## Déploiement

Pour déployer l'application sur Firebase Hosting :

1. Construire l'application frontend :
```bash
cd frontend
npm run build
```

2. Déployer sur Firebase Hosting :
```bash
firebase deploy --only hosting
```

L'application sera accessible à l'URL fournie par Firebase après le déploiement.

### Prérequis pour le déploiement
- Avoir Firebase CLI installé : `npm install -g firebase-tools`
- Être connecté à Firebase : `firebase login`
- Avoir les droits sur le projet Firebase `timetrackingwindsurf`

### Configuration Firebase
Le fichier de configuration Firebase (`firebase.json`) contient les configurations pour :
- L'hébergement (hosting)
- Firestore
- Les règles de stockage

### URL de Production
L'application est déployée et accessible à : https://timetrackingwindsurf.web.app

### Notes importantes
- Assurez-vous que le dossier `frontend/dist` existe et contient la dernière version buildée
- Le fichier `firebase.json` doit rester à la racine du projet
- Les fichiers de règles et d'index sont stockés dans le dossier `config/`

## Fonctionnalités

- 📊 Suivi du temps en temps réel
- 📈 Visualisation des données avec des graphiques
- 🎯 Gestion des projets et des tâches
- 📱 Interface responsive
- 🌍 Support multilingue (FR/EN)
- 🔒 Authentification sécurisée
- 📅 Vue quotidienne, hebdomadaire et mensuelle

## Contribution

1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Créer une Pull Request

## Licence

MIT
