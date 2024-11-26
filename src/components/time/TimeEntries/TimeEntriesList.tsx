import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  TextField,
  Stack,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import EditIcon from '@mui/icons-material/Edit';
import EditTimeEntryDialog from './EditTimeEntryDialog';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

interface TimeEntry {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  notes?: string;
  userId: string;
  projectId: string;
}

interface TimeEntriesListProps {
  projectId: string;
}

interface GroupedTimeEntry {
  description: string;
  totalDuration: number;
  entries: TimeEntry[];
  isExpanded: boolean;
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
  const [groupedEntries, setGroupedEntries] = useState<GroupedTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const groupEntries = (entries: TimeEntry[]) => {
    const groups: { [key: string]: TimeEntry[] } = {};
    entries.forEach(entry => {
      const description = entry.notes || 'Sans description';
      if (!groups[description]) {
        groups[description] = [];
      }
      groups[description].push(entry);
    });

    return Object.entries(groups).map(([description, entries]) => ({
      description,
      entries: entries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()),
      totalDuration: entries.reduce((sum, entry) => sum + entry.duration, 0),
      isExpanded: false
    }));
  };

  useEffect(() => {
    const timeEntriesRef = collection(db, 'timeEntries');
    const q = query(
      timeEntriesRef,
      where('projectId', '==', projectId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries: TimeEntry[] = [];
        let total = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          const startTime = data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime);
          const endTime = data.endTime instanceof Timestamp ? data.endTime.toDate() : new Date(data.endTime);
          const entry = {
            id: doc.id,
            startTime,
            endTime,
            duration: data.duration,
            notes: data.notes || '',
            userId: data.userId,
            projectId: data.projectId,
          };
          entries.push(entry);
          total += entry.duration;
        });

        setTimeEntries(entries);
        setGroupedEntries(groupEntries(entries));
        setTotalDuration(total);
        setLoading(false);
      },
      (err) => {
        console.error('Erreur lors de la récupération des time entries:', err);
        setError('Erreur lors du chargement des entrées de temps');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  const handleExpandGroup = (index: number) => {
    setGroupedEntries(prev => prev.map((group, i) => 
      i === index ? { ...group, isExpanded: !group.isExpanded } : group
    ));
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
  };

  const handleUpdateEntry = () => {
    // Rafraîchir les données après une mise à jour
    // Les données seront automatiquement mises à jour grâce à onSnapshot
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
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <TextField
          label="Date de début"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="Date de fin"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <Tooltip title="Réinitialiser les filtres">
          <IconButton 
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setGroupedEntries(groupEntries(timeEntries));
              setTotalDuration(timeEntries.reduce((sum, entry) => sum + entry.duration, 0));
            }}
            size="small"
            color="primary"
            sx={{ ml: 1 }}
          >
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle1" color="primary" sx={{ ml: 'auto' }}>
          Temps total : {formatDuration(totalDuration)}
        </Typography>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Durée totale</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedEntries.map((group, groupIndex) => (
              <React.Fragment key={group.description}>
                <TableRow 
                  hover 
                  onClick={() => handleExpandGroup(groupIndex)}
                  sx={{ cursor: 'pointer', backgroundColor: group.isExpanded ? 'action.hover' : 'inherit' }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <IconButton size="small" sx={{ mr: 1 }}>
                        {group.isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                      </IconButton>
                      {group.description}
                    </Box>
                  </TableCell>
                  <TableCell>{formatDuration(group.totalDuration)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {group.entries.length} entrée{group.entries.length > 1 ? 's' : ''}
                    </Typography>
                  </TableCell>
                </TableRow>
                {group.isExpanded && group.entries.map(entry => (
                  <TableRow key={entry.id} sx={{ backgroundColor: 'action.hover' }}>
                    <TableCell sx={{ pl: 6 }}>
                      {formatDate(entry.startTime)} {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                    </TableCell>
                    <TableCell>{formatDuration(entry.duration)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEntry(entry);
                        }}
                      >
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
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        timeEntry={editingEntry}
        onUpdate={handleUpdateEntry}
      />
    </Box>
  );
};

export default TimeEntriesList;
