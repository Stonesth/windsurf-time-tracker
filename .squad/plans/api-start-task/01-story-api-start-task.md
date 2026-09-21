# Plan: API pour lancer et arreter une activite

- **Story:** `.squad/stories/api-start-task/api-pour-lancer-et-arreter-une-activite/intake.md`
- **Feature:** `api-start-task`
- **Planner:** `Gemini 3.8`
- **Status:** `Completed`

---

## 1. Contexte & Objectif
Fournir une interface REST permettant à l'utilisateur de déclencher le suivi du temps (start, stop, active) à distance via curl, scripts d'automatisation ou raccourcis système, sans avoir à manipuler l'interface web.

---

## 2. Découpage technique

### Étape 1 : Authentification simplifiée (API Key)
- Fichier : `backend/src/middleware/auth.ts`
- Vérification du header `x-api-key` ou paramètre `apiKey`.
- Association transparente avec l'utilisateur administrateur/par défaut (`DEFAULT_USER_EMAIL`).

### Étape 2 : Contrôleur des entrées de temps
- Fichier : `backend/src/controllers/timeEntryController.ts`
- Implémentation de `startTask` :
  - Détection par `taskId` (reprise) ou `projectName`/`taskName` (création/recherche automatique).
  - Arrêt atomique par batch Firestore de toutes les tâches en cours (`isRunning == true`).
  - Calcul de la durée écoulée et mise à jour de `endTime`.
  - Création de la nouvelle entrée active avec `isRunning: true` et `startTime: now`.
- Implémentation de `stopTask` :
  - Arrêt de la tâche active.
- Implémentation de `getActiveTask` :
  - Récupération de la tâche en cours.

### Étape 3 : Déclaration des routes
- Fichier : `backend/src/routes/timeEntryRoutes.ts`
- `POST /api/time-entries/start`
- `POST /api/time-entries/stop`
- `GET /api/time-entries/active`

### Étape 4 : Variables d'environnement
- Fichiers : `backend/.env`, `backend/.env.example`
- Ajout de `API_SECRET_KEY` et `DEFAULT_USER_EMAIL`.

---

## 3. Validation & Tests
- [x] Compilation TypeScript `npm run build` dans `backend/`.
- [x] Validation de l'authentification 401 sans clé API.
- [x] Vérification de la compatibilité avec la collection Firestore `timeEntries`.
