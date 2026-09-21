import { Response } from 'express';
import { db } from '../config/firebase';
import { AuthRequest } from '../middleware/auth';

export const timeEntryController = {
  // Récupérer toutes les entrées de temps d'un utilisateur
  async getTimeEntries(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, projectId } = req.query;
      let query = db.collection('timeEntries')
        .where('userId', '==', req.user?.uid);

      // Filtrer par projet si spécifié
      if (projectId) {
        query = query.where('projectId', '==', projectId);
      }

      // Filtrer par période si spécifiée
      if (startDate) {
        query = query.where('startTime', '>=', new Date(startDate as string));
      }
      if (endDate) {
        query = query.where('startTime', '<=', new Date(endDate as string));
      }

      const snapshot = await query.orderBy('startTime', 'desc').get();

      const timeEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json(timeEntries);
    } catch (error) {
      console.error('Erreur lors de la récupération des entrées de temps:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Créer une nouvelle entrée de temps
  async createTimeEntry(req: AuthRequest, res: Response) {
    try {
      const { projectId, startTime, duration, notes } = req.body;

      if (!projectId || !startTime || !duration) {
        return res.status(400).json({ 
          error: 'Le projet, l\'heure de début et la durée sont requis' 
        });
      }

      // Vérifier que le projet existe et appartient à l'utilisateur
      const projectDoc = await db.collection('projects').doc(projectId).get();
      if (!projectDoc.exists || projectDoc.data()?.createdBy !== req.user?.uid) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const timeEntryData = {
        projectId,
        userId: req.user?.uid,
        startTime: new Date(startTime),
        duration: Number(duration),
        notes: notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('timeEntries').add(timeEntryData);
      const doc = await docRef.get();

      res.status(201).json({
        id: doc.id,
        ...doc.data()
      });
    } catch (error) {
      console.error('Erreur lors de la création de l\'entrée de temps:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Mettre à jour une entrée de temps
  async updateTimeEntry(req: AuthRequest, res: Response) {
    try {
      const { timeEntryId } = req.params;
      const { startTime, duration, notes } = req.body;

      const timeEntryRef = db.collection('timeEntries').doc(timeEntryId);
      const doc = await timeEntryRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Entrée de temps non trouvée' });
      }

      if (doc.data()?.userId !== req.user?.uid) {
        return res.status(403).json({ error: 'Non autorisé' });
      }

      const updateData = {
        ...(startTime && { startTime: new Date(startTime) }),
        ...(duration && { duration: Number(duration) }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date()
      };

      await timeEntryRef.update(updateData);
      
      const updatedDoc = await timeEntryRef.get();
      res.json({
        id: updatedDoc.id,
        ...updatedDoc.data()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'entrée de temps:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Supprimer une entrée de temps
  async deleteTimeEntry(req: AuthRequest, res: Response) {
    try {
      const { timeEntryId } = req.params;
      const timeEntryRef = db.collection('timeEntries').doc(timeEntryId);
      const doc = await timeEntryRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Entrée de temps non trouvée' });
      }

      if (doc.data()?.userId !== req.user?.uid) {
        return res.status(403).json({ error: 'Non autorisé' });
      }

      await timeEntryRef.delete();
      res.json({ message: 'Entrée de temps supprimée avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'entrée de temps:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Obtenir les statistiques de temps
  async getTimeStats(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, projectId } = req.query;
      let query = db.collection('timeEntries')
        .where('userId', '==', req.user?.uid);

      if (projectId) {
        query = query.where('projectId', '==', projectId);
      }

      if (startDate) {
        query = query.where('startTime', '>=', new Date(startDate as string));
      }
      if (endDate) {
        query = query.where('startTime', '<=', new Date(endDate as string));
      }

      const snapshot = await query.get();

      // Calculer les statistiques
      const stats = {
        totalDuration: 0,
        numberOfEntries: snapshot.size,
        averageDuration: 0,
        projectStats: {} as Record<string, { totalDuration: number, numberOfEntries: number }>
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        stats.totalDuration += data.duration;

        // Statistiques par projet
        if (!stats.projectStats[data.projectId]) {
          stats.projectStats[data.projectId] = {
            totalDuration: 0,
            numberOfEntries: 0
          };
        }
        stats.projectStats[data.projectId].totalDuration += data.duration;
        stats.projectStats[data.projectId].numberOfEntries += 1;
      });

      if (stats.numberOfEntries > 0) {
        stats.averageDuration = stats.totalDuration / stats.numberOfEntries;
      }

      res.json(stats);
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Démarrer une tâche (Option C : par taskId ou par projectName/taskName)
  async startTask(req: AuthRequest, res: Response) {
    try {
      const { taskId, projectId, projectName, taskName, task, notes, tags } = req.body;
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non identifié' });
      }

      let targetProjectId = projectId;
      let targetTaskName = taskName || task;
      let targetNotes = notes || '';
      let targetTags = tags || [];

      // 1. Si taskId est fourni, récupérer les informations de la tâche existante
      if (taskId) {
        const existingDoc = await db.collection('timeEntries').doc(taskId).get();
        if (existingDoc.exists) {
          const data = existingDoc.data()!;
          targetProjectId = targetProjectId || data.projectId;
          targetTaskName = targetTaskName || data.task;
          targetNotes = targetNotes || data.notes || '';
          targetTags = targetTags.length > 0 ? targetTags : (data.tags || []);
        }
      }

      // 2. Si projectName est fourni et aucun targetProjectId, chercher ou créer le projet
      if (!targetProjectId && projectName) {
        const projectQuery = await db.collection('projects')
          .where('name', '==', projectName.trim())
          .limit(1)
          .get();

        if (!projectQuery.empty) {
          targetProjectId = projectQuery.docs[0].id;
        } else {
          // Création automatique du projet s'il n'existe pas encore
          const newProjectRef = await db.collection('projects').add({
            name: projectName.trim(),
            description: 'Créé automatiquement via API',
            color: '#1976d2',
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          targetProjectId = newProjectRef.id;
        }
      }

      // S'il n'y a toujours pas de projet, vérifier s'il existe un projet existant ou en créer un par défaut
      if (!targetProjectId) {
        const firstProjectQuery = await db.collection('projects').limit(1).get();
        if (!firstProjectQuery.empty) {
          targetProjectId = firstProjectQuery.docs[0].id;
        } else {
          const defaultProjectRef = await db.collection('projects').add({
            name: 'Général',
            description: 'Projet par défaut',
            color: '#1976d2',
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          targetProjectId = defaultProjectRef.id;
        }
      }

      if (!targetTaskName) {
        targetTaskName = 'Activité sans nom';
      }

      const now = new Date();

      // 3. Arrêter atomiquement toutes les tâches en cours pour cet utilisateur
      const runningQuery = await db.collection('timeEntries')
        .where('userId', '==', userId)
        .where('isRunning', '==', true)
        .get();

      const batch = db.batch();

      runningQuery.docs.forEach((docSnap) => {
        const runningData = docSnap.data();
        let startTime = now;
        if (runningData.startTime && typeof runningData.startTime.toDate === 'function') {
          startTime = runningData.startTime.toDate();
        } else if (runningData.startTime) {
          startTime = new Date(runningData.startTime);
        }

        const elapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
        const newDuration = (runningData.duration || 0) + elapsed;

        batch.update(docSnap.ref, {
          endTime: now,
          isRunning: false,
          duration: newDuration,
          updatedAt: now
        });
      });

      // 4. Créer la nouvelle entrée de temps active
      const newEntryRef = db.collection('timeEntries').doc();
      const newEntryData = {
        projectId: targetProjectId,
        userId: userId,
        task: targetTaskName,
        notes: targetNotes,
        tags: targetTags,
        startTime: now,
        endTime: null,
        duration: 0,
        isRunning: true,
        createdAt: now,
        updatedAt: now
      };

      batch.set(newEntryRef, newEntryData);
      await batch.commit();

      res.status(201).json({
        message: 'Activité démarrée avec succès',
        timeEntry: {
          id: newEntryRef.id,
          ...newEntryData
        },
        stoppedPreviousEntriesCount: runningQuery.size
      });
    } catch (error) {
      console.error('Erreur lors du démarrage de la tâche:', error);
      res.status(500).json({ error: 'Erreur lors du démarrage de la tâche' });
    }
  },

  // Arrêter la tâche actuellement en cours
  async stopTask(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non identifié' });
      }

      const now = new Date();
      const runningQuery = await db.collection('timeEntries')
        .where('userId', '==', userId)
        .where('isRunning', '==', true)
        .get();

      if (runningQuery.empty) {
        return res.status(200).json({ message: 'Aucune tâche active à arrêter', stoppedEntries: [] });
      }

      const batch = db.batch();
      const stoppedEntries: any[] = [];

      runningQuery.docs.forEach((docSnap) => {
        const runningData = docSnap.data();
        let startTime = now;
        if (runningData.startTime && typeof runningData.startTime.toDate === 'function') {
          startTime = runningData.startTime.toDate();
        } else if (runningData.startTime) {
          startTime = new Date(runningData.startTime);
        }

        const elapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
        const newDuration = (runningData.duration || 0) + elapsed;

        batch.update(docSnap.ref, {
          endTime: now,
          isRunning: false,
          duration: newDuration,
          updatedAt: now
        });

        stoppedEntries.push({
          id: docSnap.id,
          task: runningData.task,
          duration: newDuration
        });
      });

      await batch.commit();

      res.status(200).json({
        message: 'Tâche(s) arrêtée(s) avec succès',
        stoppedEntries
      });
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de la tâche:', error);
      res.status(500).json({ error: 'Erreur serveur lors de l\'arrêt' });
    }
  },

  // Obtenir la tâche active en cours
  async getActiveTask(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non identifié' });
      }

      const runningQuery = await db.collection('timeEntries')
        .where('userId', '==', userId)
        .where('isRunning', '==', true)
        .limit(1)
        .get();

      if (runningQuery.empty) {
        return res.status(200).json({ activeTask: null });
      }

      const doc = runningQuery.docs[0];
      res.status(200).json({
        activeTask: {
          id: doc.id,
          ...doc.data()
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération de la tâche active:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};
