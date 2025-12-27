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
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Psychology,
  Lightbulb,
  QuestionMark,
  CheckCircle,
  Favorite,
  Warning,
  PlayArrow,
  Delete,
  Edit,
  Refresh,
  Category,
} from '@mui/icons-material';

import { useNotification } from '../contexts/NotificationContext';
import {
  getThoughts,
  getThoughtCategories,
  getThoughtStats,
  createThought,
  updateThought,
  deleteThought,
  brainDump,
  getThoughtSessions,
} from '../services/thoughtService';

// Category configuration with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ReactElement; color: string; label: string }> = {
  facts: { icon: <CheckCircle />, color: '#3498db', label: 'Facts' },
  interpretations: { icon: <Lightbulb />, color: '#9b59b6', label: 'Interpretations' },
  emotions: { icon: <Favorite />, color: '#e74c3c', label: 'Emotions' },
  assumptions: { icon: <Warning />, color: '#f39c12', label: 'Assumptions' },
  actions: { icon: <PlayArrow />, color: '#2ecc71', label: 'Actions' },
  questions: { icon: <QuestionMark />, color: '#1abc9c', label: 'Questions' },
};

// Thought card component
const ThoughtCard: React.FC<{
  thought: any;
  onEdit: (thought: any) => void;
  onDelete: (id: string) => void;
  onToggleProcessed: (id: string, processed: boolean) => void;
}> = ({ thought, onEdit, onDelete, onToggleProcessed }) => {
  const config = CATEGORY_CONFIG[thought.category] || CATEGORY_CONFIG.facts;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderLeft: `4px solid ${config.color}`,
        opacity: thought.is_processed ? 0.7 : 1,
        backgroundColor: thought.is_processed ? 'action.hover' : 'background.paper',
        '&:hover': { boxShadow: 2 },
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ color: config.color }}>{config.icon}</Box>
            <Chip size="small" label={config.label} sx={{ backgroundColor: config.color, color: 'white' }} />
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={thought.is_processed ? 'Mark as unprocessed' : 'Mark as processed'}>
              <IconButton
                size="small"
                onClick={() => onToggleProcessed(thought.id, !thought.is_processed)}
              >
                <CheckCircle
                  fontSize="small"
                  color={thought.is_processed ? 'success' : 'disabled'}
                />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => onEdit(thought)}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onDelete(thought.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Typography
          sx={{
            textDecoration: thought.is_processed ? 'line-through' : 'none',
          }}
        >
          {thought.content}
        </Typography>

        {thought.action_extracted && (
          <Box sx={{ mt: 1, p: 1, backgroundColor: 'success.light', borderRadius: 1 }}>
            <Typography variant="caption" color="success.contrastText">
              Action: {thought.action_extracted}
            </Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

// Main component
const ThoughtOrganizer: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Data
  const [thoughts, setThoughts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  // Dialogs
  const [thoughtDialogOpen, setThoughtDialogOpen] = useState(false);
  const [brainDumpDialogOpen, setBrainDumpDialogOpen] = useState(false);
  const [editingThought, setEditingThought] = useState<any>(null);

  // Form state
  const [thoughtForm, setThoughtForm] = useState({
    content: '',
    category: 'facts',
    priority: 'medium',
    action_extracted: '',
  });
  const [brainDumpContent, setBrainDumpContent] = useState('');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [processedFilter, setProcessedFilter] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [thoughtsRes, categoriesRes, statsRes, sessionsRes] = await Promise.all([
        getThoughts({
          category: categoryFilter || undefined,
          processed: processedFilter === '' ? undefined : processedFilter === 'true',
        }),
        getThoughtCategories(),
        getThoughtStats(),
        getThoughtSessions(),
      ]);

      setThoughts(thoughtsRes.data);
      setCategories(categoriesRes.data);
      setStats(statsRes.data);
      setSessions(sessionsRes.data);
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, processedFilter, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateThought = async () => {
    try {
      if (editingThought) {
        await updateThought(editingThought.id, thoughtForm);
        showSuccess('Thought updated');
      } else {
        await createThought(thoughtForm);
        showSuccess('Thought captured');
      }
      setThoughtDialogOpen(false);
      setEditingThought(null);
      setThoughtForm({ content: '', category: 'facts', priority: 'medium', action_extracted: '' });
      loadData();
    } catch (error) {
      showError('Failed to save thought');
    }
  };

  const handleBrainDump = async () => {
    try {
      const result = await brainDump({ content: brainDumpContent });
      showSuccess(`Captured ${result.data.count} thoughts`);
      setBrainDumpDialogOpen(false);
      setBrainDumpContent('');
      loadData();
    } catch (error) {
      showError('Failed to process brain dump');
    }
  };

  const handleDeleteThought = async (id: string) => {
    try {
      await deleteThought(id);
      showSuccess('Thought deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete thought');
    }
  };

  const handleToggleProcessed = async (id: string, processed: boolean) => {
    try {
      await updateThought(id, { is_processed: processed });
      loadData();
    } catch (error) {
      showError('Failed to update thought');
    }
  };

  const openEditDialog = (thought: any) => {
    setEditingThought(thought);
    setThoughtForm({
      content: thought.content,
      category: thought.category,
      priority: thought.priority,
      action_extracted: thought.action_extracted || '',
    });
    setThoughtDialogOpen(true);
  };

  // Group thoughts by category
  const thoughtsByCategory = thoughts.reduce((acc: Record<string, any[]>, thought) => {
    const cat = thought.category || 'facts';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(thought);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>Loading Thought Organizer...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Psychology sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">Thought Organizer</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Organize thoughts, reduce overthinking, gain clarity
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Category />}
              onClick={() => setBrainDumpDialogOpen(true)}
            >
              Brain Dump
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setEditingThought(null);
                setThoughtForm({ content: '', category: 'facts', priority: 'medium', action_extracted: '' });
                setThoughtDialogOpen(true);
              }}
            >
              Add Thought
            </Button>
            <IconButton onClick={loadData}>
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">{stats.total}</Typography>
                <Typography variant="body2">Total Thoughts</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">{stats.unprocessed}</Typography>
                <Typography variant="body2">To Process</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'success.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">
                  {stats.byCategory?.find((c: any) => c.category === 'actions')?.count || 0}
                </Typography>
                <Typography variant="body2">Actions</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'info.main', color: 'white' }}>
              <CardContent>
                <Typography variant="h4">
                  {stats.byCategory?.find((c: any) => c.category === 'questions')?.count || 0}
                </Typography>
                <Typography variant="body2">Questions</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="All Thoughts" />
          <Tab label="By Category" />
          <Tab label="Sessions" />
        </Tabs>
      </Paper>

      {/* Filters */}
      {activeTab === 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <MenuItem key={key} value={key}>{config.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={processedFilter}
              label="Status"
              onChange={(e) => setProcessedFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="false">Unprocessed</MenuItem>
              <MenuItem value="true">Processed</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      )}

      {/* All Thoughts Tab */}
      {activeTab === 0 && (
        <Stack spacing={2}>
          {thoughts.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Psychology sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No thoughts captured yet
              </Typography>
              <Typography color="text.secondary">
                Start by adding a thought or doing a brain dump
              </Typography>
            </Paper>
          ) : (
            thoughts.map((thought) => (
              <ThoughtCard
                key={thought.id}
                thought={thought}
                onEdit={openEditDialog}
                onDelete={handleDeleteThought}
                onToggleProcessed={handleToggleProcessed}
              />
            ))
          )}
        </Stack>
      )}

      {/* By Category Tab */}
      {activeTab === 1 && (
        <Grid container spacing={2}>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Box sx={{ color: config.color }}>{config.icon}</Box>
                    <Typography variant="h6">{config.label}</Typography>
                    <Chip
                      size="small"
                      label={thoughtsByCategory[key]?.length || 0}
                      sx={{ backgroundColor: config.color, color: 'white' }}
                    />
                  </Stack>
                  <Divider sx={{ mb: 2 }} />

                  {categories?.questions?.[key] && (
                    <Box sx={{ mb: 2, p: 1, backgroundColor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Reflection questions:
                      </Typography>
                      <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                        {categories.questions[key].map((q: string, i: number) => (
                          <li key={i}>
                            <Typography variant="body2">{q}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}

                  <Stack spacing={1} sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {thoughtsByCategory[key]?.length === 0 ? (
                      <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                        No {config.label.toLowerCase()} yet
                      </Typography>
                    ) : (
                      thoughtsByCategory[key]?.map((thought: any) => (
                        <Paper
                          key={thought.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            opacity: thought.is_processed ? 0.6 : 1,
                          }}
                        >
                          <Typography variant="body2">{thought.content}</Typography>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Sessions Tab */}
      {activeTab === 2 && (
        <Grid container spacing={2}>
          {sessions.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No sessions yet
                </Typography>
                <Typography color="text.secondary">
                  Brain dumps will create sessions automatically
                </Typography>
              </Paper>
            </Grid>
          ) : (
            sessions.map((session) => (
              <Grid item xs={12} md={6} key={session.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{session.title}</Typography>
                      <Chip
                        size="small"
                        label={`${session.thought_count} thoughts`}
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(session.created_at).toLocaleString()}
                    </Typography>
                    {session.clarity_rating && (
                      <Chip
                        size="small"
                        label={`Clarity: ${session.clarity_rating}/10`}
                        color="success"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Add/Edit Thought Dialog */}
      <Dialog
        open={thoughtDialogOpen}
        onClose={() => setThoughtDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingThought ? 'Edit Thought' : 'Capture Thought'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="What's on your mind?"
              value={thoughtForm.content}
              onChange={(e) => setThoughtForm({ ...thoughtForm, content: e.target.value })}
              fullWidth
              multiline
              rows={3}
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={thoughtForm.category}
                label="Category"
                onChange={(e) => setThoughtForm({ ...thoughtForm, category: e.target.value })}
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ color: config.color }}>{config.icon}</Box>
                      <span>{config.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={thoughtForm.priority}
                label="Priority"
                onChange={(e) => setThoughtForm({ ...thoughtForm, priority: e.target.value })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            {thoughtForm.category === 'actions' && (
              <TextField
                label="Extracted Action"
                value={thoughtForm.action_extracted}
                onChange={(e) => setThoughtForm({ ...thoughtForm, action_extracted: e.target.value })}
                fullWidth
                placeholder="What action needs to be taken?"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThoughtDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateThought}
            variant="contained"
            disabled={!thoughtForm.content.trim()}
          >
            {editingThought ? 'Update' : 'Capture'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Brain Dump Dialog */}
      <Dialog
        open={brainDumpDialogOpen}
        onClose={() => setBrainDumpDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Category />
            <span>Brain Dump</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Write everything on your mind. Each line becomes a separate thought that you can organize later.
          </Typography>
          <TextField
            label="Dump your thoughts here..."
            value={brainDumpContent}
            onChange={(e) => setBrainDumpContent(e.target.value)}
            fullWidth
            multiline
            rows={10}
            autoFocus
            placeholder="Enter each thought on a new line..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBrainDumpDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleBrainDump}
            variant="contained"
            disabled={!brainDumpContent.trim()}
          >
            Capture All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ThoughtOrganizer;
