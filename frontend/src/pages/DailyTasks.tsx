import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  IconButton,
  Paper,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  MenuItem,
  useTheme,
  useMediaQuery,
  Collapse,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow,
  Stop,
  Timer,
  Edit as EditIcon,
  KeyboardArrowDown,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import fr from 'date-fns/locale/fr';
import TotalTimeDisplay from '../components/timer/TotalTimeDisplay';
import { useTranslation } from 'react-i18next';

interface TimeEntry {
  id: string;
  projectId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  task?: string;
  notes?: string;
  tags?: string[];
  userId: string;
  isRunning?: boolean;
}

interface NewTaskData {
  projectId: string;
  task: string;
  tags: string;
}

interface GroupedTimeEntry {
  projectId: string;
  task: string;
  entries: TimeEntry[];
  totalDuration: number;
  isRunning: boolean;
}

interface EditTimeEntryData {
  startTime: Date;
  endTime: Date | null;
  task: string;
  notes?: string;
  tags: string[];
  projectId: string;
}

const DailyTasks = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<TimeEntry[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimeEntry | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editTaskData, setEditTaskData] = useState<NewTaskData>({
    projectId: '',
    task: '',
    tags: '',
  });
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [timers, setTimers] = useState<{ [key: string]: number }>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editTimeEntryId, setEditTimeEntryId] = useState<string | null>(null);
  const [editTimeEntryData, setEditTimeEntryData] = useState<EditTimeEntryData>({
    startTime: new Date(),
    endTime: null,
    task: '',
    notes: '',
    tags: [],
    projectId: ''
  });
  const [openEditTimeEntryDialog, setOpenEditTimeEntryDialog] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  };

  const formatTimeToLocale = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

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

        // Filtrer les tâches pour n'avoir que celles du jour sélectionné
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const filteredTasks = tasks.filter(task => {
          const taskDate = task.startTime;
          return taskDate >= startOfDay && taskDate <= endOfDay;
        });

        setTodaysTasks(filteredTasks);
      } catch (error) {
        console.error('Erreur lors de la récupération des tâches:', error);
        setError('Impossible de charger les tâches. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentUser, selectedDate]);

  useEffect(() => {
    const intervals: { [key: string]: NodeJS.Timeout } = {};

    todaysTasks.forEach(task => {
      if (task.isRunning) {
        const startTime = task.startTime.getTime();
        const initialDuration = task.duration || 0;

        setTimers(prev => ({
          ...prev,
          [task.id]: Math.floor((Date.now() - startTime) / 1000) + initialDuration
        }));

        intervals[task.id] = setInterval(() => {
          setTimers(prev => ({
            ...prev,
            [task.id]: Math.floor((Date.now() - startTime) / 1000) + initialDuration
          }));
        }, 1000);
      } else {
        setTimers(prev => ({
          ...prev,
          [task.id]: task.duration || 0
        }));
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

      // Arrêter toutes les autres tâches en cours
      const runningTasks = todaysTasks.filter(t => t.isRunning);
      for (const runningTask of runningTasks) {
        await handleStopTimer(runningTask.id);
      }

      const now = new Date();

      // Créer une nouvelle entrée de temps
      const newTimeEntry = {
        projectId: task.projectId,
        userId: currentUser?.uid,
        startTime: Timestamp.fromDate(now),
        endTime: null,
        duration: 0,
        task: task.task,
        notes: task.notes || '',
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

      setTimers(prev => ({
        ...prev,
        [docRef.id]: 0
      }));

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
      const elapsedTime = Math.floor((now.getTime() - task.startTime.getTime()) / 1000);
      const newDuration = (task.duration || 0) + elapsedTime;

      const taskRef = doc(db, 'timeEntries', taskId);
      await updateDoc(taskRef, {
        endTime: Timestamp.fromDate(now),
        isRunning: false,
        duration: newDuration
      });

      const updatedTask = {
        ...task,
        endTime: now,
        isRunning: false,
        duration: newDuration
      };

      setTodaysTasks(prev =>
        prev.map(t => (t.id === taskId ? updatedTask : t))
      );

      setTimers(prev => ({
        ...prev,
        [taskId]: newDuration
      }));

    } catch (error) {
      console.error('Erreur lors de l\'arrêt du chronomètre:', error);
      setError('Impossible d\'arrêter le chronomètre');
    }
  };

  const handleNewTask = async () => {
    if (!currentUser) {
      setError('Utilisateur non connecté');
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
      const newTimeEntry = {
        projectId: '', // Pas de projet par défaut
        userId: currentUser.uid,
        startTime: Timestamp.fromDate(now),
        endTime: null,
        duration: 0,
        task: '',
        notes: '',
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
    try {
      setLoading(true);
      setError(null);

      const updatedData = {
        projectId: editTaskData.projectId,
        task: editTaskData.task,
        tags: editTaskData.tags ? editTaskData.tags.split(',').map(tag => tag.trim()) : [],
      };

      if (selectedTask) {
        // Mode édition
        await updateDoc(doc(db, 'timeEntries', selectedTask.id), updatedData);

        setTodaysTasks(prev => prev.map(task =>
          task.id === selectedTask.id
            ? { ...task, ...updatedData }
            : task
        ));
      } else {
        // Mode création
        const now = new Date();
        const newTimeEntry = {
          ...updatedData,
          userId: currentUser?.uid,
          startTime: Timestamp.fromDate(now),
          endTime: null,
          duration: 0,
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
      }

      setOpenEditDialog(false);
      setSelectedTask(null);
      
      // Mettre à jour la liste des tags
      fetchExistingTags();
    } catch (error) {
      console.error('Erreur lors de la modification de la tâche:', error);
      setError('Impossible de modifier la tâche');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedTask) return;

    if (window.confirm(t('dailyTasks.confirmDelete'))) {
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

  const handleEditTimeEntry = (entry: TimeEntry) => {
    setEditTimeEntryId(entry.id);
    setEditTimeEntryData({
      startTime: entry.startTime,
      endTime: entry.endTime,
      task: entry.task || '',
      notes: entry.notes || '',
      tags: entry.tags || [],
      projectId: entry.projectId
    });
    setOpenEditTimeEntryDialog(true);
  };

  const handleEditTimeEntrySubmit = async () => {
    if (!editTimeEntryId) return;

    try {
      const docRef = doc(db, 'timeEntries', editTimeEntryId);
      const duration = editTimeEntryData.endTime
        ? Math.floor((editTimeEntryData.endTime.getTime() - editTimeEntryData.startTime.getTime()) / 1000)
        : 0;

      await updateDoc(docRef, {
        startTime: Timestamp.fromDate(editTimeEntryData.startTime),
        endTime: editTimeEntryData.endTime ? Timestamp.fromDate(editTimeEntryData.endTime) : null,
        duration: duration,
        task: editTimeEntryData.task,
        notes: editTimeEntryData.notes,
        tags: editTimeEntryData.tags,
        projectId: editTimeEntryData.projectId
      });

      // Mettre à jour l'état local
      setTodaysTasks(prev => prev.map(task => {
        if (task.id === editTimeEntryId) {
          return {
            ...task,
            startTime: editTimeEntryData.startTime,
            endTime: editTimeEntryData.endTime,
            duration: duration,
            task: editTimeEntryData.task,
            notes: editTimeEntryData.notes,
            tags: editTimeEntryData.tags,
            projectId: editTimeEntryData.projectId
          };
        }
        return task;
      }));

      setOpenEditTimeEntryDialog(false);
      fetchExistingTags(); // Mettre à jour la liste des tags
    } catch (error) {
      console.error('Erreur lors de la modification de l\'entrée:', error);
      setError('Impossible de modifier l\'entrée');
    }
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    if (window.confirm(t('dailyTasks.confirmDelete'))) {
      try {
        setLoading(true);
        setError(null);

        await deleteDoc(doc(db, 'timeEntries', timeEntryId));
        setTodaysTasks(prev => prev.filter(task => task.id !== timeEntryId));

      } catch (error) {
        console.error('Erreur lors de la suppression de l\'entrée:', error);
        setError('Impossible de supprimer l\'entrée');
      } finally {
        setLoading(false);
      }
    }
  };

  const groupTasks = (tasks: TimeEntry[]): GroupedTimeEntry[] => {
    const groupedMap = tasks.reduce((acc, task) => {
      const key = `${task.projectId}-${task.task}`;
      if (!acc.has(key)) {
        acc.set(key, {
          projectId: task.projectId,
          task: task.task || '',
          entries: [],
          totalDuration: 0,
          isRunning: false
        });
      }
      const group = acc.get(key)!;
      group.entries.push(task);
      group.isRunning = group.isRunning || task.isRunning || false;

      // Calculer la durée totale
      if (task.isRunning) {
        const currentDuration = Math.floor((Date.now() - task.startTime.getTime()) / 1000);
        group.totalDuration += currentDuration;
      } else {
        group.totalDuration += task.duration || 0;
      }

      return acc;
    }, new Map<string, GroupedTimeEntry>());

    return Array.from(groupedMap.values());
  };

  const groupedTasks = useMemo(() => groupTasks(todaysTasks), [todaysTasks, timers]);

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const fetchExistingTags = async () => {
    if (!currentUser) return;

    try {
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(timeEntriesQuery);
      const allTags = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const tags = doc.data().tags || [];
        tags.forEach((tag: string) => allTags.add(tag));
      });

      setExistingTags(Array.from(allTags));
    } catch (error) {
      console.error('Erreur lors de la récupération des tags:', error);
    }
  };

  useEffect(() => {
    fetchExistingTags();
  }, [currentUser]);

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
        <Typography variant="h6" color="textSecondary">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        mt: 3,
        mb: 4,
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} mb={4}>
        <Typography variant="h4" component="h1" sx={{ mb: isMobile ? 2 : 0 }}>
          {t('dailyTasks.title')}
        </Typography>
        <Box
          display="flex"
          flexDirection={isMobile ? 'column' : 'row'}
          alignItems={isMobile ? 'stretch' : 'center'}
          gap={2}
        >
          <TotalTimeDisplay />
          <Box
            display="flex"
            alignItems="center"
            bgcolor="background.paper"
            borderRadius={1}
            boxShadow={1}
            sx={{
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-start'
            }}
          >
            <IconButton onClick={handlePreviousDay}>
              <ChevronLeftIcon />
            </IconButton>
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={fr}>
              <DatePicker
                value={selectedDate}
                onChange={(newValue) => {
                  if (newValue) {
                    setSelectedDate(newValue);
                  }
                }}
                format="dd/MM/yyyy"
                sx={{ width: isMobile ? '100%' : 'auto' }}
              />
            </LocalizationProvider>
            <IconButton onClick={handleNextDay}>
              <ChevronRightIcon />
            </IconButton>
            <IconButton onClick={() => setSelectedDate(new Date())}>
              <HomeIcon />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewTask}
            fullWidth={isMobile}
          >
            {t('dailyTasks.addTask')}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : todaysTasks.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography variant="h6" color="textSecondary">
            {t('dailyTasks.noTasks')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {groupedTasks.map((group) => {
            const groupKey = `${group.projectId}-${group.task}`;
            const isExpanded = expandedGroups.has(groupKey);

            return (
              <Grid item xs={12} key={groupKey}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: group.isRunning ? 'action.hover' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: group.isRunning ? 'action.selected' : 'action.hover',
                    },
                  }}
                  onClick={() => toggleGroupExpansion(groupKey)}
                >
                  <Box
                    display="flex"
                    flexDirection={isMobile ? 'column' : 'row'}
                    justifyContent="space-between"
                    alignItems={isMobile ? 'stretch' : 'flex-start'}
                    gap={isMobile ? 2 : 0}
                  >
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" component="h2">
                          {projects.find(p => p.id === group.projectId)?.name || t('dailyTasks.unknownProject')}
                        </Typography>
                        <IconButton
                          size="small"
                          sx={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        >
                          <KeyboardArrowDown />
                        </IconButton>
                      </Box>
                      <Typography color="textSecondary" gutterBottom>
                        {group.task}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Timer fontSize="small" color="action" />
                        <Typography variant="body2" color="textSecondary">
                          {t('dailyTasks.totalDuration')}: {formatDuration(group.totalDuration)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          ({group.entries.length} {t('dailyTasks.entries')})
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        display: 'flex',
                        justifyContent: isMobile ? 'flex-end' : 'flex-start',
                        width: isMobile ? '100%' : 'auto'
                      }}
                    >
                      {!group.isRunning ? (
                        <IconButton
                          onClick={() => handleStartTimer(group.entries[0].id)}
                          color="primary"
                        >
                          <PlayArrow />
                        </IconButton>
                      ) : (
                        <IconButton
                          onClick={() => {
                            const runningEntry = group.entries.find(e => e.isRunning);
                            if (runningEntry) {
                              handleStopTimer(runningEntry.id);
                            }
                          }}
                          color="secondary"
                        >
                          <Stop />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <Collapse in={isExpanded}>
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('dailyTasks.entryDetails')}
                      </Typography>
                      {group.entries.map((entry) => (
                        <Box
                          key={entry.id}
                          sx={{
                            mt: 1,
                            p: 2,
                            borderRadius: 1,
                            bgcolor: 'background.default',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: isMobile ? 'stretch' : 'center',
                            gap: isMobile ? 1 : 0
                          }}
                        >
                          <Box>
                            <Typography variant="body2">
                              {formatTimeToLocale(entry.startTime)} - {entry.endTime ? formatTimeToLocale(entry.endTime) : t('dailyTasks.running')}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {t('dailyTasks.duration')}: {formatDuration(entry.isRunning ? timers[entry.id] || 0 : entry.duration || 0)}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: isMobile ? 'flex-end' : 'flex-start',
                              width: isMobile ? '100%' : 'auto',
                              gap: 1
                            }}
                          >
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTimeEntry(entry);
                              }}
                              variant="outlined"
                              fullWidth={isMobile}
                            >
                              {t('dailyTasks.edit')}
                            </Button>
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTimeEntry(entry.id);
                              }}
                              variant="outlined"
                              color="error"
                              fullWidth={isMobile}
                            >
                              {t('dailyTasks.delete')}
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedTask ? t('dailyTasks.editTask') : t('dailyTasks.addTask')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="project-select-label">{t('dailyTasks.project')}</InputLabel>
              <Select
                labelId="project-select-label"
                value={editTaskData.projectId}
                label={t('dailyTasks.project')}
                onChange={(e) => setEditTaskData(prev => ({ ...prev, projectId: e.target.value }))}
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('dailyTasks.taskName')}
              value={editTaskData.task}
              onChange={(e) => setEditTaskData(prev => ({ ...prev, task: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <Autocomplete
              multiple
              freeSolo
              options={existingTags}
              value={editTaskData.tags ? editTaskData.tags.split(',').filter(tag => tag.trim() !== '') : []}
              onChange={(_, newValue) => {
                setEditTaskData(prev => ({ ...prev, tags: newValue.join(', ') }));
              }}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('dailyTasks.tags')}
                  placeholder={t('dailyTasks.addTags')}
                  helperText={t('dailyTasks.addTagsHelper')}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleEditSubmit} variant="contained">
            {selectedTask ? t('common.save') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditTimeEntryDialog}
        onClose={() => setOpenEditTimeEntryDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {t('dailyTasks.editEntry')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{
            pt: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <FormControl fullWidth>
              <InputLabel id="project-select-label">{t('dailyTasks.project')}</InputLabel>
              <Select
                labelId="project-select-label"
                value={editTimeEntryData.projectId}
                label={t('dailyTasks.project')}
                onChange={(e) => setEditTimeEntryData(prev => ({ ...prev, projectId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>{t('dailyTasks.noProject')}</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('dailyTasks.taskName')}
              value={editTimeEntryData.task}
              onChange={(e) => setEditTimeEntryData(prev => ({ ...prev, task: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label={t('dailyTasks.notes')}
              value={editTimeEntryData.notes}
              onChange={(e) => setEditTimeEntryData(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <Autocomplete
              multiple
              freeSolo
              options={existingTags}
              value={editTimeEntryData.tags}
              onChange={(_, newValue) => {
                setEditTimeEntryData(prev => ({ ...prev, tags: newValue }));
              }}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('dailyTasks.tags')}
                  placeholder={t('dailyTasks.addTags')}
                  helperText={t('dailyTasks.addTagsHelper')}
                />
              )}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} locale={fr}>
              <Box sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: 2
              }}>
                <TimePicker
                  label={t('dailyTasks.startTime')}
                  value={editTimeEntryData.startTime}
                  onChange={(newValue) => {
                    if (newValue) {
                      setEditTimeEntryData(prev => ({ ...prev, startTime: newValue }));
                    }
                  }}
                  sx={{ width: '100%' }}
                  ampm={false}
                  format="HH:mm"
                />
                <TimePicker
                  label={t('dailyTasks.endTime')}
                  value={editTimeEntryData.endTime}
                  onChange={(newValue) => {
                    setEditTimeEntryData(prev => ({ ...prev, endTime: newValue }));
                  }}
                  sx={{ width: '100%' }}
                  ampm={false}
                  format="HH:mm"
                />
              </Box>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenEditTimeEntryDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleEditTimeEntrySubmit} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DailyTasks;
