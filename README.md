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

Le projet utilise Firebase pour le déploiement :

1. Frontend : Hébergé sur Firebase Hosting
2. Backend : Fonctions Firebase
3. Base de données : Firebase Firestore

## Contribution

1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Créer une Pull Request

## Licence

MIT
