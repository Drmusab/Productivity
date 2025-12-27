import { z } from 'zod';

/**
 * Core type definitions for Productivity OS
 * All types use Zod for runtime validation
 */

// =====================================================
// Note Types
// =====================================================

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string(),
  path: z.string(),
  frontmatter: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]), // Outgoing wikilinks
  backlinks: z.array(z.string()).default([]), // Incoming wikilinks
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export type Note = z.infer<typeof NoteSchema>;

// =====================================================
// Block Types (Notion-style)
// =====================================================

export const BlockTypeSchema = z.enum([
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'todo',
  'bulletList',
  'numberedList',
  'quote',
  'code',
  'callout',
  'embed',
  'divider',
]);

export type BlockType = z.infer<typeof BlockTypeSchema>;

export const BlockSchema = z.object({
  id: z.string().uuid(),
  type: BlockTypeSchema,
  content: z.string(),
  properties: z.record(z.unknown()).optional(),
  parentId: z.string().uuid().nullable(),
  noteId: z.string().uuid(),
  order: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Block = z.infer<typeof BlockSchema>;

// =====================================================
// Wikilink Types
// =====================================================

export const WikilinkSchema = z.object({
  text: z.string(), // Display text
  target: z.string(), // Target note title/path
  alias: z.string().optional(), // Optional alias
  blockRef: z.string().optional(), // Block reference if linking to specific block
});

export type Wikilink = z.infer<typeof WikilinkSchema>;

// =====================================================
// Frontmatter Types
// =====================================================

export const FrontmatterSchema = z.object({
  title: z.string().optional(),
  tags: z.array(z.string()).optional(),
  date: z.string().optional(),
  author: z.string().optional(),
  template: z.string().optional(),
  // Allow additional custom fields
}).passthrough();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// =====================================================
// Task Types
// =====================================================

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'cancelled']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  tags: z.array(z.string()).default([]),
  noteId: z.string().uuid().nullable().optional(), // Link to note
  blockId: z.string().uuid().nullable().optional(), // Link to block
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof TaskSchema>;

// =====================================================
// Graph Types
// =====================================================

export const GraphNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['note', 'tag']),
  weight: z.number().default(1), // Number of connections
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(['wikilink', 'tag', 'backlink']),
  weight: z.number().default(1),
});

export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type Graph = z.infer<typeof GraphSchema>;

// =====================================================
// Command Palette Types
// =====================================================

export const CommandSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  keywords: z.array(z.string()).default([]),
  handler: z.function().args(z.any()).returns(z.promise(z.void())),
  shortcut: z.string().optional(), // e.g., "Cmd+K"
});

export type Command = z.infer<typeof CommandSchema>;

// =====================================================
// Sync Types (CRDT)
// =====================================================

export const OperationTypeSchema = z.enum(['insert', 'delete', 'update']);
export type OperationType = z.infer<typeof OperationTypeSchema>;

export const SyncOperationSchema = z.object({
  id: z.string().uuid(),
  type: OperationTypeSchema,
  entityType: z.string(), // 'note', 'block', 'task', etc.
  entityId: z.string().uuid(),
  timestamp: z.number(), // Lamport timestamp
  data: z.record(z.unknown()),
  clientId: z.string().uuid(),
});

export type SyncOperation = z.infer<typeof SyncOperationSchema>;

// =====================================================
// Export all schemas
// =====================================================

export const schemas = {
  Note: NoteSchema,
  Block: BlockSchema,
  Wikilink: WikilinkSchema,
  Frontmatter: FrontmatterSchema,
  Task: TaskSchema,
  GraphNode: GraphNodeSchema,
  GraphEdge: GraphEdgeSchema,
  Graph: GraphSchema,
  Command: CommandSchema,
  SyncOperation: SyncOperationSchema,
};
