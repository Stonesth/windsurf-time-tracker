import express from 'express';
import { timeEntryController } from '../controllers/timeEntryController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware);

// Routes des entrées de temps
router.get('/', timeEntryController.getTimeEntries);
router.post('/', timeEntryController.createTimeEntry);
router.put('/:timeEntryId', timeEntryController.updateTimeEntry);
router.delete('/:timeEntryId', timeEntryController.deleteTimeEntry);

// Route pour les statistiques
router.get('/stats', timeEntryController.getTimeStats);

export default router;
