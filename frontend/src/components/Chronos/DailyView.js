/**
 * @fileoverview Daily View Component for Chronos
 * Shows today's schedule with progress tracking
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
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function DailyView({ settings, activeSession, onSessionUpdate }) {
  const [todayBlocks, setTodayBlocks] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's time blocks
      const blocksResponse = await axios.get(
        `${API_URL}/api/chronos/time-blocks?startDate=${today}&endDate=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTodayBlocks(blocksResponse.data);

      // Fetch today's sessions
      const sessionsResponse = await axios.get(
        `${API_URL}/api/chronos/time-sessions?startDate=${today}&endDate=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTodaySessions(sessionsResponse.data);

    } catch (error) {
      console.error('Error fetching today data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBlock = async (block) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/chronos/time-sessions/start`,
        {
          time_block_id: block.id,
          task_id: block.task_id,
          project_id: block.project_id,
          title: block.title,
          description: block.description,
          category: block.category
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSessionUpdate();
      fetchTodayData();
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const isBlockCurrent = (block) => {
    const currentTime = getCurrentTime();
    return currentTime >= block.start_time && currentTime <= block.end_time;
  };

  const completedBlocks = todayBlocks.filter(block =>
    todaySessions.some(s => s.time_block_id === block.id && s.status === 'completed')
  );

  const progressPercentage = todayBlocks.length > 0
    ? (completedBlocks.length / todayBlocks.length) * 100
    : 0;

  return (
    <Box>
      {/* Daily Summary */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Planned Blocks
              </Typography>
              <Typography variant="h4">{todayBlocks.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4">{completedBlocks.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4">
                {todaySessions.filter(s => s.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completion Rate
              </Typography>
              <Typography variant="h4">{progressPercentage.toFixed(0)}%</Typography>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Today's Schedule */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Today's Schedule - {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : todayBlocks.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              No time blocks scheduled for today
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }}>
              Plan Your Day
            </Button>
          </Box>
        ) : (
          <List>
            {todayBlocks.map((block, index) => {
              const isCurrent = isBlockCurrent(block);
              const isCompleted = completedBlocks.some(b => b.id === block.id);
              const hasActiveSession = activeSession?.time_block_id === block.id;

              return (
                <React.Fragment key={block.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    sx={{
                      bgcolor: isCurrent ? 'action.selected' : 'transparent',
                      borderLeft: `4px solid ${block.color || '#3498db'}`,
                      pl: 2
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" fontWeight={isCurrent ? 'bold' : 'normal'}>
                            {block.title}
                          </Typography>
                          {isCurrent && <Chip label="Now" size="small" color="primary" />}
                          {isCompleted && <Chip label="✓ Done" size="small" color="success" />}
                          {hasActiveSession && <Chip label="Active" size="small" color="warning" />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {block.start_time} - {block.end_time}
                          </Typography>
                          {block.description && (
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {block.description}
                            </Typography>
                          )}
                          <Box display="flex" gap={1} mt={1}>
                            <Chip label={block.category} size="small" variant="outlined" />
                            {block.task_title && (
                              <Chip label={`Task: ${block.task_title}`} size="small" variant="outlined" />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                    <Box>
                      {!isCompleted && !hasActiveSession && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<PlayIcon />}
                          onClick={() => handleStartBlock(block)}
                        >
                          Start
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>
    </Box>
  );
}

export default DailyView;
