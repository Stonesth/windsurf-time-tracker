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
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const Profile = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const storage = getStorage();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    
    try {
      const file = event.target.files[0];
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'Access-Control-Allow-Origin': '*'
        }
      };
      const storageRef = ref(storage, `profile-photos/${user?.uid}`);
      await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(storageRef);
      setPhotoURL(downloadURL);
      
      // Mettre à jour le profil immédiatement après le téléchargement réussi
      if (user) {
        await updateProfile(user, {
          photoURL: downloadURL
        });
      }
      
      setNotification({
        open: true,
        message: 'Photo de profil mise à jour avec succès',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setNotification({
        open: true,
        message: 'Erreur lors du téléchargement de la photo',
        severity: 'error'
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      await updateProfile(user, {
        displayName,
        photoURL
      });

      setIsEditing(false);
      setNotification({
        open: true,
        message: 'Profil mis à jour avec succès',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: 'Erreur lors de la mise à jour du profil',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} display="flex" justifyContent="center">
            <Box position="relative">
              <Avatar
                src={photoURL}
                sx={{ width: 120, height: 120 }}
                alt={displayName}
              />
              {isEditing && (
                <Button
                  component="label"
                  variant="contained"
                  size="small"
                  sx={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)' }}
                >
                  Changer
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </Button>
              )}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h5" gutterBottom textAlign="center">
              Mon Profil
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nom d'affichage"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={!isEditing}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              value={email}
              disabled
              margin="normal"
            />
          </Grid>

          <Grid item xs={12} display="flex" justifyContent="center" gap={2}>
            {!isEditing ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsEditing(true)}
              >
                Modifier
              </Button>
            ) : (
              <>
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
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity as 'success' | 'error'}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile;
