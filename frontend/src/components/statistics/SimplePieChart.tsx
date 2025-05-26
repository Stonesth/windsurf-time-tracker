import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Box, Typography, TextField, Button, Paper, Grid, CircularProgress, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTranslation } from 'react-i18next';

// Interface pour les données de projet
interface ProjectData {
  id: string;
  name: string;
  value: number;
  color?: string;
}

// Interface pour les props du composant
interface SimplePieChartProps {
  data: ProjectData[];
  onDateChange?: (startDate: string, endDate: string) => Promise<void>;
  title?: string;
}

// Couleurs pour le graphique
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6E6E', '#4AB3FF', '#32CD32'];

/**
 * Composant de graphique en camembert avec sélecteur de dates
 */
const SimplePieChart: React.FC<SimplePieChartProps> = ({ 
  data = [], 
  onDateChange,
  title = 'Répartition des projets'
}) => {
  const { t } = useTranslation();
  
  // État pour les dates et le chargement
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // État pour les projets masqués
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());
  
  // Données filtrées (sans les projets masqués)
  const [filteredData, setFilteredData] = useState<ProjectData[]>(data);
  
  // Effet pour filtrer les données lorsque les projets masqués changent
  useEffect(() => {
    // Filtre les données pour ne garder que les projets visibles
    const visible = data.filter(item => !hiddenProjects.has(item.id));
    setFilteredData(visible);
  }, [data, hiddenProjects]);
  
  // Fonction pour basculer la visibilité d'un projet
  const toggleProjectVisibility = (projectId: string) => {
    const newHiddenProjects = new Set(hiddenProjects);
    if (newHiddenProjects.has(projectId)) {
      newHiddenProjects.delete(projectId);
    } else {
      newHiddenProjects.add(projectId);
    }
    setHiddenProjects(newHiddenProjects);
  };
  
  // Fonction pour gérer le changement de date
  const handleDateSubmit = async () => {
    if (startDate && endDate && onDateChange) {
      try {
        setLoading(true);
        await onDateChange(startDate, endDate);
      } catch (error) {
        console.error('Erreur lors du changement de dates:', error);
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Format personnalisé pour l'infobulle
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper elevation={3} sx={{ p: 1.5, backgroundColor: 'white', maxWidth: 'none', minWidth: '200px' }}>
          <Typography variant="subtitle2" sx={{ wordBreak: 'break-word', fontWeight: 'bold' }}>{data.name}</Typography>
          <Typography variant="body2">
            {`${t('hours')}: ${(data.value / 3600).toFixed(2)}`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 'auto', minHeight: 500, p: 2 }}>
      <Typography variant="h6" align="center" gutterBottom>
        {title}
      </Typography>
      
      {/* Sélecteur de dates */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={5}>
          <TextField
            label={t('start_date')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={5}>
          <TextField
            label={t('end_date')}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Button 
            variant="contained" 
            onClick={handleDateSubmit}
            fullWidth
            disabled={!startDate || !endDate || loading}
            sx={{ height: '100%', position: 'relative' }}
          >
            {loading ? (
              <>
                <CircularProgress size={24} sx={{ position: 'absolute', color: 'white' }} />
                <span style={{ visibility: 'hidden' }}>{t('filter')}</span>
              </>
            ) : (
              t('filter')
            )}
          </Button>
        </Grid>
      </Grid>
      
      {/* Affichage du message si aucune donnée ou tous les projets masqués */}
      {data.length === 0 || filteredData.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="250px">
          <Typography variant="subtitle1" color="textSecondary">
            {data.length === 0 ? t('no_data_available') : t('all_projects_hidden')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* Graphique */}
          <Box sx={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${entry.id}`} 
                      fill={entry.color || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          
          {/* Légendes en colonne */}
          <Box sx={{ mt: 2, p: 1, maxHeight: '200px', overflowY: 'auto', width: '100%' }}>
            {data.map((entry, index) => (
              <Box key={`legend-${entry.id}`} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1, width: '100%' }}>
                <IconButton 
                  size="small" 
                  onClick={() => toggleProjectVisibility(entry.id)}
                  sx={{ padding: 0, mr: 1 }}
                >
                  {hiddenProjects.has(entry.id) ? (
                    <VisibilityOffIcon fontSize="small" color="action" />
                  ) : (
                    <VisibilityIcon fontSize="small" color="primary" />
                  )}
                </IconButton>
                <Box 
                  sx={{ 
                    width: 16, 
                    height: 16, 
                    backgroundColor: entry.color || COLORS[index % COLORS.length],
                    mr: 1,
                    flexShrink: 0,
                    mt: 0.5,
                    opacity: hiddenProjects.has(entry.id) ? 0.4 : 1
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    wordBreak: 'break-word', 
                    width: 'calc(100% - 50px)', 
                    opacity: hiddenProjects.has(entry.id) ? 0.6 : 1
                  }}
                >
                  {entry.name} ({(entry.value / 3600).toFixed(1)}h - {Math.round((entry.value / data.reduce((sum, item) => sum + item.value, 0)) * 100)}%)
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SimplePieChart;
