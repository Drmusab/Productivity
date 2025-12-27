/**
 * @fileoverview Block Schema Definitions
 * 
 * Defines schemas for all built-in block types.
 * Each schema includes validation rules and default data.
 */

import {
  BlockType,
  TextBlockData,
  HeadingBlockData,
  TodoBlockData,
  ImageBlockData,
  EmbedBlockData,
  PageBlockData,
  RowBlockData,
  ColumnBlockData,
  KanbanBoardBlockData,
  KanbanColumnBlockData,
  KanbanCardBlockData,
  KanbanSwimlaneBlockData,
  TableBlockData,
  TableRowBlockData,
  TableCellBlockData,
  AIBlockData,
  AIChatBlockData,
  AISuggestionBlockData,
  DividerBlockData,
  QuoteBlockData,
  CodeBlockData,
  ListBlockData,
  ListItemBlockData,
  DatabaseBlockData,
  DatabaseRowBlockData,
} from '../types/blocks';

import {
  BlockSchema,
  createValidationResult,
  validateRequired,
  validateString,
  validateNumber,
  validateBoolean,
  validateEnum,
} from './blockRegistry';

// ===== Content Block Schemas =====

export const textBlockSchema: BlockSchema<BlockType.TEXT> = {
  type: BlockType.TEXT,
  name: 'Text',
  description: 'Basic text content with optional formatting',
  category: 'content',
  canHaveChildren: false,
  defaultData: {
    content: '',
  },
  validate: (data: TextBlockData) => {
    const errors = [];
    const contentError = validateRequired(data.content, 'content');
    if (contentError) errors.push(contentError);
    return createValidationResult(errors);
  },
};

export const headingBlockSchema: BlockSchema<BlockType.HEADING> = {
  type: BlockType.HEADING,
  name: 'Heading',
  description: 'Hierarchical heading (H1-H6)',
  category: 'content',
  canHaveChildren: false,
  defaultData: {
    content: '',
    level: 1,
  },
  validate: (data: HeadingBlockData) => {
    const errors = [];
    const contentError = validateRequired(data.content, 'content');
    if (contentError) errors.push(contentError);
    
    const levelError = validateEnum(data.level, 'level', [1, 2, 3, 4, 5, 6]);
    if (levelError) errors.push(levelError);
    
    return createValidationResult(errors);
  },
};

export const todoBlockSchema: BlockSchema<BlockType.TODO> = {
  type: BlockType.TODO,
  name: 'Todo',
  description: 'Checkbox with text for task tracking',
  category: 'content',
  canHaveChildren: false,
  defaultData: {
    content: '',
    completed: false,
  },
  validate: (data: TodoBlockData) => {
    const errors = [];
    const contentError = validateRequired(data.content, 'content');
    if (contentError) errors.push(contentError);
    
    const completedError = validateBoolean(data.completed, 'completed');
    if (completedError) errors.push(completedError);
    
    if (data.priority) {
      const priorityError = validateEnum(data.priority, 'priority', [
        'low', 'medium', 'high', 'critical'
      ]);
      if (priorityError) errors.push(priorityError);
    }
    
    return createValidationResult(errors);
  },
};

export const imageBlockSchema: BlockSchema<BlockType.IMAGE> = {
  type: BlockType.IMAGE,
  name: 'Image',
  description: 'Embedded image with caption',
  category: 'content',
  canHaveChildren: false,
  defaultData: {
    url: '',
  },
  validate: (data: ImageBlockData) => {
    const errors = [];
    const urlError = validateRequired(data.url, 'url');
    if (urlError) errors.push(urlError);
    
    if (data.width !== undefined) {
      const widthError = validateNumber(data.width, 'width', { min: 0 });
      if (widthError) errors.push(widthError);
    }
    
    if (data.height !== undefined) {
      const heightError = validateNumber(data.height, 'height', { min: 0 });
      if (heightError) errors.push(heightError);
    }
    
    return createValidationResult(errors);
  },
};

export const embedBlockSchema: BlockSchema<BlockType.EMBED> = {
  type: BlockType.EMBED,
  name: 'Embed',
  description: 'Embedded external content',
  category: 'content',
  canHaveChildren: false,
  defaultData: {
    url: '',
    type: 'webpage',
  },
  validate: (data: EmbedBlockData) => {
    const errors = [];
    const urlError = validateRequired(data.url, 'url');
    if (urlError) errors.push(urlError);
    
    const typeError = validateEnum(data.type, 'type', [
      'video', 'audio', 'document', 'webpage', 'other'
    ]);
    if (typeError) errors.push(typeError);
    
    return createValidationResult(errors);
  },
};

// ===== Structure Block Schemas =====

export const pageBlockSchema: BlockSchema<BlockType.PAGE> = {
  type: BlockType.PAGE,
  name: 'Page',
  description: 'Top-level container for content',
  category: 'structure',
  canHaveChildren: true,
  defaultData: {
    title: 'Untitled Page',
  },
  validate: (data: PageBlockData) => {
    const errors = [];
    const titleError = validateRequired(data.title, 'title');
    if (titleError) errors.push(titleError);
    return createValidationResult(errors);
  },
};

export const rowBlockSchema: BlockSchema<BlockType.ROW> = {
  type: BlockType.ROW,
  name: 'Row',
  description: 'Horizontal layout container',
  category: 'structure',
  canHaveChildren: true,
  allowedChildren: [BlockType.COLUMN],
  defaultData: {},
  validate: (data: RowBlockData) => {
    const errors = [];
    if (data.alignment) {
      const alignError = validateEnum(data.alignment, 'alignment', [
        'left', 'center', 'right'
      ]);
      if (alignError) errors.push(alignError);
    }
    return createValidationResult(errors);
  },
};

export const columnBlockSchema: BlockSchema<BlockType.COLUMN> = {
  type: BlockType.COLUMN,
  name: 'Column',
  description: 'Vertical layout within a row',
  category: 'structure',
  canHaveChildren: true,
  allowedParents: [BlockType.ROW],
  defaultData: {},
  validate: (data: ColumnBlockData) => {
    return createValidationResult([]);
  },
};

// ===== Kanban Block Schemas =====

export const kanbanBoardBlockSchema: BlockSchema<BlockType.KANBAN_BOARD> = {
  type: BlockType.KANBAN_BOARD,
  name: 'Kanban Board',
  description: 'Full Kanban board container',
  category: 'kanban',
  canHaveChildren: true,
  allowedChildren: [BlockType.KANBAN_COLUMN, BlockType.KANBAN_SWIMLANE],
  defaultData: {
    name: 'New Board',
  },
  validate: (data: KanbanBoardBlockData) => {
    const errors = [];
    const nameError = validateRequired(data.name, 'name');
    if (nameError) errors.push(nameError);
    return createValidationResult(errors);
  },
};

export const kanbanColumnBlockSchema: BlockSchema<BlockType.KANBAN_COLUMN> = {
  type: BlockType.KANBAN_COLUMN,
  name: 'Kanban Column',
  description: 'Vertical column in Kanban board',
  category: 'kanban',
  canHaveChildren: true,
  allowedParents: [BlockType.KANBAN_BOARD],
  allowedChildren: [BlockType.KANBAN_CARD],
  defaultData: {
    name: 'New Column',
  },
  validate: (data: KanbanColumnBlockData) => {
    const errors = [];
    const nameError = validateRequired(data.name, 'name');
    if (nameError) errors.push(nameError);
    
    if (data.wipLimit !== undefined && data.wipLimit !== null) {
      const wipError = validateNumber(data.wipLimit, 'wipLimit', { min: 0, integer: true });
      if (wipError) errors.push(wipError);
    }
    
    return createValidationResult(errors);
  },
};

export const kanbanCardBlockSchema: BlockSchema<BlockType.KANBAN_CARD> = {
  type: BlockType.KANBAN_CARD,
  name: 'Kanban Card',
  description: 'Individual task card in Kanban',
  category: 'kanban',
  canHaveChildren: true,
  allowedParents: [BlockType.KANBAN_COLUMN],
  defaultData: {
    title: 'New Task',
  },
  validate: (data: KanbanCardBlockData) => {
    const errors = [];
    const titleError = validateRequired(data.title, 'title');
    if (titleError) errors.push(titleError);
    
    if (data.priority) {
      const priorityError = validateEnum(data.priority, 'priority', [
        'low', 'medium', 'high', 'critical'
      ]);
      if (priorityError) errors.push(priorityError);
    }
    
    if (data.estimatedHours !== undefined && data.estimatedHours !== null) {
      const hoursError = validateNumber(data.estimatedHours, 'estimatedHours', { min: 0 });
      if (hoursError) errors.push(hoursError);
    }
    
    return createValidationResult(errors);
  },
};

export const kanbanSwimlaneBlockSchema: BlockSchema<BlockType.KANBAN_SWIMLANE> = {
  type: BlockType.KANBAN_SWIMLANE,
  name: 'Kanban Swimlane',
  description: 'Horizontal grouping in Kanban',
  category: 'kanban',
  canHaveChildren: true,
  allowedParents: [BlockType.KANBAN_BOARD],
  allowedChildren: [BlockType.KANBAN_CARD],
  defaultData: {
    name: 'New Swimlane',
  },
  validate: (data: KanbanSwimlaneBlockData) => {
    const errors = [];
    const nameError = validateRequired(data.name, 'name');
    if (nameError) errors.push(nameError);
    return createValidationResult(errors);
  },
};

// ===== Table Block Schemas =====

export const tableBlockSchema: BlockSchema<BlockType.TABLE> = {
  type: BlockType.TABLE,
  name: 'Table',
  description: 'Spreadsheet-like table',
  category: 'table',
  canHaveChildren: true,
  allowedChildren: [BlockType.TABLE_ROW],
  defaultData: {},
  validate: (data: TableBlockData) => {
    return createValidationResult([]);
  },
};

export const tableRowBlockSchema: BlockSchema<BlockType.TABLE_ROW> = {
  type: BlockType.TABLE_ROW,
  name: 'Table Row',
  description: 'Single row in a table',
  category: 'table',
  canHaveChildren: true,
  allowedParents: [BlockType.TABLE],
  allowedChildren: [BlockType.TABLE_CELL],
  defaultData: {},
  validate: (data: TableRowBlockData) => {
    return createValidationResult([]);
  },
};

export const tableCellBlockSchema: BlockSchema<BlockType.TABLE_CELL> = {
  type: BlockType.TABLE_CELL,
  name: 'Table Cell',
  description: 'Single cell in a table',
  category: 'table',
  canHaveChildren: false,
  allowedParents: [BlockType.TABLE_ROW],
  defaultData: {
    content: '',
  },
  validate: (data: TableCellBlockData) => {
    const errors = [];
    const contentError = validateRequired(data.content, 'content');
    if (contentError) errors.push(contentError);
    
    if (data.alignment) {
      const alignError = validateEnum(data.alignment, 'alignment', [
        'left', 'center', 'right'
      ]);
      if (alignError) errors.push(alignError);
    }
    
    return createValidationResult(errors);
  },
};

// ===== AI Block Schemas =====

export const aiBlockSchema: BlockSchema<BlockType.AI_BLOCK> = {
  type: BlockType.AI_BLOCK,
  name: 'AI Block',
  description: 'AI-generated content',
  category: 'ai',
  canHaveChildren: false,
  defaultData: {
    prompt: '',
    response: '',
  },
  validate: (data: AIBlockData) => {
    const errors = [];
    const promptError = validateRequired(data.prompt, 'prompt');
    if (promptError) errors.push(promptError);
    
    const responseError = validateRequired(data.response, 'response');
    if (responseError) errors.push(responseError);
    
    if (data.confidence !== undefined) {
      const confError = validateNumber(data.confidence, 'confidence', { min: 0, max: 1 });
      if (confError) errors.push(confError);
    }
    
    return createValidationResult(errors);
  },
};

export const aiChatBlockSchema: BlockSchema<BlockType.AI_CHAT> = {
  type: BlockType.AI_CHAT,
  name: 'AI Chat',
  description: 'Conversational AI interface',
  category: 'ai',
  canHaveChildren: false,
  defaultData: {
    messages: [],
  },
  validate: (data: AIChatBlockData) => {
    const errors = [];
    if (!Array.isArray(data.messages)) {
      errors.push({
        field: 'messages',
        message: 'messages must be an array',
        code: 'INVALID_TYPE',
      });
    }
    return createValidationResult(errors);
  },
};

export const aiSuggestionBlockSchema: BlockSchema<BlockType.AI_SUGGESTION> = {
  type: BlockType.AI_SUGGESTION,
  name: 'AI Suggestion',
  description: 'AI-powered suggestions',
  category: 'ai',
  canHaveChildren: false,
  defaultData: {
    suggestion: '',
    reason: '',
    confidence: 0.5,
  },
  validate: (data: AISuggestionBlockData) => {
    const errors = [];
    const suggestionError = validateRequired(data.suggestion, 'suggestion');
    if (suggestionError) errors.push(suggestionError);
    
    const reasonError = validateRequired(data.reason, 'reason');
    if (reasonError) errors.push(reasonError);
    
    const confError = validateNumber(data.confidence, 'confidence', { min: 0, max: 1 });
    if (confError) errors.push(confError);
    
    return createValidationResult(errors);
  },
};

// ===== Other Block Schemas =====

export const dividerBlockSchema: BlockSchema<BlockType.DIVIDER> = {
  type: BlockType.DIVIDER,
  name: 'Divider',
  description: 'Visual separator',
  category: 'other',
  canHaveChildren: false,
  defaultData: {},
  validate: (data: DividerBlockData) => {
    return createValidationResult([]);
  },
};

export const quoteBlockSchema: BlockSchema<BlockType.QUOTE> = {
  type: BlockType.QUOTE,
  name: 'Quote',
  description: 'Blockquote for citations',
  category: 'other',
  canHaveChildren: false,
  defaultData: {
    content: '',
  },
  validate: (data: QuoteBlockData) => {
    const errors = [];
    const contentError = validateRequired(data.content, 'content');
    if (contentError) errors.push(contentError);
    return createValidationResult(errors);
  },
};

export const codeBlockSchema: BlockSchema<BlockType.CODE> = {
  type: BlockType.CODE,
  name: 'Code',
  description: 'Syntax-highlighted code block',
  category: 'other',
  canHaveChildren: false,
  defaultData: {
    content: '',
  },
  validate: (data: CodeBlockData) => {
    const errors = [];
    const contentError = validateRequired(data.content, 'content');
    if (contentError) errors.push(contentError);
    return createValidationResult(errors);
  },
};

export const listBlockSchema: BlockSchema<BlockType.LIST> = {
  type: BlockType.LIST,
  name: 'List',
  description: 'Ordered or unordered list',
  category: 'other',
  canHaveChildren: true,
  allowedChildren: [BlockType.LIST_ITEM],
  defaultData: {
    ordered: false,
  },
  validate: (data: ListBlockData) => {
    const errors = [];
    const orderedError = validateBoolean(data.ordered, 'ordered');
    if (orderedError) errors.push(orderedError);
    return createValidationResult(errors);
  },
};

export const listItemBlockSchema: BlockSchema<BlockType.LIST_ITEM> = {
  type: BlockType.LIST_ITEM,
  name: 'List Item',
  description: 'Item within a list',
  category: 'other',
  canHaveChildren: true,
  allowedParents: [BlockType.LIST, BlockType.LIST_ITEM],
  defaultData: {
    content: '',
  },
  validate: (data: ListItemBlockData) => {
    const errors = [];
    const contentError = validateRequired(data.content, 'content');
    if (contentError) errors.push(contentError);
    return createValidationResult(errors);
  },
};

// ===== Database Block Schemas =====

export const databaseBlockSchema: BlockSchema<BlockType.DATABASE> = {
  type: BlockType.DATABASE,
  name: 'Database',
  description: 'Universal database with schema and views',
  category: 'other',
  canHaveChildren: true,
  allowedChildren: [BlockType.DB_ROW],
  defaultData: {
    name: 'New Database',
    properties: '[]',
  },
  validate: (data: DatabaseBlockData) => {
    const errors = [];
    const nameError = validateRequired(data.name, 'name');
    if (nameError) errors.push(nameError);
    
    const propertiesError = validateRequired(data.properties, 'properties');
    if (propertiesError) errors.push(propertiesError);
    
    // Validate properties is valid JSON
    try {
      JSON.parse(data.properties);
    } catch (e) {
      errors.push({
        field: 'properties',
        message: 'properties must be valid JSON',
        code: 'INVALID_JSON',
      });
    }
    
    return createValidationResult(errors);
  },
};

export const databaseRowBlockSchema: BlockSchema<BlockType.DB_ROW> = {
  type: BlockType.DB_ROW,
  name: 'Database Row',
  description: 'Single row in a database',
  category: 'other',
  canHaveChildren: true,
  allowedParents: [BlockType.DATABASE],
  defaultData: {
    databaseId: '',
    values: '{}',
  },
  validate: (data: DatabaseRowBlockData) => {
    const errors = [];
    const dbIdError = validateRequired(data.databaseId, 'databaseId');
    if (dbIdError) errors.push(dbIdError);
    
    const valuesError = validateRequired(data.values, 'values');
    if (valuesError) errors.push(valuesError);
    
    // Validate values is valid JSON
    try {
      JSON.parse(data.values);
    } catch (e) {
      errors.push({
        field: 'values',
        message: 'values must be valid JSON',
        code: 'INVALID_JSON',
      });
    }
    
    return createValidationResult(errors);
  },
};

// ===== Export All Schemas =====

export const allBlockSchemas = [
  textBlockSchema,
  headingBlockSchema,
  todoBlockSchema,
  imageBlockSchema,
  embedBlockSchema,
  pageBlockSchema,
  rowBlockSchema,
  columnBlockSchema,
  kanbanBoardBlockSchema,
  kanbanColumnBlockSchema,
  kanbanCardBlockSchema,
  kanbanSwimlaneBlockSchema,
  tableBlockSchema,
  tableRowBlockSchema,
  tableCellBlockSchema,
  aiBlockSchema,
  aiChatBlockSchema,
  aiSuggestionBlockSchema,
  databaseBlockSchema,
  databaseRowBlockSchema,
  dividerBlockSchema,
  quoteBlockSchema,
  codeBlockSchema,
  listBlockSchema,
  listItemBlockSchema,
];
