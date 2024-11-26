import express from 'express';
import { projectController } from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware);

// Routes des projets
router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.put('/:projectId', projectController.updateProject);
router.delete('/:projectId', projectController.deleteProject);

export default router;
