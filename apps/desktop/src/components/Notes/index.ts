/**
 * @fileoverview Notes Components Index
 * Export all Notes-related components
 */

export { NotesSidebar } from './NotesSidebar';
export type { NoteSummary, FolderSummary, Tag } from './NotesSidebar';

export { NoteEditor } from './NoteEditor';

export {
  BacklinksPanel,
  LinkedTasksPanel,
  LinkedNotesPanel,
  ContextSearchPanel,
} from './ContextPanels';
export type { BacklinkItem, TaskSummary } from './ContextPanels';

export { NotesWorkspace } from './NotesWorkspace';
