/**
 * @fileoverview Lexical Editor Configuration
 * 
 * Defines the initial configuration for the Lexical editor including
 * theme, nodes, error handling, and namespace.
 */

import { InitialConfigType } from '@lexical/react/LexicalComposer';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { CUSTOM_NODES } from '../nodes/BlockNodes';

/**
 * Custom theme for editor styling
 */
export const editorTheme = {
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
    h6: 'editor-heading-h6',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
  },
  code: 'editor-code',
  codeHighlight: {
    atrule: 'editor-tokenAttr',
    attr: 'editor-tokenAttr',
    boolean: 'editor-tokenProperty',
    builtin: 'editor-tokenSelector',
    cdata: 'editor-tokenComment',
    char: 'editor-tokenSelector',
    class: 'editor-tokenFunction',
    'class-name': 'editor-tokenFunction',
    comment: 'editor-tokenComment',
    constant: 'editor-tokenProperty',
    deleted: 'editor-tokenProperty',
    doctype: 'editor-tokenComment',
    entity: 'editor-tokenOperator',
    function: 'editor-tokenFunction',
    important: 'editor-tokenVariable',
    inserted: 'editor-tokenSelector',
    keyword: 'editor-tokenAttr',
    namespace: 'editor-tokenVariable',
    number: 'editor-tokenProperty',
    operator: 'editor-tokenOperator',
    prolog: 'editor-tokenComment',
    property: 'editor-tokenProperty',
    punctuation: 'editor-tokenPunctuation',
    regex: 'editor-tokenVariable',
    selector: 'editor-tokenSelector',
    string: 'editor-tokenSelector',
    symbol: 'editor-tokenProperty',
    tag: 'editor-tokenProperty',
    url: 'editor-tokenOperator',
    variable: 'editor-tokenVariable',
  },
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
  },
  link: 'editor-link',
};

/**
 * Error handler for editor errors
 */
export function onError(error: Error): void {
  console.error('Lexical Editor Error:', error);
  // In production, send to error tracking service
}

/**
 * Editor configuration
 */
export const editorConfig: InitialConfigType = {
  namespace: 'RichBlockEditor',
  theme: editorTheme,
  onError,
  nodes: [
    // Built-in rich text nodes
    HeadingNode,
    QuoteNode,
    ListNode,
    ListItemNode,
    CodeNode,
    LinkNode,
    // Custom block nodes
    ...CUSTOM_NODES,
  ],
};

/**
 * Configuration for collaboration features
 */
export interface CollaborationConfig {
  enabled: boolean;
  serverUrl: string;
  roomId: string;
  userId: string;
  userName: string;
  userColor: string;
}

/**
 * Configuration for offline features
 */
export interface OfflineConfig {
  enabled: boolean;
  dbName: string;
  snapshotInterval: number; // milliseconds
  maxSnapshots: number;
}

/**
 * Default collaboration config
 */
export const defaultCollaborationConfig: CollaborationConfig = {
  enabled: false,
  serverUrl: 'ws://localhost:3001',
  roomId: '',
  userId: '',
  userName: 'Anonymous',
  userColor: '#3498db',
};

/**
 * Default offline config
 */
export const defaultOfflineConfig: OfflineConfig = {
  enabled: true,
  dbName: 'editor-offline-db',
  snapshotInterval: 10 * 60 * 1000, // 10 minutes
  maxSnapshots: 100,
};
