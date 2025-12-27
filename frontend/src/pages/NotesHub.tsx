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
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Add,
  Folder,
  FolderOpen,
  Note,
  Delete,
  Archive,
  PushPin,
  Search,
  Link as LinkIcon,
  School,
  Refresh,
  ViewModule,
  ViewQuilt,
} from '@mui/icons-material';

import { useNotification } from '../contexts/NotificationContext';
import { NotesWorkspace } from '../components/Notes';
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getFolders,
  createFolder,
  deleteFolder,
  getTags,
} from '../services/noteService';

// Note type colors
const NOTE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  standard: { label: 'Standard', color: '#3498db' },
  cornell: { label: 'Cornell', color: '#9b59b6' },
  zettelkasten: { label: 'Zettelkasten', color: '#2ecc71' },
};

// Note card component
const NoteCard: React.FC<{
  note: any;
  onOpen: (note: any) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ note, onOpen, onPin, onArchive, onDelete }) => {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        cursor: 'pointer',
        borderTop: `4px solid ${note.color || '#3498db'}`,
        opacity: note.is_archived ? 0.6 : 1,
        '&:hover': { boxShadow: 3 },
      }}
      onClick={() => onOpen(note)}
    >
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1} alignItems="center">
              {note.is_pinned && <PushPin fontSize="small" color="primary" />}
              <Typography variant="h6" noWrap sx={{ maxWidth: 200 }}>
                {note.title}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
              <Tooltip title={note.is_pinned ? 'Unpin' : 'Pin'}>
                <IconButton size="small" onClick={() => onPin(note.id, !note.is_pinned)}>
                  <PushPin fontSize="small" color={note.is_pinned ? 'primary' : 'disabled'} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Archive">
                <IconButton size="small" onClick={() => onArchive(note.id)}>
                  <Archive fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => onDelete(note.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Chip
            size="small"
            label={NOTE_TYPE_CONFIG[note.type]?.label || 'Standard'}
            sx={{
              alignSelf: 'flex-start',
              backgroundColor: NOTE_TYPE_CONFIG[note.type]?.color || '#3498db',
              color: 'white',
            }}
          />

          {note.content && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {note.content}
            </Typography>
          )}

          {note.tags && note.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap">
              {note.tags.slice(0, 3).map((tag: string) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
              {note.tags.length > 3 && (
                <Chip label={`+${note.tags.length - 3}`} size="small" variant="outlined" />
              )}
            </Stack>
          )}

          <Typography variant="caption" color="text.secondary">
            {new Date(note.updated_at).toLocaleDateString()}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};

// Main component
const NotesHub: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'workspace'>('workspace');

  // Data
  const [notes, setNotes] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);

  // Dialogs
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [noteDetailOpen, setNoteDetailOpen] = useState(false);

  // Filters
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Form state
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    type: 'standard',
    folder_id: '',
    color: '#3498db',
    tags: [] as string[],
    cornell: {
      cue_column: '',
      notes_column: '',
      summary: '',
      topic: '',
      knowledge_rating: 0,
    },
  });
  const [folderName, setFolderName] = useState('');
  const [tagInput, setTagInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [notesRes, foldersRes, tagsRes] = await Promise.all([
        getNotes({
          folder_id: selectedFolder || undefined,
          tag: selectedTag || undefined,
          search: searchQuery || undefined,
          archived: showArchived,
        }),
        getFolders(),
        getTags(),
      ]);

      setNotes(notesRes.data);
      setFolders(foldersRes.data);
      setTags(tagsRes.data);
    } catch (error) {
      showError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, selectedTag, searchQuery, showArchived, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateNote = async () => {
    try {
      const payload = {
        ...noteForm,
        folder_id: noteForm.folder_id || undefined,
        cornell: noteForm.type === 'cornell' ? noteForm.cornell : undefined,
      };

      if (selectedNote) {
        await updateNote(selectedNote.id, payload);
        showSuccess('Note updated');
      } else {
        await createNote(payload);
        showSuccess('Note created');
      }
      setNoteDialogOpen(false);
      resetNoteForm();
      loadData();
    } catch (error) {
      showError('Failed to save note');
    }
  };

  const handleCreateFolder = async () => {
    try {
      await createFolder({ name: folderName });
      showSuccess('Folder created');
      setFolderDialogOpen(false);
      setFolderName('');
      loadData();
    } catch (error) {
      showError('Failed to create folder');
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      showSuccess('Note deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete note');
    }
  };

  const handlePinNote = async (id: string, pinned: boolean) => {
    try {
      await updateNote(id, { is_pinned: pinned });
      loadData();
    } catch (error) {
      showError('Failed to update note');
    }
  };

  const handleArchiveNote = async (id: string) => {
    try {
      const note = notes.find((n) => n.id === id);
      await updateNote(id, { is_archived: !note?.is_archived });
      showSuccess(note?.is_archived ? 'Note restored' : 'Note archived');
      loadData();
    } catch (error) {
      showError('Failed to archive note');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder(id);
      showSuccess('Folder deleted');
      if (selectedFolder === id) setSelectedFolder(null);
      loadData();
    } catch (error) {
      showError('Failed to delete folder');
    }
  };

  const openNoteForEdit = async (note: any) => {
    try {
      const fullNote = await getNote(note.id);
      setSelectedNote(fullNote.data);
      setNoteForm({
        title: fullNote.data.title,
        content: fullNote.data.content || '',
        type: fullNote.data.type || 'standard',
        folder_id: fullNote.data.folder_id || '',
        color: fullNote.data.color || '#3498db',
        tags: fullNote.data.tags?.map((t: any) => t.name || t) || [],
        cornell: fullNote.data.cornell || {
          cue_column: '',
          notes_column: '',
          summary: '',
          topic: '',
          knowledge_rating: 0,
        },
      });
      setNoteDialogOpen(true);
    } catch (error) {
      showError('Failed to load note details');
    }
  };

  const resetNoteForm = () => {
    setSelectedNote(null);
    setNoteForm({
      title: '',
      content: '',
      type: 'standard',
      folder_id: selectedFolder || '',
      color: '#3498db',
      tags: [],
      cornell: {
        cue_column: '',
        notes_column: '',
        summary: '',
        topic: '',
        knowledge_rating: 0,
      },
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !noteForm.tags.includes(tagInput.trim().toLowerCase())) {
      setNoteForm({
        ...noteForm,
        tags: [...noteForm.tags, tagInput.trim().toLowerCase()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setNoteForm({
      ...noteForm,
      tags: noteForm.tags.filter((t) => t !== tag),
    });
  };

  if (loading && notes.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>Loading Notes Hub...</Typography>
      </Box>
    );
  }

  // Render Workspace View (3-panel layout)
  if (viewMode === 'workspace') {
    return (
      <Box>
        {/* View Mode Toggle Header */}
        <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="workspace" aria-label="workspace view">
              <Tooltip title="Workspace View">
                <ViewQuilt fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view">
              <Tooltip title="Grid View">
                <ViewModule fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <NotesWorkspace />
      </Box>
    );
  }

  // Grid View (existing implementation)
  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Note sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">Notes Hub</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Organize your notes with folders, tags, and smart linking
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="workspace" aria-label="workspace view">
                <Tooltip title="Workspace View">
                  <ViewQuilt fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid" aria-label="grid view">
                <Tooltip title="Grid View">
                  <ViewModule fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              startIcon={<Folder />}
              onClick={() => setFolderDialogOpen(true)}
            >
              New Folder
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetNoteForm();
                setNoteDialogOpen(true);
              }}
            >
              New Note
            </Button>
            <IconButton onClick={loadData}>
              <Refresh />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            {/* Search */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ mb: 2 }}
            />

            {/* Folders */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              FOLDERS
            </Typography>
            <List dense>
              <ListItem disablePadding>
                <ListItemButton
                  selected={selectedFolder === null}
                  onClick={() => setSelectedFolder(null)}
                >
                  <ListItemIcon>
                    <FolderOpen fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="All Notes" />
                  <Chip size="small" label={notes.length} />
                </ListItemButton>
              </ListItem>
              {folders.map((folder) => (
                <ListItem
                  key={folder.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    selected={selectedFolder === folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <ListItemIcon>
                      <Folder fontSize="small" sx={{ color: folder.color || 'inherit' }} />
                    </ListItemIcon>
                    <ListItemText primary={folder.name} />
                    <Chip size="small" label={folder.note_count || 0} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            {/* Tags */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              TAGS
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <Chip
                label="All"
                size="small"
                variant={selectedTag === '' ? 'filled' : 'outlined'}
                onClick={() => setSelectedTag('')}
              />
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  variant={selectedTag === tag.name ? 'filled' : 'outlined'}
                  onClick={() => setSelectedTag(tag.name)}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Archive toggle */}
            <Button
              fullWidth
              variant={showArchived ? 'contained' : 'outlined'}
              startIcon={<Archive />}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Button>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          {/* Tabs for note types */}
          <Paper sx={{ mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="All Notes" />
              <Tab icon={<School fontSize="small" />} label="Cornell Notes" iconPosition="start" />
              <Tab icon={<LinkIcon fontSize="small" />} label="Zettelkasten" iconPosition="start" />
            </Tabs>
          </Paper>

          {/* Notes Grid */}
          <Grid container spacing={2}>
            {notes
              .filter((note) => {
                if (activeTab === 1) return note.type === 'cornell';
                if (activeTab === 2) return note.type === 'zettelkasten';
                return true;
              })
              .map((note) => (
                <Grid item xs={12} sm={6} lg={4} key={note.id}>
                  <NoteCard
                    note={note}
                    onOpen={openNoteForEdit}
                    onPin={handlePinNote}
                    onArchive={handleArchiveNote}
                    onDelete={handleDeleteNote}
                  />
                </Grid>
              ))}
            {notes.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Note sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No notes found
                  </Typography>
                  <Typography color="text.secondary">
                    Create your first note to get started
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {/* Note Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedNote ? 'Edit Note' : 'Create Note'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              fullWidth
              autoFocus
            />

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={noteForm.type}
                  label="Type"
                  onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}
                >
                  {Object.entries(NOTE_TYPE_CONFIG).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Folder</InputLabel>
                <Select
                  value={noteForm.folder_id}
                  label="Folder"
                  onChange={(e) => setNoteForm({ ...noteForm, folder_id: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {folders.map((folder) => (
                    <MenuItem key={folder.id} value={folder.id}>{folder.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Color"
                type="color"
                value={noteForm.color}
                onChange={(e) => setNoteForm({ ...noteForm, color: e.target.value })}
                sx={{ width: 100 }}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            {noteForm.type === 'standard' && (
              <TextField
                label="Content"
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                fullWidth
                multiline
                rows={8}
              />
            )}

            {noteForm.type === 'cornell' && (
              <>
                <TextField
                  label="Topic"
                  value={noteForm.cornell.topic}
                  onChange={(e) =>
                    setNoteForm({
                      ...noteForm,
                      cornell: { ...noteForm.cornell, topic: e.target.value },
                    })
                  }
                  fullWidth
                />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      label="Cue Column (Keywords/Questions)"
                      value={noteForm.cornell.cue_column}
                      onChange={(e) =>
                        setNoteForm({
                          ...noteForm,
                          cornell: { ...noteForm.cornell, cue_column: e.target.value },
                        })
                      }
                      fullWidth
                      multiline
                      rows={6}
                    />
                  </Grid>
                  <Grid item xs={8}>
                    <TextField
                      label="Notes Column"
                      value={noteForm.cornell.notes_column}
                      onChange={(e) =>
                        setNoteForm({
                          ...noteForm,
                          cornell: { ...noteForm.cornell, notes_column: e.target.value },
                        })
                      }
                      fullWidth
                      multiline
                      rows={6}
                    />
                  </Grid>
                </Grid>
                <TextField
                  label="Summary"
                  value={noteForm.cornell.summary}
                  onChange={(e) =>
                    setNoteForm({
                      ...noteForm,
                      cornell: { ...noteForm.cornell, summary: e.target.value },
                    })
                  }
                  fullWidth
                  multiline
                  rows={2}
                />
                <FormControl fullWidth>
                  <InputLabel>Knowledge Rating</InputLabel>
                  <Select
                    value={noteForm.cornell.knowledge_rating}
                    label="Knowledge Rating"
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        cornell: { ...noteForm.cornell, knowledge_rating: Number(e.target.value) },
                      })
                    }
                  >
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                      <MenuItem key={rating} value={rating}>
                        {rating === 0 ? 'Not rated' : `${rating}/5`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            {noteForm.type === 'zettelkasten' && (
              <TextField
                label="Atomic Note Content (One idea per note)"
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                fullWidth
                multiline
                rows={6}
                helperText="Keep it focused on a single concept or idea"
              />
            )}

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
                {noteForm.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => removeTag(tag)}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateNote}
            variant="contained"
            disabled={!noteForm.title.trim()}
          >
            {selectedNote ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Folder Dialog */}
      <Dialog
        open={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Folder</DialogTitle>
        <DialogContent>
          <TextField
            label="Folder Name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={!folderName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotesHub;
