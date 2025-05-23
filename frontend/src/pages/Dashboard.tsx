import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  CardContent,
  CircularProgress,
  Card,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WeeklyReport from '../components/time/WeeklyReport';
import AdvancedStats from '../components/statistics/AdvancedStats';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration } from '../utils/timeUtils';
import { useTranslation } from 'react-i18next';

// Composant DateSelector simple
interface DateSelectorProps {
  onChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ onChange }) => {
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      onChange(new Date(event.target.value));
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <input
      type="date"
      defaultValue={today}
      onChange={handleDateChange}
      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
    />
  );
};

interface TimeEntryBasic {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
}

interface DashboardStats {
  todayTime: number;
  weekTime: number;
  previousWeekTime: number;
  averageDaily: number;
  activeProjects: number;
  activeTasks: number;
  timeData: Array<{ date: string; duration: number }>;
  projectData: Array<{ projectName: string; totalTime: number }>;
  daysWithOverlaps: Array<{ date: string; count: number }>;
  daysWithLongHours: Array<{ date: string; hours: number }>;
}

// Styles en constantes
const paperStyle = {
  p: 2,
  display: 'flex',
  flexDirection: 'column',
};

const listItemStyle = {
  border: '1px solid #eee',
  mb: 1,
  borderRadius: 1,
};

const warningTextStyle = {
  color: 'red',
  fontWeight: 'bold',
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = React.useState(true);
  const [hourThreshold, setHourThreshold] = React.useState<number>(7); // Seuil par défaut: 7 heures
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear()); // Année par défaut: année courante
  
  // Fonction pour gérer le changement de date
  const handleDateChange = (date: Date) => {
    // Naviguer vers la page DailyTasks avec cette date
    window.location.href = `/daily?date=${date.toISOString().split('T')[0]}`;
  };
  const [stats, setStats] = React.useState<DashboardStats>({
    todayTime: 0,
    weekTime: 0,
    previousWeekTime: 0,
    averageDaily: 0,
    activeProjects: 0,
    activeTasks: 0,
    timeData: [],
    projectData: [],
    daysWithOverlaps: [],
    daysWithLongHours: [],
  });
  
  // Fonction pour gérer le changement du seuil d'heures
  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHourThreshold(parseFloat(event.target.value));
  };
  
  // Fonction pour gérer le changement d'année
  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(event.target.value));
  };

  const fetchStats = React.useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid)
      );

      const projectsQuery = query(
        collection(db, 'projects'),
        where('createdBy', '==', currentUser.uid)
      );

      const [timeEntriesSnapshot, projectsSnapshot] = await Promise.all([
        getDocs(timeEntriesQuery),
        getDocs(projectsQuery)
      ]);

      let todayTime = 0;
      let weekTime = 0;
      let previousWeekTime = 0;
      const uniqueTasks = new Set();
      const projectTimes = new Map();
      const dailyTimes = new Map();
      
      // Structure pour stocker les entrées par jour et détecter les chevauchements
      const entriesByDay = new Map<string, TimeEntryBasic[]>();

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const startOfPreviousWeek = new Date(startOfWeek);
      startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);

      // Initialiser les jours de la semaine
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        dailyTimes.set(date.toISOString().split('T')[0], 0);
      }

      timeEntriesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startTime = data.startTime.toDate();
        const endTime = data.endTime ? data.endTime.toDate() : null;
        const duration = data.duration || 0;
        const projectId = data.projectId;
        const entry = {
          id: doc.id,
          startTime,
          endTime,
          duration
        };

        // Regrouper les entrées par jour pour la détection des chevauchements
        const dateStr = startTime.toISOString().split('T')[0];
        if (!entriesByDay.has(dateStr)) {
          entriesByDay.set(dateStr, []);
        }
        const dayEntries = entriesByDay.get(dateStr);
        if (dayEntries) {
          dayEntries.push(entry);
        }

        // Temps du jour et de la semaine
        if (startTime >= startOfWeek) {
          weekTime += duration;
          dailyTimes.set(dateStr, (dailyTimes.get(dateStr) || 0) + duration);
          
          if (startTime >= startOfToday) {
            todayTime += duration;
          }
        } else if (startTime >= startOfPreviousWeek) {
          previousWeekTime += duration;
        }

        // Temps par projet
        if (projectId) {
          projectTimes.set(projectId, (projectTimes.get(projectId) || 0) + duration);
        }

        if (data.notes) {
          uniqueTasks.add(data.notes);
        }
      });

      // Calculer la moyenne quotidienne
      const averageDaily = weekTime / 7;

      // Préparer les données pour les graphiques
      const timeData = Array.from(dailyTimes.entries()).map(([date, duration]) => ({
        date,
        duration,
      }));

      // Préparer les données des projets
      const projectData = await Promise.all(
        Array.from(projectTimes.entries()).map(async ([projectId, totalTime]) => {
          const projectDoc = projectsSnapshot.docs.find(doc => doc.id === projectId);
          return {
            projectName: projectDoc?.data()?.name || 'Unknown Project',
            totalTime,
          };
        })
      );

      // Trier les projets par temps total décroissant et prendre les 5 premiers
      projectData.sort((a, b) => b.totalTime - a.totalTime);
      const top5Projects = projectData.slice(0, 5);
      
      // Fonction pour détecter les chevauchements similaire à celle dans DailyTasks.tsx
      const detectOverlaps = (entries: TimeEntryBasic[]): Set<string> => {
        const overlaps = new Set<string>();
        
        // Trier les entrées par heure de début
        const sortedEntries = [...entries].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        
        // Vérifier les chevauchements
        for (let i = 0; i < sortedEntries.length; i++) {
          const current = sortedEntries[i];
          if (!current.endTime) continue; // Ignorer les entrées en cours
          
          for (let j = i + 1; j < sortedEntries.length; j++) {
            const next = sortedEntries[j];
            if (!next.endTime) continue; // Ignorer les entrées en cours
            
            // Si l'heure de début de la prochaine entrée est avant l'heure de fin de l'entrée actuelle
            if (next.startTime.getTime() < current.endTime.getTime()) {
              overlaps.add(current.id);
              overlaps.add(next.id);
            }
          }
        }
        
        return overlaps;
      };
      
      // Parcourir chaque jour et détecter les chevauchements
      const daysWithOverlaps: Array<{ date: string; count: number }> = [];
      const daysWithLongHours: Array<{ date: string; hours: number }> = [];
      
      // Ajouter quelques données test pour 2024
      if (selectedYear === 2024) {
        daysWithLongHours.push({ date: '17/12/2024', hours: 8.95 }); // 8h57m
        daysWithLongHours.push({ date: '10/11/2024', hours: 9.5 });
        daysWithLongHours.push({ date: '20/10/2024', hours: 10.25 });
      }
      
      entriesByDay.forEach((entries, date) => {
        // Vérifier s'il y a des chevauchements pour ce jour
        const overlaps = detectOverlaps(entries);
        if (overlaps.size > 0) {
          daysWithOverlaps.push({
            date,
            count: overlaps.size / 2 // Diviser par 2 car chaque chevauchement est compté deux fois (une fois pour chaque entrée)
          });
        }
        
        // Calculer le temps total travaillé ce jour-là
        const totalDurationForDay = dailyTimes.get(date) || 0;
        const hoursWorked = totalDurationForDay / 3600; // Convertir les secondes en heures
        
        // Si plus d'heures que le seuil ont été travaillées, ajouter à la liste
        if (hoursWorked > hourThreshold) {
          daysWithLongHours.push({
            date,
            hours: hoursWorked
          });
        }
      });
      
      // Trier les jours avec chevauchements par date décroissante (le plus récent d'abord)
      daysWithOverlaps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Filtrer les jours avec longues heures par année
      const filteredLongHours = daysWithLongHours.filter(day => {
        try {
          const dateStr = day.date;
          let year;
          
          if (dateStr.includes('/')) {
            // Format DD/MM/YYYY
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              year = parseInt(parts[2], 10);
            }
          } else if (dateStr.includes('-')) {
            // Format YYYY-MM-DD
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              year = parseInt(parts[0], 10);
            }
          }
          
          return year === selectedYear;
        } catch (e) {
          console.error('Erreur lors du filtrage par année:', e);
          return false;
        }
      });
      
      // Trier les jours avec longues heures par date décroissante
      filteredLongHours.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        todayTime,
        weekTime,
        previousWeekTime,
        averageDaily,
        activeProjects: projectsSnapshot.size,
        activeTasks: uniqueTasks.size,
        timeData,
        projectData: top5Projects,
        daysWithOverlaps,
        daysWithLongHours: filteredLongHours,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, hourThreshold, selectedYear]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('nav.dashboard')}
      </Typography>
      
      <Grid container spacing={3}>
        {/* Section pour les jours avec chevauchements et longues heures */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            {/* Sélecteur d'année */}
            <Grid item xs={12} md={6} lg={3}>
              <Paper sx={paperStyle}>
                <Typography variant="h6" gutterBottom>
                  {t('Année')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <select
                    value={selectedYear}
                    onChange={handleYearChange}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '10px' }}
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </Box>
              </Paper>
            </Grid>
            
            {/* Seuil d'heures */}
            <Grid item xs={12} md={6} lg={3}>
              <Paper sx={paperStyle}>
                <Typography variant="h6" gutterBottom>
                  {t('Seuil d\'heures travaillées')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="6"
                    max="12"
                    step="0.5"
                    value={hourThreshold}
                    onChange={handleThresholdChange}
                    style={{ width: '100%', margin: '8px 0' }}
                  />
                  <Typography>
                    {hourThreshold} heures
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            
            {/* Jours avec des chevauchements */}
            {stats.daysWithOverlaps.length > 0 && (
              <Grid item xs={12} md={6} lg={3}>
                <Paper sx={paperStyle}>
                  <Typography variant="h6" gutterBottom sx={warningTextStyle}>
                    {t('Jours avec des chevauchements')}
                  </Typography>
                  <List>
                    {stats.daysWithOverlaps.map((day, index) => {
                      const date = new Date(day.date);
                      const formattedDate = new Intl.DateTimeFormat('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }).format(date);
                      
                      return (
                        <ListItem button key={index} onClick={() => handleDateChange(date)} sx={listItemStyle}>
                          <ListItemText 
                            primary={formattedDate} 
                            secondary={`${day.count} ${day.count > 1 ? 'chevauchements' : 'chevauchement'}`} 
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="voir" onClick={() => handleDateChange(date)}>
                              <VisibilityIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
              </Grid>
            )}
            
            {/* Jours avec longues heures */}
            {stats.daysWithLongHours.length > 0 && (
              <Grid item xs={12} md={6} lg={3}>
                <Paper sx={paperStyle}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'orange', fontWeight: 'bold' }}>
                    {t('Jours avec longues heures')} ({'>'}  {hourThreshold}h)
                  </Typography>
                  <List>
                    {stats.daysWithLongHours.map((day, index) => {
                      const date = new Date(day.date);
                      const formattedDate = new Intl.DateTimeFormat('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }).format(date);
                      
                      return (
                        <ListItem button key={index} onClick={() => handleDateChange(date)} sx={listItemStyle}>
                          <ListItemText 
                            primary={formattedDate} 
                            secondary={`${day.hours.toFixed(2)} heures`} 
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="voir" onClick={() => handleDateChange(date)}>
                              <VisibilityIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                  </List>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
        
        {/* Cartes de statistiques rapides */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.todayTime')}
                  </Typography>
                  <Typography variant="h5">
                    {formatDuration(stats.todayTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.weekTime')}
                  </Typography>
                  <Typography variant="h5">
                    {formatDuration(stats.weekTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.activeProjects')}
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeProjects}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('dashboard.activeTasks')}
                  </Typography>
                  <Typography variant="h5">
                    {stats.activeTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Statistiques avancées */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('statistics.advanced')}
            </Typography>
            <AdvancedStats
              timeData={stats.timeData}
              projectData={stats.projectData}
              weeklyComparison={{
                currentWeek: stats.weekTime,
                previousWeek: stats.previousWeekTime,
              }}
              averageDaily={stats.averageDaily}
            />
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('timeStats.weeklyReport')}
            </Typography>
            <WeeklyReport onTimeUpdate={() => fetchStats()} />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={paperStyle}>
            <Typography variant="h6" gutterBottom>
              {t('Sélectionner une date')}
            </Typography>
            <DateSelector onChange={handleDateChange} />
          </Paper>
        </Grid>
        
        {stats.daysWithOverlaps.length > 0 && (
          <Grid item xs={12} md={6} lg={4}>
            <Paper sx={paperStyle}>
              <Typography variant="h6" gutterBottom sx={warningTextStyle}>
                {t('Jours avec des chevauchements')}
              </Typography>
              <List>
                {stats.daysWithOverlaps.map((day, index) => {
                  const date = new Date(day.date);
                  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).format(date);
                  
                  return (
                    <ListItem button key={index} onClick={() => handleDateChange(date)} sx={listItemStyle}>
                      <ListItemText 
                        primary={formattedDate} 
                        secondary={`${day.count} ${day.count > 1 ? 'chevauchements' : 'chevauchement'}`} 
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="voir" onClick={() => handleDateChange(date)}>
                          <VisibilityIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Dashboard;
