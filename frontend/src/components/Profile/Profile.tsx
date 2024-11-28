import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Avatar,
  Grid,
  Box,
  Snackbar,
  Alert
} from '@mui/material';
import { getAuth, updateProfile } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';

const Profile = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const { userRole } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrateur';
      case UserRole.PROJECT_LEADER:
        return 'Chef de projet';
      case UserRole.USER:
        return 'Utilisateur';
      case UserRole.READ:
        return 'Lecture seule';
      default:
        return 'Non défini';
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateProfile(user, {
        displayName: displayName,
      });

      setIsEditing(false);
      setNotification({
        open: true,
        message: 'Profil mis à jour avec succès',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      setNotification({
        open: true,
        message: 'Erreur lors de la mise à jour du profil',
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{ width: 100, height: 100 }}
                alt={displayName}
              >
                {displayName?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h5" gutterBottom>
                  Profil Utilisateur
                </Typography>
                <Typography color="textSecondary">
                  Rôle: {getRoleLabel(userRole)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box component="form" noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nom d'affichage"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={email}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  {!isEditing ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setIsEditing(true)}
                    >
                      Modifier
                    </Button>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSave}
                      >
                        Enregistrer
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setIsEditing(false)}
                      >
                        Annuler
                      </Button>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity as 'success' | 'error'}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile;
