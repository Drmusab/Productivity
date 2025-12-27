import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
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
  TextField,
  Typography,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Add,
  Note,
  Psychology,
  Lightbulb,
  Edit,
  Article,
  FormatQuote,
  Spellcheck,
  Delete,
  Folder,
  Search,
  ViewModule,
  ViewList,
  Sync,
  Archive,
  Work,
  Category,
  LibraryBooks,
  Timer,
} from '@mui/icons-material';

import { useNotification } from '../contexts/NotificationContext';
import {
  getVaultItems,
  createVaultItem,
  deleteVaultItem,
  getVaultStats,
  migrateToVault,
  VaultItem,
  VaultStats,
} from '../services/vaultService';

// PARA categories configuration
const PARA_CONFIG: Record<string, { label: string; icon: React.ReactElement; color: string; description: string }> = {
  project: { label: 'Projects', icon: <Work />, color: '#3498db', description: 'Short-term goals with deadlines' },
  area: { label: 'Areas', icon: <Category />, color: '#9b59b6', description: 'Long-term responsibilities' },
  resource: { label: 'Resources', icon: <LibraryBooks />, color: '#2ecc71', description: 'Reference materials' },
  archive: { label: 'Archive', icon: <Archive />, color: '#95a5a6', description: 'Completed or inactive items' },
};

// Vault item type configuration
const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactElement; color: string }> = {
  note: { label: 'Notes', icon: <Note />, color: '#3498db' },
  thought: { label: 'Thoughts', icon: <Psychology />, color: '#9b59b6' },
  thought_session: { label: 'Thought Sessions', icon: <Psychology />, color: '#8e44ad' },
  idea: { label: 'Ideas', icon: <Lightbulb />, color: '#f39c12' },
  article: { label: 'Articles', icon: <Article />, color: '#e74c3c' },
  research: { label: 'Research', icon: <Edit />, color: '#1abc9c' },
  quote: { label: 'Quotes', icon: <FormatQuote />, color: '#16a085' },
  word: { label: 'Words', icon: <Spellcheck />, color: '#27ae60' },
  sticky_note: { label: 'Sticky Notes', icon: <Note />, color: '#f39c12' },
  task: { label: 'Tasks', icon: <Edit />, color: '#e67e22' },
  pomodoro: { label: 'Pomodoro', icon: <Timer />, color: '#e74c3c' },
};

// Vault item card component
const VaultItemCard: React.FC<{
  item: VaultItem;
  onOpen: (item: VaultItem) => void;
  onDelete: (id: string) => void;
}> = ({ item, onOpen, onDelete }) => {
  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.note;
  const paraConfig = item.para_category ? PARA_CONFIG[item.para_category] : null;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        cursor: 'pointer',
        borderLeft: `4px solid ${typeConfig.color}`,
        '&:hover': { boxShadow: 3 },
      }}
      onClick={() => onOpen(item)}
    >
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1} alignItems="center" flex={1}>
              <Box sx={{ color: typeConfig.color }}>{typeConfig.icon}</Box>
              <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                {item.title}
              </Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Stack>

          {item.content && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {item.content.substring(0, 100)}...
            </Typography>
          )}

          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            <Chip
              size="small"
              label={typeConfig.label}
              sx={{ backgroundColor: typeConfig.color, color: 'white' }}
            />
            {paraConfig && (
              <Chip
                size="small"
                icon={paraConfig.icon}
                label={paraConfig.label}
                sx={{ backgroundColor: paraConfig.color, color: 'white' }}
              />
            )}
            {item.tags?.map((tag, idx) => (
              <Chip key={idx} size="small" label={tag} variant="outlined" />
            ))}
          </Stack>

          {item.folder_path && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Folder fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {item.folder_path}
              </Typography>
            </Stack>
          )}

          <Typography variant="caption" color="text.secondary">
            Updated: {new Date(item.updated_at).toLocaleDateString()}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Main Knowledge Vault component
const KnowledgeVault: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [paraFilter, setParaFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderPath, setFolderPath] = useState('');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    type: 'note',
    title: '',
    content: '',
    para_category: '',
    folder_path: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (typeFilter) filters.type = typeFilter;
      if (paraFilter) filters.para_category = paraFilter;
      if (folderPath) filters.folder_path = folderPath;
      if (searchQuery) filters.search = searchQuery;

      const [itemsRes, statsRes] = await Promise.all([
        getVaultItems(filters),
        getVaultStats(),
      ]);

      setItems(itemsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      showError('Failed to load vault data');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, paraFilter, folderPath, searchQuery, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    try {
      if (!formData.title.trim()) {
        showError('Title is required');
        return;
      }

      await createVaultItem({
        type: formData.type,
        title: formData.title,
        content: formData.content,
        para_category: formData.para_category || undefined,
        folder_path: formData.folder_path || undefined,
        tags: formData.tags,
      });

      showSuccess('Item created successfully');
      setCreateDialogOpen(false);
      setFormData({
        type: 'note',
        title: '',
        content: '',
        para_category: '',
        folder_path: '',
        tags: [],
      });
      setTagInput('');
      loadData();
    } catch (error) {
      showError('Failed to create item');
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteVaultItem(itemToDelete);
      showSuccess('Item deleted successfully');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error) {
      showError('Failed to delete item');
    }
  };

  const handleMigrate = async () => {
    try {
      setLoading(true);
      const result = await migrateToVault();
      showSuccess(`Migrated ${result.data.migrated} items to vault`);
      if (result.data.errors.length > 0) {
        console.error('Migration errors:', result.data.errors);
      }
      setMigrateDialogOpen(false);
      loadData();
    } catch (error) {
      showError('Failed to migrate data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Knowledge Vault
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unified Obsidian-style knowledge management
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Sync />}
              onClick={() => setMigrateDialogOpen(true)}
            >
              Migrate Data
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New Item
            </Button>
          </Stack>
        </Stack>

        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h4" fontWeight={700}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Items
                </Typography>
              </Paper>
            </Grid>
            {Object.entries(PARA_CONFIG).map(([key, config]) => (
              <Grid item xs={12} sm={3} key={key}>
                <Paper sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: config.color }}>{config.icon}</Box>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={600}>
                        {stats.by_para[key] || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.label}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>PARA</InputLabel>
                <Select
                  value={paraFilter}
                  label="PARA"
                  onChange={(e) => setParaFilter(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {Object.entries(PARA_CONFIG).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Folder path..."
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                InputProps={{
                  startAdornment: <Folder sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="grid">
                  <ViewModule />
                </ToggleButton>
                <ToggleButton value="list">
                  <ViewList />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Content */}
      {loading && <LinearProgress />}

      {!loading && items.length === 0 && (
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No items found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Start by creating a new item or migrating existing data
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create First Item
          </Button>
        </Paper>
      )}

      {!loading && items.length > 0 && (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={12} sm={viewMode === 'grid' ? 6 : 12} md={viewMode === 'grid' ? 4 : 12} key={item.id}>
              <VaultItemCard
                item={item}
                onOpen={(item) => {
                  setSelectedItem(item);
                  setDetailsDialogOpen(true);
                }}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Vault Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              multiline
              rows={6}
            />

            <FormControl fullWidth>
              <InputLabel>PARA Category</InputLabel>
              <Select
                value={formData.para_category}
                label="PARA Category"
                onChange={(e) => setFormData({ ...formData, para_category: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {Object.entries(PARA_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label} - {config.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Folder Path"
              value={formData.folder_path}
              onChange={(e) => setFormData({ ...formData, folder_path: e.target.value })}
              placeholder="e.g., Projects/Work/2024"
            />

            <Box>
              <Stack direction="row" spacing={1} mb={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Add Tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag}>Add</Button>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {formData.tags.map((tag, idx) => (
                  <Chip
                    key={idx}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle>{selectedItem.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Type</Typography>
                  <Chip
                    size="small"
                    label={TYPE_CONFIG[selectedItem.type]?.label || selectedItem.type}
                    sx={{ ml: 1 }}
                  />
                </Box>

                {selectedItem.para_category && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">PARA Category</Typography>
                    <Chip
                      size="small"
                      label={PARA_CONFIG[selectedItem.para_category]?.label || selectedItem.para_category}
                      sx={{ ml: 1 }}
                    />
                  </Box>
                )}

                {selectedItem.folder_path && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Folder</Typography>
                    <Typography variant="body2">{selectedItem.folder_path}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">Content</Typography>
                  <Paper sx={{ p: 2, mt: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" whiteSpace="pre-wrap">
                      {selectedItem.content || 'No content'}
                    </Typography>
                  </Paper>
                </Box>

                {selectedItem.tags.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Tags</Typography>
                    <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap">
                      {selectedItem.tags.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(selectedItem.created_at).toLocaleString()}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    Updated: {new Date(selectedItem.updated_at).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Migrate Dialog */}
      <Dialog
        open={migrateDialogOpen}
        onClose={() => setMigrateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Migrate Existing Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            This will migrate all your existing thoughts, ideas, articles, quotes, words, and notes
            into the unified Knowledge Vault. Your original data will be preserved.
          </Typography>
          <Typography variant="body2" color="warning.main">
            This operation may take a few moments depending on the amount of data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMigrateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMigrate} variant="contained" color="primary">
            Migrate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this item? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default KnowledgeVault;
