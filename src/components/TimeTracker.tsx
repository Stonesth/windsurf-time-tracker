import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  Grid,
  IconButton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import { timeEntryService, TimeEntry } from '../services/timeEntryService';
import { projectService } from '../services/projectService';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
}

export const TimeTracker: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, entriesData, activeTimerData] = await Promise.all([
        projectService.getAllProjects(),
        timeEntryService.getAllTimeEntries(),
        timeEntryService.getActiveTimer(),
      ]);
      setProjects(projectsData);
      setTimeEntries(entriesData);
      setActiveTimer(activeTimerData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleStartTimer = async () => {
    if (!selectedProject || !description) return;

    try {
      const newTimer = await timeEntryService.startTimer(selectedProject, description);
      setActiveTimer(newTimer);
      setTimeEntries([...timeEntries, newTimer]);
      setDescription('');
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;

    try {
      const stoppedTimer = await timeEntryService.stopTimer(activeTimer.id!);
      setActiveTimer(null);
      setTimeEntries(
        timeEntries.map((entry) =>
          entry.id === stoppedTimer.id ? stoppedTimer : entry
        )
      );
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await timeEntryService.deleteTimeEntry(entryId);
      setTimeEntries(timeEntries.filter((entry) => entry.id !== entryId));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffInMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                value={selectedProject}
                label="Project"
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={!!activeTimer}
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!!activeTimer}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            {!activeTimer ? (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartTimer}
                disabled={!selectedProject || !description}
              >
                Start
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<StopIcon />}
                onClick={handleStopTimer}
              >
                Stop
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" gutterBottom>
        Recent Time Entries
      </Typography>

      {timeEntries
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .map((entry) => (
          <Paper key={entry.id} sx={{ p: 2, mb: 2 }}>
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} sm={3}>
                <Typography variant="subtitle1">
                  {projects.find((p) => p.id === entry.projectId)?.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography>{entry.description}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography>
                  {format(new Date(entry.startTime), 'MMM d, HH:mm')} -{' '}
                  {entry.endTime
                    ? format(new Date(entry.endTime), 'HH:mm')
                    : 'Running'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatDuration(entry.startTime, entry.endTime)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={2}>
                {!entry.isRunning && (
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteEntry(entry.id!)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          </Paper>
        ))}
    </Box>
  );
};
