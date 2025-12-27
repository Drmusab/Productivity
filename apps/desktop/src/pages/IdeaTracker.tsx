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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Lightbulb,
  Delete,
  PlayArrow,
  Pause,
  CheckCircle,
  Refresh,
  SwapHoriz,
  Note,
  Assignment,
  Folder,
} from '@mui/icons-material';

import { useNotification } from '../contexts/NotificationContext';
import {
  getIdeas,
  getIdea,
  createIdea,
  updateIdea,
  deleteIdea,
  getIdeaStats,
  getWorkflow,
  convertIdea,
} from '../services/ideaService';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactElement }> = {
  new: { label: 'New', color: '#3498db', icon: <Lightbulb /> },
  exploring: { label: 'Exploring', color: '#9b59b6', icon: <PlayArrow /> },
  developing: { label: 'Developing', color: '#f39c12', icon: <PlayArrow /> },
  on_hold: { label: 'On Hold', color: '#95a5a6', icon: <Pause /> },
  completed: { label: 'Completed', color: '#2ecc71', icon: <CheckCircle /> },
};

// Priority colors
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#e74c3c';
    case 'medium': return '#f39c12';
    case 'low': return '#3498db';
    default: return '#95a5a6';
  }
};

// Idea card component
const IdeaCard: React.FC<{
  idea: any;
  onOpen: (idea: any) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}> = ({ idea, onOpen, onStatusChange, onDelete }) => {
  const status = STATUS_CONFIG[idea.status] || STATUS_CONFIG.new;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        cursor: 'pointer',
        borderLeft: `4px solid ${status.color}`,
        '&:hover': { boxShadow: 3 },
      }}
      onClick={() => onOpen(idea)}
    >
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h6" noWrap sx={{ maxWidth: 200 }}>
              {idea.title}
            </Typography>
            <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => onDelete(idea.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              icon={status.icon}
              label={status.label}
              sx={{ backgroundColor: status.color, color: 'white' }}
            />
            <Chip
              size="small"
              label={idea.priority}
              sx={{ backgroundColor: getPriorityColor(idea.priority), color: 'white' }}
            />
          </Stack>

          {idea.one_sentence_summary && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {idea.one_sentence_summary}
            </Typography>
          )}

          {idea.tags && idea.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {idea.tags.slice(0, 3).map((tag: string) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>
          )}

          <Typography variant="caption" color="text.secondary">
            Updated: {new Date(idea.updated_at).toLocaleDateString()}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Main component
const IdeaTracker: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Data
  const [ideas, setIdeas] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [selectedIdea, setSelectedIdea] = useState<any>(null);

  // Dialogs
  const [ideaDialogOpen, setIdeaDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [ideaForm, setIdeaForm] = useState({
    title: '',
    raw_dump: '',
    problem_definition: '',
    concept_expansion: '',
    tools_resources: '',
    one_sentence_summary: '',
    step_by_step_plan: '',
    status: 'new',
    priority: 'medium',
    category: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ideasRes, statsRes, workflowRes] = await Promise.all([
        getIdeas({
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        }),
        getIdeaStats(),
        getWorkflow(),
      ]);

      setIdeas(ideasRes.data);
      setStats(statsRes.data);
      setWorkflow(workflowRes.data);
    } catch (error) {
      showError('Failed to load ideas');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateIdea = async () => {
    try {
      if (selectedIdea) {
        await updateIdea(selectedIdea.id, ideaForm);
        showSuccess('Idea updated');
      } else {
        await createIdea(ideaForm);
        showSuccess('Idea captured');
      }
      setIdeaDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      showError('Failed to save idea');
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      await deleteIdea(id);
      showSuccess('Idea deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete idea');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateIdea(id, { status });
      loadData();
    } catch (error) {
      showError('Failed to update status');
    }
  };

  const handleConvert = async (type: 'task' | 'note' | 'project') => {
    try {
      await convertIdea(selectedIdea.id, type);
      showSuccess(`Idea ready to convert to ${type}`);
      setConvertDialogOpen(false);
      loadData();
    } catch (error) {
      showError('Failed to convert idea');
    }
  };

  const openIdeaForEdit = async (idea: any) => {
    try {
      const fullIdea = await getIdea(idea.id);
      setSelectedIdea(fullIdea.data);
      setIdeaForm({
        title: fullIdea.data.title,
        raw_dump: fullIdea.data.raw_dump || '',
        problem_definition: fullIdea.data.problem_definition || '',
        concept_expansion: fullIdea.data.concept_expansion || '',
        tools_resources: fullIdea.data.tools_resources || '',
        one_sentence_summary: fullIdea.data.one_sentence_summary || '',
        step_by_step_plan: fullIdea.data.step_by_step_plan || '',
        status: fullIdea.data.status || 'new',
        priority: fullIdea.data.priority || 'medium',
        category: fullIdea.data.category || '',
        tags: fullIdea.data.tags || [],
      });
      setActiveStep(0);
      setIdeaDialogOpen(true);
    } catch (error) {
      showError('Failed to load idea details');
    }
  };

  const resetForm = () => {
    setSelectedIdea(null);
    setIdeaForm({
      title: '',
      raw_dump: '',
      problem_definition: '',
      concept_expansion: '',
      tools_resources: '',
      one_sentence_summary: '',
      step_by_step_plan: '',
      status: 'new',
      priority: 'medium',
      category: '',
      tags: [],
    });
    setActiveStep(0);
  };

  const addTag = () => {
    if (tagInput.trim() && !ideaForm.tags.includes(tagInput.trim())) {
      setIdeaForm({ ...ideaForm, tags: [...ideaForm.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  // Group ideas by status for kanban view
  const ideasByStatus = ideas.reduce((acc: Record<string, any[]>, idea) => {
    const status = idea.status || 'new';
    if (!acc[status]) acc[status] = [];
    acc[status].push(idea);
    return acc;
  }, {});

  if (loading && ideas.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>Loading Idea Tracker...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Lightbulb sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">Idea Tracker</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Capture, develop, and transform your ideas
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setIdeaDialogOpen(true);
              }}
            >
              New Idea
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
          <Grid item xs={6} sm={2.4}>
            <Card sx={{ backgroundColor: '#3498db', color: 'white' }}>
              <CardContent sx={{ py: 1 }}>
                <Typography variant="h4">{stats.total}</Typography>
                <Typography variant="body2">Total Ideas</Typography>
              </CardContent>
            </Card>
          </Grid>
          {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, config]) => (
            <Grid item xs={6} sm={2.4} key={key}>
              <Card sx={{ backgroundColor: config.color, color: 'white' }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="h4">
                    {stats.byStatus?.find((s: any) => s.status === key)?.count || 0}
                  </Typography>
                  <Typography variant="body2">{config.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="All Ideas" />
          <Tab label="Kanban Board" />
        </Tabs>
      </Paper>

      {/* Filters */}
      {activeTab === 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <MenuItem key={key} value={key}>{config.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      {/* All Ideas Grid */}
      {activeTab === 0 && (
        <Grid container spacing={2}>
          {ideas.map((idea) => (
            <Grid item xs={12} sm={6} md={4} key={idea.id}>
              <IdeaCard
                idea={idea}
                onOpen={openIdeaForEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteIdea}
              />
            </Grid>
          ))}
          {ideas.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Lightbulb sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No ideas yet
                </Typography>
                <Typography color="text.secondary">
                  Capture your first idea to get started
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* Kanban Board */}
      {activeTab === 1 && (
        <Box sx={{ overflowX: 'auto' }}>
          <Stack direction="row" spacing={2} sx={{ minWidth: 1200, pb: 2 }}>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
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
                  <Box sx={{ color: config.color }}>{config.icon}</Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {config.label}
                  </Typography>
                  <Chip size="small" label={ideasByStatus[key]?.length || 0} />
                </Stack>

                <Stack spacing={1}>
                  {ideasByStatus[key]?.map((idea: any) => (
                    <Paper
                      key={idea.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        '&:hover': { boxShadow: 2 },
                      }}
                      onClick={() => openIdeaForEdit(idea)}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {idea.title}
                      </Typography>
                      {idea.one_sentence_summary && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {idea.one_sentence_summary}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* Idea Dialog with Workflow */}
      <Dialog
        open={ideaDialogOpen}
        onClose={() => setIdeaDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>{selectedIdea ? 'Edit Idea' : 'Capture New Idea'}</span>
            {selectedIdea && (
              <Button
                startIcon={<SwapHoriz />}
                onClick={() => {
                  setIdeaDialogOpen(false);
                  setConvertDialogOpen(true);
                }}
              >
                Convert
              </Button>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="Idea Title"
                value={ideaForm.title}
                onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                fullWidth
                autoFocus
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={ideaForm.status}
                  label="Status"
                  onChange={(e) => setIdeaForm({ ...ideaForm, status: e.target.value })}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={ideaForm.priority}
                  label="Priority"
                  onChange={(e) => setIdeaForm({ ...ideaForm, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider />

            {/* Workflow Stepper */}
            <Stepper activeStep={activeStep} orientation="vertical">
              {workflow?.stages?.map((stage: any, index: number) => (
                <Step key={stage.key} completed={!!ideaForm[stage.key as keyof typeof ideaForm]}>
                  <StepLabel
                    onClick={() => setActiveStep(index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {stage.label}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {stage.description}
                    </Typography>
                    <TextField
                      value={ideaForm[stage.key as keyof typeof ideaForm] || ''}
                      onChange={(e) =>
                        setIdeaForm({ ...ideaForm, [stage.key]: e.target.value })
                      }
                      fullWidth
                      multiline
                      rows={4}
                      placeholder={`Enter ${stage.label.toLowerCase()}...`}
                    />
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={() => setActiveStep(index + 1)}
                        sx={{ mr: 1 }}
                        disabled={index === workflow.stages.length - 1}
                      >
                        Continue
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={() => setActiveStep(index - 1)}
                      >
                        Back
                      </Button>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {/* Tags */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Tags</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="small" onClick={addTag}>Add</Button>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                {ideaForm.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() =>
                      setIdeaForm({ ...ideaForm, tags: ideaForm.tags.filter((t) => t !== tag) })
                    }
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIdeaDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateIdea}
            variant="contained"
            disabled={!ideaForm.title.trim()}
          >
            {selectedIdea ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog
        open={convertDialogOpen}
        onClose={() => setConvertDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Convert Idea</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Convert "{selectedIdea?.title}" to:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 2, borderColor: 'primary.main' },
                }}
                onClick={() => handleConvert('task')}
              >
                <Assignment sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="h6">Task</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 2, borderColor: 'primary.main' },
                }}
                onClick={() => handleConvert('note')}
              >
                <Note sx={{ fontSize: 48, color: 'success.main' }} />
                <Typography variant="h6">Note</Typography>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 2, borderColor: 'primary.main' },
                }}
                onClick={() => handleConvert('project')}
              >
                <Folder sx={{ fontSize: 48, color: 'warning.main' }} />
                <Typography variant="h6">Project</Typography>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IdeaTracker;
