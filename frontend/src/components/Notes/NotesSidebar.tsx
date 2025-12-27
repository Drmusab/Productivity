// @ts-nocheck
/**
 * @fileoverview Notes Sidebar Component
 * Left panel navigation for notes, folders, tags, and daily notes
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  IconButton,
  Typography,
  Chip,
  Stack,
  Collapse,
  Divider,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Note,
  Folder,
  FolderOpen,
  Add,
  Today,
  Search,
  List as ListIcon,
  AccountTree,
  ExpandMore,
  ExpandLess,
  Label,
  Schedule,
  Star,
} from '@mui/icons-material';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export interface NoteSummary {
  id: string;
  title: string;
  folder_id?: string;
  folder_name?: string;
  updated_at: string;
  is_pinned?: boolean;
  type?: string;
  tags?: string[];
}

export interface FolderSummary {
  id: string;
  name: string;
  parent_id?: string;
  note_count: number;
  color?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  usage_count?: number;
}

interface NotesSidebarProps {
  notes: NoteSummary[];
  folders: FolderSummary[];
  tags: Tag[];
  selectedFolderId: string | null;
  selectedTag: string;
  searchQuery: string;
  onFolderSelect: (folderId: string | null) => void;
  onTagSelect: (tagName: string) => void;
  onSearchChange: (query: string) => void;
  onNewNote: () => void;
  onOpenDailyNote: () => void;
  onNoteSelect: (note: NoteSummary) => void;
  loading?: boolean;
}

export const NotesSidebar: React.FC<NotesSidebarProps> = ({
  notes,
  folders,
  tags,
  selectedFolderId,
  selectedTag,
  searchQuery,
  onFolderSelect,
  onTagSelect,
  onSearchChange,
  onNewNote,
  onOpenDailyNote,
  onNoteSelect,
  loading = false,
}) => {
  const { state, setSidebarMode } = useWorkspace();
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);

  // Get recent notes (last 5 updated)
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // Get pinned notes
  const pinnedNotes = notes.filter(n => n.is_pinned);

  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'tree' | 'list' | null) => {
      if (newMode) {
        setSidebarMode(newMode);
      }
    },
    [setSidebarMode]
  );

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Note color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Notes
            </Typography>
          </Stack>
          <ToggleButtonGroup
            value={state.sidebarMode}
            exclusive
            onChange={handleModeChange}
            size="small"
          >
            <ToggleButton value="tree" aria-label="tree view">
              <Tooltip title="Tree View">
                <AccountTree fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="List View">
                <ListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* Quick Actions */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Tooltip title="New Note">
            <IconButton
              onClick={onNewNote}
              color="primary"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <Add />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open Daily Note">
            <IconButton onClick={onOpenDailyNote} color="primary">
              <Today />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
              <Star fontSize="small" sx={{ mr: 0.5, color: 'warning.main' }} />
              PINNED
            </Typography>
            <List dense disablePadding>
              {pinnedNotes.map((note) => (
                <ListItem key={note.id} disablePadding>
                  <ListItemButton
                    onClick={() => onNoteSelect(note)}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Note fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={note.title}
                      primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* Recent Notes */}
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton size="small" onClick={() => setRecentExpanded(!recentExpanded)}>
              {recentExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          }
        >
          <ListItemButton onClick={() => setRecentExpanded(!recentExpanded)} sx={{ borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Schedule fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Recent" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>
        <Collapse in={recentExpanded}>
          <List dense disablePadding sx={{ pl: 2 }}>
            {recentNotes.map((note) => (
              <ListItem key={note.id} disablePadding>
                <ListItemButton onClick={() => onNoteSelect(note)} sx={{ borderRadius: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Note fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={note.title}
                    primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>

        <Divider sx={{ my: 1 }} />

        {/* Folders */}
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton size="small" onClick={() => setFoldersExpanded(!foldersExpanded)}>
              {foldersExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          }
        >
          <ListItemButton onClick={() => setFoldersExpanded(!foldersExpanded)} sx={{ borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Folder fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Folders" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>
        <Collapse in={foldersExpanded}>
          <List dense disablePadding sx={{ pl: 2 }}>
            <ListItem disablePadding>
              <ListItemButton
                selected={selectedFolderId === null}
                onClick={() => onFolderSelect(null)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <FolderOpen fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="All Notes" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                <Chip size="small" label={notes.length} />
              </ListItemButton>
            </ListItem>
            {folders.map((folder) => (
              <ListItem key={folder.id} disablePadding>
                <ListItemButton
                  selected={selectedFolderId === folder.id}
                  onClick={() => onFolderSelect(folder.id)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Folder fontSize="small" sx={{ color: folder.color || 'inherit' }} />
                  </ListItemIcon>
                  <ListItemText primary={folder.name} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                  <Chip size="small" label={folder.note_count || 0} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>

        <Divider sx={{ my: 1 }} />

        {/* Tags */}
        <ListItem
          disablePadding
          secondaryAction={
            <IconButton size="small" onClick={() => setTagsExpanded(!tagsExpanded)}>
              {tagsExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          }
        >
          <ListItemButton onClick={() => setTagsExpanded(!tagsExpanded)} sx={{ borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Label fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Tags" primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>
        <Collapse in={tagsExpanded}>
          <Box sx={{ px: 2, py: 1 }}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              <Chip
                label="All"
                size="small"
                variant={selectedTag === '' ? 'filled' : 'outlined'}
                onClick={() => onTagSelect('')}
                sx={{ mb: 0.5 }}
              />
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  variant={selectedTag === tag.name ? 'filled' : 'outlined'}
                  onClick={() => onTagSelect(tag.name)}
                  sx={{
                    mb: 0.5,
                    bgcolor: selectedTag === tag.name ? tag.color : 'transparent',
                    borderColor: tag.color,
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
};

export default NotesSidebar;
