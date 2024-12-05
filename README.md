# Time Tracker Application

Une application complète de suivi du temps avec un frontend React et un backend Node.js.

## Structure du Projet

```
time-tracker/
├── frontend/          # Application React/TypeScript
├── backend/           # API Node.js/Express
└── firebase/         # Configuration Firebase
```

## Technologies Utilisées

### Frontend
- React avec TypeScript
- Vite pour le build
- Material-UI pour l'interface
- Firebase Authentication
- Firebase Firestore

### Backend
- Node.js
- Express
- Firebase Admin SDK

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

3. Installer les dépendances du backend :
```bash
cd ../backend
npm install
```

4. Configuration Firebase :

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

3. Le fichier `src/lib/firebase.ts` est déjà configuré pour utiliser ces variables d'environnement

### Backend
1. Copier `.env.example` vers `.env`
2. Configurer les variables d'environnement dans `.env` :
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=../config/service-account-key.json
   FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
   PORT=3000
   ```

3. Créer le fichier de clé de service Firebase :
   - Aller dans la console Firebase
   - Paramètres du projet > Comptes de service
   - Générer une nouvelle clé privée
   - Placer le fichier JSON téléchargé dans `backend/config/service-account-key.json`

⚠️ IMPORTANT : Ne jamais commiter les fichiers suivants :
- `.env` et autres fichiers d'environnement
- `firebase.ts` avec vos identifiants
- `service-account-key.json`
- Tout autre fichier contenant des clés ou secrets

## Développement

### Frontend
```bash
cd frontend
npm run dev
```

### Backend
```bash
cd backend
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
cd ..  # Retourner à la racine du projet
firebase deploy --only hosting
```

L'application sera accessible à l'URL fournie par Firebase après le déploiement.

Le projet utilise Firebase pour le déploiement :

1. Frontend : Hébergé sur Firebase Hosting
2. Backend : Fonctions Firebase
3. Base de données : Firebase Firestore

### Prérequis
- Avoir Firebase CLI installé : `npm install -g firebase-tools`
- Être connecté à Firebase : `firebase login`
- Avoir les droits sur le projet Firebase `timetrackingwindsurf`

### Configuration Firebase
Le fichier de configuration Firebase (`firebase.json`) se trouve à la racine du projet. Il contient les configurations pour :
- L'hébergement (hosting)
- Firestore
- Les règles de stockage

### Étapes de déploiement

1. Construction du frontend :
```bash
cd frontend
npm run build
```

2. Déploiement sur Firebase :
```bash
firebase deploy --only hosting --project timetrackingwindsurf
```

L'application sera déployée et accessible à l'URL : https://timetrackingwindsurf.web.app

### Notes importantes
- Assurez-vous que le dossier `frontend/dist` existe et contient la dernière version buildée
- Le fichier `firebase.json` doit rester à la racine du projet
- Les fichiers de règles et d'index sont stockés dans le dossier `config/`

## Contribution

1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Créer une Pull Request

## Licence

MIT
