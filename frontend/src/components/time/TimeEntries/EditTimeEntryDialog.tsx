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
  task?: string;
  tags?: string[];
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
    task: '',
    tags: '',
    projectId: '',
  });
  const [loading, setLoading] = useState(false);
  const { projects } = useProjects();

  useEffect(() => {
    if (timeEntry) {
      const start = new Date(timeEntry.startTime);
      const end = new Date(timeEntry.endTime);

      setFormData({
        startDate: start.toISOString().split('T')[0],
        startTime: start.toTimeString().split(' ')[0].substr(0, 5),
        endDate: end.toISOString().split('T')[0],
        endTime: end.toTimeString().split(' ')[0].substr(0, 5),
        notes: timeEntry.notes || '',
        task: timeEntry.task || '',
        tags: timeEntry.tags ? timeEntry.tags.join(', ') : '',
        projectId: timeEntry.projectId,
      });
    }
  }, [timeEntry]);

  const handleSave = async () => {
    if (!timeEntry) return;
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      const timeEntryRef = doc(db, 'timeEntries', timeEntry.id);
      await updateDoc(timeEntryRef, {
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        notes: formData.notes,
        task: formData.task,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        projectId: formData.projectId,
        lastUpdated: Timestamp.now(),
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !timeEntry) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableEnforceFocus
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Modifier l'entrée de temps</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Projet</InputLabel>
              <Select
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

            <TextField
              fullWidth
              label="Tâche"
              value={formData.task}
              onChange={(e) => setFormData(prev => ({ ...prev, task: e.target.value }))}
            />

            <TextField
              fullWidth
              label="Tags (séparés par des virgules)"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              helperText="Exemple: important, urgent, bug"
            />

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
              fullWidth
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={2}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTimeEntryDialog;
