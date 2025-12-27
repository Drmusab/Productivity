// @ts-nocheck
/**
 * @fileoverview Tracker Mode Component for Chronos
 * Active timer and session management interface
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  Rating,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  FiberManualRecord as RecordIcon
} from '@mui/icons-material';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { API_URL } from '../../utils/config';

interface ChronosSettings {
  work_hours_start?: string;
  work_hours_end?: string;
  [key: string]: any;
}

interface ActiveSession {
  id: number;
  start_time: string;
  [key: string]: any;
}

interface TrackerModeProps {
  settings: ChronosSettings | null;
  activeSession: ActiveSession | null;
  onSessionUpdate: () => void;
}

function TrackerMode({ settings, activeSession, onSessionUpdate }: TrackerModeProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [showStopDialog, setShowStopDialog] = useState<boolean>(false);
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [focusQuality, setFocusQuality] = useState<number>(3);
  const [productivityRating, setProductivityRating] = useState<number>(3);
  const [interruptions, setInterruptions] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    fetchRecentSessions();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (activeSession) {
      interval = setInterval(() => {
        const start = new Date(activeSession.start_time);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  const fetchRecentSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/chronos/time-sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data.slice(0, 10)); // Show last 10 sessions
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/chronos/time-sessions/${activeSession.id}/pause`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSessionUpdate();
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/chronos/time-sessions/${activeSession.id}/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSessionUpdate();
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/chronos/time-sessions/${activeSession.id}/stop`,
        {
          energy_level: energyLevel,
          focus_quality: focusQuality,
          productivity_rating: productivityRating,
          interruptions: interruptions,
          notes: sessionNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowStopDialog(false);
      onSessionUpdate();
      fetchRecentSessions();
      // Reset form
      setSessionNotes('');
      setEnergyLevel(3);
      setFocusQuality(3);
      setProductivityRating(3);
      setInterruptions(0);
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Active Session Widget */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Active Session
            </Typography>

            {activeSession ? (
              <Box>
                <Box
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    p: 3,
                    borderRadius: 2,
                    textAlign: 'center',
                    mb: 3
                  }}
                >
                  <Typography variant="h3" fontFamily="monospace">
                    {formatTime(elapsedTime)}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    {activeSession.title}
                  </Typography>
                  <Chip
                    label={activeSession.status.toUpperCase()}
                    size="small"
                    sx={{ mt: 1, bgcolor: 'white', color: 'primary.main' }}
                  />
                </Box>

                <Box display="flex" gap={2} justifyContent="center">
                  {activeSession.status === 'active' ? (
                    <Button
                      variant="outlined"
                      startIcon={<PauseIcon />}
                      onClick={handlePauseSession}
                      size="large"
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<PlayIcon />}
                      onClick={handleResumeSession}
                      size="large"
                    >
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={() => setShowStopDialog(true)}
                    size="large"
                  >
                    Stop
                  </Button>
                </Box>

                {activeSession.description && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {activeSession.description}
                  </Typography>
                )}

                <Box sx={{ mt: 2 }}>
                  <Chip label={activeSession.category} size="small" />
                  {activeSession.task_title && (
                    <Chip label={`Task: ${activeSession.task_title}`} size="small" sx={{ ml: 1 }} />
                  )}
                </Box>
              </Box>
            ) : (
              <Box textAlign="center" py={8}>
                <RecordIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
                <Typography color="textSecondary" sx={{ mt: 2 }}>
                  No active session
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Start tracking time from a time block or create a quick session
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Sessions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="h6" gutterBottom>
              Recent Sessions
            </Typography>

            {sessions.length === 0 ? (
              <Typography color="textSecondary" sx={{ mt: 2 }}>
                No sessions recorded yet
              </Typography>
            ) : (
              <Box sx={{ mt: 2 }}>
                {sessions.map((session) => (
                  <Card key={session.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box flex={1}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {session.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {formatDistanceToNow(new Date(session.start_time), { addSuffix: true })}
                          </Typography>
                        </Box>
                        <Chip
                          label={session.status}
                          size="small"
                          color={session.status === 'completed' ? 'success' : 'default'}
                        />
                      </Box>

                      {session.status === 'completed' && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            Duration: {Math.round(session.total_duration)} minutes
                          </Typography>
                          {session.focus_quality && (
                            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                              <Typography variant="caption">Focus:</Typography>
                              <Rating value={session.focus_quality} readOnly size="small" max={5} />
                            </Box>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Stop Session Dialog */}
      <Dialog open={showStopDialog} onClose={() => setShowStopDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Session</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            How was this session?
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Energy Level
            </Typography>
            <Rating
              value={energyLevel}
              onChange={(e, value) => setEnergyLevel(value || 0)}
              max={5}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Focus Quality
            </Typography>
            <Rating
              value={focusQuality}
              onChange={(e, value) => setFocusQuality(value || 0)}
              max={5}
            />
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Productivity Rating
            </Typography>
            <Rating
              value={productivityRating}
              onChange={(e, value) => setProductivityRating(value || 0)}
              max={5}
            />
          </Box>

          <TextField
            label="Interruptions Count"
            type="number"
            value={interruptions}
            onChange={(e) => setInterruptions(parseInt(e.target.value) || 0)}
            fullWidth
            margin="normal"
            inputProps={{ min: 0 }}
          />

          <TextField
            label="Session Notes"
            multiline
            rows={3}
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            fullWidth
            margin="normal"
            placeholder="What did you accomplish?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStopDialog(false)}>Cancel</Button>
          <Button onClick={handleStopSession} variant="contained" color="primary">
            Complete Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TrackerMode;
