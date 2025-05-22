import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Timer as TimerIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const formatTotalTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

interface TotalTimeDisplayProps {
  variant?: 'default' | 'navbar';
  specificDate?: Date;
  showTotal?: boolean;
}

const TotalTimeDisplay: React.FC<TotalTimeDisplayProps> = ({ variant = 'default', specificDate, showTotal = false }) => {
  const [totalTime, setTotalTime] = useState(0);
  const [totalDayTime, setTotalDayTime] = useState(0);
  const { currentUser } = useAuth();

  const calculateTotalTime = async () => {
    if (!currentUser) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const tasksQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid),
        where('startTime', '>=', Timestamp.fromDate(today))
      );

      const querySnapshot = await getDocs(tasksQuery);
      let total = 0;

      querySnapshot.forEach((doc) => {
        const task = doc.data();
        if (task.isRunning) {
          const currentDuration = Math.floor((Date.now() - task.startTime.toDate().getTime()) / 1000);
          total += currentDuration;
        } else if (task.duration) {
          total += task.duration;
        }
      });

      return total;
    } catch (error) {
      console.error('Error calculating total time:', error);
      return 0;
    }
  };
  
  const calculateDayTotalTime = async () => {
    if (!currentUser || !specificDate) return 0;
    
    // Définir le début et la fin de la journée spécifiée
    const dayStart = new Date(specificDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(specificDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    try {
      const tasksQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid),
        where('startTime', '>=', Timestamp.fromDate(dayStart)),
        where('startTime', '<=', Timestamp.fromDate(dayEnd))
      );
      
      const querySnapshot = await getDocs(tasksQuery);
      let total = 0;
      
      querySnapshot.forEach((doc) => {
        const task = doc.data();
        if (task.duration) {
          total += task.duration;
        } else if (task.isRunning && task.startTime) {
          // Pour les tâches en cours, calculer la durée jusqu'à maintenant
          const now = new Date();
          const taskStartTime = task.startTime.toDate();
          const currentDuration = Math.floor((now.getTime() - taskStartTime.getTime()) / 1000);
          total += currentDuration;
        }
      });
      
      return total;
    } catch (error) {
      console.error('Error calculating day total time:', error);
      return 0;
    }
  };

  useEffect(() => {
    const updateTotalTime = async () => {
      const time = await calculateTotalTime();
      setTotalTime(time);
      
      if (showTotal && specificDate) {
        const dayTotal = await calculateDayTotalTime();
        setTotalDayTime(dayTotal);
      }
    };

    const interval = setInterval(updateTotalTime, 1000);
    updateTotalTime();

    return () => clearInterval(interval);
  }, [currentUser, specificDate, showTotal]);

  if (variant === 'navbar') {
    return (
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'white'
        }}
      >
        <TimerIcon fontSize="small" />
        <Typography variant="body1">
          {formatTotalTime(totalTime)}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex',
        gap: 2,
        alignItems: 'center'
      }}
    >
      {/* Compteur violet (temps total de la journée) */}
      {showTotal && specificDate && (
        <Box 
          sx={{ 
            backgroundColor: 'secondary.main',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <TimerIcon fontSize="small" />
          <Typography variant="h6" component="span">
            {formatTotalTime(totalDayTime)}
          </Typography>
        </Box>
      )}
      
      {/* Compteur bleu (temps aujourd'hui) */}
      <Box 
        sx={{ 
          backgroundColor: 'primary.main',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <TimerIcon fontSize="small" />
        <Typography variant="h6" component="span">
          {formatTotalTime(totalTime)}
        </Typography>
      </Box>
    </Box>
  );
};

export default TotalTimeDisplay;
