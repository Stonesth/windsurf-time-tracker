import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';

export interface TimeEntry {
  id?: string;
  userId: string;
  projectId: string;
  taskId: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  hourlyRate?: number;
  description?: string;
}

export const timeTrackingService = {
  // Start a new time entry
  startTracking: async (timeEntry: Omit<TimeEntry, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'timeEntries'), {
        ...timeEntry,
        startTime: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error starting time tracking', error);
      throw error;
    }
  },

  // Stop an ongoing time entry
  stopTracking: async (entryId: string) => {
    try {
      const entryRef = doc(db, 'timeEntries', entryId);
      const entrySnap = await getDoc(entryRef);
      const endTime = Timestamp.now();

      if (entrySnap.exists()) {
        const startTime = entrySnap.data().startTime;
        await updateDoc(entryRef, {
          endTime,
          duration: endTime.seconds - startTime.seconds
        });
      }
    } catch (error) {
      console.error('Error stopping time tracking', error);
      throw error;
    }
  },

  // Get time entries for a user
  getUserTimeEntries: async (userId: string, startDate?: Date, endDate?: Date) => {
    try {
      let q = query(collection(db, 'timeEntries'), where('userId', '==', userId));

      if (startDate) {
        q = query(q, where('startTime', '>=', Timestamp.fromDate(startDate)));
      }

      if (endDate) {
        q = query(q, where('startTime', '<=', Timestamp.fromDate(endDate)));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching time entries', error);
      throw error;
    }
  }
};
