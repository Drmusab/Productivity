// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add,
  FitnessCenter,
  PlayArrow,
  Stop,
  Timer,
  TrendingUp,
  EmojiEvents,
  MonitorWeight,
  Flag,
  Today,
  CalendarMonth,
  Assessment,
  DirectionsRun,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

import {
  getMuscleGroups,
  getExercises,
  createExercise,
  getWorkoutTemplates,
  createWorkoutTemplate,
  getWorkoutSessions,
  createWorkoutSession,
  updateWorkoutSession,
  logExerciseSet,
  getPersonalRecords,
  getBodyMeasurements,
  addBodyMeasurement,
  getFitnessGoals,
  createFitnessGoal,
  getWeeklyStats,
  getTodayWorkout,
  getExerciseProgress,
} from '../services/fitnessService';
import { useNotification } from '../contexts/NotificationContext';

const Fitness = () => {
  const { showError, showSuccess } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Data states
  const [todayData, setTodayData] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [goals, setGoals] = useState([]);

  // UI states
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [measurementDialogOpen, setMeasurementDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [progressData, setProgressData] = useState(null);

  // Form states
  const [exerciseForm, setExerciseForm] = useState({ name: '', primaryMuscleGroupId: '', equipment: '', difficulty: 'intermediate' });
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', frequency: 3, goal: 'general' });
  const [logForm, setLogForm] = useState({ exerciseId: '', setNumber: 1, reps: '', weight: '', rpe: '' });
  const [measurementForm, setMeasurementForm] = useState({ date: dayjs().format('YYYY-MM-DD'), weight: '', bodyFatPercent: '' });
  const [goalForm, setGoalForm] = useState({ goalType: 'strength', targetDescription: '', deadline: '' });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [todayRes, statsRes, exercisesRes, muscleRes, templatesRes, sessionsRes, prsRes, measurementsRes, goalsRes] = await Promise.all([
        getTodayWorkout(),
        getWeeklyStats(),
        getExercises(),
        getMuscleGroups(),
        getWorkoutTemplates(),
        getWorkoutSessions({ limit: 10 }),
        getPersonalRecords(),
        getBodyMeasurements(10),
        getFitnessGoals('active'),
      ]);

      setTodayData(todayRes.data);
      setWeeklyStats(statsRes.data);
      setExercises(exercisesRes.data);
      setMuscleGroups(muscleRes.data);
      setTemplates(templatesRes.data);
      setSessions(sessionsRes.data);
      setPersonalRecords(prsRes.data);
      setMeasurements(measurementsRes.data);
      setGoals(goalsRes.data);
    } catch (error) {
      showError('Failed to load fitness data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Start a new workout session
  const handleStartWorkout = async (templateId = null, workoutDayId = null) => {
    try {
      const res = await createWorkoutSession({
        date: dayjs().format('YYYY-MM-DD'),
        startTime: dayjs().toISOString(),
        templateId,
        workoutDayId,
      });
      setActiveSession({ id: res.data.id, startTime: new Date() });
      setSessionLogs([]);
      showSuccess('Workout started!');
    } catch (error) {
      showError('Failed to start workout');
    }
  };

  // End the current workout session
  const handleEndWorkout = async () => {
    if (!activeSession) return;

    try {
      const duration = Math.round((new Date() - activeSession.startTime) / 60000);
      await updateWorkoutSession(activeSession.id, {
        endTime: dayjs().toISOString(),
        durationMinutes: duration,
      });
      setActiveSession(null);
      setSessionLogs([]);
      showSuccess(`Workout completed! Duration: ${duration} minutes`);
      loadDashboardData();
    } catch (error) {
      showError('Failed to end workout');
    }
  };

  // Log a set
  const handleLogSet = async () => {
    if (!activeSession) return;

    try {
      const res = await logExerciseSet(activeSession.id, {
        exerciseId: parseInt(logForm.exerciseId),
        setNumber: logForm.setNumber,
        reps: parseInt(logForm.reps),
        weight: parseFloat(logForm.weight),
        rpe: logForm.rpe ? parseInt(logForm.rpe) : null,
      });

      const exercise = exercises.find(e => e.id === parseInt(logForm.exerciseId));
      setSessionLogs([...sessionLogs, {
        ...logForm,
        exerciseName: exercise?.name,
        isPR: res.data.isPR,
      }]);

      if (res.data.isPR) {
        showSuccess('🎉 New Personal Record!');
      } else {
        showSuccess('Set logged');
      }

      // Increment set number for next log
      setLogForm({ ...logForm, setNumber: logForm.setNumber + 1 });
      setLogDialogOpen(false);
    } catch (error) {
      showError('Failed to log set');
    }
  };

  // Create exercise
  const handleCreateExercise = async () => {
    try {
      await createExercise(exerciseForm);
      showSuccess('Exercise created');
      setExerciseDialogOpen(false);
      setExerciseForm({ name: '', primaryMuscleGroupId: '', equipment: '', difficulty: 'intermediate' });
      loadDashboardData();
    } catch (error) {
      showError('Failed to create exercise');
    }
  };

  // Create template
  const handleCreateTemplate = async () => {
    try {
      await createWorkoutTemplate(templateForm);
      showSuccess('Workout template created');
      setTemplateDialogOpen(false);
      setTemplateForm({ name: '', description: '', frequency: 3, goal: 'general' });
      loadDashboardData();
    } catch (error) {
      showError('Failed to create template');
    }
  };

  // Add measurement
  const handleAddMeasurement = async () => {
    try {
      await addBodyMeasurement({
        date: measurementForm.date,
        weight: measurementForm.weight ? parseFloat(measurementForm.weight) : null,
        bodyFatPercent: measurementForm.bodyFatPercent ? parseFloat(measurementForm.bodyFatPercent) : null,
      });
      showSuccess('Measurement recorded');
      setMeasurementDialogOpen(false);
      setMeasurementForm({ date: dayjs().format('YYYY-MM-DD'), weight: '', bodyFatPercent: '' });
      loadDashboardData();
    } catch (error) {
      showError('Failed to add measurement');
    }
  };

  // Add goal
  const handleAddGoal = async () => {
    try {
      await createFitnessGoal(goalForm);
      showSuccess('Goal created');
      setGoalDialogOpen(false);
      setGoalForm({ goalType: 'strength', targetDescription: '', deadline: '' });
      loadDashboardData();
    } catch (error) {
      showError('Failed to create goal');
    }
  };

  // View exercise progress
  const handleViewProgress = async (exercise) => {
    try {
      const res = await getExerciseProgress(exercise.id);
      setSelectedExercise(exercise);
      setProgressData(res.data);
    } catch (error) {
      showError('Failed to load exercise progress');
    }
  };

  // Render Today's Overview
  const renderTodayTab = () => (
    <Box>
      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" color="primary">
                  <Today sx={{ mr: 1, verticalAlign: 'middle' }} />
                  This Week
                </Typography>
                {weeklyStats && (
                  <>
                    <Box>
                      <Typography variant="h3" color="primary">
                        {weeklyStats.totalSessions}
                      </Typography>
                      <Typography color="text.secondary">Workouts</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4">
                        {weeklyStats.totalSets}
                      </Typography>
                      <Typography color="text.secondary">Total Sets</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4">
                        {weeklyStats.totalVolume.toLocaleString()} kg
                      </Typography>
                      <Typography color="text.secondary">Total Volume</Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Workout or Start New */}
        <Grid item xs={12} md={8}>
          <Card sx={{ minHeight: 300 }}>
            <CardContent>
              {activeSession ? (
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" color="success.main">
                      <DirectionsRun sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Workout in Progress
                    </Typography>
                    <Chip 
                      icon={<Timer />} 
                      label={`Started ${dayjs(activeSession.startTime).format('HH:mm')}`}
                      color="success"
                    />
                  </Stack>

                  {/* Quick log buttons */}
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Add />}
                      onClick={() => setLogDialogOpen(true)}
                    >
                      Log Set
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="large"
                      startIcon={<Stop />}
                      onClick={handleEndWorkout}
                    >
                      Finish Workout
                    </Button>
                  </Stack>

                  {/* Session logs */}
                  {sessionLogs.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Logged Sets:</Typography>
                      <Stack spacing={1}>
                        {sessionLogs.map((log, idx) => (
                          <Stack key={idx} direction="row" spacing={2} alignItems="center">
                            <Chip size="small" label={`Set ${log.setNumber}`} />
                            <Typography>{log.exerciseName}</Typography>
                            <Typography color="text.secondary">
                              {log.weight}kg × {log.reps} reps
                            </Typography>
                            {log.isPR && <Chip size="small" color="warning" label="PR!" icon={<EmojiEvents />} />}
                          </Stack>
                        ))}
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              ) : (
                <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ minHeight: 200 }}>
                  <Typography variant="h6" color="text.secondary">
                    No active workout
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartWorkout()}
                  >
                    Start Workout
                  </Button>
                  {todayData?.activeTemplate && (
                    <Typography variant="body2" color="text.secondary">
                      Active program: {todayData.activeTemplate.name} ({todayData.activeTemplate.frequency}x/week)
                    </Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent PRs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                Recent Personal Records
              </Typography>
              {personalRecords.length > 0 ? (
                <List dense>
                  {personalRecords.slice(0, 5).map((pr) => (
                    <ListItem key={pr.id}>
                      <ListItemIcon>
                        <FitnessCenter />
                      </ListItemIcon>
                      <ListItemText
                        primary={pr.exerciseName}
                        secondary={`${pr.value} kg × ${pr.reps} reps - ${dayjs(pr.date).format('MMM D')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No PRs yet. Start lifting!</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Goals */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  <Flag sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                  Active Goals
                </Typography>
                <Button size="small" onClick={() => setGoalDialogOpen(true)}>Add Goal</Button>
              </Stack>
              {goals.length > 0 ? (
                <Stack spacing={2}>
                  {goals.slice(0, 3).map((goal) => (
                    <Box key={goal.id}>
                      <Typography variant="body2" fontWeight="medium">
                        {goal.targetDescription || goal.goalType}
                      </Typography>
                      {goal.deadline && (
                        <Typography variant="caption" color="text.secondary">
                          Deadline: {dayjs(goal.deadline).format('MMM D, YYYY')}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">No active goals</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Render Exercises Tab
  const renderExercisesTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">Exercise Library</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setExerciseDialogOpen(true)}>
          Add Exercise
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {muscleGroups.map((group) => (
          <Grid item xs={12} md={6} lg={4} key={group.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>{group.name}</Typography>
                <List dense>
                  {exercises
                    .filter(e => e.muscleGroupName === group.name)
                    .slice(0, 5)
                    .map((ex) => (
                      <ListItem
                        key={ex.id}
                        secondaryAction={
                          <IconButton size="small" onClick={() => handleViewProgress(ex)}>
                            <TrendingUp />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={ex.name}
                          secondary={ex.equipment}
                        />
                      </ListItem>
                    ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Progress Chart */}
      {selectedExercise && progressData && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Progress: {selectedExercise.name}
            </Typography>
            {progressData.progress.length > 0 ? (
              <>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressData.progress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line type="monotone" dataKey="maxWeight" stroke="#3498db" name="Max Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                {progressData.suggestedNextWeight && (
                  <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                    💪 Suggested next weight: <strong>{progressData.suggestedNextWeight} kg</strong>
                  </Typography>
                )}
              </>
            ) : (
              <Typography color="text.secondary">No progress data yet</Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );

  // Render Programs Tab
  const renderProgramsTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">Workout Programs</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setTemplateDialogOpen(true)}>
          Create Program
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card variant={template.isActive ? 'elevation' : 'outlined'} elevation={template.isActive ? 3 : 0}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6">{template.name}</Typography>
                    {template.isActive && <Chip size="small" label="Active" color="success" />}
                  </Box>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {template.description || 'No description'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip size="small" label={`${template.frequency}x/week`} variant="outlined" />
                  <Chip size="small" label={template.goal} variant="outlined" />
                </Stack>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => handleStartWorkout(template.id)}
                  disabled={activeSession !== null}
                >
                  Start Workout
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {templates.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" align="center">
              No workout programs yet. Create your first program!
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  // Render History Tab
  const renderHistoryTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Workout History</Typography>
      
      <Grid container spacing={2}>
        {sessions.map((session) => (
          <Grid item xs={12} md={6} key={session.id}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {dayjs(session.date).format('dddd, MMM D')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {session.templateName || 'Quick Workout'}
                      {session.workoutDayName && ` - ${session.workoutDayName}`}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    icon={<Timer />}
                    label={session.durationMinutes ? `${session.durationMinutes} min` : 'In progress'}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {sessions.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" align="center">
              No workout history yet
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  // Render Body Tab
  const renderBodyTab = () => (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6">
          <MonitorWeight sx={{ mr: 1, verticalAlign: 'middle' }} />
          Body Measurements
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setMeasurementDialogOpen(true)}>
          Add Measurement
        </Button>
      </Stack>

      {measurements.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Weight Trend</Typography>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...measurements].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="weight" stroke="#2ecc71" name="Weight (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {measurements.map((m) => (
          <Grid item xs={12} sm={6} md={4} key={m.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {dayjs(m.date).format('MMM D, YYYY')}
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                  {m.weight && (
                    <Box>
                      <Typography variant="h5">{m.weight}</Typography>
                      <Typography variant="caption">kg</Typography>
                    </Box>
                  )}
                  {m.bodyFatPercent && (
                    <Box>
                      <Typography variant="h5">{m.bodyFatPercent}%</Typography>
                      <Typography variant="caption">Body Fat</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">
            <FitnessCenter sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gym Companion
          </Typography>
          <Typography color="text.secondary">
            Track your workouts, monitor progress, and achieve your fitness goals
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<Today />} iconPosition="start" label="Today" />
          <Tab icon={<FitnessCenter />} iconPosition="start" label="Exercises" />
          <Tab icon={<Assessment />} iconPosition="start" label="Programs" />
          <Tab icon={<CalendarMonth />} iconPosition="start" label="History" />
          <Tab icon={<MonitorWeight />} iconPosition="start" label="Body" />
        </Tabs>
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ py: 4 }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 2 }}>
            Loading fitness data...
          </Typography>
        </Box>
      ) : (
        <>
          {activeTab === 0 && renderTodayTab()}
          {activeTab === 1 && renderExercisesTab()}
          {activeTab === 2 && renderProgramsTab()}
          {activeTab === 3 && renderHistoryTab()}
          {activeTab === 4 && renderBodyTab()}
        </>
      )}

      {/* Log Set Dialog */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Set</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Exercise</InputLabel>
              <Select
                value={logForm.exerciseId}
                label="Exercise"
                onChange={(e) => setLogForm({ ...logForm, exerciseId: e.target.value, setNumber: 1 })}
              >
                {exercises.map((ex) => (
                  <MenuItem key={ex.id} value={ex.id}>{ex.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Set Number"
              type="number"
              value={logForm.setNumber}
              onChange={(e) => setLogForm({ ...logForm, setNumber: parseInt(e.target.value) })}
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Weight (kg)"
              type="number"
              value={logForm.weight}
              onChange={(e) => setLogForm({ ...logForm, weight: e.target.value })}
              inputProps={{ step: 0.5, min: 0 }}
            />
            <TextField
              label="Reps"
              type="number"
              value={logForm.reps}
              onChange={(e) => setLogForm({ ...logForm, reps: e.target.value })}
              inputProps={{ min: 1 }}
            />
            <TextField
              label="RPE (1-10)"
              type="number"
              value={logForm.rpe}
              onChange={(e) => setLogForm({ ...logForm, rpe: e.target.value })}
              inputProps={{ min: 1, max: 10 }}
              helperText="Rate of Perceived Exertion"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleLogSet} disabled={!logForm.exerciseId || !logForm.reps || !logForm.weight}>
            Log Set
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Exercise Dialog */}
      <Dialog open={exerciseDialogOpen} onClose={() => setExerciseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Custom Exercise</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Exercise Name"
              value={exerciseForm.name}
              onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Primary Muscle Group</InputLabel>
              <Select
                value={exerciseForm.primaryMuscleGroupId}
                label="Primary Muscle Group"
                onChange={(e) => setExerciseForm({ ...exerciseForm, primaryMuscleGroupId: e.target.value })}
              >
                {muscleGroups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Equipment"
              value={exerciseForm.equipment}
              onChange={(e) => setExerciseForm({ ...exerciseForm, equipment: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={exerciseForm.difficulty}
                label="Difficulty"
                onChange={(e) => setExerciseForm({ ...exerciseForm, difficulty: e.target.value })}
              >
                <MenuItem value="beginner">Beginner</MenuItem>
                <MenuItem value="intermediate">Intermediate</MenuItem>
                <MenuItem value="advanced">Advanced</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateExercise} disabled={!exerciseForm.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Workout Program</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Program Name"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Sessions per Week"
              type="number"
              value={templateForm.frequency}
              onChange={(e) => setTemplateForm({ ...templateForm, frequency: parseInt(e.target.value) })}
              inputProps={{ min: 1, max: 7 }}
            />
            <FormControl fullWidth>
              <InputLabel>Goal</InputLabel>
              <Select
                value={templateForm.goal}
                label="Goal"
                onChange={(e) => setTemplateForm({ ...templateForm, goal: e.target.value })}
              >
                <MenuItem value="strength">Strength</MenuItem>
                <MenuItem value="hypertrophy">Hypertrophy (Muscle Growth)</MenuItem>
                <MenuItem value="endurance">Endurance</MenuItem>
                <MenuItem value="general">General Fitness</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTemplate} disabled={!templateForm.name}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Measurement Dialog */}
      <Dialog open={measurementDialogOpen} onClose={() => setMeasurementDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Body Measurement</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Date"
              type="date"
              value={measurementForm.date}
              onChange={(e) => setMeasurementForm({ ...measurementForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Weight (kg)"
              type="number"
              value={measurementForm.weight}
              onChange={(e) => setMeasurementForm({ ...measurementForm, weight: e.target.value })}
              inputProps={{ step: 0.1 }}
              fullWidth
            />
            <TextField
              label="Body Fat %"
              type="number"
              value={measurementForm.bodyFatPercent}
              onChange={(e) => setMeasurementForm({ ...measurementForm, bodyFatPercent: e.target.value })}
              inputProps={{ step: 0.1, min: 0, max: 100 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMeasurementDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMeasurement}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Fitness Goal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Goal Type</InputLabel>
              <Select
                value={goalForm.goalType}
                label="Goal Type"
                onChange={(e) => setGoalForm({ ...goalForm, goalType: e.target.value })}
              >
                <MenuItem value="strength">Strength</MenuItem>
                <MenuItem value="weight_loss">Weight Loss</MenuItem>
                <MenuItem value="muscle_gain">Muscle Gain</MenuItem>
                <MenuItem value="endurance">Endurance</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Goal Description"
              value={goalForm.targetDescription}
              onChange={(e) => setGoalForm({ ...goalForm, targetDescription: e.target.value })}
              placeholder="e.g., Bench press 100kg"
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Deadline"
              type="date"
              value={goalForm.deadline}
              onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddGoal} disabled={!goalForm.targetDescription}>
            Create Goal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Fitness;
