import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface StatsData {
  totalHours: number;
  entriesCount: number;
  averageDuration: number;
  projectBreakdown: {
    [projectId: string]: {
      hours: number;
      percentage: number;
    };
  };
}

const TimeStats: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [projects, setProjects] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer les entrées de temps
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid)
      );

      // Récupérer les projets
      const projectsQuery = query(
        collection(db, 'projects'),
        where('createdBy', '==', currentUser.uid)
      );

      const [timeEntriesSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(timeEntriesQuery),
        getDocs(projectsQuery)
      ]);

      // Créer un map des projets
      const projectMap = projectsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().name;
        return acc;
      }, {} as { [key: string]: string });

      // Calculer les statistiques
      let totalDuration = 0;
      const projectBreakdown: { [key: string]: number } = {};

      timeEntriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const duration = data.duration || 0;
        totalDuration += duration;

        if (data.projectId) {
          projectBreakdown[data.projectId] = (projectBreakdown[data.projectId] || 0) + duration;
        }
      });

      // Calculer les pourcentages pour chaque projet
      const statsData: StatsData = {
        totalHours: totalDuration / 60, // Convertir en heures
        entriesCount: timeEntriesSnapshot.size,
        averageDuration: timeEntriesSnapshot.size ? totalDuration / timeEntriesSnapshot.size : 0,
        projectBreakdown: Object.entries(projectBreakdown).reduce((acc, [projectId, duration]) => {
          acc[projectId] = {
            hours: duration / 60,
            percentage: (duration / totalDuration) * 100
          };
          return acc;
        }, {} as StatsData['projectBreakdown'])
      };

      setStats(statsData);
      setProjects(projectMap);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography>Aucune statistique disponible</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Statistiques détaillées
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Heures totales
              </Typography>
              <Typography variant="h5">
                {stats.totalHours.toFixed(1)}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Nombre d'entrées
              </Typography>
              <Typography variant="h5">
                {stats.entriesCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Durée moyenne
              </Typography>
              <Typography variant="h5">
                {(stats.averageDuration / 60).toFixed(1)}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
          Répartition par projet
        </Typography>
        {Object.entries(stats.projectBreakdown).map(([projectId, data]) => (
          <Box key={projectId} mb={2}>
            <Typography variant="subtitle1">
              {projects[projectId] || 'Projet inconnu'} - {data.hours.toFixed(1)}h ({data.percentage.toFixed(1)}%)
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default TimeStats;
