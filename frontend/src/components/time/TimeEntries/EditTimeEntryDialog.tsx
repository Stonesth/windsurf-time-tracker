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
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { fr } from 'date-fns/locale';

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
    startTime: new Date(),
    endTime: new Date(),
    notes: '',
    task: '',
    tags: '',
    projectId: '',
  });
  const [loading, setLoading] = useState(false);
  const { projects } = useProjects();

  useEffect(() => {
    if (timeEntry) {
      setFormData({
        startTime: new Date(timeEntry.startTime),
        endTime: new Date(timeEntry.endTime),
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
      const timeEntryRef = doc(db, 'timeEntries', timeEntry.id);
      await updateDoc(timeEntryRef, {
        startTime: Timestamp.fromDate(formData.startTime),
        endTime: Timestamp.fromDate(formData.endTime),
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

            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <Stack spacing={2}>
                <DateTimePicker
                  label="Date et heure de début"
                  value={formData.startTime}
                  onChange={(newValue) => setFormData(prev => ({ ...prev, startTime: newValue || new Date() }))}
                  format="dd/MM/yyyy HH:mm"
                  ampm={false}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DateTimePicker
                  label="Date et heure de fin"
                  value={formData.endTime}
                  onChange={(newValue) => setFormData(prev => ({ ...prev, endTime: newValue || new Date() }))}
                  format="dd/MM/yyyy HH:mm"
                  ampm={false}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Stack>
            </LocalizationProvider>

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
