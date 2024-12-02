import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { fr, enUS, nl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Close as CloseIcon } from '@mui/icons-material';
import { useProjects } from '../../contexts/ProjectsContext';
import { TimeEntry } from '../../types/TimeEntry';

const locales = {
  fr,
  en: enUS,
  nl,
};

interface TimeEntryFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: Partial<TimeEntry>) => Promise<void>;
  initialData?: Partial<TimeEntry>;
  isEdit?: boolean;
}

const TimeEntryForm: React.FC<TimeEntryFormProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  isEdit = false,
}) => {
  const { t, i18n } = useTranslation();
  const { projects } = useProjects();
  const [formData, setFormData] = useState<Partial<TimeEntry>>({
    projectId: '',
    task: '',
    notes: '',
    tags: [],
    startTime: new Date(),
    endTime: new Date(),
    ...initialData,
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        startTime: initialData.startTime || new Date(),
        endTime: initialData.endTime || new Date(),
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof TimeEntry, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && newTag.trim()) {
      event.preventDefault();
      const updatedTags = [...(formData.tags || []), newTag.trim()];
      setFormData((prev) => ({
        ...prev,
        tags: updatedTags,
      }));
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    const updatedTags = (formData.tags || []).filter((tag) => tag !== tagToDelete);
    setFormData((prev) => ({
      ...prev,
      tags: updatedTags,
    }));
  };

  const handleSubmit = async () => {
    const duration = Math.floor(
      ((formData.endTime?.getTime() || 0) - (formData.startTime?.getTime() || 0)) / 1000
    );
    
    await onSave({
      ...formData,
      duration,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? t('timeTracker.editEntry') : t('timeTracker.manualEntry.title')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>{t('timeTracker.project')}</InputLabel>
            <Select
              value={formData.projectId || ''}
              label={t('timeTracker.project')}
              onChange={(e) => handleChange('projectId', e.target.value)}
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
            label={t('timeTracker.task')}
            value={formData.task || ''}
            onChange={(e) => handleChange('task', e.target.value)}
          />

          <LocalizationProvider 
            dateAdapter={AdapterDateFns}
            adapterLocale={locales[i18n.language as keyof typeof locales] || locales.en}
          >
            <DateTimePicker
              label={t('timeTracker.startTime')}
              value={formData.startTime}
              onChange={(newValue) => handleChange('startTime', newValue)}
            />
            <DateTimePicker
              label={t('timeTracker.endTime')}
              value={formData.endTime}
              onChange={(newValue) => handleChange('endTime', newValue)}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('timeTracker.notes')}
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
          />

          <Box>
            <TextField
              fullWidth
              label={t('timeTracker.tags')}
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleAddTag}
              helperText={t('common.pressEnter')}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {formData.tags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('timeTracker.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained">
          {t('timeTracker.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TimeEntryForm;
