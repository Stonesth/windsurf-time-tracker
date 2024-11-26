import { Response } from 'express';
import { db } from '../config/firebase';
import { AuthRequest } from '../middleware/auth';

export const projectController = {
  // Récupérer tous les projets d'un utilisateur
  async getProjects(req: AuthRequest, res: Response) {
    try {
      const projectsRef = db.collection('projects');
      const snapshot = await projectsRef
        .where('createdBy', '==', req.user?.uid)
        .orderBy('createdAt', 'desc')
        .get();

      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json(projects);
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Créer un nouveau projet
  async createProject(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Le nom du projet est requis' });
      }

      const projectData = {
        name,
        description: description || '',
        createdBy: req.user?.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('projects').add(projectData);
      const doc = await docRef.get();

      res.status(201).json({
        id: doc.id,
        ...doc.data()
      });
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Mettre à jour un projet
  async updateProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;

      const projectRef = db.collection('projects').doc(projectId);
      const doc = await projectRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (doc.data()?.createdBy !== req.user?.uid) {
        return res.status(403).json({ error: 'Non autorisé' });
      }

      const updateData = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        updatedAt: new Date()
      };

      await projectRef.update(updateData);
      
      const updatedDoc = await projectRef.get();
      res.json({
        id: updatedDoc.id,
        ...updatedDoc.data()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du projet:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Supprimer un projet
  async deleteProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const projectRef = db.collection('projects').doc(projectId);
      const doc = await projectRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (doc.data()?.createdBy !== req.user?.uid) {
        return res.status(403).json({ error: 'Non autorisé' });
      }

      await projectRef.delete();
      res.json({ message: 'Projet supprimé avec succès' });
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};
