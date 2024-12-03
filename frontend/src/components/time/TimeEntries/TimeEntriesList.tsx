import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Grid,
  CircularProgress,
  Collapse
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useProjects } from '../../../contexts/ProjectsContext';
import EditTimeEntryDialog from './EditTimeEntryDialog';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFirestoreQueryData } from '../../../hooks/useFirestoreQuery';

interface TimeEntry {
  id: string;
  projectId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  notes?: string;
  task?: string;
  tags?: string[];
  userId: string;
}

interface TimeEntriesListProps {
  projectId: string;
}

interface GroupedTimeEntries {
  [key: string]: {
    projectId: string;
    projectName: string;
    task: string;
    totalDuration: number;
    entries: TimeEntry[];
    isExpanded: boolean;
    date: Date;
  };
}

interface SearchFilters {
  task: string;
  tags: string;
  startDate: string;
  endDate: string;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const TotalTimeDisplay = ({ duration }: { duration: number }) => {
  return (
    <Typography variant="body2">
      {formatDuration(duration)}
    </Typography>
  );
};

const TimeEntriesList: React.FC<TimeEntriesListProps> = ({ projectId }) => {
  // Hooks d'état
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SearchFilters>({
    task: '',
    tags: '',
    startDate: '',
    endDate: ''
  });

  // Hooks de contexte
  const { currentUser } = useAuth();
  const { projects } = useProjects();
  const { t } = useTranslation();

  // Construction de la requête Firestore
  const q = useMemo(() => {
    if (!currentUser) return null;
    return query(
      collection(db, 'timeEntries'),
      where('projectId', '==', projectId),
      where('userId', '==', currentUser.uid),
      orderBy('startTime', 'desc'),
      limit(100)
    );
  }, [currentUser, projectId]);

  // React Query hook
  const {
    data: timeEntries,
    isLoading,
    refetch,
    dataUpdatedAt
  } = useFirestoreQueryData<TimeEntry>(
    ['timeEntries', currentUser?.uid || '', projectId],
    q,
    {
      enabled: !!currentUser && !!q,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Memoized values
  const lastRefreshTime = useMemo(() => {
    return dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '';
  }, [dataUpdatedAt]);

  const getProjectName = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Projet inconnu';
  }, [projects]);

  const filteredAndSortedEntries = useMemo(() => {
    if (!timeEntries) return [];
    
    return timeEntries
      .filter(entry => {
        if (!entry) return false;
        
        const matchesTask = !filters.task || 
          entry.task.toLowerCase().includes(filters.task.toLowerCase());
        
        const matchesTags = !filters.tags || 
          entry.tags?.some(tag => 
            tag.toLowerCase().includes(filters.tags.toLowerCase())
          );
        
        const matchesStartDate = !filters.startDate || 
          entry.startTime >= new Date(filters.startDate);
        
        const matchesEndDate = !filters.endDate || 
          entry.endTime <= new Date(filters.endDate);

        return matchesTask && matchesTags && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [timeEntries, filters]);

  const groupedEntries = useMemo(() => {
    const grouped: GroupedTimeEntries = {};
    
    filteredAndSortedEntries.forEach(entry => {
      if (entry.startTime && entry.endTime) {
        const dateStr = formatDate(entry.startTime);
        const taskStr = entry.task?.trim() || 'no-task';
        
        if (!grouped[dateStr]) {
          grouped[dateStr] = {
            projectId: entry.projectId,
            projectName: getProjectName(entry.projectId),
            task: taskStr,
            totalDuration: 0,
            entries: [],
            isExpanded: false,
            date: entry.startTime
          };
        }
        
        const duration = entry.duration || (entry.endTime.getTime() - entry.startTime.getTime()) / 1000;
        grouped[dateStr].entries.push(entry);
        grouped[dateStr].totalDuration += duration;
      }
    });

    return grouped;
  }, [filteredAndSortedEntries, getProjectName]);

  // Callbacks
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleEditClick = useCallback((entry: TimeEntry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const handleFilterChange = useCallback((filterName: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={2}>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} container justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2" color="text.secondary">
                {t('timeTracker.lastUpdate')}: {lastRefreshTime}
              </Typography>
              <Button
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                size="small"
              >
                {t('common.refresh')}
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label={t('timeTracker.searchByTask')}
                value={filters.task}
                onChange={(e) => handleFilterChange('task', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label={t('timeTracker.searchByTags')}
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label={t('timeTracker.startDate')}
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label={t('timeTracker.endDate')}
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('timeTracker.project')}</TableCell>
              <TableCell>{t('timeTracker.task')}</TableCell>
              <TableCell>{t('timeTracker.duration')}</TableCell>
              <TableCell>{t('timeTracker.entries')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(groupedEntries)
              .sort(([keyA, groupA], [keyB, groupB]) => groupB.date.getTime() - groupA.date.getTime())
              .map(([key, group]) => (
                <React.Fragment key={key}>
                  <TableRow 
                    hover
                    onClick={() => toggleGroup(key)}
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: 'rgba(0, 0, 0, 0.03)'
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <IconButton size="small">
                          {expandedGroups.has(key) ? 
                            <KeyboardArrowDownIcon /> : 
                            <KeyboardArrowRightIcon />
                          }
                        </IconButton>
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          {format(group.date, 'EEEE d MMMM yyyy', { locale: fr })}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography>{group.projectName}</Typography>
                        <Typography sx={{ ml: 1, color: 'text.secondary' }}>
                          {group.task}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <TotalTimeDisplay duration={group.totalDuration} />
                    </TableCell>
                    <TableCell>{group.entries.length}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow key={`${key}-row`}>
                    <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                      <Collapse in={expandedGroups.has(key)} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2 }}>
                          <Table size="small">
                            <TableBody>
                              {group.entries.map((entry) => (
                                <TableRow key={entry.id}>
                                  <TableCell sx={{ pl: 6 }}>
                                    {format(entry.startTime, 'HH:mm')} - {entry.endTime ? format(entry.endTime, 'HH:mm') : '--:--'}
                                  </TableCell>
                                  <TableCell>
                                    <TotalTimeDisplay duration={entry.duration || 0} />
                                  </TableCell>
                                  <TableCell>
                                    {entry.tags && entry.tags.map((tag) => (
                                      <Chip
                                        key={`${entry.id}-${tag}`}
                                        label={tag}
                                        size="small"
                                        sx={{ mr: 0.5 }}
                                      />
                                    ))}
                                  </TableCell>
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClick(entry);
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TimeEntriesList;
