// @ts-nocheck
/**
 * @fileoverview Context Panel Components
 * Right panel showing backlinks, linked tasks, and linked notes
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Button,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Link as LinkIcon,
  Assignment,
  Note,
  Add,
  ExpandMore,
  ExpandLess,
  OpenInNew,
  Search,
  LinkOff,
} from '@mui/icons-material';

// Types
export interface BacklinkItem {
  id: string;
  title: string;
  snippet?: string;
  type?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  columnName?: string;
  relationType?: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  folderName?: string;
  relationType?: string;
}

// Backlinks Panel Component
interface BacklinksPanelProps {
  items: BacklinkItem[];
  onNavigate: (noteId: string) => void;
  loading?: boolean;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  items,
  onNavigate,
  loading = false,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Paper sx={{ mb: 2 }} variant="outlined">
      <ListItem
        disablePadding
        secondaryAction={
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        }
      >
        <ListItemButton onClick={() => setExpanded(!expanded)}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <LinkIcon color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Backlinks
                </Typography>
                <Chip label={items.length} size="small" color="primary" />
              </Stack>
            }
          />
        </ListItemButton>
      </ListItem>

      <Collapse in={expanded}>
        <Divider />
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <LinkOff color="disabled" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notes link to this one yet
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton onClick={() => onNavigate(item.id)}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Note fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.snippet}
                    primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      fontSize: '0.75rem',
                      sx: { color: 'text.secondary' },
                    }}
                  />
                  <IconButton size="small">
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Collapse>
    </Paper>
  );
};

// Linked Tasks Panel Component
interface LinkedTasksPanelProps {
  tasks: TaskSummary[];
  onNavigate: (taskId: string) => void;
  onLinkTask: () => void;
  loading?: boolean;
}

export const LinkedTasksPanel: React.FC<LinkedTasksPanelProps> = ({
  tasks,
  onNavigate,
  onLinkTask,
  loading = false,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Paper sx={{ mb: 2 }} variant="outlined">
      <ListItem
        disablePadding
        secondaryAction={
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Link existing task">
              <IconButton size="small" onClick={onLinkTask}>
                <Add />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Stack>
        }
      >
        <ListItemButton onClick={() => setExpanded(!expanded)}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Assignment color="secondary" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Linked Tasks
                </Typography>
                <Chip label={tasks.length} size="small" color="secondary" />
              </Stack>
            }
          />
        </ListItemButton>
      </ListItem>

      <Collapse in={expanded}>
        <Divider />
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : tasks.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Assignment color="disabled" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No tasks linked to this note
            </Typography>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={onLinkTask}
              sx={{ mt: 1 }}
            >
              Link a task
            </Button>
          </Box>
        ) : (
          <List dense disablePadding>
            {tasks.map((task) => (
              <ListItem key={task.id} disablePadding>
                <ListItemButton onClick={() => onNavigate(task.id)}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Assignment fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {task.relationType && (
                          <Chip label={task.relationType} size="small" variant="outlined" />
                        )}
                        {task.columnName && (
                          <Typography variant="caption" color="text.secondary">
                            {task.columnName}
                          </Typography>
                        )}
                      </Stack>
                    }
                    primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                  />
                  {task.priority && (
                    <Chip
                      label={task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                      sx={{ mr: 1 }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Collapse>
    </Paper>
  );
};

// Linked Notes Panel Component (for Tasks)
interface LinkedNotesPanelProps {
  notes: NoteSummary[];
  onNavigate: (noteId: string) => void;
  onLinkNote: () => void;
  onCreateNote: () => void;
  loading?: boolean;
}

export const LinkedNotesPanel: React.FC<LinkedNotesPanelProps> = ({
  notes,
  onNavigate,
  onLinkNote,
  onCreateNote,
  loading = false,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Paper sx={{ mb: 2 }} variant="outlined">
      <ListItem
        disablePadding
        secondaryAction={
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Create note from task">
              <IconButton size="small" onClick={onCreateNote} color="primary">
                <Add />
              </IconButton>
            </Tooltip>
            <Tooltip title="Link existing note">
              <IconButton size="small" onClick={onLinkNote}>
                <LinkIcon />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Stack>
        }
      >
        <ListItemButton onClick={() => setExpanded(!expanded)}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Note color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" fontWeight="bold">
                  Linked Notes
                </Typography>
                <Chip label={notes.length} size="small" color="primary" />
              </Stack>
            }
          />
        </ListItemButton>
      </ListItem>

      <Collapse in={expanded}>
        <Divider />
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : notes.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Note color="disabled" sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notes linked to this task
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
              <Button size="small" startIcon={<Add />} variant="contained" onClick={onCreateNote}>
                Create Note
              </Button>
              <Button size="small" startIcon={<LinkIcon />} onClick={onLinkNote}>
                Link Note
              </Button>
            </Stack>
          </Box>
        ) : (
          <List dense disablePadding>
            {notes.map((note) => (
              <ListItem key={note.id} disablePadding>
                <ListItemButton onClick={() => onNavigate(note.id)}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Note fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={note.title}
                    secondary={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {note.relationType && (
                          <Chip label={note.relationType} size="small" variant="outlined" />
                        )}
                        {note.folderName && (
                          <Typography variant="caption" color="text.secondary">
                            {note.folderName}
                          </Typography>
                        )}
                      </Stack>
                    }
                    primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                  />
                  <IconButton size="small">
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Collapse>
    </Paper>
  );
};

// Context Search Panel Component
interface ContextSearchPanelProps {
  onSearch: (query: string) => void;
  results?: Array<{ type: 'note' | 'task'; id: string; title: string; snippet?: string }>;
  onNavigate: (type: 'note' | 'task', id: string) => void;
  loading?: boolean;
}

export const ContextSearchPanel: React.FC<ContextSearchPanelProps> = ({
  onSearch,
  results = [],
  onNavigate,
  loading = false,
}) => {
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(true);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 2) {
      onSearch(value);
    }
  };

  return (
    <Paper sx={{ mb: 2 }} variant="outlined">
      <ListItem
        disablePadding
        secondaryAction={
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        }
      >
        <ListItemButton onClick={() => setExpanded(!expanded)}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Search color="action" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="subtitle2" fontWeight="bold">
                Context Search
              </Typography>
            }
          />
        </ListItemButton>
      </ListItem>

      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 1 }}>
          <input
            type="text"
            placeholder="Search notes and tasks..."
            value={query}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: '0.875rem',
            }}
          />
        </Box>
        {loading && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && results.length > 0 && (
          <List dense disablePadding>
            {results.map((result) => (
              <ListItem key={`${result.type}-${result.id}`} disablePadding>
                <ListItemButton onClick={() => onNavigate(result.type, result.id)}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {result.type === 'note' ? (
                      <Note fontSize="small" />
                    ) : (
                      <Assignment fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.title}
                    secondary={result.snippet}
                    primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      fontSize: '0.75rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Collapse>
    </Paper>
  );
};
