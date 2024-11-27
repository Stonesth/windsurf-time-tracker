import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { canWrite } from '../../utils/roleUtils';

interface Project {
  id: string;
  name: string;
}

interface TimeTrackerProps {
  onTimeUpdate: () => void;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ onTimeUpdate }) => {
  const { currentUser, userRole } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUser) return;

      try {
        const projectsQuery = query(
          collection(db, 'projects'),
          where('createdBy', '==', currentUser.uid)
        );
        const snapshot = await getDocs(projectsQuery);
        const projectsList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setProjects(projectsList);
      } catch (error) {
        console.error('Erreur lors de la récupération des projets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentUser]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTracking && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
        onTimeUpdate();
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTracking, isPaused, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!selectedProject) {
      alert('Veuillez sélectionner un projet');
      return;
    }
    setIsTracking(true);
    setIsPaused(false);
    setStartTime(Date.now());
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = async () => {
    if (!currentUser || !startTime) return;

    try {
      const endTime = Date.now();
      const duration = Math.floor((endTime - startTime) / 1000); // Durée en secondes

      await addDoc(collection(db, 'timeEntries'), {
        userId: currentUser.uid,
        projectId: selectedProject,
        startTime: Timestamp.fromMillis(startTime),
        endTime: Timestamp.fromMillis(endTime),
        duration: duration,
        notes: description,
      });

      setIsTracking(false);
      setIsPaused(false);
      setElapsedTime(0);
      setStartTime(null);
      setDescription('');
      onTimeUpdate(); // Rafraîchir les données après l'enregistrement
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'entrée de temps:', error);
      alert('Une erreur est survenue lors de l\'enregistrement');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Projet</InputLabel>
            <Select
              value={selectedProject}
              label="Projet"
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={isTracking || !canWrite(userRole)}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isTracking || !canWrite(userRole)}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <Typography variant="h4" component="div" align="center">
            {formatTime(elapsedTime)}
          </Typography>
        </Grid>

        <Grid item xs={12} md={2}>
          <Box display="flex" gap={1} justifyContent="flex-end">
            {!isTracking ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleStart}
                disabled={!selectedProject || !canWrite(userRole)}
              >
                Démarrer
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handlePause}
                    disabled={!canWrite(userRole)}
                  >
                    <PauseIcon />
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleResume}
                    disabled={!canWrite(userRole)}
                  >
                    <PlayArrowIcon />
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleStop}
                  disabled={!canWrite(userRole)}
                >
                  <StopIcon />
                </Button>
              </>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TimeTracker;
