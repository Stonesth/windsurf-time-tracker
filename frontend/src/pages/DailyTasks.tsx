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
import TimeEntryForm from '../components/timeEntry/TimeEntryForm';
import { useLocation } from 'react-router-dom';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isNewEntry, setIsNewEntry] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    }
  }, [location.search]);

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

  const fetchTimeEntries = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Charger tous les tags existants
      const allTagsQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid)
      );
      
      const allTagsSnapshot = await getDocs(allTagsQuery);
      const allTags = new Set<string>();
      
      allTagsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      console.log('Loaded all existing tags:', Array.from(allTags));
      setExistingTags(Array.from(allTags));

      // Charger les entrées du jour
      const entriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid),
        where('startTime', '>=', Timestamp.fromDate(startOfDay)),
        where('startTime', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('startTime', 'desc')
      );

      const entriesSnapshot = await getDocs(entriesQuery);
      const entries: TimeEntry[] = [];

      entriesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.startTime) {
          const entry = {
            id: doc.id,
            userId: data.userId,
            projectId: data.projectId || '',
            task: data.task || '',
            startTime: data.startTime.toDate(),
            endTime: data.endTime ? data.endTime.toDate() : null,
            duration: data.duration || 0,
            notes: data.notes || '',
            tags: data.tags || [],
            isRunning: data.isRunning || false
          };
          console.log(`Loading entry ${doc.id} with tags:`, entry.tags);
          entries.push(entry);
        }
      });

      setTodaysTasks(entries);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError(t('dailyTasks.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [selectedDate, currentUser]);

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
      fetchTimeEntries();
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

  const handleEditEntry = (entry: TimeEntry) => {
    console.log('Editing entry with tags:', entry.tags); // Debug log
    setSelectedEntry({
      ...entry,
      tags: entry.tags || []
    });
    setIsNewEntry(false);
    setIsFormOpen(true);
  };

  const handleSaveEntry = async (entryData: Partial<TimeEntry>) => {
    if (!currentUser) return;

    try {
      const duration = Math.floor(
        (entryData.endTime!.getTime() - entryData.startTime!.getTime()) / 1000
      );

      const entryToSave = {
        projectId: entryData.projectId || '',
        task: entryData.task || '',
        notes: entryData.notes || '',
        tags: entryData.tags || [],
        startTime: Timestamp.fromDate(entryData.startTime!),
        endTime: entryData.endTime ? Timestamp.fromDate(entryData.endTime) : null,
        duration: duration,
        isRunning: false,
      };

      if (isNewEntry) {
        await addDoc(collection(db, 'timeEntries'), {
          ...entryToSave,
          userId: currentUser.uid,
        });
      } else if (selectedEntry) {
        const entryRef = doc(db, 'timeEntries', selectedEntry.id);
        await updateDoc(entryRef, entryToSave);
      }

      setIsFormOpen(false);
      setSelectedEntry(null);
      setIsNewEntry(true);
      await fetchTimeEntries();
    } catch (error) {
      console.error('Error saving time entry:', error);
      setError(t('timeTracker.errors.saveFailed'));
    }
  };

  const handleAddEntry = () => {
    // Créer une nouvelle entrée avec la date sélectionnée
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(9, 0, 0, 0); // Par défaut à 9h du matin

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(17, 0, 0, 0); // Par défaut à 17h

    setSelectedEntry({
      id: '',
      projectId: '',
      task: '',
      notes: '',
      tags: [],
      userId: '',
      startTime: startOfDay,
      endTime: endOfDay,
      duration: 0,
      isRunning: false
    });
    setIsNewEntry(true);
    setIsFormOpen(true);
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

  if (loading) {
    return (
      <Box id="loading-spinner" display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box id="error-message" display="flex" justifyContent="center" p={3}>
        <Typography variant="h6" color="textSecondary">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Container
      id="daily-tasks-container"
      maxWidth="lg"
      sx={{
        mt: 3,
        mb: 4,
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box id="daily-tasks-header" display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} mb={4}>
        <Typography id="daily-tasks-title" variant="h4" component="h1" sx={{ mb: isMobile ? 2 : 0 }}>
          {t('dailyTasks.title')}
        </Typography>
        <Box
          id="daily-tasks-actions"
          display="flex"
          flexDirection={isMobile ? 'column' : 'row'}
          alignItems={isMobile ? 'stretch' : 'center'}
          gap={2}
        >
          <TotalTimeDisplay id="total-time-display" />
          <Box
            id="date-picker-container"
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
            <IconButton id="prev-day-button" onClick={handlePreviousDay}>
              <ChevronLeftIcon />
            </IconButton>

            <LocalizationProvider dateAdapter={AdapterDateFns} locale={fr}>
              <DatePicker
                id="date-picker"
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

            <IconButton id="next-day-button" onClick={handleNextDay}>
              <ChevronRightIcon />
            </IconButton>

            <IconButton id="today-button" onClick={() => setSelectedDate(new Date())}>
              <HomeIcon />
            </IconButton>
          </Box>
          <Button
            id="add-task-button"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewTask}
            fullWidth={isMobile}
          >
            {t('dailyTasks.addTask')}
          </Button>
          <Button
            id="add-entry-button"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEntry}
            fullWidth={isMobile}
          >
            {t('dailyTasks.addEntry')}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box id="loading-spinner" display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : todaysTasks.length === 0 ? (
        <Box id="no-tasks-message" display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography variant="h6" color="textSecondary">
            {t('dailyTasks.noTasks')}
          </Typography>
        </Box>
      ) : (
        <Grid id="tasks-grid" container spacing={3}>
          {groupedTasks.map((group, index) => {
            const groupKey = `${group.projectId}-${group.task}`;
            const isExpanded = expandedGroups.has(groupKey);

            return (
              <Grid item xs={12} key={groupKey}>
                <Paper
                  id={`task-group-${index}`}
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
                    id="task-group-header"
                    display="flex"
                    flexDirection={isMobile ? 'column' : 'row'}
                    justifyContent="space-between"
                    alignItems={isMobile ? 'stretch' : 'flex-start'}
                    gap={isMobile ? 2 : 0}
                  >
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography id={`project-name-${index}`} variant="h6" component="h2">
                          {projects.find(p => p.id === group.projectId)?.name || t('dailyTasks.unknownProject')}
                        </Typography>
                        <IconButton
                          id={`expand-button-${index}`}
                          size="small"
                          sx={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }}
                        >
                          <KeyboardArrowDown />
                        </IconButton>
                      </Box>
                      <Typography id={`task-name-${index}`} color="textSecondary" gutterBottom>
                        {group.task}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Timer fontSize="small" color="action" />
                        <Typography id={`duration-${index}`} variant="body2" color="textSecondary">
                          {t('dailyTasks.totalDuration')}: {formatDuration(group.totalDuration)}
                        </Typography>
                        <Typography id={`entries-count-${index}`} variant="body2" color="textSecondary">
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
                          id={`start-timer-${index}`}
                          onClick={() => handleStartTimer(group.entries[0].id)}
                          color="primary"
                        >
                          <PlayArrow />
                        </IconButton>
                      ) : (
                        <IconButton
                          id={`stop-timer-${index}`}
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
                      {group.entries.map((entry, entryIndex) => (
                        <Box
                          id={`entry-${index}-${entryIndex}`}
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
                            <Typography id={`entry-time-${index}-${entryIndex}`} variant="body2">
                              {formatTimeToLocale(entry.startTime)} - {entry.endTime ? formatTimeToLocale(entry.endTime) : t('dailyTasks.running')}
                            </Typography>
                            <Typography id={`entry-duration-${index}-${entryIndex}`} variant="body2" color="textSecondary">
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
                              id={`edit-entry-${index}-${entryIndex}`}
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEntry(entry);
                              }}
                              variant="outlined"
                              fullWidth={isMobile}
                            >
                              {t('dailyTasks.edit')}
                            </Button>
                            <Button
                              id={`delete-entry-${index}-${entryIndex}`}
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
        id="edit-dialog"
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
              id="task-name-input"
              label={t('dailyTasks.taskName')}
              value={editTaskData.task}
              onChange={(e) => setEditTaskData(prev => ({ ...prev, task: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <Autocomplete
              id="tags-autocomplete"
              multiple
              freeSolo
              options={existingTags || []}
              value={editTaskData.tags ? editTaskData.tags.split(',').filter(tag => tag.trim() !== '') : []}
              onChange={(_, newValue) => {
                setEditTaskData(prev => ({ ...prev, tags: newValue.join(', ') }));
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...otherProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      label={option}
                      {...otherProps}
                    />
                  );
                })
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
        id="entry-dialog"
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEntry(null);
          setIsNewEntry(true);
        }}
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
                value={selectedEntry?.projectId}
                label={t('dailyTasks.project')}
                onChange={(e) => setSelectedEntry(prev => ({ ...prev, projectId: e.target.value }))}
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
              id="task-name-input"
              label={t('dailyTasks.taskName')}
              value={selectedEntry?.task}
              onChange={(e) => setSelectedEntry(prev => ({ ...prev, task: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              id="notes-input"
              label={t('dailyTasks.notes')}
              value={selectedEntry?.notes}
              onChange={(e) => setSelectedEntry(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <Autocomplete
              id="tags-autocomplete"
              multiple
              freeSolo
              options={existingTags || []}
              value={selectedEntry?.tags || []}
              onChange={(_, newValue) => {
                setSelectedEntry(prev => prev ? ({
                  ...prev,
                  tags: newValue
                }) : null);
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...otherProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      label={option}
                      size="small"
                      {...otherProps}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('dailyTasks.tags')}
                  placeholder={t('dailyTasks.addTags')}
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
                  id="start-time-picker"
                  label={t('dailyTasks.startTime')}
                  value={selectedEntry?.startTime}
                  onChange={(newValue) => {
                    if (newValue) {
                      setSelectedEntry(prev => ({ ...prev, startTime: newValue }));
                    }
                  }}
                  sx={{ width: '100%' }}
                  ampm={false}
                  format="HH:mm"
                />
                <TimePicker
                  id="end-time-picker"
                  label={t('dailyTasks.endTime')}
                  value={selectedEntry?.endTime}
                  onChange={(newValue) => {
                    setSelectedEntry(prev => ({ ...prev, endTime: newValue }));
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
          <Button onClick={() => setIsFormOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSaveEntry} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <TimeEntryForm
        id="time-entry-form"
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEntry(null);
          setIsNewEntry(true);
        }}
        onSave={handleSaveEntry}
        initialData={selectedEntry}
        isEdit={!isNewEntry}
        existingTags={existingTags}
      />
    </Container>
  );
};

export default DailyTasks;
