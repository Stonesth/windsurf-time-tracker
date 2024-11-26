# Time Tracker Application

Une application de suivi du temps construite avec React, TypeScript, et Firebase.

## Configuration requise

- Node.js (v14 ou supérieur)
- npm ou yarn
- Un projet Firebase

## Installation

1. Clonez le dépôt :
```bash
git clone [URL_DU_REPO]
cd fresh-time-tracker
```

2. Installez les dépendances :
```bash
npm install
```

3. Configuration de l'environnement :
   - Copiez le fichier `.env.example` en `.env`
   - Remplissez les variables avec vos informations Firebase

```bash
cp .env.example .env
```

4. Démarrez l'application en mode développement :
```bash
npm run dev
```

## Fonctionnalités

- Authentification utilisateur
- Gestion des projets
- Suivi du temps en temps réel
- Rapports hebdomadaires
- Stockage des données avec Firebase

## Technologies utilisées

- React 18
- TypeScript
- Vite
- Material-UI
- Firebase (Authentication, Firestore, Realtime Database)
- React Router

## Structure du projet

```
src/
  ├── components/     # Composants React
  ├── config/        # Configuration (Firebase, etc.)
  ├── hooks/         # Hooks personnalisés
  ├── pages/         # Pages/Routes principales
  ├── services/      # Services (auth, API, etc.)
  └── types/         # Types TypeScript
```

## Contribution

1. Créez une branche pour votre fonctionnalité
2. Committez vos changements
3. Poussez vers la branche
4. Créez une Pull Request

## Sécurité

- Ne committez jamais le fichier `.env`
- Utilisez les variables d'environnement pour les clés sensibles
- Vérifiez les règles de sécurité Firebase
