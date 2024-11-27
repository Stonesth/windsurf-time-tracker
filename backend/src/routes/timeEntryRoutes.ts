import express, { Router, RequestHandler } from 'express';
import { timeEntryController } from '../controllers/timeEntryController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware as RequestHandler);

// Routes des entrées de temps
router.get('/', timeEntryController.getTimeEntries as RequestHandler);
router.post('/', timeEntryController.createTimeEntry as RequestHandler);
router.put('/:timeEntryId', timeEntryController.updateTimeEntry as RequestHandler);
router.delete('/:timeEntryId', timeEntryController.deleteTimeEntry as RequestHandler);

// Route pour les statistiques
router.get('/stats', timeEntryController.getTimeStats as RequestHandler);

export default router;
