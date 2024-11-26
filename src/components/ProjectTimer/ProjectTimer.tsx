import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { doc, updateDoc, collection, addDoc, Timestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface TimeEntry {
  startTime: Date;
  endTime: Date;
  duration: number;
  notes?: string;
  userId: string;
  projectId: string;
}

interface ProjectTimerProps {
  projectId: string;
  projectName: string;
  onTimeUpdate: () => void;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const ProjectTimer: React.FC<ProjectTimerProps> = ({ projectId, projectName, onTimeUpdate }) => {
  const { currentUser } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(new Date());
  };

  const handlePause = async () => {
    setIsRunning(false);
    if (startTime) {
      await saveTimeEntry(new Date(), notes);
      setStartTime(null);
      setTime(0);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setOpenNotesDialog(true);
  };

  const saveTimeEntry = async (endTime: Date, entryNotes: string) => {
    if (!currentUser || !startTime) {
      console.error('Utilisateur non connecté ou temps de début non défini');
      return;
    }

    console.log('Début de sauvegarde avec utilisateur:', currentUser.uid);
    setIsSaving(true);
    
    try {
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      console.log('Durée calculée:', duration);
      
      // Sauvegarder l'entrée de temps
      const timeEntry: TimeEntry = {
        startTime,
        endTime,
        duration,
        notes: entryNotes,
        userId: currentUser.uid,
        projectId: projectId
      };

      console.log('Tentative de sauvegarde de timeEntry:', timeEntry);
      
      // Sauvegarder dans une collection principale timeEntries
      const timeEntriesRef = collection(db, 'timeEntries');
      console.log('Sauvegarde dans la collection principale timeEntries');
      
      // Sauvegarder l'entrée de temps
      const docRef = await addDoc(timeEntriesRef, {
        ...timeEntry,
        startTime: Timestamp.fromDate(timeEntry.startTime),
        endTime: Timestamp.fromDate(timeEntry.endTime),
      });
      console.log('TimeEntry sauvegardée avec ID:', docRef.id);

      // Mettre à jour le temps total du projet
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        totalTime: increment(duration),
        lastUpdated: Timestamp.now(),
      });
      console.log('Projet mis à jour avec nouveau temps total');

      onTimeUpdate();
    } catch (error) {
      console.error('Erreur détaillée lors de la sauvegarde du temps:', error);
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
      }
    } finally {
      setIsSaving(false);
      setTime(0);
    }
  };

  const handleNotesSubmit = async () => {
    if (startTime) {
      await saveTimeEntry(new Date(), notes);
      setStartTime(null);
      setTime(0);
      setNotes('');
    }
    setOpenNotesDialog(false);
  };

  return (
    <>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="h6" component="span" sx={{ minWidth: 100 }}>
          {formatTime(time)}
        </Typography>
        
        {isSaving ? (
          <CircularProgress size={24} />
        ) : (
          <>
            {!isRunning ? (
              <IconButton 
                color="primary" 
                onClick={handleStart}
                disabled={isSaving}
              >
                <PlayIcon />
              </IconButton>
            ) : (
              <IconButton 
                color="primary" 
                onClick={handlePause}
                disabled={isSaving}
              >
                <PauseIcon />
              </IconButton>
            )}
            
            {isRunning && (
              <>
                <IconButton 
                  color="error" 
                  onClick={handleStop}
                  disabled={isSaving}
                >
                  <StopIcon />
                </IconButton>
                <IconButton 
                  color="primary" 
                  onClick={() => setOpenNotesDialog(true)}
                  disabled={isSaving}
                >
                  <NotesIcon />
                </IconButton>
              </>
            )}
          </>
        )}
      </Box>

      <Dialog open={openNotesDialog} onClose={() => setOpenNotesDialog(false)}>
        <DialogTitle>Ajouter des notes pour {projectName}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotesDialog(false)}>Annuler</Button>
          <Button onClick={handleNotesSubmit} variant="contained">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ProjectTimer;
