import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { settingsService } from '../../services/settingsService';
import { SiteSettings as SiteSettingsType, DEFAULT_SETTINGS } from '../../types/settings';

export const SiteSettings: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettingsType>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const siteSettings = await settingsService.getSettings();
      setSettings(siteSettings);
      setError('');
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      setError('Erreur lors du chargement des paramètres');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!validateTimeFormat(settings.workHoursPerDay) || !validateTimeFormat(settings.workHoursPerWeek, true)) {
      setError('Format d\'heure invalide. Utilisez le format HH:mm');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await settingsService.updateSettings(settings);
      setSuccess('Paramètres mis à jour avec succès');
      await loadSettings(); // Recharger les paramètres après la mise à jour
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      setError('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const validateTimeFormat = (time: string, isWeekly: boolean = false): boolean => {
    if (isWeekly) {
      // Pour les heures hebdomadaires, on accepte n'importe quel nombre d'heures
      const weeklyTimeRegex = /^([0-9]{1,2}|[0-9]{3}):[0-5][0-9]$/;
      return weeklyTimeRegex.test(time);
    } else {
      // Pour les heures journalières, on garde la limite de 23:59
      const dailyTimeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      return dailyTimeRegex.test(time);
    }
  };

  const handleTimeChange = (field: keyof SiteSettingsType) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Paramètres du site
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Heures de travail par jour"
            value={settings.workHoursPerDay}
            onChange={handleTimeChange('workHoursPerDay')}
            placeholder="HH:mm"
            helperText="Format: HH:mm (ex: 07:24)"
            error={!validateTimeFormat(settings.workHoursPerDay)}
            inputProps={{
              pattern: "[0-2][0-9]:[0-5][0-9]"
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Heures de travail par semaine"
            value={settings.workHoursPerWeek}
            onChange={handleTimeChange('workHoursPerWeek')}
            placeholder="HH:mm"
            helperText="Format: HH:mm (ex: 37:00)"
            error={!validateTimeFormat(settings.workHoursPerWeek, true)}
            inputProps={{
              pattern: "[0-9]{1,3}:[0-5][0-9]"
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              onClick={handleSaveSettings}
              disabled={saving || !validateTimeFormat(settings.workHoursPerDay) || !validateTimeFormat(settings.workHoursPerWeek, true)}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};
