import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Paper, 
  Typography, 
  Box, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Grid,
  Chip,
  TextField,
  Button,
} from '@mui/material';
import { formatDuration } from '../../utils/timeUtils';

interface ProjectData {
  projectId?: string; // Ajout de l'ID du projet pour assurer l'unicité dans l'affichage
  projectName: string;
  totalTime: number;
}

interface TopProjectsPieChartProps {
  projectData: ProjectData[];
  onPeriodChange?: (period: string) => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const TopProjectsPieChart: React.FC<TopProjectsPieChartProps> = ({ 
  projectData, 
  onPeriodChange,
  onDateRangeChange
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('thisWeek');
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCustomRange, setIsCustomRange] = useState<boolean>(false);

  const handlePeriodChange = (event: SelectChangeEvent<string>) => {
    const period = event.target.value;
    setSelectedPeriod(period);
    setIsCustomRange(period === 'custom');
    
    if (period !== 'custom') {
      setStartDate('');
      setEndDate('');
    }
    
    if (onPeriodChange) {
      onPeriodChange(period);
    }
  };

  const handleDateRangeSubmit = () => {
    console.log('🔍 TopProjectsPieChart - Submit date range:', { startDate, endDate });
    
    // Afficher une alerte pour déboguer
    alert(`Filtrage par dates: ${startDate} à ${endDate}`);
    
    if (startDate && endDate && onDateRangeChange) {
      console.log('🔍 TopProjectsPieChart - Calling onDateRangeChange');
      try {
        onDateRangeChange(startDate, endDate);
        console.log('✅ Fonction onDateRangeChange appelée avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de l\'appel de onDateRangeChange:', error);
      }
    } else {
      console.log('❌ TopProjectsPieChart - Impossible de soumettre les dates:', { 
        startDateExists: !!startDate, 
        endDateExists: !!endDate, 
        onDateRangeChangeExists: !!onDateRangeChange 
      });
    }
  };

  // Utiliser un identifiant unique combinant l'ID et le nom pour éviter les conflits
  const toggleProjectVisibility = (project: { projectId?: string; projectName: string }) => {
    // Créer un identifiant unique pour chaque projet
    const projectIdentifier = project.projectId
      ? `${project.projectId}::${project.projectName}`
      : `id-${Math.random().toString(36).substr(2, 9)}::${project.projectName}`;
      
    const newHiddenProjects = new Set(hiddenProjects);
    if (newHiddenProjects.has(projectIdentifier)) {
      newHiddenProjects.delete(projectIdentifier);
    } else {
      newHiddenProjects.add(projectIdentifier);
    }
    setHiddenProjects(newHiddenProjects);
    
    // Debug
    console.log(`🔒 Visibilité modifiée pour: ${projectIdentifier} - Projets masqués: ${newHiddenProjects.size}`);
  };

  // Créer une fonction pour générer l'identifiant unique d'un projet
  const getProjectIdentifier = (project: { projectId?: string; projectName: string }) => {
    return project.projectId
      ? `${project.projectId}::${project.projectName}`
      : `id-${project.projectName}`;
  };
  
  // Filtrer les projets visibles en utilisant l'identifiant unique
  const visibleProjectData = projectData.filter(project => 
    !hiddenProjects.has(getProjectIdentifier(project))
  );

  // Debug avec useEffect
  useEffect(() => {
    console.log('📊 TopProjectsPieChart - Données des projets mises à jour:', projectData);
    
    // Vérifier les doublons de noms de projets
    const projectNames = projectData.map(p => p.projectName);
    const uniqueNames = new Set(projectNames);
    if (projectNames.length !== uniqueNames.size) {
      console.error('⚠️ ALERTE: Noms de projets dupliqués détectés!');
      projectNames.forEach((name, index) => {
        const count = projectNames.filter(n => n === name).length;
        if (count > 1) {
          console.error(`⚠️ Nom dupliqué: '${name}' apparait ${count} fois. ID Projet: ${projectData[index].projectId || 'non défini'}`);
        }
      });
    }
  }, [projectData]);

  // Convertir les données pour le graphique en secteurs
  const chartData = visibleProjectData.map((project, index) => ({
    id: project.projectId || `project-${index}`,
    name: project.projectName,
    value: Math.round(project.totalTime / 3600), // Convertir en heures
    fullTime: project.totalTime,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <Box sx={{ 
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          p: 1
        }}>
          <Typography variant="body2">
            <strong>{data.payload.name}</strong>
          </Typography>
          <Typography variant="body2">
            Temps: {formatDuration(data.payload.fullTime)}
          </Typography>
          <Typography variant="body2">
            {data.value}h ({((data.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '10px', color: 'text.secondary' }}>
            ID: {data.payload.projectId || 'non défini'}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Top Projects
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Période</InputLabel>
            <Select
              value={selectedPeriod}
              label="Période"
              onChange={handlePeriodChange}
            >
              <MenuItem value="today">Aujourd'hui</MenuItem>
              <MenuItem value="thisWeek">Cette semaine</MenuItem>
              <MenuItem value="thisMonth">Ce mois</MenuItem>
              <MenuItem value="last30Days">30 derniers jours</MenuItem>
              <MenuItem value="thisYear">Cette année</MenuItem>
              <MenuItem value="custom">Période personnalisée</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {isCustomRange && (
          <>
            <Grid item xs={12} sm={2}>
              <TextField
                type="date"
                label="Date début"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                type="date"
                label="Date fin"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <div>
                <Button 
                  variant="contained" 
                  onClick={handleDateRangeSubmit}
                  disabled={!startDate || !endDate}
                  size="small"
                  fullWidth
                  sx={{ bgcolor: 'primary.main' }}
                >
                  Appliquer
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => {
                    alert('Test direct');
                    if (onDateRangeChange) {
                      onDateRangeChange('2025-01-01', '2025-05-31');
                    }
                  }}
                  size="small"
                  fullWidth
                  sx={{ mt: 1, bgcolor: 'secondary.main' }}
                >
                  Test Direct
                </Button>
              </div>
              <pre style={{ fontSize: '10px', position: 'absolute', right: '10px', bottom: '30px', padding: '5px', background: '#f5f5f5', maxWidth: '300px', overflow: 'auto' }}>
                {`startDate: ${startDate}
endDate: ${endDate}`}
              </pre>
            </Grid>
          </>
        )}
      </Grid>

      {/* Puces pour masquer/afficher les projets */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Cliquez sur un projet pour le masquer/afficher :
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {projectData.map((project, index) => {
            // Clu00e9 absolument unique pour chaque Chip
            const uniqueKey = `chip-${index}-${project.projectId || ''}-${encodeURIComponent(project.projectName)}`;
            return (
              <Chip
                key={uniqueKey}
                label={project.projectName}
                onClick={() => toggleProjectVisibility(project)}
                sx={{
                  backgroundColor: hiddenProjects.has(getProjectIdentifier(project)) 
                    ? 'action.disabled' 
                    : COLORS[index % COLORS.length],
                  color: hiddenProjects.has(getProjectIdentifier(project)) 
                    ? 'text.disabled' 
                    : 'white',
                  opacity: hiddenProjects.has(getProjectIdentifier(project)) ? 0.5 : 1,
                  '&:hover': {
                    opacity: 0.8,
                  }
                }}
              />
            );
          })}

        </Box>
      </Box>

      {chartData.length > 0 ? (
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData.map((item, idx) => ({
                  ...item,
                  // Ajouter un champ uniqueId pour garantir l'unicité absolue des données
                  uniqueId: `item-${idx}-${item.id || ''}-${encodeURIComponent(item.name)}`
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, payload }) => {
                  // S'assurer que l'affichage du nom est unique si c'est un 'Projet Inconnu'
                  const displayName = payload?.projectId 
                    ? name.startsWith('Projet Inconnu') 
                      ? `${name.split('(')[0]}(${payload.projectId.substring(0, 4)})` 
                      : name
                    : `${name}-${Math.floor(Math.random() * 1000)}`; // Fallback avec random
                  return `${displayName} ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="uniqueId"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}-${entry.id || ''}-${encodeURIComponent(entry.name)}`} 
                    fill={entry.color} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(value, entry) => {
                // Vérifier si payload existe et extraire le nom
                if (entry && entry.payload && 'name' in entry.payload) {
                  return entry.payload.name;
                }
                return value;
              }} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
          Aucun projet visible pour cette période
        </Typography>
      )}
    </Paper>
  );
};

export default TopProjectsPieChart;
