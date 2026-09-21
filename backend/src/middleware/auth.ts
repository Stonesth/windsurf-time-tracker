import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
  };
}

let cachedDefaultUser: { uid: string; email: string } | null = null;

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Vérification de la clé API secrète (x-api-key ou paramètre d'URL apiKey)
    const apiKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);
    const configuredApiKey = process.env.API_SECRET_KEY;

    if (configuredApiKey && apiKey && apiKey === configuredApiKey) {
      if (!cachedDefaultUser) {
        if (process.env.DEFAULT_USER_UID) {
          cachedDefaultUser = {
            uid: process.env.DEFAULT_USER_UID,
            email: process.env.DEFAULT_USER_EMAIL || '',
          };
        } else if (process.env.DEFAULT_USER_EMAIL) {
          const userRecord = await auth.getUserByEmail(process.env.DEFAULT_USER_EMAIL);
          cachedDefaultUser = {
            uid: userRecord.uid,
            email: userRecord.email || process.env.DEFAULT_USER_EMAIL,
          };
        } else {
          // Si ni UID ni email configuré, utiliser l'admin par défaut
          const userRecord = await auth.getUserByEmail('pierre.thonon@gmail.com');
          cachedDefaultUser = {
            uid: userRecord.uid,
            email: userRecord.email || 'pierre.thonon@gmail.com',
          };
        }
      }

      req.user = { ...cachedDefaultUser };
      return next();
    }

    // 2. Authentification Firebase standard par Bearer Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non autorisé: Clé API ou token manquant' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
    };
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    res.status(401).json({ error: 'Non autorisé' });
  }
};
