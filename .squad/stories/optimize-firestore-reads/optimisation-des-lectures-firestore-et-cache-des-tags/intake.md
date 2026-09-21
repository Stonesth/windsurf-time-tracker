# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/optimize-firestore-reads/optimisation-des-lectures-firestore-et-cache-des-tags/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** Optimisation des lectures Firestore
- **Feature slug (folder under `plans/`):** `optimize-firestore-reads`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `02`
- **Work item type:** `Optimization`
- **Status:** `In Progress`
- **Assignee:** `Gemini 3.8`
- **Labels:** `frontend, firestore, performance, cost-reduction`

---

## Title

```
Optimisation des lectures Firestore et cache des tags (DailyTasks.tsx)
```

---

## Description

```
Actuellement dans DailyTasks.tsx (lignes 220-225), allTagsQuery exécute :
query(collection(db, 'timeEntries'), where('userId', '==', currentUser.uid))
sans limite, à chaque changement de date ou rechargement de page.

Sur un utilisateur actif avec des centaines ou milliers d'entrées, cela consomme des milliers de lectures Firestore par session et épuise le quota gratuit quotidien (50 000 lectures).

L'objectif est d'éliminer cette surconsommation en :
1. Sauvegardant et lisant les tags d'un utilisateur depuis un document de profil ou de préférences dédié (1 seule lecture par session), ou en utilisant le cache localStorage.
2. Ajoutant de nouveaux tags au profil au moment de leur création (arrayUnion).
3. Ne rechargeant plus la collection timeEntries complète lors des navigations dans le calendrier.
```

---

## Acceptance criteria

```
[x] Suppression de la requête sans limite sur timeEntries dans DailyTasks.tsx.
[x] Mise en place d'un cache local (localStorage / memo) des tags utilisateur pour éviter les requêtes répétées.
[x] Réduction drastique des lectures Firestore : 1 lecture unique pour les tags au démarrage au lieu de N lectures à chaque clic de date.
[x] Préservation intégrale de la fonctionnalité d'autocomplétion des tags dans l'interface utilisateur.
[x] Build frontend sans régression (npm run build).
```

---

## Attachments

None.

---

## Technical hints (optional)

- Fichier concerné : `frontend/src/pages/DailyTasks.tsx` (fonction `fetchDayEntries`, lignes 210-237).
- Service concerné : `frontend/src/services/userService.ts` ou gestion de cache `localStorage`.

