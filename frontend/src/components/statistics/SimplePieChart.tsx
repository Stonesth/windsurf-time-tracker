import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Box, Typography, TextField, Button, Paper, Grid, CircularProgress } from '@mui/material';
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
        <Paper elevation={3} sx={{ p: 1, backgroundColor: 'white' }}>
          <Typography variant="subtitle2">{data.name}</Typography>
          <Typography variant="body2">
            {`${t('hours')}: ${(data.value / 3600).toFixed(2)}`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 400, p: 2 }}>
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
      
      {/* Affichage du message si aucune donnée */}
      {data.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="250px">
          <Typography variant="subtitle1" color="textSecondary">
            {t('no_data_available')}
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
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
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
};

export default SimplePieChart;
