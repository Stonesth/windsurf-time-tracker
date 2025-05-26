import React, { useState, useEffect } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  TextField,
  Button
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WeeklyReport from '../components/time/WeeklyReport';
import AdvancedStats from '../components/statistics/AdvancedStats';
import TopProjectsPieChart from '../components/statistics/TopProjectsPieChart';
import SimplePieChart from '../components/statistics/SimplePieChart';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
  projectData: Array<{ projectId: string; projectName: string; totalTime: number }>;
  daysWithOverlaps: Array<{ date: string; count: number }>;
  daysWithLongHours: Array<{ date: string; hours: number }>;
}

// Interface pour les entrées de temps
interface TimeEntry {
  id: string;
  projectId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  description?: string;
}

// Interface pour les données de projet
interface Project {
  id: string;
  name: string;
  userId: string;
  color?: string; // Couleur optionnelle pour le projet
}

// Données pour le graphique en camembert
interface ChartData {
  id: string;
  name: string;            // Nom formaté pour l'affichage
  value: number;          // Valeur en secondes
  color?: string;         // Couleur personnalisée
  fullName?: string;      // Nom complet non tronqué
  formattedTime?: string; // Temps formaté pour l'affichage
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
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>('thisWeek'); // Période par défaut
  
  // États pour le graphique en camembert
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<string>('month'); // 'day', 'week', 'month', 'year'
  
  // Fonction pour gérer le changement de date depuis le DateSelector
  const handleDateChange = (date: Date) => {
    // Naviguer vers la page DailyTasks avec cette date
    // Utiliser les méthodes de Date pour éviter les problèmes de fuseau horaire
    const formattedDate = date.getFullYear() + '-' + 
                         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(date.getDate()).padStart(2, '0');
    window.location.href = `/daily?date=${formattedDate}`;
  };

  // Fonction pour gérer le clic sur une date depuis les listes (string)
  const handleDateClick = (dateString: string) => {
    // La date est déjà au format YYYY-MM-DD, on peut l'utiliser directement
    window.location.href = `/daily?date=${dateString}`;
  };

  // Fonction pour gérer le changement d'année
  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };

  // Fonction pour gérer le changement de période dans TopProjectsPieChart
  const handlePeriodChange = (period: string) => {
    console.log('🔍 Dashboard - période changée:', period);
    setSelectedPeriod(period);
    
    // Test simple - Inverser l'ordre des projets pour vérifier que le graphique réagit
    if (period === 'thisWeek') {
      const reversedProjects = [...stats.projectData].reverse();
      console.log('🔍 Dashboard - INVERSER les projets pour test visuel');
      setStats(prevStats => ({
        ...prevStats,
        projectData: reversedProjects
      }));
    }
  };

  // Fonction pour récupérer les données de projets
  const fetchProjects = async (): Promise<Map<string, Project>> => {
    const projectsMap = new Map<string, Project>();
    if (!currentUser) return projectsMap;

    try {
      console.log('Récupération des projets pour l\'utilisateur:', currentUser.uid);
      
      // Récupérer tous les projets accessibles à l'utilisateur
      const projectsQuery = query(
        collection(db, 'projects'),
        where('userId', '==', currentUser.uid)
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      
      console.log(`Nombre de projets trouvés: ${projectsSnapshot.size}`);
      
      projectsSnapshot.forEach((doc) => {
        const projectData = doc.data() as Project;
        const projectName = projectData.name?.trim() || t('unknown_project');
        
        console.log(`Projet trouvé: ${doc.id} - ${projectName}`);
        
        projectsMap.set(doc.id, {
          id: doc.id,
          name: projectName,
          userId: projectData.userId
        });
      });
      
      // Si aucun projet n'est trouvé, ajouter un projet 'unknown' par défaut
      if (projectsMap.size === 0) {
        console.log('Aucun projet trouvé, ajout d\'un projet inconnu par défaut');
        projectsMap.set('unknown', {
          id: 'unknown',
          name: t('unknown_project'),
          userId: currentUser.uid
        });
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des projets:', err);
      setChartError(t('error_fetching_data'));
    }
    
    return projectsMap;
  };

  // Fonction pour récupérer les entrées de temps pour le graphique en camembert
  const fetchTimeEntriesForChart = async (startDate: string, endDate: string): Promise<void> => {
    setChartLoading(true);
    setChartError(null);
    console.log(`Début du chargement des données du graphique: ${startDate} à ${endDate}`);
    
    if (!currentUser) {
      setChartLoading(false);
      return Promise.resolve();
    }

    try {
      // Conversion des dates
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // Fin de journée
      
      // D'abord, récupérons tous les projets disponibles
      console.log('Récupération des projets avant de chercher les entrées de temps');
      const projects = await fetchProjects();
      
      // Requête des entrées de temps
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid),
        where('startTime', '>=', startDateTime),
        where('startTime', '<=', endDateTime)
      );
      
      const querySnapshot = await getDocs(timeEntriesQuery);
      console.log(`Nombre d'entrées de temps trouvées: ${querySnapshot.size}`);
      
      // Ensemble des ID de projets uniques
      const projectIds = new Set<string>();
      
      // Traitement des entrées de temps pour obtenir les durées par projet
      const entries: TimeEntry[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const entry = {
          id: doc.id,
          projectId: data.projectId || 'unknown',
          startTime: data.startTime.toDate(),
          endTime: data.endTime?.toDate() || null,
          duration: data.duration || 0,
          description: data.description || ''
        };
        
        if (entry.projectId) {
          projectIds.add(entry.projectId);
        }
        
        entries.push(entry);
      });
      
      // Si aucune entrée n'est trouvée, on arrête ici
      if (entries.length === 0) {
        console.log('Aucune entrée de temps trouvée pour cette période');
        setChartData([]);
        setChartLoading(false);
        return;
      }
      
      // Récupération des projets manquants
      for (const projectId of projectIds) {
        if (!projects.has(projectId)) {
          // Création des couleurs pour les projets
          const colors = ['#4A90E2', '#50E3C2', '#E55934', '#F8C146', '#9B59B6', '#1ABC9C', '#F39C12', '#3498DB'];
          const colorIndex = Math.abs(projectId.charCodeAt(0) + projectId.charCodeAt(projectId.length - 1)) % colors.length;
          
          try {
            // Récupération directe du document du projet par son ID
            const projectRef = doc(db, 'projects', projectId);
            const projectDoc = await getDoc(projectRef);
            
            if (projectDoc.exists()) {
              // Projet trouvé, utiliser son nom réel
              const projectData = projectDoc.data();
              const projectName = projectData.name || 'Projet sans nom';
              console.log(`Projet trouvé: ${projectId} - ${projectName}`);
              
              projects.set(projectId, {
                id: projectId,
                name: projectName,
                userId: projectData.userId || currentUser.uid,
                color: colors[colorIndex]
              });
            } else {
              // Projet non trouvé, utiliser un nom descriptif
              console.log(`Projet ${projectId} non trouvé, utilisation d'un nom générique`);
              projects.set(projectId, {
                id: projectId,
                name: `Projet ${projectId}`,
                userId: currentUser.uid,
                color: colors[colorIndex]
              });
            }
          } catch (error) {
            console.error(`Erreur lors de la recherche du projet ${projectId}:`, error);
            projects.set(projectId, {
              id: projectId,
              name: `Projet non identifié`,
              userId: currentUser.uid,
              color: colors[colorIndex]
            });
          }
        }
      }
      
      // Calcul du temps par projet
      const projectTimes = new Map<string, number>();
      
      entries.forEach(entry => {
        const currentTotal = projectTimes.get(entry.projectId) || 0;
        projectTimes.set(entry.projectId, currentTotal + entry.duration);
      });
      
      // Couleurs pour le graphique
      const PROJECT_COLORS = [
        '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', 
        '#FF6E6E', '#4AB3FF', '#32CD32', '#9966CC', '#FF7F50'
      ];
      
      // Création des données pour le graphique
      const chartData: ChartData[] = [];
      
      projectTimes.forEach((time, projectId) => {
        const project = projects.get(projectId);
        if (!project) {
          console.warn(`Projet ${projectId} introuvable lors de la génération des données du graphique`);
          return; // Ignorer ce projet
        }
        
        const projectName = project.name || t('unknown_project');
        
        // Utiliser le nom complet du projet
        const formattedName = projectName;
        
        // Utiliser la couleur du projet si elle existe, sinon utiliser une couleur par défaut
        const projectColor = project.color || PROJECT_COLORS[chartData.length % PROJECT_COLORS.length];
        
        // Ajouter des informations supplémentaires pour l'infobulle
        const hours = (time / 3600).toFixed(2);
        const formattedTime = `${hours} ${hours === '1.00' ? t('hour') : t('hours')}`;
        
        // Ajouter l'entrée pour le graphique
        chartData.push({
          id: projectId,
          name: formattedName,
          value: time,
          color: projectColor,
          fullName: projectName,
          formattedTime: formattedTime
        });
      });
      
      // Tri par valeur décroissante
      chartData.sort((a, b) => b.value - a.value);
      
      // Limiter à 10 projets maximum pour la lisibilité
      const limitedChartData = chartData.slice(0, 10);
      
      console.log(`Données du graphique prêtes: ${limitedChartData.length} projets`);
      setChartData(limitedChartData);
    } catch (err) {
      console.error('Erreur lors de la récupération des données:', err);
      setChartError(t('error_fetching_data'));
    } finally {
      setChartLoading(false);
    }
  };

  // Fonction pour gérer le changement de période du graphique
  const handleChartPeriodChange = (newPeriod: string) => {
    setChartPeriod(newPeriod);
    
    // Définir la plage de dates en fonction de la période sélectionnée
    const today = new Date();
    let startDate, endDate;
    
    switch(newPeriod) {
      case 'day': // Aujourd'hui
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case 'week': // Cette semaine
        const firstDayOfWeek = new Date(today);
        const dayOfWeek = today.getDay() || 7; // Si 0 (dimanche), alors 7
        firstDayOfWeek.setDate(today.getDate() - dayOfWeek + 1); // Lundi
        startDate = new Date(firstDayOfWeek);
        endDate = new Date(firstDayOfWeek);
        endDate.setDate(endDate.getDate() + 6); // Dimanche
        endDate.setHours(23, 59, 59);
        break;
      case 'month': // Ce mois
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'year': // Cette année
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'last30days': // 30 derniers jours
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    }
    
    // Convertir en chaîne de caractères pour l'API
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Période du graphique changée: ${newPeriod}`, { startDateStr, endDateStr });
    
    // Mettre à jour les données du graphique
    fetchTimeEntriesForChart(startDateStr, endDateStr);
  };
  
  // Effet pour charger les données du graphique initialement
  useEffect(() => {
    if (currentUser) {
      // Chargement initial avec la période par défaut (mois)
      handleChartPeriodChange(chartPeriod);
    }
  }, [currentUser, t]);
  
  // Fonction pour gérer le changement de plage de dates personnalisée
  const handleDateRangeChange = async (startDate: string, endDate: string) => {
    if (!currentUser) return;
    
    // Mettre à jour les données du graphique en camembert
    fetchTimeEntriesForChart(startDate, endDate);
    
    console.log('🕐 DASHBOARD - Filtrage par dates réelles:', { startDate, endDate });
    
    try {
      setIsLoading(true);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Fin de journée
      
      console.log('📅 Dates converties:', { start, end });
      
      // Requête pour récupérer les données dans la plage spécifiée
      const timeEntriesQuery = query(
        collection(db, 'timeEntries'),
        where('userId', '==', currentUser.uid),
        where('startTime', '>=', start),
        where('startTime', '<=', end)
      );
      
      console.log('🔍 Exécution de la requête Firebase...');
      const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
      console.log(`📊 ${timeEntriesSnapshot.docs.length} entrées trouvées`);
      
      const filteredEntries = timeEntriesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          projectId: data.projectId,
          startTime: data.startTime.toDate(),
          endTime: data.endTime?.toDate() || null,
          description: data.description || '',
        };
      });

      // Calculer les données des projets pour cette période
      const projectTimes = new Map<string, number>();
      filteredEntries.forEach((entry) => {
        if (entry.endTime) {
          const duration = entry.endTime.getTime() - entry.startTime.getTime();
          const currentTime = projectTimes.get(entry.projectId) || 0;
          projectTimes.set(entry.projectId, currentTime + duration);
        }
      });

      console.log('⏰ Temps par projet calculé:', Object.fromEntries(projectTimes));

      // Récupérer les informations des projets
      const projectsQuery = query(collection(db, 'projects'), where('userId', '==', currentUser.uid));
      const projectsSnapshot = await getDocs(projectsQuery);

      const projectData = await Promise.all(
        Array.from(projectTimes.entries()).map(async ([projectId, totalTime]) => {
          const projectDoc = projectsSnapshot.docs.find(doc => doc.id === projectId);
          return {
            projectId, // ID unique pour chaque projet
            projectName: projectDoc?.data()?.name || `Projet Inconnu (${projectId.substring(0, 6)})`,
            totalTime,
          };
        })
      );

      // Trier et mettre à jour les stats
      projectData.sort((a, b) => b.totalTime - a.totalTime);
      const top5 = projectData.slice(0, 5);
      
      console.log('📈 Nouvelles données projet:', top5);
      
      // Fallback au cas où aucun projet n'est trouvé
      if (top5.length === 0) {
        console.log('⚠️ Aucun projet trouvé pour cette période, utilisation de données par défaut');
        setStats(prevStats => ({
          ...prevStats,
          projectData: [
            { projectId: 'no-projects', projectName: `Aucun projet - ${startDate} à ${endDate}`, totalTime: 0 }
          ]
        }));
      } else {
        setStats(prevStats => ({
          ...prevStats,
          projectData: top5
        }));
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du filtrage par dates:', error);
      
      // Afficher un message d'erreur convivial dans le graphique
      setStats(prevStats => ({
        ...prevStats,
        projectData: [
          { projectId: 'error', projectName: 'Erreur de filtrage', totalTime: 0 }
        ]
      }));
    } finally {
      setIsLoading(false);
    }
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
  
  const fetchStats = React.useCallback(async () => {
    if (!currentUser) return;

    try {
      const timeEntriesRef = collection(db, 'timeEntries');
      const timeEntriesQuery = query(
        timeEntriesRef,
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

      const allTimeEntries: TimeEntryBasic[] = [];
      const dailyTimes = new Map<string, number>();
      const projectTimes = new Map<string, number>();

      // Traitement des données unifiées
      timeEntriesSnapshot.forEach((doc) => {
        const data = doc.data();
        const startTime = data.startTime?.toDate();
        const endTime = data.endTime?.toDate();
        const duration = data.duration || 0;

        if (startTime) {
          // Utiliser un format de date cohérent YYYY-MM-DD
          const dateKey = startTime.getFullYear() + '-' + 
                         String(startTime.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(startTime.getDate()).padStart(2, '0');
          
          // Collecter toutes les données
          dailyTimes.set(dateKey, (dailyTimes.get(dateKey) || 0) + duration);

          if (data.projectId) {
            projectTimes.set(data.projectId, (projectTimes.get(data.projectId) || 0) + duration);
          }

          allTimeEntries.push({
            id: doc.id,
            startTime,
            endTime,
            duration,
          });
        }
      });

      // Filtrer les jours avec de longues heures basé sur le seuil et l'année sélectionnée
      const daysWithLongHours = Array.from(dailyTimes.entries())
        .filter(([dateStr, hours]) => {
          const dateParts = dateStr.split('-');
          const year = parseInt(dateParts[0]);
          return year === selectedYear && (hours / 3600) >= hourThreshold;
        })
        .map(([date, hours]) => ({
          date,
          hours: hours / 3600,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculer la moyenne quotidienne
      const averageDaily = Array.from(dailyTimes.entries()).reduce((sum, [, hours]) => sum + hours, 0) / 7;

      // Préparer les données pour les graphiques
      const timeData = Array.from(dailyTimes.entries()).map(([date, duration]) => ({
        date,
        duration,
      }));

      // Préparer les données des projets avec les noms corrects
      const projectData = await Promise.all(
        Array.from(projectTimes.entries()).map(async ([projectId, totalTime]) => {
          const projectDoc = projectsSnapshot.docs.find(doc => doc.id === projectId);
          return {
            projectId, // Ajouter l'ID pour garantir l'unicité
            projectName: projectDoc?.data()?.name || `Projet Inconnu (${projectId.substring(0, 6)})`,
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
      const entriesByDay = new Map<string, TimeEntryBasic[]>();

      allTimeEntries.forEach((entry) => {
        const dateStr = entry.startTime.getFullYear() + '-' + 
                         String(entry.startTime.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(entry.startTime.getDate()).padStart(2, '0');
        if (!entriesByDay.has(dateStr)) {
          entriesByDay.set(dateStr, []);
        }
        const dayEntries = entriesByDay.get(dateStr);
        if (dayEntries) {
          dayEntries.push(entry);
        }
      });

      entriesByDay.forEach((entries, date) => {
        // Vérifier s'il y a des chevauchements pour ce jour
        const overlaps = detectOverlaps(entries);
        if (overlaps.size > 0) {
          daysWithOverlaps.push({
            date,
            count: overlaps.size / 2 // Diviser par 2 car chaque chevauchement est compté deux fois (une fois pour chaque entrée)
          });
        }
      });

      // Trier les jours avec chevauchements par date décroissante (le plus récent d'abord)
      daysWithOverlaps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        todayTime: Array.from(dailyTimes.entries()).reduce((sum, [, hours]) => sum + hours, 0),
        weekTime: Array.from(dailyTimes.entries()).reduce((sum, [, hours]) => sum + hours, 0),
        previousWeekTime: 0,
        averageDaily,
        activeProjects: projectData.length,
        activeTasks: 0,
        timeData,
        projectData: top5Projects,
        daysWithOverlaps,
        daysWithLongHours,
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
        {/* Section seuil d'heures - AMÉLIORÉE */}
        <Grid item xs={12} md={6}>
          <Paper sx={paperStyle}>
            <Typography variant="h6" gutterBottom>
              <span style={{ color: 'red' }}>⚠️</span> Seuil d'heures travaillées ({hourThreshold}h+)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Année</InputLabel>
                <Select
                  value={selectedYear}
                  label="Année"
                  onChange={handleYearChange}
                >
                  {[2023, 2024, 2025].map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField // Champ pour modifier le seuil
                label="Seuil d'heures"
                type="number"
                value={hourThreshold}
                onChange={(e) => setHourThreshold(Number(e.target.value))}
              />
            </Box>
            {stats.daysWithLongHours.length > 0 ? (
              <List>
                {stats.daysWithLongHours.slice(0, 5).map((day) => (
                  <ListItem 
                    key={day.date} 
                    sx={{
                      ...listItemStyle,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      }
                    }}
                    onClick={() => handleDateClick(day.date)}
                  >
                    <ListItemText
                      primary={new Date(day.date).toLocaleDateString('fr-FR')}
                      secondary={
                        <Typography sx={warningTextStyle}>
                          {day.hours.toFixed(1)} heures (seuil: {hourThreshold}h)
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                {t('dashboard.noLongDays')}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Section Top Projects avec graphique en camembert */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              alert('Test direct depuis Dashboard');
              handleDateRangeChange('2025-01-01', '2025-12-31');
            }}
            sx={{ mb: 2 }}
          >
            TESTER FILTRE DATES
          </Button>
          <TopProjectsPieChart 
            projectData={stats.projectData} 
            onPeriodChange={handlePeriodChange}
            onDateRangeChange={handleDateRangeChange}
          />
        </Grid>

        {/* Section Advanced Statistics - OPTIMISÉE */}
        <Grid item xs={12}>
          <Paper sx={paperStyle}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.advancedStatistics')}
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

        {/* Section sélecteur de date - CLARIFIÉE */}
        <Grid item xs={12}>
          <Paper sx={paperStyle}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.dateNavigation')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('dashboard.dateNavigationHelp')}
            </Typography>
            <DateSelector onChange={handleDateChange} />
          </Paper>
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
        
        {/* Graphique en camembert des projets */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('Répartition des projets par temps')}
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('Sélectionner une période :')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button 
                  variant={chartPeriod === 'day' ? 'contained' : 'outlined'} 
                  size="small" 
                  onClick={() => handleChartPeriodChange('day')}
                >
                  {t('Aujourd\'hui')}
                </Button>
                <Button 
                  variant={chartPeriod === 'week' ? 'contained' : 'outlined'} 
                  size="small" 
                  onClick={() => handleChartPeriodChange('week')}
                >
                  {t('Cette semaine')}
                </Button>
                <Button 
                  variant={chartPeriod === 'month' ? 'contained' : 'outlined'} 
                  size="small" 
                  onClick={() => handleChartPeriodChange('month')}
                >
                  {t('Ce mois')}
                </Button>
                <Button 
                  variant={chartPeriod === 'last30days' ? 'contained' : 'outlined'} 
                  size="small" 
                  onClick={() => handleChartPeriodChange('last30days')}
                >
                  {t('30 jours')}
                </Button>
                <Button 
                  variant={chartPeriod === 'year' ? 'contained' : 'outlined'} 
                  size="small" 
                  onClick={() => handleChartPeriodChange('year')}
                >
                  {t('Cette année')}
                </Button>
              </Box>
            </Box>

            <SimplePieChart 
              data={chartData} 
              onDateChange={fetchTimeEntriesForChart} 
              title={t('Répartition du temps par projet')}
            />
            {chartLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {chartError && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {chartError}
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
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
                    <ListItem button key={index} onClick={() => handleDateClick(day.date)} sx={listItemStyle}>
                      <ListItemText 
                        primary={formattedDate} 
                        secondary={`${day.count} ${day.count > 1 ? 'chevauchements' : 'chevauchement'}`} 
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="voir" onClick={() => handleDateClick(day.date)}>
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
