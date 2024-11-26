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
import { timeEntryService } from '../../services/timeEntryService';
import { projectService } from '../../services/projectService';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, projectsData] = await Promise.all([
        timeEntryService.getTimeStats(),
        projectService.getAllProjects(),
      ]);
      
      // Créer un map des projets pour un accès rapide
      const projectMap = projectsData.reduce((acc, project) => {
        acc[project.id] = project.name;
        return acc;
      }, {} as { [key: string]: string });

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Typography color="text.secondary">
        No statistics available yet. Start tracking time to see your stats!
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Time Tracking Statistics
      </Typography>
      
      <Grid container spacing={3}>
        {/* Statistiques générales */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Hours
              </Typography>
              <Typography variant="h4">
                {stats.totalHours.toFixed(1)}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Number of Entries
              </Typography>
              <Typography variant="h4">
                {stats.entriesCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Average Duration
              </Typography>
              <Typography variant="h4">
                {stats.averageDuration.toFixed(1)}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Répartition par projet */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Time Distribution by Project
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(stats.projectBreakdown).map(([projectId, data]) => (
                <Grid item xs={12} key={projectId}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1">
                      {projects[projectId] || 'Unknown Project'}
                    </Typography>
                    <Box
                      sx={{
                        height: 20,
                        width: '100%',
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${data.percentage}%`,
                          bgcolor: 'primary.main',
                          position: 'absolute',
                          transition: 'width 0.5s ease-in-out',
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {data.hours.toFixed(1)}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {data.percentage.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TimeStats;
