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
import AdvancedStats from '../components/statistics/AdvancedStats';
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
  previousWeekTime: number;
  averageDaily: number;
  activeProjects: number;
  activeTasks: number;
  timeData: Array<{ date: string; duration: number }>;
  projectData: Array<{ projectName: string; totalTime: number }>;
}

const Dashboard: React.FC = () => {
  const { currentUser, userRole } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<DashboardStats>({
    todayTime: 0,
    weekTime: 0,
    previousWeekTime: 0,
    averageDaily: 0,
    activeProjects: 0,
    activeTasks: 0,
    timeData: [],
    projectData: [],
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

      let todayTime = 0;
      let weekTime = 0;
      let previousWeekTime = 0;
      const uniqueTasks = new Set();
      const projectTimes = new Map();
      const dailyTimes = new Map();

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const startOfPreviousWeek = new Date(startOfWeek);
      startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);

      // Initialiser les jours de la semaine
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        dailyTimes.set(date.toISOString().split('T')[0], 0);
      }

      timeEntriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startTime = data.startTime.toDate();
        const duration = data.duration || 0;
        const projectId = data.projectId;

        // Temps du jour et de la semaine
        if (startTime >= startOfWeek) {
          weekTime += duration;
          const dateStr = startTime.toISOString().split('T')[0];
          dailyTimes.set(dateStr, (dailyTimes.get(dateStr) || 0) + duration);
          
          if (startTime >= startOfToday) {
            todayTime += duration;
          }
        } else if (startTime >= startOfPreviousWeek) {
          previousWeekTime += duration;
        }

        // Temps par projet
        if (projectId) {
          projectTimes.set(projectId, (projectTimes.get(projectId) || 0) + duration);
        }

        if (data.notes) {
          uniqueTasks.add(data.notes);
        }
      });

      // Calculer la moyenne quotidienne
      const averageDaily = weekTime / 7;

      // Préparer les données pour les graphiques
      const timeData = Array.from(dailyTimes.entries()).map(([date, duration]) => ({
        date,
        duration,
      }));

      // Préparer les données des projets
      const projectData = await Promise.all(
        Array.from(projectTimes.entries()).map(async ([projectId, totalTime]) => {
          const projectDoc = projectsSnapshot.docs.find(doc => doc.id === projectId);
          return {
            projectName: projectDoc?.data()?.name || 'Unknown Project',
            totalTime,
          };
        })
      );

      // Trier les projets par temps total décroissant et prendre les 5 premiers
      projectData.sort((a, b) => b.totalTime - a.totalTime);
      const top5Projects = projectData.slice(0, 5);

      setStats({
        todayTime,
        weekTime,
        previousWeekTime,
        averageDaily,
        activeProjects: projectsSnapshot.size,
        activeTasks: uniqueTasks.size,
        timeData,
        projectData: top5Projects,
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
        {/* Cartes de statistiques rapides */}
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

        {/* Statistiques avancées */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('statistics.advanced')}
            </Typography>
            <AdvancedStats
              timeData={stats.timeData}
              projectData={stats.projectData}
              weeklyComparison={{
                currentWeek: stats.weekTime,
                previousWeek: stats.previousWeekTime,
              }}
              averageDaily={stats.averageDaily}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('timeStats.weeklyReport')}
            </Typography>
            <WeeklyReport />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
