import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDuration } from '../../utils/timeUtils';

interface TimeData {
  date: string;
  duration: number;
}

interface ProjectData {
  projectName: string;
  totalTime: number;
}

interface AdvancedStatsProps {
  timeData: TimeData[];
  projectData: ProjectData[];
  weeklyComparison: {
    currentWeek: number;
    previousWeek: number;
  };
  averageDaily: number;
}

const AdvancedStats: React.FC<AdvancedStatsProps> = ({
  timeData,
  projectData,
  weeklyComparison,
  averageDaily,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [timeRange, setTimeRange] = React.useState('week');

  const weeklyTrend = weeklyComparison.currentWeek - weeklyComparison.previousWeek;
  const trendPercentage = ((weeklyTrend / weeklyComparison.previousWeek) * 100).toFixed(1);

  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {/* Période sélecteur */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>{t('statistics.timeRange')}</InputLabel>
            <Select
              value={timeRange}
              label={t('statistics.timeRange')}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="day">{t('statistics.day')}</MenuItem>
              <MenuItem value="week">{t('statistics.week')}</MenuItem>
              <MenuItem value="month">{t('statistics.month')}</MenuItem>
              <MenuItem value="year">{t('statistics.year')}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Comparaison hebdomadaire */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('statistics.weeklyComparison')}
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="h4">
                  {formatDuration(weeklyComparison.currentWeek)}
                </Typography>
                <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                  {weeklyTrend >= 0 ? (
                    <TrendingUpIcon color="success" />
                  ) : (
                    <TrendingDownIcon color="error" />
                  )}
                  <Typography
                    color={weeklyTrend >= 0 ? 'success.main' : 'error.main'}
                    sx={{ ml: 1 }}
                  >
                    {trendPercentage}%
                  </Typography>
                </Box>
              </Box>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {t('statistics.comparedToPreviousWeek')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Moyenne quotidienne */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('statistics.dailyAverage')}
              </Typography>
              <Typography variant="h4">
                {formatDuration(averageDaily)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Graphique de distribution du temps */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('statistics.timeDistribution')}
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatDuration(value, true)} />
                    <Tooltip
                      formatter={(value: number) => [
                        formatDuration(value),
                        t('statistics.duration'),
                      ]}
                    />
                    <Bar
                      dataKey="duration"
                      fill={theme.palette.primary.main}
                      name={t('statistics.duration')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top des projets */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('statistics.topProjects')}
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={projectData}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatDuration(value, true)} />
                    <YAxis type="category" dataKey="projectName" />
                    <Tooltip
                      formatter={(value: number) => [
                        formatDuration(value),
                        t('statistics.duration'),
                      ]}
                    />
                    <Bar
                      dataKey="totalTime"
                      fill={theme.palette.secondary.main}
                      name={t('statistics.duration')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdvancedStats;
