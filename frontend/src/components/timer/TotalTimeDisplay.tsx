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
}

const TotalTimeDisplay: React.FC<TotalTimeDisplayProps> = ({ variant = 'default' }) => {
  const [totalTime, setTotalTime] = useState(0);
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

  useEffect(() => {
    const updateTotalTime = async () => {
      const time = await calculateTotalTime();
      setTotalTime(time);
    };

    const interval = setInterval(updateTotalTime, 1000);
    updateTotalTime();

    return () => clearInterval(interval);
  }, [currentUser]);

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
  );
};

export default TotalTimeDisplay;
