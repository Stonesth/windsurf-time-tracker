import { useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';
import { SiteSettings, DEFAULT_SETTINGS } from '../types/settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const siteSettings = await settingsService.getSettings();
        setSettings(siteSettings);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des paramètres:', err);
        setError('Erreur lors du chargement des paramètres');
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Convertir le format HH:mm en heures décimales
  const convertTimeToHours = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours + minutes / 60;
  };

  const getDailyTargetHours = (): number => {
    return convertTimeToHours(settings.workHoursPerDay);
  };

  const getWeeklyTargetHours = (): number => {
    return convertTimeToHours(settings.workHoursPerWeek);
  };

  return {
    settings,
    loading,
    error,
    getDailyTargetHours,
    getWeeklyTargetHours,
  };
};
