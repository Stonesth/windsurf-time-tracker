import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface DayReport {
  day: string;
  hours: number;
  target: number;
  date: Date;
}

interface WeeklyReportProps {
  onTimeUpdate: () => void;
}

const DAYS_OF_WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DEFAULT_TARGET_HOURS = 8;
const WEEKEND_TARGET_HOURS = 0;

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ onTimeUpdate }) => {
  const { currentUser } = useAuth();
  const [weeklyData, setWeeklyData] = useState<DayReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!currentUser) return;

      try {
        // Calculer le début et la fin de la semaine
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        // Requête unique pour toutes les entrées de temps
        const timeEntriesQuery = query(
          collection(db, 'timeEntries'),
          where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(timeEntriesQuery);
        
        // Initialiser les données pour chaque jour de la semaine
        const dailyHours: { [key: string]: number } = {};
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(date.getDate() + i);
          dailyHours[date.toDateString()] = 0;
        }

        // Calculer les heures par jour
        snapshot.forEach((doc) => {
          const data = doc.data();
          const startTime = data.startTime.toDate();
          
          // Ne traiter que les entrées de cette semaine
          if (startTime >= startOfWeek && startTime < endOfWeek) {
            dailyHours[startTime.toDateString()] += data.duration / 3600; // Convertir les secondes en heures
          }
        });

        // Créer le rapport hebdomadaire
        const weeklyReport = Object.entries(dailyHours).map(([dateStr, hours]) => {
          const date = new Date(dateStr);
          const dayName = DAYS_OF_WEEK[date.getDay()];
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          return {
            day: dayName,
            date: date,
            hours: hours,
            target: isWeekend ? WEEKEND_TARGET_HOURS : DEFAULT_TARGET_HOURS
          };
        });

        setWeeklyData(weeklyReport);
      } catch (error) {
        console.error('Erreur lors de la récupération des données hebdomadaires:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, [currentUser]);

  const calculateProgress = (hours: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min((hours / target) * 100, 100);
  };

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getTotalHours = (): number => {
    return weeklyData.reduce((acc, day) => acc + day.hours, 0);
  };

  const getTargetHours = (): number => {
    return weeklyData.reduce((acc, day) => acc + day.target, 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Total de la semaine: {formatHours(getTotalHours())} / {formatHours(getTargetHours())}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={calculateProgress(getTotalHours(), getTargetHours())}
          sx={{ height: 10, borderRadius: 5 }}
        />
      </Box>

      <List>
        {weeklyData.map((day) => (
          <ListItem key={day.day} sx={{ px: 0 }}>
            <ListItemText
              primary={
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body1">
                    {day.day} {day.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatHours(day.hours)} {day.target > 0 && `/ ${formatHours(day.target)}`}
                  </Typography>
                </Box>
              }
              secondary={
                day.target > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress(day.hours, day.target)}
                    sx={{ mt: 1 }}
                  />
                )
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
