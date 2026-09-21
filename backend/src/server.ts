import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { onRequest } from 'firebase-functions/v2/https';
import { auth } from './config/firebase';
import projectRoutes from './routes/projectRoutes';
import timeEntryRoutes from './routes/timeEntryRoutes';

// Load environment variables
dotenv.config();

export const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Basic health check route (supporte /health et /api/health)
const healthHandler: RequestHandler = (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Test auth route
const authTestHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    res.status(200).json({
      message: 'Successfully authenticated',
      uid: decodedToken.uid,
      email: decodedToken.email
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};
app.get('/auth/test', authTestHandler);
app.get('/api/auth/test', authTestHandler);

// Routes (supporte à la fois avec et sans préfixe /api pour les rewrites Firebase Hosting)
app.use('/api/projects', projectRoutes);
app.use('/projects', projectRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/time-entries', timeEntryRoutes);

// Export Cloud Function pour déploiement Firebase Functions v2
export const api = onRequest({ region: 'us-central1', cors: true }, app);

// Démarrage local si exécuté directement (non-Cloud Function)
if (!process.env.K_SERVICE && !process.env.FUNCTION_NAME && !process.env.FUNCTION_TARGET) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

