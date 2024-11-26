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
  }
};
