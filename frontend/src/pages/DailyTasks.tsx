import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  MenuItem as MenuItemMui,
} from '@mui/material';
import { 
  Add as AddIcon, 
  PlayArrow, 
  Stop, 
  Timer, 
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';

interface TimeEntry {
  id: string;
  projectId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  task?: string;
  tags?: string[];
  userId: string;
  isRunning?: boolean;
}

interface NewTaskData {
  projectId: string;
  task: string;
  tags: string;
}

const DailyTasks = () => {
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<TimeEntry[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimeEntry | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editTaskData, setEditTaskData] = useState<NewTaskData>({
    projectId: '',
    task: '',
    tags: '',
  });

  // Timer state
  const [timers, setTimers] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const intervals: { [key: string]: NodeJS.Timeout } = {};

    // Update timers every second for running tasks
    todaysTasks.forEach(task => {
      if (task.isRunning) {
        const startTime = task.startTime.getTime();
        const initialDuration = task.duration || 0;
        
        intervals[task.id] = setInterval(() => {
          const now = new Date().getTime();
          const elapsed = Math.floor((now - startTime) / 1000) + initialDuration;
          setTimers(prev => ({ ...prev, [task.id]: elapsed }));
        }, 1000);
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [todaysTasks]);

  const handleStartTimer = async (taskId: string) => {
    try {
      const task = todaysTasks.find(t => t.id === taskId);
      if (!task) return;

      // Arrêter la tâche en cours s'il y en a une
      const runningTask = todaysTasks.find(t => t.isRunning);
      if (runningTask) {
        await handleStopTimer(runningTask.id);
      }

      const now = new Date();
      const newTimeEntry = {
        projectId: task.projectId,
        userId: currentUser?.uid,
        startTime: Timestamp.fromDate(now),
        endTime: null,
        duration: 0,
        task: task.task,
        tags: task.tags || [],
        isRunning: true
      };

      const docRef = await addDoc(collection(db, 'timeEntries'), newTimeEntry);
      
      const newTask = {
        id: docRef.id,
        ...newTimeEntry,
        startTime: now,
        endTime: null,
      } as TimeEntry;

      setTodaysTasks(prev => [newTask, ...prev]);
    } catch (error) {
      console.error('Erreur lors du démarrage du chronomètre:', error);
      setError('Impossible de démarrer le chronomètre');
    }
  };

  const handleStopTimer = async (taskId: string) => {
    try {
      const task = todaysTasks.find(t => t.id === taskId);
      if (!task) return;

      const now = new Date();
      const duration = timers[taskId] || task.duration || 0;

      await updateDoc(doc(db, 'timeEntries', taskId), {
        endTime: Timestamp.fromDate(now),
        isRunning: false,
        duration
      });

      setTodaysTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, endTime: now, isRunning: false, duration }
          : t
      ));
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du chronomètre:', error);
      setError('Impossible d\'arrêter le chronomètre');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  };

  useEffect(() => {
    const fetchTodaysTasks = async () => {
      if (!currentUser) return;

      try {
        setError(null);
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));

        const timeEntriesQuery = query(
          collection(db, 'timeEntries'),
          where('userId', '==', currentUser.uid),
          where('startTime', '>=', Timestamp.fromDate(startOfDay)),
          orderBy('startTime', 'desc'),
          limit(50)
        );

        const snapshot = await getDocs(timeEntriesQuery);
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime?.toDate() || null,
        })) as TimeEntry[];

        setTodaysTasks(tasks);
      } catch (error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        setError('Impossible de charger les tâches. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysTasks();
  }, [currentUser]);

  const handleNewTask = async () => {
    if (!currentUser || !projects.length) {
      setError('Aucun projet disponible');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Arrêter la tâche en cours s'il y en a une
      const runningTask = todaysTasks.find(t => t.isRunning);
      if (runningTask) {
        await handleStopTimer(runningTask.id);
      }

      const now = new Date();
      // Utiliser le premier projet disponible par défaut
      const defaultProject = projects[0];
      
      const newTimeEntry = {
        projectId: defaultProject.id,
        userId: currentUser.uid,
        startTime: Timestamp.fromDate(now),
        endTime: null,
        duration: 0,
        task: '',
        tags: [],
        isRunning: true
      };

      const docRef = await addDoc(collection(db, 'timeEntries'), newTimeEntry);
      
      const newTask = {
        id: docRef.id,
        ...newTimeEntry,
        startTime: now,
        endTime: null,
      } as TimeEntry;

      setTodaysTasks(prev => [newTask, ...prev]);

      // Ouvrir directement le dialogue d'édition
      setSelectedTask(newTask);
      setEditTaskData({
        projectId: newTask.projectId,
        task: '',
        tags: '',
      });
      setTimeout(() => setOpenEditDialog(true), 100);
    } catch (error) {
      console.error('Erreur lors de la création de la tâche:', error);
      setError('Impossible de créer la tâche. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, task: TimeEntry) => {
    setAnchorEl(event.currentTarget);
    setSelectedTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    if (selectedTask) {
      setEditTaskData({
        projectId: selectedTask.projectId,
        task: selectedTask.task || '',
        tags: selectedTask.tags?.join(', ') || '',
      });
      setOpenEditDialog(true);
    }
    handleMenuClose();
  };

  const handleEditSubmit = async () => {
    if (!selectedTask) return;

    try {
      setLoading(true);
      setError(null);

      const updatedData = {
        projectId: editTaskData.projectId,
        task: editTaskData.task,
        tags: editTaskData.tags ? editTaskData.tags.split(',').map(tag => tag.trim()) : [],
      };

      await updateDoc(doc(db, 'timeEntries', selectedTask.id), updatedData);

      setTodaysTasks(prev => prev.map(task => 
        task.id === selectedTask.id
          ? { ...task, ...updatedData }
          : task
      ));

      setOpenEditDialog(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Erreur lors de la modification de la tâche:', error);
      setError('Impossible de modifier la tâche');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedTask) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      try {
        setLoading(true);
        setError(null);

        await deleteDoc(doc(db, 'timeEntries', selectedTask.id));
        setTodaysTasks(prev => prev.filter(task => task.id !== selectedTask.id));

      } catch (error) {
        console.error('Erreur lors de la suppression de la tâche:', error);
        setError('Impossible de supprimer la tâche');
      } finally {
        setLoading(false);
      }
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Tâches du Jour
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewTask}
        >
          Nouvelle Tâche
        </Button>
      </Box>

      <Grid container spacing={3}>
        {todaysTasks.map((task) => (
          <Grid item xs={12} key={task.id}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box flex={1}>
                  <Typography variant="h6" component="h2">
                    {task.task || 'Sans description'}
                  </Typography>
                  <Typography color="textSecondary">
                    Projet: {projects.find(p => p.id === task.projectId)?.name || 'Inconnu'}
                  </Typography>
                  {task.tags && task.tags.length > 0 && (
                    <Box mt={1}>
                      {task.tags.map((tag, index) => (
                        <Typography
                          key={index}
                          component="span"
                          sx={{
                            backgroundColor: 'primary.main',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            mr: 1,
                            fontSize: '0.8rem',
                          }}
                        >
                          {tag}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box textAlign="right">
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="body2" color="textSecondary">
                        Début: {task.startTime.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    {task.endTime && (
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="body2" color="textSecondary">
                          Fin: {task.endTime.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={1}>
                      <Timer fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary">
                        {task.isRunning 
                          ? formatDuration(timers[task.id] || 0)
                          : formatDuration(task.duration || 0)
                        }
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    {!task.isRunning ? (
                      <Tooltip title="Démarrer">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleStartTimer(task.id)}
                          size="small"
                        >
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Arrêter">
                        <IconButton 
                          color="error" 
                          onClick={() => handleStopTimer(task.id)}
                          size="small"
                        >
                          <Stop />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, task)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Menu contextuel */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItemMui onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItemMui>
        <MenuItemMui onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItemMui>
      </Menu>

      {/* Dialog de modification */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Modifier la tâche</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              select
              fullWidth
              label="Projet"
              value={editTaskData.projectId}
              onChange={(e) => setEditTaskData({ ...editTaskData, projectId: e.target.value })}
              sx={{ mb: 2 }}
            >
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Description de la tâche"
              value={editTaskData.task}
              onChange={(e) => setEditTaskData({ ...editTaskData, task: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Tags (séparés par des virgules)"
              value={editTaskData.tags}
              onChange={(e) => setEditTaskData({ ...editTaskData, tags: e.target.value })}
              helperText="Ex: urgent, bug, feature"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Annuler</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DailyTasks;
