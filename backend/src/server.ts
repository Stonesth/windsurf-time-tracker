import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { auth } from './config/firebase';
import projectRoutes from './routes/projectRoutes';
import timeEntryRoutes from './routes/timeEntryRoutes';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', ((req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
}) as RequestHandler);

// Test auth route
app.get('/auth/test', (async (req: Request, res: Response) => {
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
}) as RequestHandler);

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/time-entries', timeEntryRoutes);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
