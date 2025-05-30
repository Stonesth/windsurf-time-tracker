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
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import fr from 'date-fns/locale/fr';
import TotalTimeDisplay from '../components/timer/TotalTimeDisplay';
import { useTranslation } from 'react-i18next';
import TimeEntryForm from '../components/timeEntry/TimeEntryForm';
import { useLocation, useNavigate } from 'react-router-dom';

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

interface BulkEditTimeEntryData {
  projectId?: string;
  task?: string;
  notes?: string;
  tags?: string[];
}

interface GroupedTimeEntry {
  projectId: string;
  task: string;
  notes: string;  
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
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaysTasks, setTodaysTasks] = useState<TimeEntry[]>([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TimeEntry | null>(null);
  const [openBulkEditDialog, setOpenBulkEditDialog] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<TimeEntry[]>([]);
  const [bulkEditData, setBulkEditData] = useState<BulkEditTimeEntryData>({});
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
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [overlappingEntries, setOverlappingEntries] = useState<Set<string>>(new Set());
  const [hasOverlappingEntries, setHasOverlappingEntries] = useState(false);
  const [timeEditDialogOpen, setTimeEditDialogOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimeEntry | null>(null);
  const [editStartTime, setEditStartTime] = useState<Date | null>(null);
  const [editEndTime, setEditEndTime] = useState<Date | null>(null);
  const [calculatedDuration, setCalculatedDuration] = useState<number>(0);
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        const refreshParam = searchParams.get('refresh');
        if (refreshParam) {
          fetchTimeEntries();
        }
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
      
      // Vérifier s'il y a des chevauchements entre les entrées
      const overlaps = detectOverlappingEntries(entries);
      setOverlappingEntries(overlaps);
      setHasOverlappingEntries(overlaps.size > 0);
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

      const now = new Date();
      const today = new Date();

      // Utiliser une transaction pour s'assurer que les opérations sont atomiques
      await runTransaction(db, async (transaction) => {
        // 1. Trouver toutes les tâches en cours
        const runningTasksQuery = query(
          collection(db, 'timeEntries'),
          where('userId', '==', currentUser?.uid),
          where('isRunning', '==', true)
        );

        const runningTasksSnapshot = await getDocs(runningTasksQuery);

        // 2. Arrêter toutes les tâches en cours dans la transaction
        runningTasksSnapshot.docs.forEach((doc) => {
          const runningTask = doc.data();
          const startTime = runningTask.startTime.toDate();
          const elapsedTime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          const newDuration = (runningTask.duration || 0) + elapsedTime;

          transaction.update(doc.ref, {
            endTime: Timestamp.fromDate(now),
            isRunning: false,
            duration: newDuration
          });
        });

        // 3. Créer la nouvelle tâche dans la transaction
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

        const newTaskRef = doc(collection(db, 'timeEntries'));
        transaction.set(newTaskRef, newTimeEntry);
      });

      // 4. Si nécessaire, rediriger vers aujourd'hui
      if (selectedDate.toDateString() !== today.toDateString()) {
        const formattedDate = today.toISOString().split('T')[0];
        navigate(`/daily-tasks?date=${formattedDate}`, { replace: true });
      }

      // 5. Rafraîchir la page pour voir les changements
      window.location.reload();

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

      window.location.reload();

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

      const runningTask = todaysTasks.find(t => t.isRunning);
      if (runningTask) {
        await handleStopTimer(runningTask.id);
      }

      const now = new Date();
      const newTimeEntry = {
        projectId: '', 
        userId: currentUser.uid,
        startTime: Timestamp.fromDate(now),
        endTime: null,
        duration: 0,
        task: '',
        notes: '',
        tags: [],
        isRunning: true
      };

      await addDoc(collection(db, 'timeEntries'), newTimeEntry);

      window.location.reload();

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
        await updateDoc(doc(db, 'timeEntries', selectedTask.id), updatedData);

        setTodaysTasks(prev =>
          prev.map(task => (task.id === selectedTask.id ? { ...task, ...updatedData } : task))
        );
      } else {
        const now = new Date();
        const newTimeEntry = {
          ...updatedData,
          userId: currentUser?.uid,
          startTime: Timestamp.fromDate(now),
          endTime: null,
          duration: 0,
          isRunning: true
        };

        await addDoc(collection(db, 'timeEntries'), newTimeEntry);
        const newTask = {
          id: '',
          ...newTimeEntry,
          startTime: now,
          endTime: null,
        } as TimeEntry;

        setTodaysTasks(prev => [newTask, ...prev]);
      }

      setOpenEditDialog(false);
      setSelectedTask(null);
      
      fetchTimeEntries();
      window.location.reload();

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

        window.location.reload();

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
    setSelectedEntry({
      ...entry,
      tags: entry.tags || []
    });
    setIsNewEntry(false);
    setIsFormOpen(true);
  };

  const handleSaveEntry = async (entryData: Partial<TimeEntry>) => {
    if (!currentUser) {
      return;
    }

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
      fetchTimeEntries();
      window.location.reload();
    } catch (error) {
      console.error('Error saving time entry:', error);
      setError(t('timeTracker.errors.saveFailed'));
    }
  };

  const handleAddEntry = () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(9, 0, 0, 0); 

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(17, 0, 0, 0); 

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

  const detectOverlappingEntries = (entries: TimeEntry[]): Set<string> => {
    const overlaps = new Set<string>();
    
    // Trier les entrées par heure de début
    const sortedEntries = [...entries].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    // Vérifier les chevauchements
    for (let i = 0; i < sortedEntries.length; i++) {
      const current = sortedEntries[i];
      if (!current.endTime) continue; // Ignorer les entrées en cours
      
      for (let j = i + 1; j < sortedEntries.length; j++) {
        const next = sortedEntries[j];
        if (!next.endTime) continue; // Ignorer les entrées en cours
        
        // Si l'heure de début de la prochaine entrée est avant l'heure de fin de l'entrée actuelle
        if (next.startTime.getTime() < current.endTime.getTime()) {
          overlaps.add(current.id);
          overlaps.add(next.id);
        }
      }
    }
    
    return overlaps;
  };

  const handleOpenTimeline = () => {
    const overlaps = detectOverlappingEntries(todaysTasks);
    setOverlappingEntries(overlaps);
    setTimelineDialogOpen(true);
  };

  const handleCloseTimeline = () => {
    setTimelineDialogOpen(false);
    setOverlappingEntries(new Set());
    setHasOverlappingEntries(false);
    
    // Rafraîchir les données tout en conservant la date sélectionnée
    fetchTimeEntries();
  };

  const handleOpenTimeEdit = (entry: TimeEntry) => {
    setEntryToEdit(entry);
    setEditStartTime(entry.startTime);
    setEditEndTime(entry.endTime || new Date());
    setCalculatedDuration(entry.duration);
    setTimeEditDialogOpen(true);
  };

  const handleCloseTimeEdit = () => {
    setTimeEditDialogOpen(false);
    setEntryToEdit(null);
    setEditStartTime(null);
    setEditEndTime(null);
  };

  const calculateNewDuration = (start: Date, end: Date) => {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  };

  const handleStartTimeChange = (newStartTime: Date | null) => {
    if (newStartTime && editEndTime) {
      setEditStartTime(newStartTime);
      setCalculatedDuration(calculateNewDuration(newStartTime, editEndTime));
    }
  };

  const handleEndTimeChange = (newEndTime: Date | null) => {
    if (newEndTime && editStartTime) {
      setEditEndTime(newEndTime);
      setCalculatedDuration(calculateNewDuration(editStartTime, newEndTime));
    }
  };

  const handleSaveTimeEdit = async () => {
    if (!entryToEdit || !editStartTime || !editEndTime) return;
    
    try {
      setLoading(true);
      setError(null);

      const updatedDuration = calculateNewDuration(editStartTime, editEndTime);
      
      const updatedData = {
        startTime: Timestamp.fromDate(editStartTime),
        endTime: Timestamp.fromDate(editEndTime),
        duration: updatedDuration,
        isRunning: false
      };

      await updateDoc(doc(db, 'timeEntries', entryToEdit.id), updatedData);

      // Mettre à jour l'état local
      setTodaysTasks(prev => 
        prev.map(task => (
          task.id === entryToEdit.id 
            ? { ...task, startTime: editStartTime, endTime: editEndTime, duration: updatedDuration, isRunning: false } 
            : task
        ))
      );

      handleCloseTimeEdit();
      // Vérifier les chevauchements après la modification
      const overlaps = detectOverlappingEntries(todaysTasks);
      setOverlappingEntries(overlaps);
    } catch (error) {
      console.error('Erreur lors de la modification des heures:', error);
      setError('Impossible de modifier les heures');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTimeEntry = async (timeEntryId: string) => {
    if (window.confirm(t('dailyTasks.confirmDelete'))) {
      try {
        setLoading(true);
        setError(null);

        await deleteDoc(doc(db, 'timeEntries', timeEntryId));
        setTodaysTasks(prev => prev.filter(task => task.id !== timeEntryId));

        window.location.reload();

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
          notes: task.notes || '',  
          entries: [],
          totalDuration: 0,
          isRunning: false
        });
      }
      const group = acc.get(key)!;
      group.entries.push(task);
      group.isRunning = group.isRunning || task.isRunning || false;

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

  const handleBulkEdit = (group: GroupedTimeEntry) => {
    const tasksToEdit = todaysTasks.filter(
      task => task.projectId === group.projectId && task.task === group.task
    );
    setSelectedTasks(tasksToEdit);
    setBulkEditData({
      projectId: group.projectId,
      task: group.task,
      notes: tasksToEdit[0]?.notes || '',
      tags: tasksToEdit[0]?.tags || [],
    });
    setOpenBulkEditDialog(true);
  };

  const handleBulkEditSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const updates = selectedTasks.map(async (task) => {
        const taskRef = doc(db, 'timeEntries', task.id);
        const updateData: Partial<TimeEntry> = {};
        
        if (bulkEditData.projectId) updateData.projectId = bulkEditData.projectId;
        if (bulkEditData.task) updateData.task = bulkEditData.task;
        if (bulkEditData.notes !== undefined) updateData.notes = bulkEditData.notes;
        if (bulkEditData.tags) updateData.tags = bulkEditData.tags;

        await updateDoc(taskRef, updateData);

        return {
          ...task,
          ...updateData,
        };
      });

      const updatedTasks = await Promise.all(updates);

      setTodaysTasks(prev =>
        prev.map(task => {
          const updatedTask = updatedTasks.find(u => u.id === task.id);
          return updatedTask || task;
        })
      );

      setOpenBulkEditDialog(false);
      setBulkEditData({});
      setSelectedTasks([]);
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour groupée:', error);
      setError('Impossible de mettre à jour les tâches');
    } finally {
      setLoading(false);
    }
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
      <Box display="flex" flexDirection="column" gap={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography id="daily-tasks-title" variant="h4" component="h1">
            {t('dailyTasks.title')}
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" id="total-time-display">
          <TotalTimeDisplay specificDate={selectedDate} showTotal={true} />
        </Box>

        <Box
          id="daily-tasks-actions"
          display="flex"
          flexDirection={isMobile ? 'column' : 'row'}
          alignItems={isMobile ? 'stretch' : 'center'}
          gap={2}
        >
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
            sx={{ mr: 1 }}
          >
            {t('dailyTasks.addEntry')}
          </Button>
          
          <Button
            id="timeline-view-button"
            variant="outlined"
            color={hasOverlappingEntries ? "error" : "secondary"}
            startIcon={<Timer />}
            onClick={handleOpenTimeline}
            fullWidth={isMobile}
          >
            {t('dailyTasks.timelineView')}
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
          {groupedTasks.map((group) => {
            const projectName = projects.find(p => p.id === group.projectId)?.name || 'no-project';
            const sanitizedProjectName = projectName.toLowerCase().replace(/\s+/g, '-');
            const sanitizedTaskName = (group.task || 'no-task').toLowerCase().replace(/\s+/g, '-');
            const groupId = `group-${sanitizedProjectName}-${sanitizedTaskName}`;

            return (
              <Grid item xs={12} key={groupId}>
                <Paper
                  id={groupId}
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: group.isRunning ? 'action.hover' : 'background.paper',
                    '&:hover': {
                      bgcolor: group.isRunning ? 'action.selected' : 'action.hover',
                    },
                  }}
                >
                  <Box 
                    flex={1} 
                    onClick={() => toggleGroupExpansion(groupId)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography id={`${groupId}-project-name`} variant="h6" component="h2">
                        {projectName}
                      </Typography>
                      <IconButton
                        id={`${groupId}-expand`}
                        size="small"
                        sx={{
                          transform: expandedGroups.has(groupId) ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      >
                        <KeyboardArrowDown />
                      </IconButton>
                      <Box sx={{ ml: 'auto' }}>
                        {!group.isRunning ? (
                          <IconButton
                            id={`${groupId}-start`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartTimer(group.entries[0].id);
                            }}
                            color="primary"
                          >
                            <PlayArrow />
                          </IconButton>
                        ) : (
                          <IconButton
                            id={`${groupId}-stop`}
                            onClick={(e) => {
                              e.stopPropagation();
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
                        <Tooltip title={t('dailyTasks.editGroup')}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBulkEdit(group);
                            }}
                            size="small"
                            id={`${groupId}-bulk-edit`}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box 
                      display="flex" 
                      alignItems="center" 
                      sx={{ mt: 1, mb: 2 }}
                    >
                      <Typography 
                        id={`${groupId}-task-name`} 
                        color="textSecondary"
                      >
                        {group.task}
                      </Typography>
                      {group.notes && (
                        <Typography 
                          id={`${groupId}-notes`} 
                          variant="body2" 
                          color="textSecondary"
                          sx={{ 
                            fontStyle: 'italic',
                            ml: 'auto',
                            mr: 'auto'
                          }}
                        >
                          {group.notes}
                        </Typography>
                      )}
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      <Timer fontSize="small" color="action" />
                      <Typography id={`${groupId}-duration`} variant="body2" color="textSecondary">
                        {t('dailyTasks.totalDuration')}: {formatDuration(group.totalDuration)}
                      </Typography>
                      <Typography id={`${groupId}-entries-count`} variant="body2" color="textSecondary">
                        ({group.entries.length} {t('dailyTasks.entries')})
                      </Typography>
                    </Box>
                  </Box>
                  <Collapse in={expandedGroups.has(groupId)}>
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        {t('dailyTasks.entryDetails')}
                      </Typography>
                      {group.entries.map((entry) => {
                        const entryTime = formatTimeToLocale(entry.startTime).replace(':', '-');
                        const entryId = `${groupId}-entry-${entryTime}`;
                        
                        return (
                          <Box
                            id={entryId}
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
                            <Box display="flex" flexDirection="column" flex={1}>
                              <Box display="flex" alignItems="center" gap={2}>
                                <Typography id={`${entryId}-time`} variant="body2">
                                  {formatTimeToLocale(entry.startTime)} - {entry.endTime ? formatTimeToLocale(entry.endTime) : t('dailyTasks.running')}
                                </Typography>
                                <Typography id={`${entryId}-duration`} variant="body2" color="textSecondary">
                                  ({formatDuration(entry.isRunning ? timers[entry.id] || 0 : entry.duration || 0)})
                                </Typography>
                              </Box>
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
                                id={`${entryId}-edit`}
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
                                id={`${entryId}-delete`}
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
                        );
                      })}
                    </Box>
                  </Collapse>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
      <TimeEntryForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedEntry(null);
        }}
        onSave={handleSaveEntry}
        initialData={selectedEntry || undefined}
        isEdit={!isNewEntry}
        existingTags={existingTags}
      />

      <Dialog
        id="bulk-edit-dialog"
        open={openBulkEditDialog}
        onClose={() => setOpenBulkEditDialog(false)}
        fullWidth
        maxWidth="sm"
        disableEnforceFocus
      >
        <DialogTitle>{t('dailyTasks.editGroup')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              id="bulk-project-autocomplete"
              options={projects}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option?.name || '';
              }}
              value={bulkEditData.projectId ? 
                (projects.find(p => p.id === bulkEditData.projectId) || bulkEditData.projectId) 
                : null
              }
              onChange={(_, newValue) => {
                const projectId = typeof newValue === 'string' ? newValue : newValue?.id || '';
                setBulkEditData(prev => ({ ...prev, projectId }));
              }}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('dailyTasks.project')}
                  placeholder={t('dailyTasks.searchProject')}
                />
              )}
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  key={option.id}
                >
                  {option.name}
                </Box>
              )}
              isOptionEqualToValue={(option, value) => {
                if (typeof option === 'string' && typeof value === 'string') {
                  return option === value;
                }
                return option?.id === value?.id;
              }}
              fullWidth
              disablePortal
            />

            <TextField
              id="bulk-task-name"
              label={t('dailyTasks.taskName')}
              value={bulkEditData.task || ''}
              onChange={(e) => setBulkEditData(prev => ({ ...prev, task: e.target.value }))}
            />

            <TextField
              id="bulk-notes"
              label={t('dailyTasks.notes')}
              value={bulkEditData.notes || ''}
              onChange={(e) => setBulkEditData(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={4}
            />

            <Autocomplete
              id="bulk-tags"
              multiple
              freeSolo
              options={existingTags}
              value={bulkEditData.tags || []}
              onChange={(_, newValue) => setBulkEditData(prev => ({ ...prev, tags: newValue }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...otherProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={`bulk-tag-${option}`}
                      label={option}
                      {...otherProps}
                    />
                  );
                })
              }
              renderOption={(props, option) => (
                <Box
                  component="li"
                  {...props}
                  key={`bulk-tag-option-${option}`}
                >
                  {option}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('dailyTasks.tags')}
                  placeholder={t('dailyTasks.addTags')}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkEditDialog(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleBulkEditSave} variant="contained" color="primary">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timeline Dialog */}
      <Dialog
        open={timelineDialogOpen}
        onClose={handleCloseTimeline}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('dailyTasks.timelineTitle')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {todaysTasks.length === 0 ? (
              <Typography variant="body1" align="center">
                {t('dailyTasks.noEntries')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {[...todaysTasks]
                  .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                  .map((entry) => (
                    <Paper 
                      key={entry.id} 
                      elevation={2} 
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        borderLeft: '4px solid', 
                        borderColor: overlappingEntries.has(entry.id) ? 'error.main' : (entry.isRunning ? 'secondary.main' : 'primary.main'),
                        bgcolor: overlappingEntries.has(entry.id) ? 'error.light' : 'inherit',
                        color: overlappingEntries.has(entry.id) ? 'error.contrastText' : 'inherit'
                      }}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={3}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="subtitle2" color="textSecondary">
                                {formatTimeToLocale(entry.startTime)} - {entry.endTime ? formatTimeToLocale(entry.endTime) : t('dailyTasks.running')}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatDuration(entry.duration)}
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={() => handleOpenTimeEdit(entry)}
                              color="primary"
                              title={t('dailyTasks.editTimes')}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={9}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {entry.task || t('dailyTasks.untitled')}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {projects.find(p => p.id === entry.projectId)?.name || t('dailyTasks.noProject')}
                          </Typography>
                          {entry.notes && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {entry.notes}
                            </Typography>
                          )}
                          {entry.tags && entry.tags.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {entry.tags.map(tag => (
                                <Chip 
                                  key={`timeline-tag-${entry.id}-${tag}`} 
                                  label={tag} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              ))}
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTimeline} color="primary">
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Time Edit Dialog */}
      <Dialog
        open={timeEditDialogOpen}
        onClose={handleCloseTimeEdit}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('dailyTasks.editTimes')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label={t('dailyTasks.startDate')}
                value={editStartTime}
                onChange={(newDate) => {
                  if (newDate && editStartTime) {
                    // Conserver l'heure actuelle mais changer la date
                    const newDateTime = new Date(newDate);
                    newDateTime.setHours(
                      editStartTime.getHours(),
                      editStartTime.getMinutes(),
                      editStartTime.getSeconds()
                    );
                    handleStartTimeChange(newDateTime);
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label={t('dailyTasks.startTime')}
                value={editStartTime}
                onChange={handleStartTimeChange}
                slotProps={{ 
                  textField: { fullWidth: true }
                }}
                views={['hours', 'minutes', 'seconds']}
                ampm={false}
                format="HH:mm:ss"
              />
              <DatePicker
                label={t('dailyTasks.endDate')}
                value={editEndTime}
                onChange={(newDate) => {
                  if (newDate && editEndTime) {
                    // Conserver l'heure actuelle mais changer la date
                    const newDateTime = new Date(newDate);
                    newDateTime.setHours(
                      editEndTime.getHours(),
                      editEndTime.getMinutes(),
                      editEndTime.getSeconds()
                    );
                    handleEndTimeChange(newDateTime);
                  }
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
              <TimePicker
                label={t('dailyTasks.endTime')}
                value={editEndTime}
                onChange={handleEndTimeChange}
                slotProps={{ 
                  textField: { fullWidth: true }
                }}
                views={['hours', 'minutes', 'seconds']}
                ampm={false}
                format="HH:mm:ss"
              />
            </LocalizationProvider>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">
                {t('dailyTasks.calculatedDuration')}:
              </Typography>
              <Typography variant="h6">
                {formatDuration(calculatedDuration)}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTimeEdit}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSaveTimeEdit} color="primary" variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DailyTasks;
