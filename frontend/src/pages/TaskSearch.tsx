import React, { useState } from 'react';
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
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
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
}

interface SearchParams {
  taskName: string;
  projectId: string;
}

const TaskSearch = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TimeEntry[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    taskName: '',
    projectId: '',
  });
  const [totalDuration, setTotalDuration] = useState(0);

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
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime?.toDate() || null,
        }))
        .filter(entry => {
          if (searchParams.taskName) {
            return entry.task?.toLowerCase().includes(searchParams.taskName.toLowerCase());
          }
          return true;
        }) as TimeEntry[];

      // Calculer la durée totale
      const total = entries.reduce((acc, entry) => acc + (entry.duration || 0), 0);
      setTotalDuration(total);
      setSearchResults(entries);
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
              fullWidth
              label={t('taskSearch.searchPlaceholder')}
              value={searchParams.taskName}
              onChange={(e) => setSearchParams({ ...searchParams, taskName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>{t('taskSearch.project')}</InputLabel>
              <Select
                value={searchParams.projectId}
                label={t('taskSearch.project')}
                onChange={(e) => setSearchParams({ ...searchParams, projectId: e.target.value })}
              >
                <MenuItem value="">
                  <em>{t('common.all')}</em>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box display="flex" gap={1}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
              >
                {t('taskSearch.search')}
              </Button>
              <Button
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
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : searchResults.length > 0 ? (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {t('taskSearch.results')} ({searchResults.length})
            </Typography>
            <Typography variant="h6">
              {t('taskSearch.totalTime')}: {formatDuration(totalDuration)}
            </Typography>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('taskSearch.project')}</TableCell>
                  <TableCell>{t('taskSearch.task')}</TableCell>
                  <TableCell>{t('taskSearch.date')}</TableCell>
                  <TableCell>{t('taskSearch.duration')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchResults.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {projects.find(p => p.id === entry.projectId)?.name || t('common.unknown')}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body1">{entry.task}</Typography>
                        {entry.tags && entry.tags.length > 0 && (
                          <Box display="flex" gap={0.5} mt={0.5}>
                            {entry.tags.map((tag, index) => (
                              <Chip
                                key={index}
                                label={tag}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{formatDate(entry.startTime)}</TableCell>
                    <TableCell>{formatDuration(entry.duration || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Box display="flex" justifyContent="center" p={3}>
          <Typography variant="h6" color="text.secondary">
            {t('taskSearch.noResults')}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default TaskSearch;
