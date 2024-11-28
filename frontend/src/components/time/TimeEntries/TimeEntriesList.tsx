import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useProjects } from '../../../contexts/ProjectsContext';
import EditTimeEntryDialog from './EditTimeEntryDialog';

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

const TimeEntriesList: React.FC<TimeEntriesListProps> = ({ projectId }) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [groupedEntries, setGroupedEntries] = useState<GroupedTimeEntries>({});
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    task: '',
    tags: '',
    startDate: '',
    endDate: '',
  });
  const { currentUser } = useAuth();
  const { projects, loading: projectsLoading } = useProjects();

  // Fonction pour obtenir le nom du projet
  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Projet inconnu';
  };

  useEffect(() => {
    if (!currentUser) return;

    let q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', currentUser.uid)
    );

    if (projectId) {
      q = query(q, where('projectId', '==', projectId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate(),
      })) as TimeEntry[];

      setTimeEntries(entries);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, projectId]);

  useEffect(() => {
    if (loading || projectsLoading) return;

    const grouped: GroupedTimeEntries = {};
    
    timeEntries.forEach(entry => {
      const key = `${entry.projectId}-${entry.task || 'Sans tâche'}`;
      if (!grouped[key]) {
        grouped[key] = {
          projectId: entry.projectId,
          projectName: getProjectName(entry.projectId),
          task: entry.task || 'Sans tâche',
          totalDuration: 0,
          entries: [],
          isExpanded: false,
        };
      }
      
      const duration = (entry.endTime.getTime() - entry.startTime.getTime()) / 1000;
      grouped[key].entries.push(entry);
      grouped[key].totalDuration += duration;
    });

    setGroupedEntries(grouped);
  }, [timeEntries, projects, loading, projectsLoading]);

  const handleEditClick = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setEditDialogOpen(true);
  };

  const handleFilterChange = (field: keyof SearchFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const toggleGroupExpansion = (key: string) => {
    setGroupedEntries(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isExpanded: !prev[key].isExpanded
      }
    }));
  };

  const filteredGroups = Object.entries(groupedEntries).filter(([_, group]) => {
    const matchesTask = !filters.task || 
      group.task.toLowerCase().includes(filters.task.toLowerCase());
    
    const matchesTags = !filters.tags || 
      group.entries.some(entry => 
        entry.tags?.some(tag => 
          tag.toLowerCase().includes(filters.tags.toLowerCase())
        )
      );
    
    const matchesStartDate = !filters.startDate || 
      group.entries.some(entry => 
        new Date(entry.startTime) >= new Date(filters.startDate)
      );
    
    const matchesEndDate = !filters.endDate || 
      group.entries.some(entry => 
        new Date(entry.endTime) <= new Date(filters.endDate)
      );

    return matchesTask && matchesTags && matchesStartDate && matchesEndDate;
  });

  if (loading || projectsLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="h6" gutterBottom>
          Entrées de temps
        </Typography>
        
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Rechercher par tâche"
                value={filters.task}
                onChange={handleFilterChange('task')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Rechercher par tags"
                value={filters.tags}
                onChange={handleFilterChange('tags')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Date de début"
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Date de fin"
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
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
              <TableCell>Projet / Tâche</TableCell>
              <TableCell>Durée totale</TableCell>
              <TableCell>Nombre d'entrées</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroups.map(([key, group]) => (
              <React.Fragment key={key}>
                <TableRow 
                  hover
                  onClick={() => toggleGroupExpansion(key)}
                  sx={{ 
                    cursor: 'pointer',
                    backgroundColor: 'rgba(0, 0, 0, 0.03)'
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <IconButton size="small">
                        {group.isExpanded ? 
                          <KeyboardArrowDownIcon /> : 
                          <KeyboardArrowRightIcon />
                        }
                      </IconButton>
                      <Box ml={1}>
                        <Typography variant="subtitle2">
                          {group.projectName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {group.task}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{formatDuration(group.totalDuration)}</TableCell>
                  <TableCell>{group.entries.length}</TableCell>
                  <TableCell />
                </TableRow>
                {group.isExpanded && group.entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell sx={{ pl: 6 }}>
                      <Box>
                        <Typography variant="body2">
                          {formatDate(entry.startTime)} {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                        </Typography>
                        {entry.tags && entry.tags.length > 0 && (
                          <Box mt={0.5}>
                            {entry.tags.map((tag, index) => (
                              <Chip
                                key={index}
                                label={tag}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {formatDuration(
                        (entry.endTime.getTime() - entry.startTime.getTime()) / 1000
                      )}
                    </TableCell>
                    <TableCell />
                    <TableCell>
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(entry);
                      }}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <EditTimeEntryDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        timeEntry={selectedEntry}
        onUpdate={() => {
          setEditDialogOpen(false);
          setSelectedEntry(null);
        }}
      />
    </Box>
  );
};

export default TimeEntriesList;
