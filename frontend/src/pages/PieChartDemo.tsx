import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import SimplePieChart from '../components/statistics/SimplePieChart';
import { useTranslation } from 'react-i18next';

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

const PieChartDemo: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(t('error_fetching_data'));
    }
    
    return projectsMap;
  };

  // Fonction pour récupérer les entrées de temps entre deux dates
  const fetchTimeEntries = async (startDate: string, endDate: string): Promise<void> => {
    setLoading(true);
    setError(null);
    console.log(`Début du chargement des données: ${startDate} à ${endDate}`);
    
    if (!currentUser) {
      setLoading(false);
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
      
      console.log('Exécution de la requête pour trouver les entrées de temps entre', 
                  startDateTime.toISOString(), 'et', endDateTime.toISOString());
                  
      const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
      console.log(`${timeEntriesSnapshot.size} entrées de temps trouvées`);
      
      const timeEntries: TimeEntry[] = [];
      
      // Traitement sécurisé des documents et conversion des données
      // D'abord, extrayons toutes les entrées de temps et collectons les IDs de projets
      const projectIds = new Set<string>();
      
      timeEntriesSnapshot.forEach((doc) => {
        try {
          const data = doc.data();
          if (!data) {
            console.warn(`Document ${doc.id} n'a pas de données`);
            return; // Passer au document suivant
          }
          
          // Vérification de tous les champs nécessaires
          let startTime = new Date();
          let endTime = new Date();
          let projectId = 'unknown';
          let duration = 0;
          
          // Vérification sécurisée de chaque champ
          if (data.startTime && typeof data.startTime.toDate === 'function') {
            try {
              startTime = data.startTime.toDate();
            } catch (e) {
              console.warn(`Erreur lors de la conversion de startTime pour ${doc.id}`, e);
            }
          }
          
          if (data.endTime && typeof data.endTime.toDate === 'function') {
            try {
              endTime = data.endTime.toDate();
            } catch (e) {
              console.warn(`Erreur lors de la conversion de endTime pour ${doc.id}`, e);
            }
          }
          
          if (data.projectId && typeof data.projectId === 'string') {
            projectId = data.projectId;
            // Collecter tous les IDs de projets pour les récupérer plus tard
            projectIds.add(projectId);
          }
          
          if (data.duration && typeof data.duration === 'number') {
            duration = data.duration;
          }
          
          timeEntries.push({
            id: doc.id,
            projectId,
            startTime,
            endTime,
            duration
          });
        } catch (e) {
          console.error(`Erreur lors du traitement du document ${doc.id}:`, e);
        }
      });
      
      // Maintenant, récupérons les informations sur les projets manquants
      console.log(`Récupération des informations pour ${projectIds.size} projets...`);
      
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
      
      // On utilise les projets déjà récupérés plus haut
      
      // Calcul du temps par projet
      const projectTimes = new Map<string, number>();
      
      timeEntries.forEach((entry) => {
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
          // Stocker les données complètes pour l'infobulle
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
      setError(t('error_fetching_data'));
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial avec le mois en cours
  useEffect(() => {
    // Utilistion d'une fonction asynchrone auto-exécutée (IIFE)
    (async () => {
      try {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const startDateStr = firstDayOfMonth.toISOString().split('T')[0];
        const endDateStr = lastDayOfMonth.toISOString().split('T')[0];
        
        console.log('Chargement initial des données...');
        // Appel de fetchTimeEntries avec await pour gérer correctement la promesse
        await fetchTimeEntries(startDateStr, endDateStr);
        console.log('Chargement initial terminé');
      } catch (error) {
        console.error('Erreur lors du chargement initial:', error);
        setError(t('error_fetching_data'));
        setLoading(false);
      }
    })();
    
    // Nettoyage
    return () => {
      console.log('Nettoyage du composant PieChartDemo');
    };
  }, [currentUser, t]);

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t('project_time_distribution')}
        </Typography>
        
        {error && (
          <Box sx={{ color: 'error.main', mb: 2 }}>
            <Typography>{error}</Typography>
          </Box>
        )}
        
        <SimplePieChart 
          data={chartData} 
          onDateChange={fetchTimeEntries}
          title={t('project_time_distribution')}
        />
        
        {loading && (
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Typography>{t('loading')}...</Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PieChartDemo;
