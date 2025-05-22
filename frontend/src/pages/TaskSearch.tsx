import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp, getFirestore, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface TimeEntry {
  id: string;
  projectId: string;
  startTime: any; // Date ou Timestamp de Firestore
  endTime: any;
  duration: number;
  task?: string;
  description?: string;
  tags?: string[];
}

interface SearchParams {
  taskName: string;
  projectId: string;
}

interface GroupedTimeEntry {
  projectId: string;
  task: string;
  date: string;
  totalDuration: number;
  entries: TimeEntry[];
}

const TaskSearch = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GroupedTimeEntry[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>(() => {
    const savedSearch = localStorage.getItem('lastTaskSearch');
    return savedSearch ? JSON.parse(savedSearch) : {
      taskName: '',
      projectId: '',
    };
  });
  const [totalDuration, setTotalDuration] = useState(0);

  useEffect(() => {
    localStorage.setItem('lastTaskSearch', JSON.stringify(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.taskName || searchParams.projectId) {
      handleSearch();
    }
  }, []); // Exécuté une seule fois au montage

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

    return parts.join(' ');
  };

  const formatDateOnly = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleSearch = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const timeEntriesRef = collection(db, 'timeEntries');
      let baseQuery = query(
        timeEntriesRef,
        where('userId', '==', currentUser.uid)
      );

      if (searchParams.projectId) {
        baseQuery = query(
          baseQuery,
          where('projectId', '==', searchParams.projectId)
        );
      }

      const querySnapshot = await getDocs(baseQuery);
      const entries = querySnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startTime: data.startTime.toDate(),
            endTime: data.endTime?.toDate() || null,
            task: data.task || data.description || '' // Assurons-nous que task est défini
          };
        })
        .filter(entry => {
          if (searchParams.taskName) {
            return entry.task?.toLowerCase().includes(searchParams.taskName.toLowerCase());
          }
          return true;
        })
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime()) as TimeEntry[];

      // Grouper les entrées par date, tâche et projet
      const groupedEntries: { [key: string]: GroupedTimeEntry } = {};
      entries.forEach(entry => {
        const dateStr = formatDateOnly(entry.startTime);
        const taskStr = entry.task?.trim() || t('timeTracker.noTask');
        const key = `${entry.projectId}-${dateStr}-${taskStr}`;

        if (!groupedEntries[key]) {
          groupedEntries[key] = {
            projectId: entry.projectId,
            task: taskStr,
            date: dateStr,
            totalDuration: 0,
            entries: [],
          };
        }

        groupedEntries[key].entries.push(entry);
        groupedEntries[key].totalDuration += entry.duration || 0;
      });

      // Convertir l'objet en tableau et trier par date décroissante
      const groupedArray = Object.values(groupedEntries).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const total = entries.reduce((acc, entry) => acc + (entry.duration || 0), 0);
      setTotalDuration(total);
      setSearchResults(groupedArray);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchParams({
      taskName: '',
      projectId: '',
    });
    setSearchResults([]);
    setTotalDuration(0);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDateClick = (dateStr: string) => {
    // Navigation directe vers la page des tâches quotidiennes avec la date sélectionnée
    navigate(`/daily?date=${dateStr}`);
  };

  const handleStartTask = async (group: GroupedTimeEntry) => {
    if (!currentUser) return;
    
    try {
      // Afficher un indicateur de chargement
      setLoading(true);
      
      // 1. Vérifier s'il y a une tâche en cours et l'arrêter
      const db = getFirestore();
      const timeEntriesRef = collection(db, 'timeEntries');
      const activeTaskQuery = query(
        timeEntriesRef,
        where('userId', '==', currentUser.uid),
        where('isRunning', '==', true)
      );
      
      const activeTaskSnapshot = await getDocs(activeTaskQuery);
      
      // Si une tâche est en cours, on l'arrête
      if (!activeTaskSnapshot.empty) {
        const activeTaskDoc = activeTaskSnapshot.docs[0];
        const activeTaskId = activeTaskDoc.id;
        
        // Arrêter la tâche en cours
        await updateDoc(doc(db, 'timeEntries', activeTaskId), {
          endTime: Timestamp.now(),
          isRunning: false,
          duration: Timestamp.now().seconds - activeTaskDoc.data().startTime.seconds
        });
        
        console.log('Tâche précédente arrêtée');
      }
      
      // 2. Récupérer les informations détaillées sur la tâche sélectionnée
      const projectId = group.projectId;
      const taskName = group.task;
      
      // Récupérer les tags de la première entrée (si disponible)
      const tags = group.entries[0]?.tags || [];
      
      // 3. Créer une nouvelle entrée de temps pour aujourd'hui
      // Utiliser le service Firebase directement pour s'assurer que tous les champs sont correctement définis
      await addDoc(timeEntriesRef, {
        userId: currentUser.uid,
        projectId: projectId,
        task: taskName,  // Utiliser le champ task à la place de taskId
        description: group.entries[0]?.description || taskName, // Utiliser la description si disponible
        tags: tags,
        startTime: Timestamp.now(),
        isRunning: true,
        // endTime sera défini lorsque la tâche est arrêtée
      });
      
      // Rediriger directement vers la page des tâches quotidiennes avec la date d'aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      navigate(`/daily?date=${today}`);
    } catch (error) {
      console.error('Erreur lors du démarrage de la tâche:', error);
      alert('Une erreur est survenue lors du démarrage de la tâche');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('taskSearch.title')}
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <TextField
              id="task-search-input"
              fullWidth
              label={t('taskSearch.searchPlaceholder')}
              value={searchParams.taskName}
              onChange={(e) => setSearchParams({ ...searchParams, taskName: e.target.value })}
              onKeyPress={handleKeyPress}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel id="project-select-label">{t('taskSearch.project')}</InputLabel>
              <Select
                id="project-select"
                labelId="project-select-label"
                value={searchParams.projectId}
                label={t('taskSearch.project')}
                onChange={(e) => setSearchParams({ ...searchParams, projectId: e.target.value })}
              >
                <MenuItem id="project-select-all" value="">
                  <em>{t('common.all')}</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem id={`project-select-${project.id}`} key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box display="flex" gap={1}>
              <Button
                id="search-button"
                fullWidth
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
              >
                {t('taskSearch.search')}
              </Button>
              <Button
                id="clear-button"
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClear}
                disabled={loading}
              >
                {t('taskSearch.clear')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box id="loading-spinner" display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : searchResults.length > 0 ? (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography id="results-count" variant="h6">
              {t('taskSearch.results')} ({searchResults.length})
            </Typography>
            <Typography id="total-duration" variant="h6">
              {t('taskSearch.totalTime')}: {formatDuration(totalDuration)}
            </Typography>
          </Box>
          <TableContainer id="search-results-table" component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell id="header-project">{t('taskSearch.project')}</TableCell>
                  <TableCell id="header-task">{t('taskSearch.task')}</TableCell>
                  <TableCell id="header-date">{t('taskSearch.date')}</TableCell>
                  <TableCell id="header-duration">{t('taskSearch.duration')}</TableCell>
                  <TableCell id="header-entries">{t('taskSearch.entries')}</TableCell>
                  <TableCell id="header-actions">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((group, index) => (
                  <TableRow id={`result-row-${index}`} key={`${group.projectId}-${group.date}-${index}`}>
                    <TableCell id={`project-cell-${index}`}>
                      {projects.find(p => p.id === group.projectId)?.name || t('common.unknown')}
                    </TableCell>
                    <TableCell id={`task-cell-${index}`}>
                      <Box>
                        <Typography variant="body1">{group.task}</Typography>
                        {group.entries[0]?.tags && group.entries[0].tags.length > 0 && (
                          <Box display="flex" gap={0.5} mt={0.5}>
                            {group.entries[0].tags?.map((tag: string, tagIndex: number) => (
                              <Chip
                                id={`tag-${index}-${tagIndex}`}
                                key={`${group.projectId}-${tag}-${tagIndex}`}
                                label={tag}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      id={`date-cell-${index}`}
                      onClick={() => handleDateClick(group.date)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: 'primary.main'
                        }
                      }}
                    >
                      {group.date}
                    </TableCell>
                    <TableCell id={`duration-cell-${index}`}>{formatDuration(group.totalDuration)}</TableCell>
                    <TableCell id={`entries-cell-${index}`}>{group.entries.length}</TableCell>
                    <TableCell id={`actions-cell-${index}`}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleStartTask(group)}
                        disabled={loading}
                      >
                        {t('common.start')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Box id="no-results" display="flex" justifyContent="center" p={3}>
          <Typography variant="h6" color="text.secondary">
            {t('taskSearch.noResults')}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default TaskSearch;
