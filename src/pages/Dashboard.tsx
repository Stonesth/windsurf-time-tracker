import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Paper,
  CardContent,
  Alert,
  CircularProgress,
  Card,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TimeTracker from '../components/time/TimeTracker';
import TimeStats from '../components/time/TimeStats';
import ProjectList from '../components/projects/ProjectList';
import WeeklyReport from '../components/time/WeeklyReport';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '../utils/timeUtils';
import { apiService } from '../services/apiService';

interface DashboardStats {
  todayTime: number;
  weekTime: number;
  activeProjects: number;
  activeTasks: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [authStatus, setAuthStatus] = React.useState<string>('');
  const [authError, setAuthError] = React.useState<string>('');
  const [stats, setStats] = React.useState<DashboardStats>({
    todayTime: 0,
    weekTime: 0,
    activeProjects: 0,
    activeTasks: 0,
  });

  const fetchStats = React.useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid),
        where('startTime', '>=', Timestamp.fromDate(startOfWeek))
      );

      const projectsQuery = query(
        collection(db, 'projects'),
        where('createdBy', '==', currentUser.uid)
      );

      const [timeEntriesSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(timeEntriesQuery),
        getDocs(projectsQuery)
      ]);

      let todayTime = 0;
      let weekTime = 0;
      const uniqueTasks = new Set();

      timeEntriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startTime = data.startTime.toDate();
        const duration = data.duration || 0;

        weekTime += duration;
        if (startTime >= startOfToday) {
          todayTime += duration;
        }
        if (data.notes) {
          uniqueTasks.add(data.notes);
        }
      });

      setStats({
        todayTime,
        weekTime,
        activeProjects: projectsSnapshot.size,
        activeTasks: uniqueTasks.size,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const testBackendAuth = async () => {
    try {
      const result = await apiService.testAuth();
      setAuthStatus(`Authentifié en tant que : ${result.email}`);
      setAuthError('');
    } catch (err) {
      setAuthError('Erreur d\'authentification avec le backend');
      setAuthStatus('');
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleNewProject = () => {
    navigate('/projects', { state: { openNewProject: true } });
  };

  const handleTimeUpdate = React.useCallback(() => {
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
      <Box sx={{ my: 4 }}>
        {/* Test Backend Auth */}
        <Box sx={{ mb: 4 }}>
          <Button 
            variant="contained" 
            onClick={testBackendAuth}
            sx={{ mb: 2 }}
          >
            Tester l'authentification backend
          </Button>
          {authStatus && (
            <Alert severity="success" sx={{ mb: 1 }}>
              {authStatus}
            </Alert>
          )}
          {authError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {authError}
            </Alert>
          )}
        </Box>

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

          {/* Statistiques du temps */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Statistiques du temps
              </Typography>
              <TimeStats />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
