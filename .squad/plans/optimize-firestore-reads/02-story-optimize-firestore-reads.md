# Plan: Optimisation des lectures Firestore et cache des tags

- **Story:** `.squad/stories/optimize-firestore-reads/optimisation-des-lectures-firestore-et-cache-des-tags/intake.md`
- **Feature:** `optimize-firestore-reads`
- **Planner:** `Gemini 3.8`
- **Status:** `Completed`

---

## 1. Contexte du problème
Dans `DailyTasks.tsx`, la fonction `fetchDayEntries` s'exécute à chaque sélection de date ou chargement de page.
Elle contient une requête globale sans limite :
```typescript
query(collection(db, 'timeEntries'), where('userId', '==', currentUser.uid))
```
Si un utilisateur a accumulé 1 000 entrées au fil des semaines, changer 10 fois de date dans la journée génère **10 000 lectures Firestore** uniquement pour extraire les suggestions de tags d'autocomplétion.

---

## 2. Solution d'optimisation proposée

### A. Découplage du chargement des tags
- Extraire la récupération des tags de la fonction `fetchDayEntries` (qui ne doit charger que les entrées de la journée courante).
- Ne charger les tags qu'**une seule fois par session** (au montage du composant ou via `localStorage`).

### B. Cache local (localStorage)
- Vérifier si les tags sont déjà en cache `localStorage.getItem('timeTracker_tags_' + currentUser.uid)`.
- Si le cache existe, l'utiliser immédiatement (0 lecture Firestore).
- Si le cache n'existe pas, faire une requête unique optimisée (limitée aux entrées récentes `limit(100)`) et alimenter le cache.
- Lors de l'ajout ou de l'édition d'une tâche avec de nouveaux tags, mettre à jour le state `existingTags` et le `localStorage` instantanément (0 lecture supplémentaire).

### C. Gain immédiat
- **Avant** : `N` lectures (N = nombre total d'entrées historiques) à CHAQUE changement de date.
- **Après** : `0` lecture pour les tags lors des changements de date (chargement uniquement des entrées du jour sélectionné).
- Réduction de plus de **95% à 99%** de la consommation quotidienne de lectures Firestore.

---

## 3. Plan d'exécution

1. **Modifier `frontend/src/pages/DailyTasks.tsx`** :
   - Supprimer `allTagsQuery` de `fetchDayEntries`.
   - Créer un effet `useEffect` dédié pour initialiser les tags depuis `localStorage` une seule fois.
   - Mettre à jour le cache lors de l'enregistrement de nouvelles tâches contenant des tags.
2. **Valider le build frontend** (`npm run build` dans `frontend/`).
3. **Tester le bon fonctionnement de l'autocomplétion**.
