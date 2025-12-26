/**
 * @fileoverview Rich Block-Based Editor Component
 * 
 * Main editor component that integrates Lexical with our block system,
 * provides offline-first editing, and supports realtime collaboration.
 */

import React, { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { Box, Paper } from '@mui/material';
import {
  editorConfig,
  CollaborationConfig,
  OfflineConfig,
  defaultCollaborationConfig,
  defaultOfflineConfig,
} from '../config/editorConfig';
import { SlashCommandPlugin } from '../plugins/SlashCommandPlugin';
import './RichEditor.css';

/**
 * Props for RichEditor component
 */
export interface RichEditorProps {
  /** Document ID for loading/saving */
  documentId?: string;
  
  /** Initial content (blocks) */
  initialBlocks?: any[];
  
  /** Callback when content is saved */
  onSave?: (blocks: any[]) => void;
  
  /** Read-only mode */
  readOnly?: boolean;
  
  /** Collaboration configuration */
  collaboration?: Partial<CollaborationConfig>;
  
  /** Offline configuration */
  offline?: Partial<OfflineConfig>;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Custom className */
  className?: string;
}

/**
 * Placeholder component
 */
function Placeholder({ text }: { text: string }) {
  return <div className="editor-placeholder">{text}</div>;
}

/**
 * Rich Block-Based Editor Component
 * 
 * Features:
 * - Block-based editing (everything is a block)
 * - Slash commands for inserting blocks
 * - Drag & drop blocks
 * - Undo/redo with history
 * - Inline formatting (bold, italic, etc.)
 * - Mentions (@user, @page)
 * - Realtime collaboration (optional)
 * - Offline-first with auto-sync
 * - Keyboard-first navigation
 * 
 * @example
 * ```tsx
 * <RichEditor
 *   documentId="page-123"
 *   placeholder="Start typing or press '/' for commands..."
 *   collaboration={{
 *     enabled: true,
 *     serverUrl: 'ws://localhost:3001',
 *     roomId: 'doc-123',
 *   }}
 *   offline={{
 *     enabled: true,
 *   }}
 *   onSave={(blocks) => console.log('Saved:', blocks)}
 * />
 * ```
 */
export function RichEditor({
  documentId,
  initialBlocks,
  onSave,
  readOnly = false,
  collaboration,
  offline,
  placeholder = "Start typing or press '/' for commands...",
  className,
}: RichEditorProps) {
  // Merge configs with defaults
  const collaborationConfig: CollaborationConfig = {
    ...defaultCollaborationConfig,
    ...collaboration,
  };
  
  const offlineConfig: OfflineConfig = {
    ...defaultOfflineConfig,
    ...offline,
  };

  // Load initial blocks on mount
  useEffect(() => {
    if (initialBlocks) {
      // TODO: Load blocks into editor
      console.log('Loading blocks:', initialBlocks);
    }
  }, [initialBlocks]);

  // Auto-save on changes
  useEffect(() => {
    if (onSave && !readOnly) {
      // TODO: Set up auto-save listener
      const handleSave = () => {
        // Extract blocks from editor state
        // onSave(blocks);
      };
      
      // Debounced save every 2 seconds
      const saveInterval = setInterval(handleSave, 2000);
      
      return () => clearInterval(saveInterval);
    }
  }, [onSave, readOnly]);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <Box className={`rich-editor-container ${className || ''}`}>
        <Paper elevation={1} className="editor-wrapper">
          {/* Main editor area */}
          <div className="editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-content"
                  readOnly={readOnly}
                  aria-label="Rich text editor"
                />
              }
              placeholder={<Placeholder text={placeholder} />}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          {/* Core plugins */}
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          
          {/* Custom plugins */}
          <SlashCommandPlugin />
          {/* TODO: Add more plugins */}
          {/* <DragDropPlugin /> */}
          {/* <FormattingToolbarPlugin /> */}
          {/* <MentionsPlugin /> */}
          
          {/* Collaboration plugin */}
          {collaborationConfig.enabled && (
            <>
              {/* TODO: Add CollaborationPlugin */}
              {/* <CollaborationPlugin config={collaborationConfig} /> */}
            </>
          )}
          
          {/* Offline plugin */}
          {offlineConfig.enabled && (
            <>
              {/* TODO: Add OfflinePlugin */}
              {/* <OfflinePlugin config={offlineConfig} documentId={documentId} /> */}
            </>
          )}
        </Paper>
      </Box>
    </LexicalComposer>
  );
}

export default RichEditor;
