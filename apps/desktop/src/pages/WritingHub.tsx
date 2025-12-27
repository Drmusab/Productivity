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
  Edit as EditIcon,
  Delete,
  Article,
  Search as SearchIcon,
  Bookmark,
  TrendingUp,
  Timer,
  Refresh,
  Favorite,
  Link as LinkIcon,
} from '@mui/icons-material';

import { useNotification } from '../contexts/NotificationContext';
import {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  getWritingStats,
  getResearchItems,
  createResearchItem,
  updateResearchItem,
  deleteResearchItem,
  getInspirationItems,
  createInspirationItem,
  toggleInspirationFavorite,
  deleteInspirationItem,
} from '../services/writingService';

// Article status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idea: { label: 'Idea', color: '#3498db' },
  research: { label: 'Research', color: '#9b59b6' },
  outline: { label: 'Outline', color: '#1abc9c' },
  draft: { label: 'Draft', color: '#f39c12' },
  editing: { label: 'Editing', color: '#e67e22' },
  review: { label: 'Review', color: '#e74c3c' },
  published: { label: 'Published', color: '#2ecc71' },
  archived: { label: 'Archived', color: '#95a5a6' },
};

// Research status
const RESEARCH_STATUS: Record<string, { label: string; color: string }> = {
  to_read: { label: 'To Read', color: '#3498db' },
  reading: { label: 'Reading', color: '#f39c12' },
  read: { label: 'Read', color: '#2ecc71' },
  archived: { label: 'Archived', color: '#95a5a6' },
};

// Main component
const WritingHub: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Data
  const [articles, setArticles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [research, setResearch] = useState<any[]>([]);
  const [inspiration, setInspiration] = useState<any[]>([]);

  // Dialogs
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const [inspirationDialogOpen, setInspirationDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Forms
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'idea',
    type: 'article',
    target_word_count: 0,
    category: '',
    tags: [] as string[],
  });

  const [researchForm, setResearchForm] = useState({
    title: '',
    type: 'link',
    url: '',
    content: '',
    summary: '',
    topic: '',
    status: 'to_read',
    priority: 'medium',
    tags: [] as string[],
  });

  const [inspirationForm, setInspirationForm] = useState({
    type: 'quote',
    content: '',
    source: '',
    url: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [articlesRes, statsRes, researchRes, inspirationRes] = await Promise.all([
        getArticles({ status: statusFilter || undefined, search: searchQuery || undefined }),
        getWritingStats(),
        getResearchItems(),
        getInspirationItems(),
      ]);

      setArticles(articlesRes.data);
      setStats(statsRes.data);
      setResearch(researchRes.data);
      setInspiration(inspirationRes.data);
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Article handlers
  const handleSaveArticle = async () => {
    try {
      if (selectedItem) {
        await updateArticle(selectedItem.id, articleForm);
        showSuccess('Article updated');
      } else {
        await createArticle(articleForm);
        showSuccess('Article created');
      }
      setArticleDialogOpen(false);
      resetArticleForm();
      loadData();
    } catch (error) {
      showError('Failed to save article');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await deleteArticle(id);
      showSuccess('Article deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete article');
    }
  };

  const openArticleForEdit = async (article: any) => {
    const fullArticle = await getArticle(article.id);
    setSelectedItem(fullArticle.data);
    setArticleForm({
      title: fullArticle.data.title,
      content: fullArticle.data.content || '',
      excerpt: fullArticle.data.excerpt || '',
      status: fullArticle.data.status || 'idea',
      type: fullArticle.data.type || 'article',
      target_word_count: fullArticle.data.target_word_count || 0,
      category: fullArticle.data.category || '',
      tags: fullArticle.data.tags || [],
    });
    setArticleDialogOpen(true);
  };

  const resetArticleForm = () => {
    setSelectedItem(null);
    setArticleForm({
      title: '',
      content: '',
      excerpt: '',
      status: 'idea',
      type: 'article',
      target_word_count: 0,
      category: '',
      tags: [],
    });
  };

  // Research handlers
  const handleSaveResearch = async () => {
    try {
      if (selectedItem) {
        await updateResearchItem(selectedItem.id, researchForm);
        showSuccess('Research item updated');
      } else {
        await createResearchItem(researchForm);
        showSuccess('Research item added');
      }
      setResearchDialogOpen(false);
      resetResearchForm();
      loadData();
    } catch (error) {
      showError('Failed to save research item');
    }
  };

  const handleDeleteResearch = async (id: string) => {
    try {
      await deleteResearchItem(id);
      showSuccess('Research item deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete research item');
    }
  };

  const resetResearchForm = () => {
    setSelectedItem(null);
    setResearchForm({
      title: '',
      type: 'link',
      url: '',
      content: '',
      summary: '',
      topic: '',
      status: 'to_read',
      priority: 'medium',
      tags: [],
    });
  };

  // Inspiration handlers
  const handleSaveInspiration = async () => {
    try {
      await createInspirationItem(inspirationForm);
      showSuccess('Inspiration added');
      setInspirationDialogOpen(false);
      resetInspirationForm();
      loadData();
    } catch (error) {
      showError('Failed to add inspiration');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleInspirationFavorite(id);
      loadData();
    } catch (error) {
      showError('Failed to update');
    }
  };

  const handleDeleteInspiration = async (id: string) => {
    try {
      await deleteInspirationItem(id);
      showSuccess('Inspiration deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete');
    }
  };

  const resetInspirationForm = () => {
    setInspirationForm({
      type: 'quote',
      content: '',
      source: '',
      url: '',
      tags: [],
    });
  };

  const addTag = (form: 'article' | 'research' | 'inspiration') => {
    if (!tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase();
    
    if (form === 'article' && !articleForm.tags.includes(tag)) {
      setArticleForm({ ...articleForm, tags: [...articleForm.tags, tag] });
    } else if (form === 'research' && !researchForm.tags.includes(tag)) {
      setResearchForm({ ...researchForm, tags: [...researchForm.tags, tag] });
    } else if (form === 'inspiration' && !inspirationForm.tags.includes(tag)) {
      setInspirationForm({ ...inspirationForm, tags: [...inspirationForm.tags, tag] });
    }
    setTagInput('');
  };

  if (loading && articles.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>Loading Writing Hub...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <EditIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">Writing & Research Hub</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Manage your writing projects, research, and inspiration
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2}>
            <IconButton onClick={loadData}>
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'primary.main', color: 'white' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Article />
                  <Box>
                    <Typography variant="h5">{stats.totalArticles}</Typography>
                    <Typography variant="body2">Articles</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'success.main', color: 'white' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUp />
                  <Box>
                    <Typography variant="h5">{stats.totalWords?.toLocaleString() || 0}</Typography>
                    <Typography variant="body2">Total Words</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'warning.main', color: 'white' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Timer />
                  <Box>
                    <Typography variant="h5">{stats.totalSessions || 0}</Typography>
                    <Typography variant="body2">Sessions</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ backgroundColor: 'info.main', color: 'white' }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <SearchIcon />
                  <Box>
                    <Typography variant="h5">{research.length}</Typography>
                    <Typography variant="body2">Research Items</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<Article fontSize="small" />} label="Articles" iconPosition="start" />
          <Tab icon={<SearchIcon fontSize="small" />} label="Research" iconPosition="start" />
          <Tab icon={<Bookmark fontSize="small" />} label="Inspiration" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Articles Tab */}
      {activeTab === 0 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <TextField
              size="small"
              placeholder="Search articles..."
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
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetArticleForm();
                setArticleDialogOpen(true);
              }}
            >
              New Article
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {articles.map((article) => {
              const status = STATUS_CONFIG[article.status] || STATUS_CONFIG.idea;
              const progress = article.target_word_count
                ? Math.min(100, Math.round((article.word_count / article.target_word_count) * 100))
                : 0;

              return (
                <Grid item xs={12} sm={6} md={4} key={article.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      borderTop: `4px solid ${status.color}`,
                      '&:hover': { boxShadow: 3 },
                    }}
                    onClick={() => openArticleForEdit(article)}
                  >
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="h6" noWrap sx={{ maxWidth: 200 }}>
                            {article.title}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteArticle(article.id);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Chip
                          size="small"
                          label={status.label}
                          sx={{ alignSelf: 'flex-start', backgroundColor: status.color, color: 'white' }}
                        />

                        {article.excerpt && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {article.excerpt}
                          </Typography>
                        )}

                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption">
                            {article.word_count?.toLocaleString() || 0} words
                          </Typography>
                          {article.target_word_count > 0 && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                / {article.target_word_count.toLocaleString()}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                              />
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {articles.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Article sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No articles yet
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Research Tab */}
      {activeTab === 1 && (
        <>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetResearchForm();
                setResearchDialogOpen(true);
              }}
            >
              Add Research
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {research.map((item) => {
              const status = RESEARCH_STATUS[item.status] || RESEARCH_STATUS.to_read;
              return (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="h6" noWrap sx={{ maxWidth: 200 }}>
                            {item.title}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteResearch(item.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={1}>
                          <Chip
                            size="small"
                            label={status.label}
                            sx={{ backgroundColor: status.color, color: 'white' }}
                          />
                          <Chip size="small" label={item.type} variant="outlined" />
                        </Stack>

                        {item.url && (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <LinkIcon fontSize="small" color="primary" />
                            <Typography
                              variant="caption"
                              color="primary"
                              component="a"
                              href={item.url}
                              target="_blank"
                              sx={{ textDecoration: 'none' }}
                            >
                              {new URL(item.url).hostname}
                            </Typography>
                          </Stack>
                        )}

                        {item.summary && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {item.summary}
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {research.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No research items yet
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Inspiration Tab */}
      {activeTab === 2 && (
        <>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetInspirationForm();
                setInspirationDialogOpen(true);
              }}
            >
              Add Inspiration
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {inspiration.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    backgroundColor: item.is_favorite ? 'warning.50' : 'background.paper',
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Chip size="small" label={item.type} variant="outlined" />
                        <Stack direction="row">
                          <Tooltip title={item.is_favorite ? 'Unfavorite' : 'Favorite'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleFavorite(item.id)}
                            >
                              <Favorite
                                fontSize="small"
                                color={item.is_favorite ? 'error' : 'disabled'}
                              />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteInspiration(item.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Typography
                        variant="body1"
                        sx={{ fontStyle: item.type === 'quote' ? 'italic' : 'normal' }}
                      >
                        {item.type === 'quote' && '"'}
                        {item.content}
                        {item.type === 'quote' && '"'}
                      </Typography>

                      {item.source && (
                        <Typography variant="caption" color="text.secondary">
                          — {item.source}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {inspiration.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Bookmark sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No inspiration items yet
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Article Dialog */}
      <Dialog open={articleDialogOpen} onClose={() => setArticleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedItem ? 'Edit Article' : 'New Article'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={articleForm.title}
              onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
              fullWidth
              autoFocus
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={articleForm.status}
                  label="Status"
                  onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value })}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={articleForm.type}
                  label="Type"
                  onChange={(e) => setArticleForm({ ...articleForm, type: e.target.value })}
                >
                  <MenuItem value="article">Article</MenuItem>
                  <MenuItem value="blog">Blog Post</MenuItem>
                  <MenuItem value="essay">Essay</MenuItem>
                  <MenuItem value="story">Story</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Target Words"
                type="number"
                value={articleForm.target_word_count}
                onChange={(e) => setArticleForm({ ...articleForm, target_word_count: parseInt(e.target.value) || 0 })}
              />
            </Stack>
            <TextField
              label="Excerpt"
              value={articleForm.excerpt}
              onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Content"
              value={articleForm.content}
              onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
              fullWidth
              multiline
              rows={10}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Tags</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag('article')}
                />
                <Button size="small" onClick={() => addTag('article')}>Add</Button>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                {articleForm.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => setArticleForm({ ...articleForm, tags: articleForm.tags.filter((t) => t !== tag) })}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArticleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveArticle} variant="contained" disabled={!articleForm.title.trim()}>
            {selectedItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Research Dialog */}
      <Dialog open={researchDialogOpen} onClose={() => setResearchDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Research Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={researchForm.title}
              onChange={(e) => setResearchForm({ ...researchForm, title: e.target.value })}
              fullWidth
              autoFocus
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={researchForm.type}
                  label="Type"
                  onChange={(e) => setResearchForm({ ...researchForm, type: e.target.value })}
                >
                  <MenuItem value="link">Link</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="video">Video</MenuItem>
                  <MenuItem value="book">Book</MenuItem>
                  <MenuItem value="article">Article</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={researchForm.status}
                  label="Status"
                  onChange={(e) => setResearchForm({ ...researchForm, status: e.target.value })}
                >
                  {Object.entries(RESEARCH_STATUS).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="URL"
              value={researchForm.url}
              onChange={(e) => setResearchForm({ ...researchForm, url: e.target.value })}
              fullWidth
            />
            <TextField
              label="Topic"
              value={researchForm.topic}
              onChange={(e) => setResearchForm({ ...researchForm, topic: e.target.value })}
              fullWidth
            />
            <TextField
              label="Summary / Notes"
              value={researchForm.summary}
              onChange={(e) => setResearchForm({ ...researchForm, summary: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResearchDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveResearch} variant="contained" disabled={!researchForm.title.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inspiration Dialog */}
      <Dialog open={inspirationDialogOpen} onClose={() => setInspirationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Inspiration</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={inspirationForm.type}
                label="Type"
                onChange={(e) => setInspirationForm({ ...inspirationForm, type: e.target.value })}
              >
                <MenuItem value="quote">Quote</MenuItem>
                <MenuItem value="idea">Idea</MenuItem>
                <MenuItem value="prompt">Writing Prompt</MenuItem>
                <MenuItem value="image">Image</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Content"
              value={inspirationForm.content}
              onChange={(e) => setInspirationForm({ ...inspirationForm, content: e.target.value })}
              fullWidth
              multiline
              rows={4}
              autoFocus
            />
            <TextField
              label="Source / Author"
              value={inspirationForm.source}
              onChange={(e) => setInspirationForm({ ...inspirationForm, source: e.target.value })}
              fullWidth
            />
            <TextField
              label="URL (optional)"
              value={inspirationForm.url}
              onChange={(e) => setInspirationForm({ ...inspirationForm, url: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInspirationDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveInspiration} variant="contained" disabled={!inspirationForm.content.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WritingHub;
