import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  CardContent,
  Alert,
  CircularProgress,
  Card,
} from '@mui/material';
import TimeStats from '../components/time/TimeStats';
import WeeklyReport from '../components/time/WeeklyReport';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from '../utils/timeUtils';
import { canWrite } from '../utils/roleUtils';
import { useTranslation } from 'react-i18next';

interface DashboardStats {
  todayTime: number;
  weekTime: number;
  activeProjects: number;
  activeTasks: number;
}

const Dashboard: React.FC = () => {
  const { currentUser, userRole } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(true);
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
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid)
      );

      const projectsQuery = query(
        collection(db, 'projects'),
        where('createdBy', '==', currentUser.uid)
      );

      const [timeEntriesSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(timeEntriesQuery),
        getDocs(projectsQuery)
      ]);

      console.log('Nombre d\'entrées de temps:', timeEntriesSnapshot.size);
      console.log('Nombre de projets:', projectsSnapshot.size);

      let todayTime = 0;
      let weekTime = 0;
      const uniqueTasks = new Set();

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      timeEntriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('Entrée de temps:', data);
        const startTime = data.startTime.toDate();
        const duration = data.duration || 0;

        if (startTime >= startOfWeek) {
          weekTime += duration;
          if (startTime >= startOfToday) {
            todayTime += duration;
          }
        }
        if (data.notes) {
          uniqueTasks.add(data.notes);
        }
      });

      console.log('Statistiques calculées:', {
        todayTime,
        weekTime,
        activeProjects: projectsSnapshot.size,
        activeTasks: uniqueTasks.size,
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

  React.useEffect(() => {
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('nav.dashboard')}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('timeTracker.title')}
            </Typography>
            {/* <TimeTracker /> */}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('timeStats.title')}
            </Typography>
            <TimeStats />
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('timeStats.weeklyReport')}
            </Typography>
            <WeeklyReport />
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.todayTime')}
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
                    {t('dashboard.weekTime')}
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
                    {t('dashboard.activeProjects')}
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
                    {t('dashboard.activeTasks')}
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
