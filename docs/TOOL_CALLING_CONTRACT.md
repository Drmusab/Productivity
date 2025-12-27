# Tool Calling Contract

## Overview

This document defines the contract for AI tool calling - how the AI system can safely and controllably interact with the workspace through a well-defined set of tools.

---

## 1. Core Principles

### 1.1 Tool Calling Rules

1. **Explicit** - All tool calls are visible and logged
2. **Validated** - Input/output schemas enforced
3. **Permission-Aware** - Respects user permissions
4. **Auditable** - Complete audit trail
5. **Reversible** - Undo data captured for mutations
6. **Confirmable** - Destructive actions require confirmation

### 1.2 Tool Categories

| Category | Description | Confirmation Required |
|----------|-------------|----------------------|
| Read | Query/search operations | No |
| Create | Add new content | No |
| Update | Modify existing content | No* |
| Delete | Remove content | Yes |
| Execute | Trigger automations | Depends on rule |

*Update operations on critical fields may require confirmation.

---

## 2. Tool Definition Schema

### 2.1 Tool Interface

```typescript
interface AITool {
  // Unique identifier
  id: string;
  
  // Human-readable name
  name: string;
  
  // Detailed description for AI
  description: string;
  
  // Tool category
  category: 'read' | 'create' | 'update' | 'delete' | 'execute';
  
  // Input parameter schema (JSON Schema)
  parameters: JSONSchema;
  
  // Return value schema
  returns: JSONSchema;
  
  // Required permissions
  requiredPermissions: Permission[];
  
  // Whether to require user confirmation
  requiresConfirmation: boolean | ConfirmationRule;
  
  // Example usages for AI
  examples: ToolExample[];
  
  // Execute the tool
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

interface ToolContext {
  // User making the request
  user: User;
  
  // Request metadata
  requestId: string;
  timestamp: string;
  
  // Conversation context (for chat)
  conversationId?: string;
  
  // Budget remaining
  budget: ToolBudget;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: ToolError;
  
  // For mutations: data needed to undo
  undoData?: any;
  
  // Blocks affected
  affectedBlocks?: string[];
  
  // Tokens consumed
  tokensUsed?: number;
}
```

### 2.2 Permission Model

```typescript
enum Permission {
  // Block permissions
  BLOCK_READ = 'block:read',
  BLOCK_CREATE = 'block:create',
  BLOCK_UPDATE = 'block:update',
  BLOCK_DELETE = 'block:delete',
  BLOCK_MOVE = 'block:move',
  
  // Task permissions
  TASK_READ = 'task:read',
  TASK_CREATE = 'task:create',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',
  
  // Database permissions
  DATABASE_READ = 'database:read',
  DATABASE_CREATE = 'database:create',
  DATABASE_UPDATE = 'database:update',
  DATABASE_DELETE = 'database:delete',
  
  // Automation permissions
  AUTOMATION_READ = 'automation:read',
  AUTOMATION_TRIGGER = 'automation:trigger',
  AUTOMATION_CREATE = 'automation:create',
}
```

---

## 3. Tool Registry

### 3.1 Read Tools

#### search_workspace
```typescript
const searchWorkspaceTool: AITool = {
  id: 'search_workspace',
  name: 'Search Workspace',
  description: 'Search for content across the workspace using natural language. Returns blocks matching the query.',
  category: 'read',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query',
      },
      blockTypes: {
        type: 'array',
        items: { type: 'string', enum: Object.values(BlockType) },
        description: 'Filter by block types',
      },
      limit: {
        type: 'number',
        default: 10,
        maximum: 50,
        description: 'Maximum results to return',
      },
    },
    required: ['query'],
  },
  returns: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            blockId: { type: 'string' },
            blockType: { type: 'string' },
            content: { type: 'string' },
            pageTitle: { type: 'string' },
            relevanceScore: { type: 'number' },
          },
        },
      },
      totalCount: { type: 'number' },
    },
  },
  requiredPermissions: [Permission.BLOCK_READ],
  requiresConfirmation: false,
  examples: [
    {
      description: 'Find overdue tasks',
      params: { query: 'overdue tasks', blockTypes: ['todo', 'kanban_card'] },
      result: { results: [/* ... */], totalCount: 5 },
    },
  ],
  execute: async (params, context) => {
    // Implementation
  },
};
```

#### get_block
```typescript
const getBlockTool: AITool = {
  id: 'get_block',
  name: 'Get Block',
  description: 'Retrieve a specific block by ID with its full content and children.',
  category: 'read',
  parameters: {
    type: 'object',
    properties: {
      blockId: {
        type: 'string',
        description: 'Block ID to retrieve',
      },
      includeChildren: {
        type: 'boolean',
        default: true,
        description: 'Include child blocks',
      },
      depth: {
        type: 'number',
        default: 1,
        maximum: 5,
        description: 'Depth of children to include',
      },
    },
    required: ['blockId'],
  },
  returns: {
    type: 'object',
    properties: {
      block: { $ref: '#/definitions/Block' },
      children: { type: 'array', items: { $ref: '#/definitions/Block' } },
    },
  },
  requiredPermissions: [Permission.BLOCK_READ],
  requiresConfirmation: false,
  examples: [/* ... */],
  execute: async (params, context) => {
    // Implementation
  },
};
```

#### query_database
```typescript
const queryDatabaseTool: AITool = {
  id: 'query_database',
  name: 'Query Database',
  description: 'Execute a query against a database to retrieve filtered and sorted rows.',
  category: 'read',
  parameters: {
    type: 'object',
    properties: {
      databaseId: {
        type: 'string',
        description: 'Database ID to query',
      },
      filter: {
        type: 'object',
        description: 'Filter conditions',
        properties: {
          property: { type: 'string' },
          operator: { 
            type: 'string',
            enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'],
          },
          value: { },
        },
      },
      sort: {
        type: 'object',
        properties: {
          property: { type: 'string' },
          direction: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
      limit: {
        type: 'number',
        default: 25,
        maximum: 100,
      },
    },
    required: ['databaseId'],
  },
  returns: {
    type: 'object',
    properties: {
      rows: { type: 'array' },
      totalCount: { type: 'number' },
      hasMore: { type: 'boolean' },
    },
  },
  requiredPermissions: [Permission.DATABASE_READ],
  requiresConfirmation: false,
  examples: [/* ... */],
  execute: async (params, context) => {
    // Implementation
  },
};
```

#### list_tasks
```typescript
const listTasksTool: AITool = {
  id: 'list_tasks',
  name: 'List Tasks',
  description: 'List tasks with filtering by status, priority, due date, and more.',
  category: 'read',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['todo', 'in_progress', 'done', 'all'],
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
      },
      overdue: {
        type: 'boolean',
        description: 'Filter to overdue tasks only',
      },
      dueBefore: {
        type: 'string',
        format: 'date-time',
        description: 'Filter tasks due before this date',
      },
      assignedTo: {
        type: 'string',
        description: 'Filter by assigned user ID',
      },
      boardId: {
        type: 'string',
        description: 'Filter by board',
      },
      limit: {
        type: 'number',
        default: 20,
        maximum: 100,
      },
    },
  },
  returns: {
    type: 'object',
    properties: {
      tasks: { type: 'array' },
      totalCount: { type: 'number' },
    },
  },
  requiredPermissions: [Permission.TASK_READ],
  requiresConfirmation: false,
  examples: [
    {
      description: 'Get overdue tasks',
      params: { overdue: true },
      result: { tasks: [/* ... */], totalCount: 3 },
    },
  ],
  execute: async (params, context) => {
    // Implementation
  },
};
```

### 3.2 Create Tools

#### create_block
```typescript
const createBlockTool: AITool = {
  id: 'create_block',
  name: 'Create Block',
  description: 'Create a new block of any type within the workspace.',
  category: 'create',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: Object.values(BlockType),
        description: 'Type of block to create',
      },
      parentId: {
        type: 'string',
        description: 'Parent block ID (null for root)',
      },
      data: {
        type: 'object',
        description: 'Block-specific data',
      },
      position: {
        type: 'number',
        description: 'Position among siblings (0-indexed)',
      },
    },
    required: ['type', 'data'],
  },
  returns: {
    type: 'object',
    properties: {
      blockId: { type: 'string' },
      block: { $ref: '#/definitions/Block' },
    },
  },
  requiredPermissions: [Permission.BLOCK_CREATE],
  requiresConfirmation: false,
  examples: [
    {
      description: 'Create a todo',
      params: {
        type: 'todo',
        parentId: 'page-123',
        data: { content: 'Review PR', completed: false, priority: 'high' },
      },
      result: { blockId: 'todo-456', block: {/* ... */} },
    },
  ],
  execute: async (params, context) => {
    // Implementation with undo data
  },
};
```

#### create_task
```typescript
const createTaskTool: AITool = {
  id: 'create_task',
  name: 'Create Task',
  description: 'Create a new task in a Kanban board or as a todo item.',
  category: 'create',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Task title',
        maxLength: 500,
      },
      description: {
        type: 'string',
        description: 'Task description (markdown supported)',
      },
      columnId: {
        type: 'string',
        description: 'Kanban column ID',
      },
      boardId: {
        type: 'string',
        description: 'Board ID (if not using columnId)',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      dueDate: {
        type: 'string',
        format: 'date-time',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
      assignedTo: {
        type: 'string',
        description: 'User ID to assign',
      },
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            completed: { type: 'boolean', default: false },
          },
        },
      },
    },
    required: ['title'],
  },
  returns: {
    type: 'object',
    properties: {
      taskId: { type: 'string' },
      task: { type: 'object' },
    },
  },
  requiredPermissions: [Permission.TASK_CREATE],
  requiresConfirmation: false,
  examples: [
    {
      description: 'Create a high priority task with subtasks',
      params: {
        title: 'Deploy v2.0',
        priority: 'high',
        dueDate: '2024-12-01T17:00:00Z',
        subtasks: [
          { title: 'Run tests' },
          { title: 'Merge to main' },
          { title: 'Deploy to staging' },
        ],
      },
      result: { taskId: 'task-789', task: {/* ... */} },
    },
  ],
  execute: async (params, context) => {
    // Implementation
  },
};
```

### 3.3 Update Tools

#### update_block
```typescript
const updateBlockTool: AITool = {
  id: 'update_block',
  name: 'Update Block',
  description: 'Update the content or properties of an existing block.',
  category: 'update',
  parameters: {
    type: 'object',
    properties: {
      blockId: {
        type: 'string',
        description: 'Block ID to update',
      },
      data: {
        type: 'object',
        description: 'Partial data to merge with existing',
      },
    },
    required: ['blockId', 'data'],
  },
  returns: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      block: { $ref: '#/definitions/Block' },
      previousData: { type: 'object' },
    },
  },
  requiredPermissions: [Permission.BLOCK_UPDATE],
  requiresConfirmation: false,
  examples: [/* ... */],
  execute: async (params, context) => {
    // Capture previous state for undo
    const previous = await blockStore.get(params.blockId);
    
    // Apply update
    const updated = await blockStore.update(params.blockId, params.data);
    
    return {
      success: true,
      data: { block: updated, previousData: previous.data },
      undoData: { blockId: params.blockId, data: previous.data },
      affectedBlocks: [params.blockId],
    };
  },
};
```

#### update_task_status
```typescript
const updateTaskStatusTool: AITool = {
  id: 'update_task_status',
  name: 'Update Task Status',
  description: 'Change the status of a task by moving it to a different column.',
  category: 'update',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'Task ID to update',
      },
      status: {
        type: 'string',
        description: 'New status/column name',
      },
      columnId: {
        type: 'string',
        description: 'Specific column ID (alternative to status)',
      },
    },
    required: ['taskId'],
  },
  returns: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      previousStatus: { type: 'string' },
      newStatus: { type: 'string' },
    },
  },
  requiredPermissions: [Permission.TASK_UPDATE],
  requiresConfirmation: false,
  examples: [/* ... */],
  execute: async (params, context) => {
    // Implementation
  },
};
```

#### add_property
```typescript
const addPropertyTool: AITool = {
  id: 'add_property',
  name: 'Add Property to Database',
  description: 'Add a new property/column to a database.',
  category: 'update',
  parameters: {
    type: 'object',
    properties: {
      databaseId: {
        type: 'string',
        description: 'Database ID',
      },
      name: {
        type: 'string',
        description: 'Property name',
      },
      type: {
        type: 'string',
        enum: ['text', 'number', 'select', 'multi_select', 'date', 'checkbox', 'url', 'email', 'phone', 'relation'],
        description: 'Property type',
      },
      options: {
        type: 'object',
        description: 'Type-specific options (e.g., select options)',
      },
    },
    required: ['databaseId', 'name', 'type'],
  },
  returns: {
    type: 'object',
    properties: {
      propertyId: { type: 'string' },
      success: { type: 'boolean' },
    },
  },
  requiredPermissions: [Permission.DATABASE_UPDATE],
  requiresConfirmation: false,
  examples: [/* ... */],
  execute: async (params, context) => {
    // Implementation
  },
};
```

### 3.4 Delete Tools

#### delete_block
```typescript
const deleteBlockTool: AITool = {
  id: 'delete_block',
  name: 'Delete Block',
  description: 'Permanently delete a block and optionally its children.',
  category: 'delete',
  parameters: {
    type: 'object',
    properties: {
      blockId: {
        type: 'string',
        description: 'Block ID to delete',
      },
      deleteChildren: {
        type: 'boolean',
        default: true,
        description: 'Also delete all child blocks',
      },
    },
    required: ['blockId'],
  },
  returns: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      deletedCount: { type: 'number' },
    },
  },
  requiredPermissions: [Permission.BLOCK_DELETE],
  requiresConfirmation: true,  // Always confirm deletions
  examples: [/* ... */],
  execute: async (params, context) => {
    // Capture full block tree for undo
    const tree = await blockStore.getTree(params.blockId);
    
    // Delete
    const count = await blockStore.delete(params.blockId, params.deleteChildren);
    
    return {
      success: true,
      data: { deletedCount: count },
      undoData: { tree },  // Can restore from tree
      affectedBlocks: tree.map(b => b.id),
    };
  },
};
```

### 3.5 Execute Tools

#### trigger_automation
```typescript
const triggerAutomationTool: AITool = {
  id: 'trigger_automation',
  name: 'Trigger Automation',
  description: 'Manually trigger an automation rule.',
  category: 'execute',
  parameters: {
    type: 'object',
    properties: {
      automationId: {
        type: 'string',
        description: 'Automation rule ID to trigger',
      },
      context: {
        type: 'object',
        description: 'Context data for the automation',
      },
    },
    required: ['automationId'],
  },
  returns: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      executionId: { type: 'string' },
      result: { type: 'object' },
    },
  },
  requiredPermissions: [Permission.AUTOMATION_TRIGGER],
  requiresConfirmation: (params) => {
    // Check if automation has side effects
    const automation = automationStore.get(params.automationId);
    return automation.hasSideEffects;
  },
  examples: [/* ... */],
  execute: async (params, context) => {
    // Implementation
  },
};
```

---

## 4. Tool Execution Flow

### 4.1 Execution Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TOOL EXECUTION PIPELINE                                │
│                                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Parse      │───▶│  Validate   │───▶│  Authorize  │───▶│  Confirm    │       │
│  │  Request    │    │  Params     │    │  Permissions│    │  If Needed  │       │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                   │               │
│                                                                   ▼               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Return     │◀───│  Audit      │◀───│  Capture    │◀───│  Execute    │       │
│  │  Result     │    │  Log        │    │  Undo Data  │    │  Tool       │       │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation

```typescript
class ToolExecutor {
  async execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
    // 1. Get tool definition
    const tool = this.registry.get(call.toolId);
    if (!tool) {
      return { success: false, error: { code: 'UNKNOWN_TOOL', message: `Tool ${call.toolId} not found` } };
    }
    
    // 2. Validate parameters
    const validation = this.validateParams(call.params, tool.parameters);
    if (!validation.valid) {
      return { success: false, error: { code: 'INVALID_PARAMS', message: validation.error } };
    }
    
    // 3. Check permissions
    const authorized = await this.authorize(tool, context);
    if (!authorized) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Insufficient permissions' } };
    }
    
    // 4. Check confirmation requirement
    if (this.requiresConfirmation(tool, call.params)) {
      const confirmed = await this.requestConfirmation(tool, call.params, context);
      if (!confirmed) {
        return { success: false, error: { code: 'CANCELLED', message: 'User cancelled operation' } };
      }
    }
    
    // 5. Execute tool
    try {
      const result = await tool.execute(call.params, context);
      
      // 6. Audit log
      await this.audit.log({
        toolId: tool.id,
        params: call.params,
        result,
        userId: context.user.id,
        timestamp: new Date().toISOString(),
      });
      
      return result;
    } catch (error) {
      await this.audit.logError({
        toolId: tool.id,
        params: call.params,
        error,
        userId: context.user.id,
        timestamp: new Date().toISOString(),
      });
      
      return { success: false, error: { code: 'EXECUTION_ERROR', message: error.message } };
    }
  }
}
```

---

## 5. Undo System

### 5.1 Undo Stack

```typescript
interface UndoEntry {
  id: string;
  toolId: string;
  timestamp: string;
  userId: string;
  
  // Data needed to reverse the operation
  undoData: any;
  
  // Human-readable description
  description: string;
  
  // Blocks affected
  affectedBlocks: string[];
  
  // Whether this can still be undone
  canUndo: boolean;
}

class UndoManager {
  private stacks: Map<string, UndoEntry[]> = new Map();  // Per-user stacks
  
  async push(userId: string, entry: UndoEntry): Promise<void> {
    const stack = this.stacks.get(userId) || [];
    stack.push(entry);
    
    // Limit stack size
    if (stack.length > 50) {
      stack.shift();
    }
    
    this.stacks.set(userId, stack);
  }
  
  async undo(userId: string): Promise<ToolResult> {
    const stack = this.stacks.get(userId);
    if (!stack || stack.length === 0) {
      return { success: false, error: { code: 'NOTHING_TO_UNDO', message: 'No operations to undo' } };
    }
    
    const entry = stack.pop()!;
    
    if (!entry.canUndo) {
      return { success: false, error: { code: 'CANNOT_UNDO', message: 'This operation cannot be undone' } };
    }
    
    // Execute undo logic based on tool
    return await this.executeUndo(entry);
  }
  
  private async executeUndo(entry: UndoEntry): Promise<ToolResult> {
    switch (entry.toolId) {
      case 'create_block':
        // Undo create = delete
        return await blockStore.delete(entry.undoData.blockId);
        
      case 'update_block':
        // Undo update = restore previous data
        return await blockStore.update(entry.undoData.blockId, entry.undoData.data);
        
      case 'delete_block':
        // Undo delete = recreate tree
        return await blockStore.restoreTree(entry.undoData.tree);
        
      // ... other tools
    }
  }
}
```

---

## 6. Audit Logging

### 6.1 Audit Entry Schema

```typescript
interface AuditEntry {
  id: string;
  timestamp: string;
  
  // Who
  userId: string;
  userName: string;
  
  // What
  toolId: string;
  toolName: string;
  params: any;
  
  // Result
  success: boolean;
  error?: ToolError;
  
  // Context
  requestId: string;
  conversationId?: string;
  aiModel?: string;
  
  // Impact
  affectedBlocks: string[];
  
  // Reversibility
  canUndo: boolean;
  undoEntryId?: string;
}
```

### 6.2 Audit Queries

```typescript
interface AuditService {
  // Log an entry
  log(entry: Omit<AuditEntry, 'id'>): Promise<string>;
  
  // Get audit entries for a block
  getForBlock(blockId: string, limit?: number): Promise<AuditEntry[]>;
  
  // Get audit entries for a user
  getForUser(userId: string, limit?: number): Promise<AuditEntry[]>;
  
  // Get recent AI actions
  getRecentAIActions(limit?: number): Promise<AuditEntry[]>;
  
  // Search audit log
  search(query: AuditQuery): Promise<AuditEntry[]>;
}
```

---

## 7. Rate Limiting & Quotas

### 7.1 Tool Budgets

```typescript
interface ToolBudget {
  // Maximum tool calls per request
  maxCallsPerRequest: number;           // Default: 10
  
  // Maximum total execution time
  maxExecutionTimeMs: number;           // Default: 30000
  
  // Per-tool limits
  toolLimits: Record<string, {
    maxCallsPerHour: number;
    maxCallsPerDay: number;
  }>;
  
  // Cost tracking (if using paid AI)
  tokenBudget?: number;
}

const DEFAULT_BUDGET: ToolBudget = {
  maxCallsPerRequest: 10,
  maxExecutionTimeMs: 30000,
  toolLimits: {
    delete_block: { maxCallsPerHour: 100, maxCallsPerDay: 500 },
    create_block: { maxCallsPerHour: 500, maxCallsPerDay: 2000 },
    trigger_automation: { maxCallsPerHour: 50, maxCallsPerDay: 200 },
  },
};
```

---

## 8. Error Handling

### 8.1 Error Codes

```typescript
enum ToolErrorCode {
  // Input errors
  INVALID_PARAMS = 'INVALID_PARAMS',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  
  // Permission errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  
  // Execution errors
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // User interaction
  CANCELLED = 'CANCELLED',
}

interface ToolError {
  code: ToolErrorCode;
  message: string;
  details?: any;
  retryable: boolean;
}
```

---

## 9. Security Considerations

### 9.1 Input Sanitization

```typescript
class ToolInputSanitizer {
  sanitize(tool: AITool, params: any): any {
    // Remove any unexpected properties
    const sanitized = this.pickAllowedProps(params, tool.parameters);
    
    // Sanitize string inputs
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      }
    }
    
    return sanitized;
  }
  
  private sanitizeString(value: string): string {
    // Remove control characters
    // Normalize whitespace
    // Limit length
    return value
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .substring(0, 100000);
  }
}
```

### 9.2 Injection Prevention

- SQL queries use parameterized statements
- Block content is sanitized before storage
- Tool parameters are validated against schema
- No `eval()` or dynamic code execution

---

## 10. Integration Examples

### 10.1 Chat with Tool Calling

```typescript
async function processChat(message: string, context: ChatContext): Promise<ChatResponse> {
  // Build context
  const contextPayload = await contextBuilder.build({
    query: message,
    type: 'chat',
    user: context.user,
    conversationHistory: context.history,
    tokenBudget: DEFAULT_BUDGET,
  });
  
  // Call AI with tools
  const aiResponse = await aiModel.chat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: contextPayload.serialized },
      { role: 'user', content: message },
    ],
    tools: AVAILABLE_TOOLS.map(t => ({
      name: t.id,
      description: t.description,
      parameters: t.parameters,
    })),
  });
  
  // Execute any tool calls
  const toolResults = [];
  for (const call of aiResponse.toolCalls || []) {
    const result = await toolExecutor.execute(call, context);
    toolResults.push({ call, result });
  }
  
  return {
    message: aiResponse.content,
    toolCalls: toolResults,
  };
}
```

---

## References

- [AI Native Architecture](./AI_NATIVE_ARCHITECTURE.md)
- [Context Builder Specification](./CONTEXT_BUILDER.md)
- [Automation Engine Design](./AUTOMATION_ENGINE.md)
