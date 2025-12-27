/**
 * @fileoverview Type definitions for Obsidian-style Notes System
 * 
 * This file defines the core types for the Obsidian-style notes functionality,
 * including notes, note links, and task-note relations.
 * 
 * Design Principles:
 * 1. Notes are first-class citizens with markdown content
 * 2. Links are normalized (no JSON blobs) and support unresolved references
 * 3. Task-note relations enable knowledge-action bridge
 * 4. Schema is DB-agnostic (SQLite/Postgres compatible)
 */

// ===== Note Entity =====

/**
 * Note entity - Represents a markdown-based knowledge node
 * Similar to an Obsidian note with frontmatter and wikilinks
 */
export interface Note {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Note title (shown in UI and used for [[Title]] links) */
  title: string;
  
  /** Optional folder hierarchy path (e.g., "Work/Projects") */
  folderPath?: string | null;
  
  /** Full markdown content (raw and unmodified) */
  contentMarkdown: string;
  
  /** YAML-equivalent metadata as JSON string */
  frontmatter?: string | null;
  
  /** User who created the note */
  createdBy?: number | null;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Last updated timestamp */
  updatedAt: string;
}

/**
 * Parsed frontmatter data structure
 */
export interface NoteFrontmatter {
  /** Tags associated with the note */
  tags?: string[];
  
  /** Aliases for the note (alternative titles for linking) */
  aliases?: string[];
  
  /** Custom metadata fields */
  [key: string]: any;
}

// ===== Note Link Entity =====

/**
 * Link type enumeration
 */
export enum NoteLinkType {
  /** Standard wikilink: [[Note Title]] */
  WIKILINK = 'wikilink',
  
  /** Heading link: [[Note Title#Heading]] */
  HEADING = 'heading',
  
  /** Block reference: [[Note Title^blockId]] */
  BLOCK = 'block',
}

/**
 * NoteLink entity - Represents a link from one note to another
 * Links are derived data, re-generated on note save
 */
export interface NoteLink {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Source note ID (the note containing the link) */
  sourceNoteId: string;
  
  /** Target note ID (resolved link) - null if unresolved */
  targetNoteId?: string | null;
  
  /** Unresolved link text (e.g., "future-note" from [[future-note]]) */
  unresolvedTarget?: string | null;
  
  /** Type of link */
  linkType: NoteLinkType;
  
  /** Created timestamp */
  createdAt: string;
}

/**
 * Parsed wikilink structure
 */
export interface ParsedWikilink {
  /** Full link text as found in markdown */
  fullText: string;
  
  /** Note title being linked to */
  noteTitle: string;
  
  /** Optional heading within the note (for #heading links) */
  heading?: string;
  
  /** Optional block ID (for ^blockId links) */
  blockId?: string;
  
  /** Position in the source text */
  position: {
    start: number;
    end: number;
  };
}

// ===== Task-Note Relation Entity =====

/**
 * Task-Note relation type enumeration
 */
export enum TaskNoteRelationType {
  /** Task refers to a note for context */
  REFERENCE = 'reference',
  
  /** Task is defined/specified by a note */
  SPEC = 'spec',
  
  /** Task came from meeting notes */
  MEETING = 'meeting',
  
  /** Note contains evidence of task completion */
  EVIDENCE = 'evidence',
  
  /** Task was derived/extracted from note content by AI */
  DERIVED = 'derived',
}

/**
 * TaskNoteRelation entity - Connects tasks with notes
 * Enables the knowledge-action bridge
 */
export interface TaskNoteRelation {
  /** Unique identifier (UUID) */
  id: string;
  
  /** Task ID */
  taskId: number;
  
  /** Note ID */
  noteId: string;
  
  /** Type of relation */
  relationType: TaskNoteRelationType;
  
  /** Created timestamp */
  createdAt: string;
}

// ===== Note Operations =====

/**
 * Parameters for creating a new note
 */
export interface CreateNoteParams {
  /** Note title */
  title: string;
  
  /** Optional folder path */
  folderPath?: string;
  
  /** Markdown content */
  contentMarkdown?: string;
  
  /** Frontmatter metadata */
  frontmatter?: NoteFrontmatter;
  
  /** User creating the note */
  createdBy?: number;
}

/**
 * Parameters for updating a note
 */
export interface UpdateNoteParams {
  /** Note ID */
  id: string;
  
  /** Updated title */
  title?: string;
  
  /** Updated folder path */
  folderPath?: string;
  
  /** Updated markdown content */
  contentMarkdown?: string;
  
  /** Updated frontmatter */
  frontmatter?: NoteFrontmatter;
}

/**
 * Parameters for creating a task-note relation
 */
export interface CreateTaskNoteRelationParams {
  /** Task ID */
  taskId: number;
  
  /** Note ID */
  noteId: string;
  
  /** Relation type */
  relationType: TaskNoteRelationType;
}

// ===== Query Results =====

/**
 * Backlink item with context snippet (Phase C)
 */
export interface BacklinkItem {
  /** ID of the source note */
  sourceNoteId: string;
  
  /** Title of the source note */
  sourceNoteTitle: string;
  
  /** Type of link */
  linkType: NoteLinkType;
  
  /** Context snippet showing where the link appears (~40-80 chars around link) */
  snippet: string;
  
  /** Optional position of the link in the source note */
  position?: number;
}

/**
 * Note with backlinks (incoming links)
 */
export interface NoteWithBacklinks extends Note {
  /** Array of notes that link to this note */
  backlinks: Array<{
    noteId: string;
    noteTitle: string;
    linkType: NoteLinkType;
  }>;
}

/**
 * Note with outgoing links
 */
export interface NoteWithLinks extends Note {
  /** Array of links from this note */
  links: NoteLink[];
}

/**
 * Note with related tasks
 */
export interface NoteWithTasks extends Note {
  /** Array of related tasks */
  relatedTasks: Array<{
    taskId: number;
    taskTitle: string;
    relationType: TaskNoteRelationType;
  }>;
}

/**
 * Full note context (with backlinks, links, and tasks)
 */
export interface NoteFullContext extends Note {
  /** Incoming links (backlinks) */
  backlinks: Array<{
    noteId: string;
    noteTitle: string;
    linkType: NoteLinkType;
  }>;
  
  /** Outgoing links */
  links: NoteLink[];
  
  /** Related tasks */
  relatedTasks: Array<{
    taskId: number;
    taskTitle: string;
    relationType: TaskNoteRelationType;
  }>;
}

/**
 * Note with backlinks including context snippets (Phase C)
 */
export interface NoteWithBacklinkSnippets extends Note {
  /** Array of backlinks with context snippets */
  backlinks: BacklinkItem[];
}

// ===== Link Resolution =====

/**
 * Link resolution result
 */
export interface LinkResolutionResult {
  /** Whether the link was resolved */
  resolved: boolean;
  
  /** Target note ID (if resolved) */
  targetNoteId?: string;
  
  /** Target note title (if resolved) */
  targetNoteTitle?: string;
  
  /** Unresolved link text (if not resolved) */
  unresolvedTarget?: string;
}

// ===== Markdown Processing =====

/**
 * Result of markdown link extraction
 */
export interface MarkdownLinkExtractionResult {
  /** All parsed wikilinks found in the markdown */
  wikilinks: ParsedWikilink[];
  
  /** Count of total links */
  totalLinks: number;
  
  /** Count of unresolved links */
  unresolvedCount: number;
}

// ===== Unified Search (Phase D) =====

/**
 * Unified search result item (for notes and tasks)
 */
export interface SearchResult {
  /** Unique identifier */
  id: string;
  
  /** Type of result */
  type: 'note' | 'task';
  
  /** Title of the note or task */
  title: string;
  
  /** Context snippet showing where the match occurs */
  snippet: string;
  
  /** Optional related entities */
  related?: {
    notes?: string[];
    tasks?: string[];
  };
  
  /** Search relevance score (higher is better) */
  score?: number;
}

/**
 * Options for unified search
 */
export interface UnifiedSearchOptions {
  /** Maximum number of results to return */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
  
  /** Filter to specific types */
  types?: Array<'note' | 'task'>;
  
  /** Include related entities in results */
  includeRelated?: boolean;
}

// ===== Graph Intelligence (Phase E) =====

/**
 * Note summary for graph queries
 */
export interface NoteSummary {
  /** Note ID */
  id: string;
  
  /** Note title */
  title: string;
  
  /** Optional folder path */
  folderPath?: string | null;
}

/**
 * Graph node with depth information
 */
export interface GraphNode {
  /** Note ID */
  noteId: string;
  
  /** Note title */
  title: string;
  
  /** Depth level from origin (0 = origin) */
  depth: number;
}

/**
 * Graph edge representing a link
 */
export interface GraphEdge {
  /** Source note ID */
  sourceNoteId: string;
  
  /** Target note ID */
  targetNoteId: string;
  
  /** Link type */
  linkType: NoteLinkType;
}

/**
 * Unresolved link (missing note)
 */
export interface UnresolvedLink {
  /** Source note ID that contains the unresolved link */
  sourceNoteId: string;
  
  /** Missing note title */
  missingTitle: string;
  
  /** Number of occurrences of this unresolved link */
  count: number;
}

/**
 * Result of neighbor traversal
 */
export interface NeighborsResult {
  /** Graph nodes at each depth level */
  nodes: GraphNode[];
  
  /** Edges between nodes */
  edges: GraphEdge[];
}

// ===== Daily Notes (Phase F) =====

/**
 * Daily note template
 */
export interface DailyNoteTemplate {
  /** Template content with variables */
  content: string;
  
  /** Frontmatter template */
  frontmatter?: NoteFrontmatter;
}

/**
 * Template variables
 */
export interface TemplateVariables {
  /** Current date in YYYY-MM-DD format */
  date: string;
  
  /** Day of week (e.g., "Monday") */
  weekday: string;
  
  /** Custom variables */
  [key: string]: string;
}

// ===== Database Row Types =====

/**
 * Database row type for notes table
 */
export interface NoteRow {
  id: string;
  title: string;
  folder_path: string | null;
  content_markdown: string;
  frontmatter: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for note_links table
 */
export interface NoteLinkRow {
  id: string;
  source_note_id: string;
  target_note_id: string | null;
  unresolved_target: string | null;
  link_type: string;
  created_at: string;
}

/**
 * Database row type for task_note_relations table
 */
export interface TaskNoteRelationRow {
  id: string;
  task_id: number;
  note_id: string;
  relation_type: string;
  created_at: string;
}
