// @ts-nocheck
/**
 * @fileoverview Note Editor Component
 * Markdown editor with wikilinks support, preview mode, and task checkboxes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  Edit,
  Visibility,
  VerticalSplit,
  Save,
  Close,
  PushPin,
  Archive,
  Folder,
  Label,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface NoteEditorProps {
  noteId: string;
  title: string;
  content: string;
  folderName?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  onSave: (data: { title: string; content: string }) => void;
  onClose: () => void;
  onPin: (pinned: boolean) => void;
  onArchive: () => void;
  loading?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  noteId,
  title: initialTitle,
  content: initialContent,
  folderName,
  tags = [],
  isPinned = false,
  isArchived = false,
  onSave,
  onClose,
  onPin,
  onArchive,
  loading = false,
}) => {
  const { state, setEditorMode } = useWorkspace();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setHasChanges(false);
  }, [noteId, initialTitle, initialContent]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave({ title, content });
    setHasChanges(false);
  }, [title, content, onSave]);

  const handleModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: 'edit' | 'preview' | 'split' | null) => {
      if (newMode) {
        setEditorMode(newMode);
      }
    },
    [setEditorMode]
  );

  // Custom component to render wikilinks in markdown
  const components = {
    a: ({ node, href, children, ...props }) => {
      // Check if it's a wikilink pattern
      const text = String(children);
      if (text.startsWith('[[') && text.endsWith(']]')) {
        const linkText = text.slice(2, -2);
        return (
          <Chip
            label={linkText}
            size="small"
            onClick={() => {
              // Handle wikilink navigation
              console.log('Navigate to:', linkText);
            }}
            sx={{
              cursor: 'pointer',
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              mx: 0.5,
            }}
          />
        );
      }
      return <a href={href} {...props}>{children}</a>;
    },
    // Custom checkbox rendering for task items
    input: ({ node, type, checked, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => {
              // TODO: Handle checkbox toggle
            }}
            style={{ marginRight: 8 }}
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },
  };

  const renderEditor = () => (
    <TextField
      fullWidth
      multiline
      value={content}
      onChange={handleContentChange}
      placeholder="Start writing... Use [[Note Title]] for wikilinks"
      sx={{
        flex: 1,
        '& .MuiInputBase-root': {
          height: '100%',
          alignItems: 'flex-start',
        },
        '& .MuiInputBase-input': {
          height: '100% !important',
          overflow: 'auto !important',
          fontFamily: 'monospace',
          fontSize: '0.95rem',
          lineHeight: 1.6,
        },
      }}
    />
  );

  const renderPreview = () => (
    <Paper
      sx={{
        flex: 1,
        p: 2,
        overflow: 'auto',
        bgcolor: 'background.default',
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || '*No content*'}
      </ReactMarkdown>
    </Paper>
  );

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <TextField
            value={title}
            onChange={handleTitleChange}
            variant="standard"
            placeholder="Note title..."
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '1.5rem',
                fontWeight: 600,
              },
            }}
            sx={{ flex: 1, mr: 2 }}
          />
          <Stack direction="row" spacing={1}>
            <ToggleButtonGroup
              value={state.editorMode}
              exclusive
              onChange={handleModeChange}
              size="small"
            >
              <ToggleButton value="edit" aria-label="edit">
                <Tooltip title="Edit">
                  <Edit fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="split" aria-label="split">
                <Tooltip title="Split View">
                  <VerticalSplit fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="preview" aria-label="preview">
                <Tooltip title="Preview">
                  <Visibility fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem />
            <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
              <IconButton onClick={() => onPin(!isPinned)} color={isPinned ? 'primary' : 'default'}>
                <PushPin />
              </IconButton>
            </Tooltip>
            <Tooltip title="Archive">
              <IconButton onClick={onArchive} color={isArchived ? 'warning' : 'default'}>
                <Archive />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save">
              <IconButton onClick={handleSave} color={hasChanges ? 'primary' : 'default'} disabled={!hasChanges}>
                <Save />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton onClick={onClose}>
                <Close />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Metadata */}
        <Stack direction="row" spacing={2} alignItems="center">
          {folderName && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Folder fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {folderName}
              </Typography>
            </Stack>
          )}
          {tags.length > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Label fontSize="small" color="action" />
              {tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>
          )}
          {hasChanges && (
            <Typography variant="caption" color="warning.main" fontWeight="bold">
              • Unsaved changes
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Editor Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', p: 2, gap: 2 }}>
        {state.editorMode === 'edit' && renderEditor()}
        {state.editorMode === 'preview' && renderPreview()}
        {state.editorMode === 'split' && (
          <>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {renderEditor()}
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {renderPreview()}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default NoteEditor;
