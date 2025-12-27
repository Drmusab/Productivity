// @ts-nocheck
/**
 * @fileoverview Analytics Mode Component for Chronos
 * Charts, reports, and productivity insights
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import { API_URL } from '../../utils/config';

const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];

interface ChronosSettings {
  work_hours_start?: string;
  work_hours_end?: string;
  break_duration?: number;
  pomodoro_duration?: number;
  [key: string]: any;
}

interface AnalystModeProps {
  settings: ChronosSettings | null;
}

function AnalystMode({ settings }: AnalystModeProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [productivityScore, setProductivityScore] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProductivityScore = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/chronos/analytics/productivity-score?days=${timeRange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductivityScore(response.data);
    } catch (error) {
      console.error('Error fetching productivity score:', error);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/chronos/analytics/weekly`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchProductivityScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  if (loading || !analytics) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <Typography>Loading analytics...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Time Range Selector */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            label="Time Range"
          >
            <MenuItem value={7}>Last 7 Days</MenuItem>
            <MenuItem value={14}>Last 14 Days</MenuItem>
            <MenuItem value={30}>Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Productivity Score */}
      {productivityScore && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Productivity Score
                </Typography>
                <Typography variant="h3" color="primary">
                  {productivityScore.score}
                  <Typography variant="h6" component="span" color="textSecondary">
                    /100
                  </Typography>
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={productivityScore.score}
                  sx={{ mt: 2 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completion Rate
                </Typography>
                <Typography variant="h4">
                  {productivityScore.metrics.completionRate}%
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {productivityScore.metrics.completedSessions} of {productivityScore.metrics.plannedBlocks} blocks
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Time Tracked
                </Typography>
                <Typography variant="h4">
                  {Math.round(productivityScore.metrics.totalMinutes / 60)}h
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {productivityScore.metrics.totalMinutes} minutes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Planned vs Actual */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Planned vs Actual Time
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.plannedVsActual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned_minutes" fill="#3498db" name="Planned" />
                <Bar dataKey="actual_minutes" fill="#2ecc71" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Time by Category
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryBreakdown}
                  dataKey="total_minutes"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analytics.categoryBreakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Energy Patterns */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Energy Patterns by Hour
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.energyPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_energy"
                  stroke="#e74c3c"
                  name="Energy Level"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="avg_focus"
                  stroke="#3498db"
                  name="Focus Quality"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Focus Analysis Summary */}
        {analytics.focusAnalysis && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Focus Analysis
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    Total Sessions
                  </Typography>
                  <Typography variant="h5">
                    {analytics.focusAnalysis.total_sessions}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    High Focus Sessions
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {analytics.focusAnalysis.high_focus_sessions}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    Avg Focus Quality
                  </Typography>
                  <Typography variant="h5">
                    {analytics.focusAnalysis.avg_focus_quality?.toFixed(1)}/5
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="textSecondary">
                    Total Interruptions
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {analytics.focusAnalysis.total_interruptions}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default AnalystMode;
