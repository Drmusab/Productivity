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
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  Inbox,
  PlayArrow,
  Schedule,
  HourglassEmpty,
  Warning,
  Delete,
  ViewKanban,
  GridView,
  List,
  Folder,
  Person,
  Category,
  ArrowForward,
  Refresh,
} from '@mui/icons-material';

import { useNotification } from '../contexts/NotificationContext';
import {
  getOmniplannerDashboard,
  getTasksByGTDStatus,
  processInboxTask,
  captureTask,
  getEisenhowerMatrix,
  getKanbanBoard,
  updateExecutionStatus,
  getContexts,
  getProjects,
  createProject,
  getCategories,
} from '../services/omniplannerService';

// Eisenhower quadrant configuration
const QUADRANTS = {
  do_first: { label: 'Do First', color: '#e74c3c', icon: <Warning />, description: 'Urgent & Important' },
  schedule: { label: 'Schedule', color: '#3498db', icon: <Schedule />, description: 'Important, Not Urgent' },
  delegate: { label: 'Delegate', color: '#f39c12', icon: <Person />, description: 'Urgent, Not Important' },
  eliminate: { label: 'Eliminate', color: '#95a5a6', icon: <Delete />, description: 'Neither' },
};

// Execution status configuration
const EXECUTION_STATUSES = {
  backlog: { label: 'Backlog', color: '#95a5a6' },
  today: { label: 'Today', color: '#e74c3c' },
  this_week: { label: 'This Week', color: '#f39c12' },
  in_progress: { label: 'In Progress', color: '#3498db' },
  waiting: { label: 'Waiting', color: '#9b59b6' },
  review: { label: 'Review', color: '#1abc9c' },
  done: { label: 'Done', color: '#27ae60' },
};

// Priority color helper
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'critical': return '#e74c3c';
    case 'high': return '#e67e22';
    case 'medium': return '#f39c12';
    case 'low': return '#3498db';
    default: return '#95a5a6';
  }
};

// Task Card Component
const TaskCard = ({ task, showQuadrant = false }) => {
  const quadrant = QUADRANTS[task.quadrant];
  
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1,
        borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle1" fontWeight="medium">
            {task.title}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {showQuadrant && quadrant && (
              <Tooltip title={quadrant.description}>
                <Chip
                  size="small"
                  label={quadrant.label}
                  sx={{ backgroundColor: quadrant.color, color: 'white' }}
                />
              </Tooltip>
            )}
            <Chip size="small" label={task.priority} sx={{ backgroundColor: getPriorityColor(task.priority), color: 'white' }} />
          </Stack>
        </Stack>
        
        {task.description && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {task.description}
          </Typography>
        )}
        
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {task.project_name && (
            <Chip size="small" icon={<Folder />} label={task.project_name} variant="outlined" />
          )}
          {task.context && (
            <Chip size="small" label={task.context} variant="outlined" />
          )}
          {task.category && (
            <Chip size="small" icon={<Category />} label={task.category} variant="outlined" />
          )}
          {task.due_date && (
            <Chip size="small" icon={<Schedule />} label={new Date(task.due_date).toLocaleDateString()} variant="outlined" />
          )}
        </Stack>
        
        {task.progress_percentage > 0 && task.progress_percentage < 100 && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={task.progress_percentage} />
            <Typography variant="caption" color="text.secondary">{task.progress_percentage}%</Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

// Quick Capture Dialog
const QuickCaptureDialog = ({ open, onClose, onCapture }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    onCapture({ title, description });
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Quick Capture to Inbox</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="What's on your mind?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Notes (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!title.trim()}>
          Capture
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Process Inbox Dialog
const ProcessInboxDialog = ({ open, onClose, task, onProcess, projects, contexts, categories }) => {
  const [formData, setFormData] = useState({
    gtd_status: 'next_actions',
    urgency: false,
    importance: false,
    context: '',
    energy_required: 'medium',
    time_estimate: 0,
    project_id: '',
    category: 'general',
    delegated_to: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        gtd_status: 'next_actions',
        urgency: task.urgency || false,
        importance: task.importance || false,
        context: task.context || '',
        energy_required: task.energy_required || 'medium',
        time_estimate: task.time_estimate || 0,
        project_id: task.project_id || '',
        category: task.category || 'general',
        delegated_to: task.delegated_to || '',
      });
    }
  }, [task]);

  const handleSubmit = () => {
    onProcess(task.id, formData);
    onClose();
  };

  if (!task) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Process: {task.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Move to</InputLabel>
            <Select
              value={formData.gtd_status}
              label="Move to"
              onChange={(e) => setFormData({ ...formData, gtd_status: e.target.value })}
            >
              <MenuItem value="next_actions">Next Actions</MenuItem>
              <MenuItem value="waiting_for">Waiting For</MenuItem>
              <MenuItem value="someday_maybe">Someday/Maybe</MenuItem>
              <MenuItem value="reference">Reference</MenuItem>
              <MenuItem value="done">Done (Delete)</MenuItem>
            </Select>
          </FormControl>

          <Divider>Eisenhower Matrix</Divider>
          
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Urgency</InputLabel>
              <Select
                value={formData.urgency}
                label="Urgency"
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              >
                <MenuItem value={true}>Urgent</MenuItem>
                <MenuItem value={false}>Not Urgent</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Importance</InputLabel>
              <Select
                value={formData.importance}
                label="Importance"
                onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
              >
                <MenuItem value={true}>Important</MenuItem>
                <MenuItem value={false}>Not Important</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Divider>Context & Energy</Divider>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Context</InputLabel>
              <Select
                value={formData.context}
                label="Context"
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {contexts.map(ctx => (
                  <MenuItem key={ctx} value={ctx}>{ctx}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Energy Required</InputLabel>
              <Select
                value={formData.energy_required}
                label="Energy Required"
                onChange={(e) => setFormData({ ...formData, energy_required: e.target.value })}
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label="Time Estimate (minutes)"
            type="number"
            value={formData.time_estimate}
            onChange={(e) => setFormData({ ...formData, time_estimate: parseInt(e.target.value) || 0 })}
            fullWidth
          />

          <Divider>Organization</Divider>

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                value={formData.project_id}
                label="Project"
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {formData.gtd_status === 'waiting_for' && (
            <TextField
              label="Delegated To"
              value={formData.delegated_to}
              onChange={(e) => setFormData({ ...formData, delegated_to: e.target.value })}
              fullWidth
              placeholder="Person or contact name"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Process
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main OmniPlanner Component
const OmniPlanner = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [inboxTasks, setInboxTasks] = useState([]);
  const [eisenhowerMatrix, setEisenhowerMatrix] = useState(null);
  const [kanbanBoard, setKanbanBoard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Dialog states
  const [captureDialogOpen, setCaptureDialogOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', goal: '', color: '#3498db' });

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardRes, projectsRes, contextsRes, categoriesRes] = await Promise.all([
        getOmniplannerDashboard(),
        getProjects(),
        getContexts(),
        getCategories(),
      ]);
      setDashboard(dashboardRes.data);
      setProjects(projectsRes.data);
      setContexts(contextsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      showError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Load inbox tasks
  const loadInbox = useCallback(async () => {
    try {
      const res = await getTasksByGTDStatus('inbox');
      setInboxTasks(res.data);
    } catch (error) {
      showError('Failed to load inbox');
    }
  }, [showError]);

  // Load Eisenhower matrix
  const loadEisenhowerMatrix = useCallback(async () => {
    try {
      const res = await getEisenhowerMatrix();
      setEisenhowerMatrix(res.data);
    } catch (error) {
      showError('Failed to load Eisenhower matrix');
    }
  }, [showError]);

  // Load Kanban board
  const loadKanbanBoard = useCallback(async () => {
    try {
      const res = await getKanbanBoard();
      setKanbanBoard(res.data);
    } catch (error) {
      showError('Failed to load Kanban board');
    }
  }, [showError]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 1) loadInbox();
    if (activeTab === 2) loadEisenhowerMatrix();
    if (activeTab === 3) loadKanbanBoard();
  }, [activeTab, loadInbox, loadEisenhowerMatrix, loadKanbanBoard]);

  // Handlers
  const handleCapture = async (task) => {
    try {
      await captureTask(task);
      showSuccess('Task captured to inbox');
      loadDashboard();
      if (activeTab === 1) loadInbox();
    } catch (error) {
      showError('Failed to capture task');
    }
  };

  const handleProcessTask = async (taskId, data) => {
    try {
      await processInboxTask(taskId, data);
      showSuccess('Task processed successfully');
      loadDashboard();
      loadInbox();
      if (activeTab === 2) loadEisenhowerMatrix();
      if (activeTab === 3) loadKanbanBoard();
    } catch (error) {
      showError('Failed to process task');
    }
  };

  // Handler for updating execution status (used for Kanban drag-drop)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUpdateExecution = async (taskId, execution_status) => {
    try {
      await updateExecutionStatus(taskId, { execution_status });
      showSuccess('Task status updated');
      loadKanbanBoard();
      loadDashboard();
    } catch (error) {
      showError('Failed to update task');
    }
  };

  const handleCreateProject = async () => {
    try {
      await createProject(newProject);
      showSuccess('Project created');
      setProjectDialogOpen(false);
      setNewProject({ name: '', description: '', goal: '', color: '#3498db' });
      loadDashboard();
    } catch (error) {
      showError('Failed to create project');
    }
  };

  const openProcessDialog = (task) => {
    setSelectedTask(task);
    setProcessDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>Loading OmniPlanner...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight="bold">OmniPlanner</Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Integrated GTD & Eisenhower-Kanban System
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCaptureDialogOpen(true)}
            >
              Quick Capture
            </Button>
            <IconButton onClick={loadDashboard}>
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<GridView />} label="Dashboard" />
          <Tab icon={<Inbox />} label={`Inbox (${dashboard?.inbox?.count || 0})`} />
          <Tab icon={<ViewKanban />} label="Eisenhower Matrix" />
          <Tab icon={<List />} label="Kanban Board" />
          <Tab icon={<Folder />} label="Projects" />
        </Tabs>
      </Paper>

      {/* Dashboard Tab */}
      {activeTab === 0 && dashboard && (
        <Grid container spacing={3}>
          {/* Quick Stats */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: '#e74c3c', color: 'white' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Inbox />
                      <Box>
                        <Typography variant="h4">{dashboard.inbox?.count || 0}</Typography>
                        <Typography variant="body2">Inbox</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: '#3498db', color: 'white' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PlayArrow />
                      <Box>
                        <Typography variant="h4">{dashboard.today?.count || 0}</Typography>
                        <Typography variant="body2">Today</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: '#f39c12', color: 'white' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Schedule />
                      <Box>
                        <Typography variant="h4">{dashboard.thisWeek?.count || 0}</Typography>
                        <Typography variant="body2">This Week</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: '#9b59b6', color: 'white' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <HourglassEmpty />
                      <Box>
                        <Typography variant="h4">{dashboard.waitingFor?.count || 0}</Typography>
                        <Typography variant="body2">Waiting For</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Eisenhower Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Eisenhower Distribution</Typography>
                <Grid container spacing={1}>
                  {Object.entries(QUADRANTS).map(([key, quadrant]) => (
                    <Grid item xs={6} key={key}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderLeft: `4px solid ${quadrant.color}`,
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h4">{dashboard.quadrantDistribution?.[key] || 0}</Typography>
                        <Typography variant="body2" color="text.secondary">{quadrant.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Projects */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">Active Projects</Typography>
                  <Button size="small" startIcon={<Add />} onClick={() => setProjectDialogOpen(true)}>
                    New Project
                  </Button>
                </Stack>
                {dashboard.projects?.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                    No active projects. Create one to get started!
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {dashboard.projects?.map((project) => (
                      <Paper key={project.id} variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography fontWeight="medium">{project.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {project.task_count} tasks • {project.progress}% complete
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={project.progress}
                            sx={{ width: 100 }}
                          />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Tasks */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Today's Focus</Typography>
                {dashboard.today?.tasks?.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                    No tasks for today. Process your inbox to add tasks!
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {dashboard.today?.tasks?.slice(0, 6).map((task) => (
                      <Grid item xs={12} md={6} key={task.id}>
                        <TaskCard task={task} showQuadrant />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Inbox Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    Inbox ({inboxTasks.length} items to process)
                  </Typography>
                  <Button startIcon={<Add />} onClick={() => setCaptureDialogOpen(true)}>
                    Add Item
                  </Button>
                </Stack>
                
                {inboxTasks.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Inbox sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Inbox Zero! 🎉
                    </Typography>
                    <Typography color="text.secondary">
                      All items have been processed. Capture new items to get started.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {inboxTasks.map((task) => (
                      <Paper
                        key={task.id}
                        variant="outlined"
                        sx={{ p: 2, '&:hover': { backgroundColor: 'action.hover' } }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography fontWeight="medium">{task.title}</Typography>
                            {task.description && (
                              <Typography variant="body2" color="text.secondary">
                                {task.description}
                              </Typography>
                            )}
                          </Box>
                          <Button
                            variant="contained"
                            size="small"
                            endIcon={<ArrowForward />}
                            onClick={() => openProcessDialog(task)}
                          >
                            Process
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Eisenhower Matrix Tab */}
      {activeTab === 2 && eisenhowerMatrix && (
        <Grid container spacing={2}>
          {Object.entries(QUADRANTS).map(([key, quadrant]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card sx={{ height: '100%', minHeight: 300 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Box sx={{ color: quadrant.color }}>{quadrant.icon}</Box>
                    <Box>
                      <Typography variant="h6">{quadrant.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {quadrant.description}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={eisenhowerMatrix[key]?.length || 0}
                      sx={{ backgroundColor: quadrant.color, color: 'white', ml: 'auto' }}
                    />
                  </Stack>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {eisenhowerMatrix[key]?.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                      No tasks in this quadrant
                    </Typography>
                  ) : (
                    <Stack spacing={1} sx={{ maxHeight: 400, overflow: 'auto' }}>
                      {eisenhowerMatrix[key]?.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Kanban Board Tab */}
      {activeTab === 3 && kanbanBoard && (
        <Box sx={{ overflowX: 'auto' }}>
          <Stack direction="row" spacing={2} sx={{ minWidth: 1200, pb: 2 }}>
            {Object.entries(EXECUTION_STATUSES).filter(([key]) => key !== 'done').map(([key, status]) => (
              <Paper
                key={key}
                sx={{
                  width: 280,
                  minHeight: 400,
                  p: 2,
                  backgroundColor: 'grey.50',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: status.color,
                    }}
                  />
                  <Typography variant="subtitle1" fontWeight="medium">
                    {status.label}
                  </Typography>
                  <Chip size="small" label={kanbanBoard[key]?.length || 0} />
                </Stack>
                
                <Stack spacing={1}>
                  {kanbanBoard[key]?.map((task) => (
                    <Paper
                      key={task.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        backgroundColor: 'white',
                        borderLeft: `3px solid ${getPriorityColor(task.priority)}`,
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 2 },
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium" gutterBottom>
                        {task.title}
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={task.priority}
                          sx={{ backgroundColor: getPriorityColor(task.priority), color: 'white', fontSize: 10 }}
                        />
                        {task.project_name && (
                          <Chip size="small" label={task.project_name} variant="outlined" sx={{ fontSize: 10 }} />
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* Projects Tab */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">Projects</Typography>
                  <Button startIcon={<Add />} variant="contained" onClick={() => setProjectDialogOpen(true)}>
                    New Project
                  </Button>
                </Stack>
                
                {projects.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Folder sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No projects yet
                    </Typography>
                    <Typography color="text.secondary">
                      Create a project to organize related tasks together.
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {projects.map((project) => (
                      <Grid item xs={12} md={4} key={project.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 1,
                                  backgroundColor: project.color,
                                }}
                              />
                              <Typography variant="h6">{project.name}</Typography>
                            </Stack>
                            {project.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {project.description}
                              </Typography>
                            )}
                            <Box sx={{ mb: 1 }}>
                              <LinearProgress variant="determinate" value={project.progress} />
                            </Box>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">
                                {project.completed_count}/{project.task_count} tasks
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {project.progress}%
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Dialogs */}
      <QuickCaptureDialog
        open={captureDialogOpen}
        onClose={() => setCaptureDialogOpen(false)}
        onCapture={handleCapture}
      />

      <ProcessInboxDialog
        open={processDialogOpen}
        onClose={() => setProcessDialogOpen(false)}
        task={selectedTask}
        onProcess={handleProcessTask}
        projects={projects}
        contexts={contexts}
        categories={categories}
      />

      {/* Create Project Dialog */}
      <Dialog open={projectDialogOpen} onClose={() => setProjectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project Name"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Goal"
              value={newProject.goal}
              onChange={(e) => setNewProject({ ...newProject, goal: e.target.value })}
              fullWidth
              placeholder="What does success look like?"
            />
            <TextField
              label="Color"
              type="color"
              value={newProject.color}
              onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained" disabled={!newProject.name.trim()}>
            Create Project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OmniPlanner;
