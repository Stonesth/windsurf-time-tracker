import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { TimeTracker } from '../components/TimeTracker';
import { ProjectList } from '../components/ProjectList';
import { WeeklyReport } from '../components/WeeklyReport';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration } from '../utils/timeUtils';

interface DashboardStats {
  todayTime: number;
  weekTime: number;
  activeProjects: number;
  activeTasks: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayTime: 0,
    weekTime: 0,
    activeProjects: 0,
    activeTasks: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Calculer les dates de début pour aujourd'hui et cette semaine
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Requête unique pour toutes les entrées de temps
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid)
      );

      // Requête pour les projets actifs
      const projectsQuery = query(
        collection(db, 'projects'),
        where('createdBy', '==', currentUser.uid)
      );

      // Exécuter les requêtes en parallèle
      const [timeEntriesSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(timeEntriesQuery),
        getDocs(projectsQuery)
      ]);

      // Filtrer et calculer les statistiques
      const todayTime = timeEntriesSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        const startTime = data.startTime.toDate();
        return startTime >= startOfToday ? sum + data.duration : sum;
      }, 0);

      const weekTime = timeEntriesSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        const startTime = data.startTime.toDate();
        return startTime >= startOfWeek ? sum + data.duration : sum;
      }, 0);

      const activeProjects = projectsSnapshot.size;

      // Compter les tâches uniques (basé sur les descriptions uniques)
      const uniqueTasks = new Set();
      timeEntriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startTime = data.startTime.toDate();
        if (startTime >= startOfWeek && data.notes) {
          uniqueTasks.add(data.notes);
        }
      });

      setStats({
        todayTime,
        weekTime,
        activeProjects,
        activeTasks: uniqueTasks.size,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleNewProject = () => {
    navigate('/projects', { state: { openNewProject: true } });
  };

  const handleTimeUpdate = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* En-tête */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" component="h1" gutterBottom>
              Tableau de bord
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleNewProject}
            >
              Nouveau Projet
            </Button>
          </Box>
        </Grid>

        {/* Statistiques rapides */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Temps aujourd'hui
                  </Typography>
                  <Typography variant="h5">
                    {formatDuration(stats.todayTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Temps cette semaine
                  </Typography>
                  <Typography variant="h5">
                    {formatDuration(stats.weekTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Projets actifs
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeProjects}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Tâches uniques
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Suivi du temps en cours */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Suivi du temps
            </Typography>
            <TimeTracker onTimeUpdate={handleTimeUpdate} />
          </Paper>
        </Grid>

        {/* Rapport hebdomadaire */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Rapport hebdomadaire
            </Typography>
            <WeeklyReport onTimeUpdate={handleTimeUpdate} />
          </Paper>
        </Grid>

        {/* Liste des projets */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Projets récents
            </Typography>
            <ProjectList onTimeUpdate={handleTimeUpdate} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
