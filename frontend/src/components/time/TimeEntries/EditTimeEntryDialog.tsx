import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Box,
} from '@mui/material';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useProjects, Project } from '../../../hooks/useProjects';

interface TimeEntry {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  notes?: string;
  userId: string;
  projectId: string;
}

interface EditTimeEntryDialogProps {
  open: boolean;
  onClose: () => void;
  timeEntry: TimeEntry | null;
  onUpdate: () => void;
}

const EditTimeEntryDialog: React.FC<EditTimeEntryDialogProps> = ({
  open,
  onClose,
  timeEntry,
  onUpdate,
}) => {
  const [formData, setFormData] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    notes: '',
    projectId: '',
  });
  const [loading, setLoading] = useState(false);
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();

  useEffect(() => {
    if (timeEntry && projects.length > 0) {
      const start = new Date(timeEntry.startTime);
      const end = new Date(timeEntry.endTime);

      // Fonction pour formater l'heure avec les secondes
      const formatTime = (date: Date) => {
        return date.toTimeString().slice(0, 8); // HH:mm:ss
      };

      // Vérifier si le projet existe toujours dans la liste
      const projectExists = projects.some(p => p.id === timeEntry.projectId);
      
      setFormData(prev => {
        const newStartDate = start.toISOString().split('T')[0];
        const newStartTime = formatTime(start);
        const newEndDate = end.toISOString().split('T')[0];
        const newEndTime = formatTime(end);
        const newProjectId = projectExists ? timeEntry.projectId : projects[0].id;

        // Ne mettre à jour que si les valeurs sont différentes
        if (
          prev.startDate === newStartDate &&
          prev.startTime === newStartTime &&
          prev.endDate === newEndDate &&
          prev.endTime === newEndTime &&
          prev.notes === timeEntry.notes &&
          prev.projectId === newProjectId
        ) {
          return prev;
        }

        return {
          startDate: newStartDate,
          startTime: newStartTime,
          endDate: newEndDate,
          endTime: newEndTime,
          notes: timeEntry.notes || '',
          projectId: newProjectId,
        };
      });
    }
  }, [timeEntry, projects]);

  const handleSave = async () => {
    if (!timeEntry) return;

    try {
      setLoading(true);

      // Créer des dates complètes avec les secondes
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const timeEntryRef = doc(db, 'timeEntries', timeEntry.id);
      await updateDoc(timeEntryRef, {
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        notes: formData.notes,
        projectId: formData.projectId,
        lastUpdated: Timestamp.now(),
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'entrée de temps:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !timeEntry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier l'entrée de temps</DialogTitle>
      <DialogContent>
        {projectsLoading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : projectsError ? (
          <Box display="flex" justifyContent="center" my={3} color="error.main">
            {projectsError}
          </Box>
        ) : projects.length === 0 ? (
          <Box display="flex" justifyContent="center" my={3}>
            Aucun projet disponible
          </Box>
        ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="project-select-label">Projet</InputLabel>
              <Select
                labelId="project-select-label"
                value={formData.projectId}
                onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                label="Projet"
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Date de début"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Heure de début"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Date de fin"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Heure de fin"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={loading || projectsLoading}
        >
          {loading ? <CircularProgress size={20} /> : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTimeEntryDialog;
