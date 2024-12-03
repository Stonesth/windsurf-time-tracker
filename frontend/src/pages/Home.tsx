import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Paper, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Timer, 
  Dashboard, 
  Assessment, 
  Group, 
  Security,
  Notifications 
} from '@mui/icons-material';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(3),
  marginTop: theme.spacing(8),
}));

const Home = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);

  const handleStartClick = () => {
    navigate('/dashboard');
  };

  const handleLearnMoreClick = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  return (
    <Container maxWidth="md">
      <StyledPaper elevation={3}>
        <Typography variant="h3" component="h1" gutterBottom>
          TimeTracker
        </Typography>
        <Typography variant="h5" color="textSecondary" align="center">
          Gérez votre temps efficacement
        </Typography>
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={handleStartClick}
          >
            Commencer
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            size="large"
            onClick={handleLearnMoreClick}
          >
            En savoir plus
          </Button>
        </Box>
      </StyledPaper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>
          <Typography variant="h4" align="center">
            À propos de TimeTracker
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            TimeTracker est une application complète de gestion du temps conçue pour vous aider à maximiser votre productivité et à mieux organiser votre travail.
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <Timer color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Suivi du temps en temps réel" 
                secondary="Enregistrez facilement le temps passé sur vos différentes tâches et projets"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Dashboard color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Tableau de bord intuitif" 
                secondary="Visualisez vos statistiques et votre progression en un coup d'œil"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Assessment color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Rapports détaillés" 
                secondary="Générez des rapports personnalisés pour analyser votre productivité"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Group color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Gestion d'équipe" 
                secondary="Collaborez efficacement avec votre équipe et suivez les progrès collectifs"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Notifications color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Rappels intelligents" 
                secondary="Recevez des notifications pour rester sur la bonne voie"
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <Security color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Sécurité garantie" 
                secondary="Vos données sont protégées avec les plus hauts standards de sécurité"
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Fermer
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              handleCloseDialog();
              handleStartClick();
            }}
          >
            Commencer maintenant
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home;
