// @ts-nocheck
/**
 * @fileoverview Notes Workspace Layout Component
 * 3-panel layout: Left Sidebar | Middle Editor | Right Context Panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { NotesSidebar, NoteSummary, FolderSummary, Tag } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import {
  BacklinksPanel,
  LinkedTasksPanel,
  ContextSearchPanel,
  BacklinkItem,
  TaskSummary,
} from './ContextPanels';
import { useWorkspace, WorkspaceProvider } from '../../contexts/WorkspaceContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  getNotes,
  getNote,
  createNote,
  updateNote,
  getFolders,
  getTags,
} from '../../services/noteService';

// Default panel widths
const LEFT_SIDEBAR_WIDTH = 280;
const RIGHT_PANEL_WIDTH = 320;

interface NotesWorkspaceProps {
  initialNoteId?: string;
}

const NotesWorkspaceContent: React.FC<NotesWorkspaceProps> = ({ initialNoteId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { showError, showSuccess } = useNotification();
  const { state, setActiveNote, clearActiveEntity, toggleContextPanel } = useWorkspace();

  // Data state
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [currentNote, setCurrentNote] = useState<any>(null);
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);
  const [linkedTasks, setLinkedTasks] = useState<TaskSummary[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [notesRes, foldersRes, tagsRes] = await Promise.all([
        getNotes({
          folder_id: selectedFolderId || undefined,
          tag: selectedTag || undefined,
          search: searchQuery || undefined,
          archived: false,
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
  }, [selectedFolderId, selectedTag, searchQuery, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load note details when selected
  const loadNoteDetails = useCallback(async (noteId: string) => {
    try {
      const response = await getNote(noteId);
      setCurrentNote(response.data);
      setBacklinks(response.data.backlinks || []);
      // TODO: Load linked tasks from task-note relations API
      setLinkedTasks([]);
    } catch (error) {
      showError('Failed to load note details');
    }
  }, [showError]);

  // Handle initial note from URL
  useEffect(() => {
    if (initialNoteId) {
      setActiveNote(initialNoteId);
      loadNoteDetails(initialNoteId);
    }
  }, [initialNoteId, setActiveNote, loadNoteDetails]);

  // Handle note selection
  const handleNoteSelect = useCallback((note: NoteSummary) => {
    setActiveNote(note.id, note.title);
    loadNoteDetails(note.id);
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [setActiveNote, loadNoteDetails, isMobile]);

  // Handle note save
  const handleNoteSave = useCallback(async (data: { title: string; content: string }) => {
    if (!currentNote) return;

    try {
      await updateNote(currentNote.id, data);
      showSuccess('Note saved');
      loadData(); // Refresh list
    } catch (error) {
      showError('Failed to save note');
    }
  }, [currentNote, showSuccess, showError, loadData]);

  // Handle note pin
  const handleNotePin = useCallback(async (pinned: boolean) => {
    if (!currentNote) return;

    try {
      await updateNote(currentNote.id, { is_pinned: pinned });
      setCurrentNote({ ...currentNote, is_pinned: pinned });
      loadData();
    } catch (error) {
      showError('Failed to update note');
    }
  }, [currentNote, showError, loadData]);

  // Handle note archive
  const handleNoteArchive = useCallback(async () => {
    if (!currentNote) return;

    try {
      await updateNote(currentNote.id, { is_archived: !currentNote.is_archived });
      showSuccess(currentNote.is_archived ? 'Note restored' : 'Note archived');
      clearActiveEntity();
      setCurrentNote(null);
      loadData();
    } catch (error) {
      showError('Failed to archive note');
    }
  }, [currentNote, showSuccess, showError, clearActiveEntity, loadData]);

  // Handle new note creation
  const handleNewNote = useCallback(async () => {
    try {
      const response = await createNote({
        title: 'Untitled Note',
        content: '',
        folder_id: selectedFolderId || undefined,
      });
      setActiveNote(response.data.id, response.data.title);
      loadNoteDetails(response.data.id);
      loadData();
      showSuccess('Note created');
    } catch (error) {
      showError('Failed to create note');
    }
  }, [selectedFolderId, setActiveNote, loadNoteDetails, loadData, showSuccess, showError]);

  // Handle daily note
  const handleOpenDailyNote = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const dailyTitle = `Daily Note - ${today}`;

    // Check if daily note exists
    const existingNote = notes.find(n => n.title === dailyTitle);
    if (existingNote) {
      handleNoteSelect(existingNote);
      return;
    }

    // Create new daily note
    try {
      const response = await createNote({
        title: dailyTitle,
        content: `# ${dailyTitle}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`,
      });
      setActiveNote(response.data.id, response.data.title);
      loadNoteDetails(response.data.id);
      loadData();
      showSuccess('Daily note created');
    } catch (error) {
      showError('Failed to create daily note');
    }
  }, [notes, handleNoteSelect, setActiveNote, loadNoteDetails, loadData, showSuccess, showError]);

  // Handle close note
  const handleCloseNote = useCallback(() => {
    clearActiveEntity();
    setCurrentNote(null);
  }, [clearActiveEntity]);

  // Handle backlink navigation
  const handleBacklinkNavigate = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      handleNoteSelect(note);
    } else {
      loadNoteDetails(noteId);
      setActiveNote(noteId);
    }
  }, [notes, handleNoteSelect, loadNoteDetails, setActiveNote]);

  // Handle task navigation
  const handleTaskNavigate = useCallback((taskId: string) => {
    // TODO: Navigate to task in board view or open task dialog
    console.log('Navigate to task:', taskId);
  }, []);

  // Handle link task
  const handleLinkTask = useCallback(() => {
    // TODO: Open task search/link dialog
    console.log('Open link task dialog');
  }, []);

  // Handle context search
  const handleContextSearch = useCallback(async (query: string) => {
    // TODO: Implement unified search
    console.log('Context search:', query);
  }, []);

  const renderLeftSidebar = () => (
    <Box
      sx={{
        width: LEFT_SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100%',
      }}
    >
      <NotesSidebar
        notes={notes}
        folders={folders}
        tags={tags}
        selectedFolderId={selectedFolderId}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
        onFolderSelect={setSelectedFolderId}
        onTagSelect={setSelectedTag}
        onSearchChange={setSearchQuery}
        onNewNote={handleNewNote}
        onOpenDailyNote={handleOpenDailyNote}
        onNoteSelect={handleNoteSelect}
        loading={loading}
      />
    </Box>
  );

  const renderMiddlePanel = () => (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {currentNote ? (
        <NoteEditor
          noteId={currentNote.id}
          title={currentNote.title}
          content={currentNote.content || ''}
          folderName={currentNote.folder_name}
          tags={currentNote.tags?.map((t: any) => t.name || t) || []}
          isPinned={!!currentNote.is_pinned}
          isArchived={!!currentNote.is_archived}
          onSave={handleNoteSave}
          onClose={handleCloseNote}
          onPin={handleNotePin}
          onArchive={handleNoteArchive}
        />
      ) : (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'text.secondary',
          }}
        >
          <Typography variant="h5" gutterBottom>
            Select a note to view
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Or press Ctrl+N to create a new note
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderRightPanel = () => (
    <Box
      sx={{
        width: RIGHT_PANEL_WIDTH,
        flexShrink: 0,
        height: '100%',
        overflow: 'auto',
        borderLeft: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        Context
      </Typography>

      {currentNote && (
        <>
          <BacklinksPanel
            items={backlinks}
            onNavigate={handleBacklinkNavigate}
          />

          <LinkedTasksPanel
            tasks={linkedTasks}
            onNavigate={handleTaskNavigate}
            onLinkTask={handleLinkTask}
          />

          <ContextSearchPanel
            onSearch={handleContextSearch}
            results={[]}
            onNavigate={(type, id) => {
              if (type === 'note') {
                handleBacklinkNavigate(id);
              } else {
                handleTaskNavigate(id);
              }
            }}
          />
        </>
      )}

      {!currentNote && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Select a note to see context
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        height: 'calc(100vh - 64px)', // Subtract navbar height
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Mobile Sidebar Toggle */}
      {isMobile && (
        <IconButton
          onClick={() => setSidebarOpen(!sidebarOpen)}
          sx={{
            position: 'fixed',
            top: 72,
            left: 8,
            zIndex: 1100,
            bgcolor: 'background.paper',
            boxShadow: 1,
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Left Sidebar */}
      {isMobile ? (
        <Drawer
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          PaperProps={{
            sx: { width: LEFT_SIDEBAR_WIDTH },
          }}
        >
          {renderLeftSidebar()}
        </Drawer>
      ) : (
        <>
          {sidebarOpen && renderLeftSidebar()}
          <IconButton
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{
              position: 'absolute',
              left: sidebarOpen ? LEFT_SIDEBAR_WIDTH - 12 : 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1000,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
          </IconButton>
        </>
      )}

      {/* Middle Panel */}
      {renderMiddlePanel()}

      {/* Right Context Panel */}
      {!isMobile && state.contextPanelOpen && renderRightPanel()}

      {/* Context Panel Toggle (Desktop) */}
      {!isMobile && (
        <Tooltip title={state.contextPanelOpen ? 'Hide context' : 'Show context'}>
          <IconButton
            onClick={toggleContextPanel}
            sx={{
              position: 'absolute',
              right: state.contextPanelOpen ? RIGHT_PANEL_WIDTH - 12 : 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1000,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {state.contextPanelOpen ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

// Wrapper component with WorkspaceProvider
export const NotesWorkspace: React.FC<NotesWorkspaceProps> = (props) => {
  return (
    <WorkspaceProvider>
      <NotesWorkspaceContent {...props} />
    </WorkspaceProvider>
  );
};

export default NotesWorkspace;
