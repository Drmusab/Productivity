/**
 * @fileoverview Block-Based Architecture Type Definitions
 * 
 * This file defines the core types for a flexible, extensible block-based architecture
 * where everything in the application is represented as a block.
 * 
 * Design Principles:
 * 1. Everything is a Block - Pages, rows, cells, Kanban cards, AI outputs
 * 2. Tree-Based Structure - Blocks form a directed tree with parent-child relationships
 * 3. Block Type Isolation - Each block type has its own data interface
 * 4. Extensibility First - New block types can be added without modifying core logic
 * 5. Immutability Friendly - Supports history, undo/redo, collaboration
 */

// ===== Base Block Types =====

/**
 * Base interface that ALL blocks must implement.
 * This ensures consistent structure across all block types.
 */
export interface BaseBlock {
  /** Globally unique identifier (UUID) */
  id: string;
  
  /** Block type discriminator */
  type: BlockType;
  
  /** Ordered list of child block IDs */
  children: string[];
  
  /** Reference to parent block (null for root blocks) */
  parentId: string | null;
  
  /** Timestamp when block was created */
  createdAt: string;
  
  /** Timestamp when block was last updated */
  updatedAt: string;
  
  /** Version number for future migrations */
  version: number;
  
  /** Additional metadata for permissions, AI hints, UI state */
  metadata: BlockMetadata;
}

/**
 * Metadata attached to every block
 */
export interface BlockMetadata {
  /** User permissions for this block */
  permissions?: {
    canEdit?: boolean;
    canDelete?: boolean;
    canMove?: boolean;
    canShare?: boolean;
  };
  
  /** AI-specific hints and context */
  aiHints?: {
    isAIGenerated?: boolean;
    aiModel?: string;
    confidence?: number;
    prompt?: string;
  };
  
  /** UI-specific state (collapsed, selected, etc.) */
  uiState?: {
    isCollapsed?: boolean;
    isSelected?: boolean;
    isHidden?: boolean;
    position?: { x: number; y: number };
  };
  
  /** Custom metadata (extensible) */
  custom?: Record<string, unknown>;
}

// ===== Block Type Enumeration =====

/**
 * All supported block types.
 * This is the single source of truth for block types.
 */
export enum BlockType {
  // Content Blocks
  TEXT = 'text',
  HEADING = 'heading',
  TODO = 'todo',
  IMAGE = 'image',
  EMBED = 'embed',
  
  // Structure Blocks
  PAGE = 'page',
  ROW = 'row',
  COLUMN = 'column',
  
  // Kanban Blocks
  KANBAN_BOARD = 'kanban_board',
  KANBAN_COLUMN = 'kanban_column',
  KANBAN_CARD = 'kanban_card',
  KANBAN_SWIMLANE = 'kanban_swimlane',
  
  // Table Blocks
  TABLE = 'table',
  TABLE_ROW = 'table_row',
  TABLE_CELL = 'table_cell',
  
  // AI Blocks
  AI_BLOCK = 'ai_block',
  AI_CHAT = 'ai_chat',
  AI_SUGGESTION = 'ai_suggestion',
  
  // Database Blocks
  DATABASE = 'database',
  DB_ROW = 'db_row',
  
  // Other Blocks
  DIVIDER = 'divider',
  QUOTE = 'quote',
  CODE = 'code',
  LIST = 'list',
  LIST_ITEM = 'list_item',
}

// ===== Block Data Interfaces =====

/**
 * Text block - basic text content
 */
export interface TextBlockData {
  content: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  };
}

/**
 * Heading block - hierarchical headings
 */
export interface HeadingBlockData {
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Todo block - checkbox with text
 */
export interface TodoBlockData {
  content: string;
  completed: boolean;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Image block - embedded image
 */
export interface ImageBlockData {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

/**
 * Embed block - external content
 */
export interface EmbedBlockData {
  url: string;
  type: 'video' | 'audio' | 'document' | 'webpage' | 'other';
  title?: string;
  provider?: string;
}

/**
 * Page block - top-level container
 */
export interface PageBlockData {
  title: string;
  icon?: string;
  cover?: string;
  description?: string;
}

/**
 * Row block - horizontal layout
 */
export interface RowBlockData {
  alignment?: 'left' | 'center' | 'right';
  spacing?: number;
}

/**
 * Column block - vertical layout within a row
 */
export interface ColumnBlockData {
  width?: number | string; // e.g., 300 or "50%"
}

/**
 * Kanban Board block - represents a full Kanban board
 */
export interface KanbanBoardBlockData {
  name: string;
  description?: string;
  isActive?: boolean;
  template?: string;
}

/**
 * Kanban Column block - vertical swimlane in Kanban
 */
export interface KanbanColumnBlockData {
  name: string;
  color?: string;
  icon?: string;
  wipLimit?: number | null;
  isDone?: boolean;
}

/**
 * Kanban Card block - individual task card
 */
export interface KanbanCardBlockData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string | null;
  assignedTo?: number | null;
  tags?: string[];
  estimatedHours?: number | null;
  completedAt?: string | null;
  archived?: boolean;
}

/**
 * Kanban Swimlane block - horizontal grouping
 */
export interface KanbanSwimlaneBlockData {
  name: string;
  color?: string;
}

/**
 * Table block - spreadsheet-like table
 */
export interface TableBlockData {
  caption?: string;
  hasHeader?: boolean;
}

/**
 * Table Row block - single row in a table
 */
export interface TableRowBlockData {
  isHeader?: boolean;
}

/**
 * Table Cell block - single cell in a table
 */
export interface TableCellBlockData {
  content: string;
  alignment?: 'left' | 'center' | 'right';
  colSpan?: number;
  rowSpan?: number;
}

/**
 * AI Block - generic AI-generated content
 */
export interface AIBlockData {
  prompt: string;
  response: string;
  model?: string;
  timestamp?: string;
  confidence?: number;
}

/**
 * AI Chat block - conversational AI interface
 */
export interface AIChatBlockData {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  model?: string;
}

/**
 * AI Suggestion block - AI-powered suggestions
 */
export interface AISuggestionBlockData {
  suggestion: string;
  reason: string;
  confidence: number;
  accepted?: boolean;
}

/**
 * Divider block - visual separator
 */
export interface DividerBlockData {
  style?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Quote block - blockquote
 */
export interface QuoteBlockData {
  content: string;
  author?: string;
  source?: string;
}

/**
 * Code block - syntax-highlighted code
 */
export interface CodeBlockData {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
}

/**
 * List block - ordered or unordered list
 */
export interface ListBlockData {
  ordered: boolean;
}

/**
 * List Item block - item within a list
 */
export interface ListItemBlockData {
  content: string;
}

/**
 * Database block - container for a universal database
 */
export interface DatabaseBlockData {
  name: string;
  description?: string;
  icon?: string;
  /** Stored as JSON string in block data */
  properties: string;  // JSON.stringify(Property[])
  defaultViewId?: string;
}

/**
 * Database Row block - single row in a database
 */
export interface DatabaseRowBlockData {
  /** Database ID this row belongs to */
  databaseId: string;
  
  /** Property values indexed by property ID, stored as JSON string */
  values: string;  // JSON.stringify(Record<string, PropertyValue>)
  
  /** Row-level metadata */
  archived?: boolean;
  pinned?: boolean;
}

// ===== Concrete Block Types =====

/**
 * Union type mapping block types to their data interfaces.
 * This ensures type safety when working with specific block types.
 */
export type Block =
  | (BaseBlock & { type: BlockType.TEXT; data: TextBlockData })
  | (BaseBlock & { type: BlockType.HEADING; data: HeadingBlockData })
  | (BaseBlock & { type: BlockType.TODO; data: TodoBlockData })
  | (BaseBlock & { type: BlockType.IMAGE; data: ImageBlockData })
  | (BaseBlock & { type: BlockType.EMBED; data: EmbedBlockData })
  | (BaseBlock & { type: BlockType.PAGE; data: PageBlockData })
  | (BaseBlock & { type: BlockType.ROW; data: RowBlockData })
  | (BaseBlock & { type: BlockType.COLUMN; data: ColumnBlockData })
  | (BaseBlock & { type: BlockType.KANBAN_BOARD; data: KanbanBoardBlockData })
  | (BaseBlock & { type: BlockType.KANBAN_COLUMN; data: KanbanColumnBlockData })
  | (BaseBlock & { type: BlockType.KANBAN_CARD; data: KanbanCardBlockData })
  | (BaseBlock & { type: BlockType.KANBAN_SWIMLANE; data: KanbanSwimlaneBlockData })
  | (BaseBlock & { type: BlockType.TABLE; data: TableBlockData })
  | (BaseBlock & { type: BlockType.TABLE_ROW; data: TableRowBlockData })
  | (BaseBlock & { type: BlockType.TABLE_CELL; data: TableCellBlockData })
  | (BaseBlock & { type: BlockType.AI_BLOCK; data: AIBlockData })
  | (BaseBlock & { type: BlockType.AI_CHAT; data: AIChatBlockData })
  | (BaseBlock & { type: BlockType.AI_SUGGESTION; data: AISuggestionBlockData })
  | (BaseBlock & { type: BlockType.DATABASE; data: DatabaseBlockData })
  | (BaseBlock & { type: BlockType.DB_ROW; data: DatabaseRowBlockData })
  | (BaseBlock & { type: BlockType.DIVIDER; data: DividerBlockData })
  | (BaseBlock & { type: BlockType.QUOTE; data: QuoteBlockData })
  | (BaseBlock & { type: BlockType.CODE; data: CodeBlockData })
  | (BaseBlock & { type: BlockType.LIST; data: ListBlockData })
  | (BaseBlock & { type: BlockType.LIST_ITEM; data: ListItemBlockData });

// ===== Block Tree Types =====

/**
 * Represents a complete block tree structure.
 * Used for serialization and storage.
 */
export interface BlockTree {
  /** Root block IDs (top-level blocks without parents) */
  roots: string[];
  
  /** Map of block ID to block data */
  blocks: Record<string, Block>;
  
  /** Tree metadata */
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
  };
}

// ===== Operation Types =====

/**
 * Block creation parameters
 */
export interface CreateBlockParams<T extends BlockType> {
  type: T;
  data: Extract<Block, { type: T }>['data'];
  parentId?: string | null;
  position?: number;
  metadata?: Partial<BlockMetadata>;
}

/**
 * Block update parameters
 */
export interface UpdateBlockParams {
  id: string;
  data?: Partial<Block['data']>;
  metadata?: Partial<BlockMetadata>;
}

/**
 * Block move parameters
 */
export interface MoveBlockParams {
  id: string;
  newParentId: string | null;
  position?: number;
}

/**
 * Block delete parameters
 */
export interface DeleteBlockParams {
  id: string;
  deleteChildren?: boolean;
}

/**
 * Block duplicate parameters
 */
export interface DuplicateBlockParams {
  id: string;
  duplicateChildren?: boolean;
}

// ===== Validation Types =====

/**
 * Block validation result
 */
export interface BlockValidationResult {
  valid: boolean;
  errors: BlockValidationError[];
}

/**
 * Block validation error
 */
export interface BlockValidationError {
  field: string;
  message: string;
  code: string;
}

// ===== Query Types =====

/**
 * Block query options
 */
export interface BlockQueryOptions {
  type?: BlockType | BlockType[];
  parentId?: string | null;
  depth?: number;
  includeChildren?: boolean;
  includeMetadata?: boolean;
}

/**
 * Block search options
 */
export interface BlockSearchOptions extends BlockQueryOptions {
  query?: string;
  limit?: number;
  offset?: number;
}
