import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  ArrowForward,
  CalendarToday,
  CheckCircle,
  Cancel,
  PauseCircle,
  RadioButtonUnchecked,
  Delete,
  Edit,
  Star,
  StarBorder,
  AccessTime,
  Notes,
  Lightbulb,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import dayjs from 'dayjs';

import { useNotification } from '../contexts/NotificationContext';
import {
  getPlannerOverview,
  savePriority,
  updatePriority,
  // eslint-disable-next-line no-unused-vars
  deletePriority,
  saveNotes,
  saveReflection,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
} from '../services/plannerService';
import { getWeeklySummary, logHabit } from '../services/habitService';

// Status icons for habits
const StatusIcon = ({ status, onClick, disabled = false }) => {
  const iconProps = {
    onClick: disabled ? undefined : onClick,
    sx: { cursor: disabled ? 'default' : 'pointer', fontSize: 24 },
  };

  switch (status) {
    case 'done':
      return <Tooltip title="Done"><CheckCircle {...iconProps} sx={{ ...iconProps.sx, color: '#2ecc71' }} /></Tooltip>;
    case 'missed':
      return <Tooltip title="Missed"><Cancel {...iconProps} sx={{ ...iconProps.sx, color: '#e74c3c' }} /></Tooltip>;
    case 'skipped':
      return <Tooltip title="Skipped"><PauseCircle {...iconProps} sx={{ ...iconProps.sx, color: '#f39c12' }} /></Tooltip>;
    default:
      return <Tooltip title="Pending"><RadioButtonUnchecked {...iconProps} sx={{ ...iconProps.sx, color: '#bdc3c7' }} /></Tooltip>;
  }
};

// Priority color based on priority level
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'critical': return '#e74c3c';
    case 'high': return '#e67e22';
    case 'medium': return '#f39c12';
    case 'low': return '#3498db';
    default: return '#95a5a6';
  }
};

const DailyPlanner = () => {
  const { showError, showSuccess } = useNotification();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  
  // Planner data state
  const [plannerData, setPlannerData] = useState({
    priorities: [],
    notes: { content: '' },
    reflection: { wentWell: '', couldImprove: '', keyTakeaways: '' },
    timeBlocks: [],
    todayTasks: [],
  });
  
  // Weekly habit summary
  const [weeklySummary, setWeeklySummary] = useState(null);
  
  // Dialog states
  const [timeBlockDialogOpen, setTimeBlockDialogOpen] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState(null);
  const [newTimeBlock, setNewTimeBlock] = useState({
    startTime: '09:00',
    endTime: '10:00',
    title: '',
    description: '',
    color: '#3498db',
  });
  
  // Priority editing state
  const [editingPriorities, setEditingPriorities] = useState([
    { title: '', completed: false },
    { title: '', completed: false },
    { title: '', completed: false },
  ]);
  
  // Notes editing state
  const [notesContent, setNotesContent] = useState('');
  const [notesDebounce, setNotesDebounce] = useState(null);
  
  // Reflection editing state
  const [reflectionData, setReflectionData] = useState({
    wentWell: '',
    couldImprove: '',
    keyTakeaways: '',
  });
  const [reflectionDebounce, setReflectionDebounce] = useState(null);

  const isToday = useMemo(() => selectedDate === dayjs().format('YYYY-MM-DD'), [selectedDate]);
  // eslint-disable-next-line no-unused-vars
  const isPast = useMemo(() => dayjs(selectedDate).isBefore(dayjs(), 'day'), [selectedDate]);
  // eslint-disable-next-line no-unused-vars
  const isFuture = useMemo(() => dayjs(selectedDate).isAfter(dayjs(), 'day'), [selectedDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, weeklyRes] = await Promise.all([
        getPlannerOverview(selectedDate),
        getWeeklySummary(),
      ]);
      
      setPlannerData(overviewRes.data);
      setWeeklySummary(weeklyRes.data);
      
      // Initialize editing states from loaded data
      const loadedPriorities = overviewRes.data.priorities || [];
      setEditingPriorities([
        loadedPriorities.find(p => p.position === 0) || { title: '', completed: false },
        loadedPriorities.find(p => p.position === 1) || { title: '', completed: false },
        loadedPriorities.find(p => p.position === 2) || { title: '', completed: false },
      ]);
      
      setNotesContent(overviewRes.data.notes?.content || '');
      setReflectionData({
        wentWell: overviewRes.data.reflection?.wentWell || '',
        couldImprove: overviewRes.data.reflection?.couldImprove || '',
        keyTakeaways: overviewRes.data.reflection?.keyTakeaways || '',
      });
    } catch (error) {
      showError('Failed to load planner data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigate dates
  const goToPreviousDay = () => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
  const goToNextDay = () => setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'));
  const goToToday = () => setSelectedDate(dayjs().format('YYYY-MM-DD'));

  // Handle priority changes
  const handlePriorityChange = async (position, field, value) => {
    const updatedPriorities = [...editingPriorities];
    updatedPriorities[position] = { ...updatedPriorities[position], [field]: value };
    setEditingPriorities(updatedPriorities);
  };

  const handlePrioritySave = async (position) => {
    const priority = editingPriorities[position];
    if (!priority.title.trim()) return;
    
    try {
      await savePriority({
        date: selectedDate,
        position,
        title: priority.title,
        completed: priority.completed,
      });
      showSuccess('Priority saved');
      loadData();
    } catch (error) {
      showError('Failed to save priority');
    }
  };

  const handlePriorityToggle = async (position) => {
    const priority = editingPriorities[position];
    const existing = plannerData.priorities.find(p => p.position === position);
    
    if (existing) {
      try {
        await updatePriority(existing.id, { completed: !priority.completed });
        const updatedPriorities = [...editingPriorities];
        updatedPriorities[position] = { ...priority, completed: !priority.completed };
        setEditingPriorities(updatedPriorities);
        loadData();
      } catch (error) {
        showError('Failed to update priority');
      }
    }
  };

  // Handle notes with debounce
  const handleNotesChange = (value) => {
    setNotesContent(value);
    
    if (notesDebounce) clearTimeout(notesDebounce);
    setNotesDebounce(setTimeout(async () => {
      try {
        await saveNotes(selectedDate, value);
      } catch (error) {
        // Silent fail for auto-save
      }
    }, 1000));
  };

  // Handle reflection with debounce
  const handleReflectionChange = (field, value) => {
    const updated = { ...reflectionData, [field]: value };
    setReflectionData(updated);
    
    if (reflectionDebounce) clearTimeout(reflectionDebounce);
    setReflectionDebounce(setTimeout(async () => {
      try {
        await saveReflection({ date: selectedDate, ...updated });
      } catch (error) {
        // Silent fail for auto-save
      }
    }, 1000));
  };

  // Handle time block operations
  const handleTimeBlockSubmit = async () => {
    try {
      if (editingTimeBlock) {
        await updateTimeBlock(editingTimeBlock.id, newTimeBlock);
        showSuccess('Time block updated');
      } else {
        await createTimeBlock({ ...newTimeBlock, date: selectedDate });
        showSuccess('Time block created');
      }
      setTimeBlockDialogOpen(false);
      setEditingTimeBlock(null);
      setNewTimeBlock({ startTime: '09:00', endTime: '10:00', title: '', description: '', color: '#3498db' });
      loadData();
    } catch (error) {
      showError('Failed to save time block');
    }
  };

  const handleDeleteTimeBlock = async (id) => {
    try {
      await deleteTimeBlock(id);
      showSuccess('Time block deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete time block');
    }
  };

  const openEditTimeBlock = (block) => {
    setEditingTimeBlock(block);
    setNewTimeBlock({
      startTime: block.startTime,
      endTime: block.endTime,
      title: block.title,
      description: block.description || '',
      color: block.color,
    });
    setTimeBlockDialogOpen(true);
  };

  // Handle habit logging
  const statusCycle = ['pending', 'done', 'missed', 'skipped'];
  const handleLogHabit = async (habitId, date, currentStatus) => {
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    try {
      await logHabit(habitId, date, nextStatus);
      loadData();
    } catch (error) {
      showError('Failed to log habit');
    }
  };

  const formatDayHeader = (dateStr) => {
    const date = dayjs(dateStr);
    const today = dayjs().format('YYYY-MM-DD');
    return {
      day: date.format('ddd'),
      date: date.format('D'),
      isToday: dateStr === today,
    };
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>Loading planner...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header with Date Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={goToPreviousDay}>
              <ArrowForward />
            </IconButton>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="bold">
                {dayjs(selectedDate).format('dddd')}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                {dayjs(selectedDate).format('MMMM D, YYYY')}
              </Typography>
            </Box>
            <IconButton onClick={goToNextDay}>
              <ArrowBack />
            </IconButton>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {!isToday && (
              <Button variant="outlined" startIcon={<CalendarToday />} onClick={goToToday}>
                اليوم
              </Button>
            )}
            {isToday && (
              <Chip 
                icon={<AccessTime />} 
                label={dayjs().format('h:mm A')} 
                color="primary" 
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column - Priorities, Tasks, Time Blocks */}
        <Grid item xs={12} md={8}>
          {/* Top 3 Priorities */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Star color="warning" />
                <Typography variant="h6">Top 3 Priorities</Typography>
              </Stack>
              
              <Stack spacing={2}>
                {[0, 1, 2].map((position) => {
                  const priority = editingPriorities[position];
                  const savedPriority = plannerData.priorities.find(p => p.position === position);
                  
                  return (
                    <Paper 
                      key={position} 
                      variant="outlined" 
                      sx={{ 
                        p: 2,
                        backgroundColor: priority.completed ? 'action.hover' : 'background.paper',
                        borderColor: position === 0 ? 'warning.main' : 'divider',
                        borderWidth: position === 0 ? 2 : 1,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Checkbox
                          checked={priority.completed}
                          onChange={() => handlePriorityToggle(position)}
                          disabled={!savedPriority}
                          icon={<StarBorder />}
                          checkedIcon={<Star />}
                          color="warning"
                        />
                        <TextField
                          fullWidth
                          size="small"
                          placeholder={`Priority #${position + 1}`}
                          value={priority.title}
                          onChange={(e) => handlePriorityChange(position, 'title', e.target.value)}
                          onBlur={() => handlePrioritySave(position)}
                          sx={{
                            '& .MuiInputBase-input': {
                              textDecoration: priority.completed ? 'line-through' : 'none',
                              color: priority.completed ? 'text.secondary' : 'text.primary',
                            },
                          }}
                        />
                        <Chip 
                          size="small" 
                          label={`#${position + 1}`}
                          color={position === 0 ? 'warning' : 'default'}
                        />
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          {/* Time Blocking Schedule */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Schedule color="primary" />
                  <Typography variant="h6">Daily Schedule</Typography>
                </Stack>
                <Button 
                  size="small" 
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingTimeBlock(null);
                    setNewTimeBlock({ startTime: '09:00', endTime: '10:00', title: '', description: '', color: '#3498db' });
                    setTimeBlockDialogOpen(true);
                  }}
                >
                  Add Block
                </Button>
              </Stack>

              {plannerData.timeBlocks.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  No time blocks scheduled. Click "Add Block" to plan your day.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {plannerData.timeBlocks.map((block) => (
                    <Paper
                      key={block.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderLeft: `4px solid ${block.color}`,
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip 
                              size="small" 
                              label={`${block.startTime} - ${block.endTime}`}
                              variant="outlined"
                            />
                            <Typography fontWeight="medium">{block.title}</Typography>
                          </Stack>
                          {block.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {block.description}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton size="small" onClick={() => openEditTimeBlock(block)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteTimeBlock(block.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <TrendingUp color="success" />
                <Typography variant="h6">Tasks Due Today</Typography>
                <Chip size="small" label={plannerData.todayTasks.length} color="primary" />
              </Stack>

              {plannerData.todayTasks.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No tasks due today.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {plannerData.todayTasks.map((task) => (
                    <Paper 
                      key={task.id} 
                      variant="outlined" 
                      sx={{ 
                        p: 2,
                        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Typography>{task.title}</Typography>
                          <Chip 
                            size="small" 
                            label={task.priority} 
                            sx={{ backgroundColor: getPriorityColor(task.priority), color: 'white' }}
                          />
                          <Chip 
                            size="small" 
                            label={task.columnName}
                            variant="outlined"
                            sx={{ borderColor: task.columnColor }}
                          />
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Notes, Habits, Reflection */}
        <Grid item xs={12} md={4}>
          {/* Notes / Brain Dump */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Notes color="info" />
                <Typography variant="h6">Notes & Brain Dump</Typography>
              </Stack>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Capture your thoughts, ideas, and quick reminders..."
                value={notesContent}
                onChange={(e) => handleNotesChange(e.target.value)}
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Auto-saves as you type
              </Typography>
            </CardContent>
          </Card>

          {/* Weekly Habit Tracker (Compact) */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <CheckCircle color="success" />
                <Typography variant="h6">Weekly Habits</Typography>
              </Stack>

              {weeklySummary && weeklySummary.habits.length > 0 ? (
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 100 }}>Habit</TableCell>
                        {weeklySummary.weekDays.map((date) => {
                          const { day, isToday } = formatDayHeader(date);
                          return (
                            <TableCell 
                              key={date} 
                              align="center" 
                              sx={{ 
                                p: 0.5,
                                backgroundColor: isToday ? 'primary.light' : 'inherit',
                                color: isToday ? 'primary.contrastText' : 'inherit',
                              }}
                            >
                              {day}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weeklySummary.habits.slice(0, 5).map((habit) => (
                        <TableRow key={habit.id}>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Box
                                sx={{
                                  width: 6,
                                  height: 20,
                                  borderRadius: 1,
                                  backgroundColor: habit.color,
                                }}
                              />
                              <Typography variant="body2" noWrap sx={{ maxWidth: 80 }}>
                                {habit.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          {weeklySummary.weekDays.map((date) => {
                            const log = habit.dailyLogs[date] || { status: 'pending' };
                            const isFutureDate = dayjs(date).isAfter(dayjs(), 'day');
                            return (
                              <TableCell key={date} align="center" sx={{ p: 0.5 }}>
                                <StatusIcon
                                  status={log.status}
                                  onClick={() => handleLogHabit(habit.id, date, log.status)}
                                  disabled={isFutureDate}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No habits created yet. Go to Habits page to add some.
                </Typography>
              )}
              
              {weeklySummary && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Chip 
                    label={`Week Average: ${weeklySummary.weekAverage}%`}
                    color={weeklySummary.weekAverage >= 70 ? 'success' : weeklySummary.weekAverage >= 40 ? 'warning' : 'error'}
                    size="small"
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* End-of-Day Reflection */}
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Lightbulb color="warning" />
                <Typography variant="h6">Daily Reflection</Typography>
              </Stack>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    What went well today?
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    placeholder="Celebrate your wins..."
                    value={reflectionData.wentWell}
                    onChange={(e) => handleReflectionChange('wentWell', e.target.value)}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    What could be improved?
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    placeholder="Areas for growth..."
                    value={reflectionData.couldImprove}
                    onChange={(e) => handleReflectionChange('couldImprove', e.target.value)}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Key takeaways?
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    placeholder="Main lessons learned..."
                    value={reflectionData.keyTakeaways}
                    onChange={(e) => handleReflectionChange('keyTakeaways', e.target.value)}
                  />
                </Box>
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Auto-saves as you type
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Time Block Dialog */}
      <Dialog open={timeBlockDialogOpen} onClose={() => setTimeBlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTimeBlock ? 'Edit Time Block' : 'Add Time Block'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Time"
                type="time"
                value={newTimeBlock.startTime}
                onChange={(e) => setNewTimeBlock({ ...newTimeBlock, startTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Time"
                type="time"
                value={newTimeBlock.endTime}
                onChange={(e) => setNewTimeBlock({ ...newTimeBlock, endTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Title"
              value={newTimeBlock.title}
              onChange={(e) => setNewTimeBlock({ ...newTimeBlock, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newTimeBlock.description}
              onChange={(e) => setNewTimeBlock({ ...newTimeBlock, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Color"
              type="color"
              value={newTimeBlock.color}
              onChange={(e) => setNewTimeBlock({ ...newTimeBlock, color: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeBlockDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleTimeBlockSubmit} 
            variant="contained"
            disabled={!newTimeBlock.title.trim()}
          >
            {editingTimeBlock ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DailyPlanner;
