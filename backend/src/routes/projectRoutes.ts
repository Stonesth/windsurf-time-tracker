import express, { Router, RequestHandler } from 'express';
import { projectController } from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware as RequestHandler);

// Routes des projets
router.get('/', projectController.getProjects as RequestHandler);
router.post('/', projectController.createProject as RequestHandler);
router.put('/:projectId', projectController.updateProject as RequestHandler);
router.delete('/:projectId', projectController.deleteProject as RequestHandler);

export default router;
