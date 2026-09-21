import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let initialized = false;

  if (credentialsPath) {
    try {
      const fullPath = resolve(__dirname, '../../', credentialsPath);
      if (fs.existsSync(fullPath)) {
        const serviceAccount = require(fullPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
        initialized = true;
      }
    } catch (e) {
      console.warn('Impossible de charger les identifiants locaux, bascule sur les identifiants Cloud par défaut:', e);
    }
  }

  if (!initialized) {
    admin.initializeApp({
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  }
}

export const auth = admin.auth();
export const db = admin.firestore();

