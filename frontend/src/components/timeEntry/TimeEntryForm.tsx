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
  Typography,
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
  existingTags?: string[];
}

const TimeEntryForm: React.FC<TimeEntryFormProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  isEdit = false,
  existingTags = [],
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
      console.log('Setting initial data with tags:', initialData.tags); // Debug log
      setFormData({
        ...initialData,
        startTime: initialData.startTime || new Date(),
        endTime: initialData.endTime || new Date(),
        tags: initialData.tags || []
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof TimeEntry, value: any) => {
    console.log(`Updating ${field} with value:`, value); // Debug log
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddTag = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && newTag.trim()) {
      event.preventDefault();
      const tagToAdd = newTag.trim();
      console.log('Adding new tag:', tagToAdd); // Debug log
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagToAdd]
      }));
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    console.log('Deleting tag:', tagToDelete); // Debug log
    const updatedTags = (formData.tags || []).filter((tag) => tag !== tagToDelete);
    setFormData(prev => ({
      ...prev,
      tags: updatedTags
    }));
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting form data with tags:', formData.tags); // Debug log
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving time entry:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? t('timeTracker.editEntry') : t('timeTracker.newEntry')}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
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
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newTag.trim()) {
                    const tagToAdd = newTag.trim();
                    console.log('Adding new tag:', tagToAdd); // Debug log
                    setFormData(prev => ({
                      ...prev,
                      tags: [...(prev.tags || []), tagToAdd]
                    }));
                    setNewTag('');
                  }
                }
              }}
              placeholder={t('timeTracker.addTag')}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {formData.tags?.map((tag, index) => (
                <Chip
                  key={`tag-${index}`}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                />
              ))}
            </Box>
            {existingTags.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  {t('timeTracker.existingTags')}:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  {existingTags
                    .filter(tag => !formData.tags?.includes(tag))
                    .map((tag, index) => (
                      <Chip
                        key={`existing-tag-${index}`}
                        label={tag}
                        size="small"
                        onClick={() => {
                          console.log('Adding existing tag:', tag); // Debug log
                          const updatedTags = [...(formData.tags || []), tag];
                          setFormData(prev => ({
                            ...prev,
                            tags: updatedTags
                          }));
                        }}
                      />
                    ))}
                </Box>
              </Box>
            )}
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
