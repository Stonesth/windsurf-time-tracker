import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

const serviceAccount = require(resolve(__dirname, '../../', process.env.GOOGLE_APPLICATION_CREDENTIALS!));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
