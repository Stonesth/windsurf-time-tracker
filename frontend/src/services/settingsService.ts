import { collection, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteSettings, DEFAULT_SETTINGS } from '../types/settings';

class SettingsService {
  private readonly settingsDoc = 'site_settings';
  private readonly collection = collection(db, 'settings');

  async getSettings(): Promise<SiteSettings> {
    try {
      const settingsRef = doc(this.collection, this.settingsDoc);
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        // Si les paramètres n'existent pas, créer avec les valeurs par défaut
        await this.updateSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }

      const data = settingsSnap.data();
      return {
        workHoursPerDay: data.workHoursPerDay || DEFAULT_SETTINGS.workHoursPerDay,
        workHoursPerWeek: data.workHoursPerWeek || DEFAULT_SETTINGS.workHoursPerWeek,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres:', error);
      throw error;
    }
  }

  async updateSettings(settings: SiteSettings): Promise<void> {
    try {
      const settingsRef = doc(this.collection, this.settingsDoc);
      await setDoc(settingsRef, {
        workHoursPerDay: settings.workHoursPerDay,
        workHoursPerWeek: settings.workHoursPerWeek,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
