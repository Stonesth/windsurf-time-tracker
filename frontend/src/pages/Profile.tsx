import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, updateUserProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: currentUser?.displayName || '',
    email: currentUser?.email || '',
    language: i18n.language,
    theme: 'light',
    notifications: true,
  });

  const handleLanguageChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newLanguage = event.target.value as string;
    setFormData({ ...formData, language: newLanguage });
    i18n.changeLanguage(newLanguage);
  };

  const handleThemeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFormData({ ...formData, theme: event.target.value as string });
    // TODO: Implement theme change logic
  };

  const handleNotificationsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, notifications: event.target.checked });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateUserProfile({
        displayName: formData.name,
      });
      // TODO: Save other preferences to user's profile in database
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('profile.title')}
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('profile.personalInfo')}
              </Typography>
              <TextField
                fullWidth
                label={t('profile.name')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label={t('common.email')}
                value={formData.email}
                disabled
                margin="normal"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                {t('profile.settings')}
              </Typography>

              <FormControl fullWidth margin="normal">
                <InputLabel id="language-select-label">
                  {t('profile.language')}
                </InputLabel>
                <Select
                  labelId="language-select-label"
                  value={formData.language}
                  label={t('profile.language')}
                  onChange={handleLanguageChange}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="nl">Nederlands</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel id="theme-select-label">
                  {t('profile.theme')}
                </InputLabel>
                <Select
                  labelId="theme-select-label"
                  value={formData.theme}
                  label={t('profile.theme')}
                  onChange={handleThemeChange}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.notifications}
                    onChange={handleNotificationsChange}
                    color="primary"
                  />
                }
                label={t('profile.notifications')}
                sx={{ mt: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                >
                  {t('common.save')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;
