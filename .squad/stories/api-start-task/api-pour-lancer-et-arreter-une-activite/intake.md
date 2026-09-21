# Story intake

Fill this template for each story you want planned. Keep it copy-paste-friendly: the planner reads **this file and the files in `attachments/`**, nothing else.

- Folder: `.squad/stories/api-start-task/api-pour-lancer-et-arreter-une-activite/intake.md`
- Binaries (screenshots, PDFs, exports): put them in `attachments/` next to this file and list them below.
- Do **not** rely on external links (tracker URLs, wiki, chat) — the planner cannot open them. Paste the content you want considered.

This is **not** an implementation prompt. It is the input to the plan-generation meta-prompt bundled with squad-kit (`generate-plan.md` in the installed package).

---

## Feature

- **Feature name (display):** API Start & Stop Task
- **Feature slug (folder under `plans/`):** `api-start-task`

## Tracker (metadata only)

- **Tracker type:** `none`
- **Work item id:** `01`
- **Work item type:** `Feature`
- **Status:** `Completed`
- **Assignee:** `Gemini 3.8`
- **Labels:** `backend, api, automation`

---

## Title

```
API pour lancer et arreter une activite (Option C avec API Key)
```

---

## Description

```
Permettre le déclenchement automatisé (scripts, raccourcis iOS/macOS, curl, Stream Deck) du démarrage et de l'arrêt d'une activité de suivi du temps sur le backend Express / Firestore, sans devoir ouvrir l'interface web.
```

---

## Acceptance criteria

```
[x] Endpoint POST /api/time-entries/start pour démarrer une tâche.
[x] Option C supportée : relance par taskId OU création/rattachement par projectName/taskName.
[x] Arrêt atomique de toute tâche active en cours pour l'utilisateur avec calcul du temps écoulé et mise à jour de endTime et duration.
[x] Authentification par clé API secrète (x-api-key ou query apiKey) liée à DEFAULT_USER_EMAIL.
[x] Endpoint POST /api/time-entries/stop pour arrêter la tâche en cours.
[x] Endpoint GET /api/time-entries/active pour consulter l'activité active.
```

---

## Attachments

None.

---

## Technical hints (optional)

- Fichiers modifiés : `backend/src/middleware/auth.ts`, `backend/src/controllers/timeEntryController.ts`, `backend/src/routes/timeEntryRoutes.ts`.
- Configuration : `backend/.env` (`API_SECRET_KEY`, `DEFAULT_USER_EMAIL`).

