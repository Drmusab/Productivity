/**
 * @fileoverview Rich Block-Based Editor - Main exports
 * 
 * This file exports all public components, types, and utilities
 * for the Rich Block-Based Editor.
 */

// Main component
export { RichEditor, type RichEditorProps } from './components/RichEditor';

// Plugins
export { SlashCommandPlugin } from './plugins/SlashCommandPlugin';

// Configuration
export {
  editorConfig,
  editorTheme,
  type CollaborationConfig,
  type OfflineConfig,
  defaultCollaborationConfig,
  defaultOfflineConfig,
} from './config/editorConfig';

// Custom nodes
export {
  KanbanCardNode,
  TodoNode,
  HeadingBlockNode,
  CUSTOM_NODES,
  type BlockNodeInterface,
  type SerializedKanbanCardNode,
  type SerializedTodoNode,
  type SerializedHeadingBlockNode,
} from './nodes/BlockNodes';

// Types
export type {
  Block,
  KanbanCardBlockData,
  TodoBlockData,
  HeadingBlockData,
} from './nodes/BlockNodes';
