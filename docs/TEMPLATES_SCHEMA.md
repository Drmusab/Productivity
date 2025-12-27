# Templates Schema Specification

## Overview

This document defines the template system for creating reusable structures, workflows, and content patterns. Templates accelerate workspace setup and ensure consistency across projects.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TEMPLATE SYSTEM                                        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         TEMPLATE REGISTRY                                │    │
│  │   • Built-in templates                                                   │    │
│  │   • User-created templates                                               │    │
│  │   • Workspace templates                                                  │    │
│  │   • Community templates (future)                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         TEMPLATE ENGINE                                  │    │
│  │   • Variable substitution                                                │    │
│  │   • Conditional blocks                                                   │    │
│  │   • Repeatable sections                                                  │    │
│  │   • AI content generation                                                │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         INSTANTIATION                                    │    │
│  │   • Create blocks from template                                          │    │
│  │   • Apply user inputs                                                    │    │
│  │   • Generate AI content                                                  │    │
│  │   • Set up relations                                                     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Types

### 2.1 Template Definition

```typescript
interface Template {
  // Unique identifier
  id: string;
  
  // Template metadata
  metadata: TemplateMetadata;
  
  // Template content
  content: TemplateContent;
  
  // Input variables
  variables: TemplateVariable[];
  
  // AI generation options
  aiOptions?: TemplateAIOptions;
  
  // Preview configuration
  preview: TemplatePreview;
}

interface TemplateMetadata {
  // Display name
  name: string;
  
  // Description
  description: string;
  
  // Template category
  category: TemplateCategory;
  
  // Tags for search/filtering
  tags: string[];
  
  // Template icon
  icon?: string;
  
  // Cover image URL
  coverImage?: string;
  
  // Author information
  author: {
    type: 'system' | 'user' | 'workspace';
    id?: string;
    name?: string;
  };
  
  // Version info
  version: string;
  createdAt: string;
  updatedAt: string;
  
  // Usage statistics
  usageCount: number;
  
  // Visibility
  visibility: 'public' | 'workspace' | 'private';
}

enum TemplateCategory {
  PROJECT = 'project',
  TASK = 'task',
  HABIT = 'habit',
  WORKFLOW = 'workflow',
  PAGE = 'page',
  DATABASE = 'database',
  MEETING = 'meeting',
  DOCUMENTATION = 'documentation',
  PERSONAL = 'personal',
}
```

### 2.2 Template Content

```typescript
interface TemplateContent {
  // Root block type
  rootType: 'page' | 'database' | 'kanban_board';
  
  // Block tree structure
  blocks: TemplateBlock[];
  
  // Database schema (for database templates)
  databaseSchema?: TemplateDatabaseSchema;
  
  // Default views
  views?: TemplateView[];
  
  // Automation rules to create
  automations?: TemplateAutomation[];
}

interface TemplateBlock {
  // Temporary ID for references
  tempId: string;
  
  // Block type
  type: BlockType;
  
  // Block data (may contain variables)
  data: Record<string, TemplateValue>;
  
  // Child blocks
  children?: TemplateBlock[];
  
  // Conditionally include this block
  condition?: TemplateCondition;
  
  // Repeat this block for each item
  repeat?: TemplateRepeat;
  
  // AI generation for this block
  aiGenerate?: TemplateAIBlock;
}

type TemplateValue = 
  | string                    // Static value
  | TemplateVariable          // Variable reference: {{variableName}}
  | TemplateExpression        // Expression: {{today + 7d}}
  | TemplateAIPlaceholder;    // AI-generated: {{ai:generate_description}}
```

### 2.3 Template Variables

```typescript
interface TemplateVariable {
  // Variable name (used in template: {{name}})
  name: string;
  
  // Display label
  label: string;
  
  // Description/help text
  description?: string;
  
  // Variable type
  type: VariableType;
  
  // Default value
  default?: any;
  
  // Whether this is required
  required: boolean;
  
  // Validation rules
  validation?: VariableValidation;
  
  // Options for select types
  options?: VariableOption[];
}

enum VariableType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  NUMBER = 'number',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  USER = 'user',
  BOOLEAN = 'boolean',
  COLOR = 'color',
  ICON = 'icon',
  FILE = 'file',
}

interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;  // Function name
}
```

---

## 3. Built-in Templates

### 3.1 Project Templates

#### Simple Project

```typescript
const simpleProjectTemplate: Template = {
  id: 'simple-project',
  metadata: {
    name: 'Simple Project',
    description: 'Basic project structure with tasks and milestones',
    category: TemplateCategory.PROJECT,
    tags: ['project', 'basic', 'tasks'],
    icon: '📁',
    author: { type: 'system' },
    version: '1.0.0',
    visibility: 'public',
  },
  variables: [
    {
      name: 'projectName',
      label: 'Project Name',
      type: VariableType.TEXT,
      required: true,
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: VariableType.DATE,
      default: '{{today}}',
      required: true,
    },
    {
      name: 'endDate',
      label: 'End Date',
      type: VariableType.DATE,
      required: false,
    },
    {
      name: 'teamMembers',
      label: 'Team Members',
      type: VariableType.MULTI_SELECT,
      required: false,
    },
  ],
  content: {
    rootType: 'page',
    blocks: [
      {
        tempId: 'page-root',
        type: BlockType.PAGE,
        data: {
          title: '{{projectName}}',
          icon: '📁',
        },
        children: [
          {
            tempId: 'overview',
            type: BlockType.HEADING,
            data: { content: 'Overview', level: 2 },
          },
          {
            tempId: 'overview-text',
            type: BlockType.TEXT,
            data: { content: 'Project started on {{startDate}}' },
          },
          {
            tempId: 'board-section',
            type: BlockType.HEADING,
            data: { content: 'Task Board', level: 2 },
          },
          {
            tempId: 'kanban',
            type: BlockType.KANBAN_BOARD,
            data: { name: '{{projectName}} Tasks' },
            children: [
              {
                tempId: 'todo-col',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'To Do', color: '#3498db' },
              },
              {
                tempId: 'progress-col',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'In Progress', color: '#f39c12' },
              },
              {
                tempId: 'done-col',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Done', color: '#2ecc71', isDone: true },
              },
            ],
          },
          {
            tempId: 'notes-section',
            type: BlockType.HEADING,
            data: { content: 'Notes', level: 2 },
          },
          {
            tempId: 'notes',
            type: BlockType.TEXT,
            data: { content: '' },
          },
        ],
      },
    ],
  },
  preview: {
    thumbnail: '/templates/simple-project.png',
    demoUrl: '/templates/demo/simple-project',
  },
};
```

#### Agile Sprint

```typescript
const agileSprintTemplate: Template = {
  id: 'agile-sprint',
  metadata: {
    name: 'Agile Sprint',
    description: 'Sprint planning board with backlog and sprint goals',
    category: TemplateCategory.PROJECT,
    tags: ['agile', 'sprint', 'scrum', 'software'],
    icon: '🏃',
    author: { type: 'system' },
    version: '1.0.0',
    visibility: 'public',
  },
  variables: [
    {
      name: 'sprintName',
      label: 'Sprint Name',
      type: VariableType.TEXT,
      default: 'Sprint {{sprintNumber}}',
      required: true,
    },
    {
      name: 'sprintNumber',
      label: 'Sprint Number',
      type: VariableType.NUMBER,
      default: 1,
      required: true,
    },
    {
      name: 'sprintGoal',
      label: 'Sprint Goal',
      type: VariableType.LONG_TEXT,
      required: false,
    },
    {
      name: 'startDate',
      label: 'Sprint Start',
      type: VariableType.DATE,
      default: '{{today}}',
      required: true,
    },
    {
      name: 'duration',
      label: 'Duration (weeks)',
      type: VariableType.SELECT,
      options: [
        { value: '1', label: '1 week' },
        { value: '2', label: '2 weeks' },
        { value: '3', label: '3 weeks' },
        { value: '4', label: '4 weeks' },
      ],
      default: '2',
      required: true,
    },
  ],
  content: {
    rootType: 'page',
    blocks: [
      {
        tempId: 'page-root',
        type: BlockType.PAGE,
        data: {
          title: '{{sprintName}}',
          icon: '🏃',
        },
        children: [
          {
            tempId: 'sprint-info',
            type: BlockType.TEXT,
            data: {
              content: '**Duration:** {{startDate}} - {{startDate + (duration * 7)d}}\n**Goal:** {{sprintGoal}}',
            },
          },
          {
            tempId: 'divider1',
            type: BlockType.DIVIDER,
            data: {},
          },
          {
            tempId: 'board',
            type: BlockType.KANBAN_BOARD,
            data: { name: '{{sprintName}} Board' },
            children: [
              {
                tempId: 'backlog',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Backlog', color: '#95a5a6' },
              },
              {
                tempId: 'ready',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Ready', color: '#3498db' },
              },
              {
                tempId: 'dev',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'In Development', color: '#9b59b6' },
              },
              {
                tempId: 'review',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'In Review', color: '#f39c12' },
              },
              {
                tempId: 'testing',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Testing', color: '#e74c3c' },
              },
              {
                tempId: 'done',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Done', color: '#2ecc71', isDone: true },
              },
            ],
          },
          {
            tempId: 'retro-section',
            type: BlockType.HEADING,
            data: { content: 'Sprint Retrospective', level: 2 },
          },
          {
            tempId: 'retro-good',
            type: BlockType.HEADING,
            data: { content: '✅ What went well', level: 3 },
          },
          {
            tempId: 'retro-good-list',
            type: BlockType.LIST,
            data: { ordered: false },
          },
          {
            tempId: 'retro-improve',
            type: BlockType.HEADING,
            data: { content: '🔄 What to improve', level: 3 },
          },
          {
            tempId: 'retro-improve-list',
            type: BlockType.LIST,
            data: { ordered: false },
          },
        ],
      },
    ],
  },
  preview: {
    thumbnail: '/templates/agile-sprint.png',
  },
};
```

### 3.2 Habit Templates

```typescript
const dailyHabitTrackerTemplate: Template = {
  id: 'daily-habit-tracker',
  metadata: {
    name: 'Daily Habit Tracker',
    description: 'Track daily habits with streaks and statistics',
    category: TemplateCategory.HABIT,
    tags: ['habit', 'daily', 'tracking', 'personal'],
    icon: '✅',
    author: { type: 'system' },
    version: '1.0.0',
    visibility: 'public',
  },
  variables: [
    {
      name: 'habitName',
      label: 'Habit Name',
      type: VariableType.TEXT,
      required: true,
    },
    {
      name: 'frequency',
      label: 'Frequency',
      type: VariableType.SELECT,
      options: [
        { value: 'daily', label: 'Every day' },
        { value: 'weekdays', label: 'Weekdays only' },
        { value: 'weekends', label: 'Weekends only' },
        { value: 'custom', label: 'Custom days' },
      ],
      default: 'daily',
      required: true,
    },
    {
      name: 'customDays',
      label: 'Days of Week',
      type: VariableType.MULTI_SELECT,
      options: [
        { value: '0', label: 'Sunday' },
        { value: '1', label: 'Monday' },
        { value: '2', label: 'Tuesday' },
        { value: '3', label: 'Wednesday' },
        { value: '4', label: 'Thursday' },
        { value: '5', label: 'Friday' },
        { value: '6', label: 'Saturday' },
      ],
      required: false,
      condition: { variable: 'frequency', operator: 'eq', value: 'custom' },
    },
    {
      name: 'reminderTime',
      label: 'Reminder Time',
      type: VariableType.TEXT,
      default: '09:00',
      required: false,
    },
    {
      name: 'streakGoal',
      label: 'Streak Goal (days)',
      type: VariableType.NUMBER,
      default: 30,
      required: false,
    },
  ],
  content: {
    rootType: 'database',
    databaseSchema: {
      name: '{{habitName}} Tracker',
      properties: [
        {
          name: 'Date',
          type: 'date',
          config: { includeTime: false },
        },
        {
          name: 'Completed',
          type: 'checkbox',
        },
        {
          name: 'Notes',
          type: 'text',
        },
        {
          name: 'Streak',
          type: 'formula',
          config: { formula: 'calculateStreak()' },
        },
      ],
    },
    views: [
      {
        name: 'Calendar View',
        type: 'calendar',
        config: {
          dateProperty: 'Date',
          showCompleted: true,
        },
      },
      {
        name: 'List View',
        type: 'table',
        config: {
          sort: [{ property: 'Date', direction: 'desc' }],
        },
      },
    ],
    automations: [
      {
        name: 'Daily reminder',
        trigger: {
          type: 'time',
          schedule: {
            at: '{{reminderTime}}',
            days: '{{frequency === "daily" ? "*" : customDays.join(",")}}',
          },
        },
        actions: [
          {
            type: 'notification',
            config: {
              title: 'Habit Reminder',
              message: "Don't forget to {{habitName}} today!",
            },
          },
        ],
      },
    ],
  },
  preview: {
    thumbnail: '/templates/habit-tracker.png',
  },
};
```

### 3.3 Task Workflow Templates

```typescript
const bugTrackingTemplate: Template = {
  id: 'bug-tracking',
  metadata: {
    name: 'Bug Tracking Workflow',
    description: 'Track bugs from report to resolution',
    category: TemplateCategory.WORKFLOW,
    tags: ['bug', 'tracking', 'software', 'qa'],
    icon: '🐛',
    author: { type: 'system' },
    version: '1.0.0',
    visibility: 'public',
  },
  variables: [
    {
      name: 'projectName',
      label: 'Project Name',
      type: VariableType.TEXT,
      required: true,
    },
  ],
  content: {
    rootType: 'page',
    blocks: [
      {
        tempId: 'root',
        type: BlockType.PAGE,
        data: {
          title: '{{projectName}} - Bug Tracker',
          icon: '🐛',
        },
        children: [
          {
            tempId: 'board',
            type: BlockType.KANBAN_BOARD,
            data: { name: 'Bug Board' },
            children: [
              {
                tempId: 'reported',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Reported', color: '#e74c3c' },
              },
              {
                tempId: 'confirmed',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Confirmed', color: '#f39c12' },
              },
              {
                tempId: 'in-progress',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'In Progress', color: '#3498db' },
              },
              {
                tempId: 'testing',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Testing', color: '#9b59b6' },
              },
              {
                tempId: 'resolved',
                type: BlockType.KANBAN_COLUMN,
                data: { name: 'Resolved', color: '#2ecc71', isDone: true },
              },
              {
                tempId: 'wont-fix',
                type: BlockType.KANBAN_COLUMN,
                data: { name: "Won't Fix", color: '#95a5a6' },
              },
            ],
          },
        ],
      },
    ],
    automations: [
      {
        name: 'Critical bug alert',
        trigger: {
          type: 'task',
          event: 'created',
        },
        conditions: [
          { field: 'priority', operator: 'eq', value: 'critical' },
        ],
        actions: [
          {
            type: 'notification',
            config: {
              recipients: ['@team'],
              title: '🚨 Critical Bug Reported',
              message: 'A critical bug "{{task.title}}" was just reported.',
              urgency: 'high',
            },
          },
        ],
      },
    ],
  },
  preview: {
    thumbnail: '/templates/bug-tracking.png',
  },
};
```

---

## 4. Database Schema Templates

### 4.1 Database Template Definition

```typescript
interface TemplateDatabaseSchema {
  // Database name
  name: string;
  
  // Description
  description?: string;
  
  // Icon
  icon?: string;
  
  // Properties
  properties: TemplateProperty[];
  
  // Default views
  views?: TemplateView[];
  
  // Sample rows to create
  sampleRows?: TemplateRow[];
}

interface TemplateProperty {
  // Property name
  name: string;
  
  // Property type
  type: PropertyType;
  
  // Type-specific configuration
  config?: PropertyConfig;
  
  // Default value
  default?: any;
  
  // Whether this property is required
  required?: boolean;
}

interface TemplateView {
  // View name
  name: string;
  
  // View type
  type: ViewType;
  
  // View-specific configuration
  config: ViewConfig;
}

interface TemplateRow {
  // Property values (may include variables)
  values: Record<string, TemplateValue>;
}
```

### 4.2 CRM Database Template

```typescript
const crmDatabaseTemplate: Template = {
  id: 'crm-database',
  metadata: {
    name: 'CRM Database',
    description: 'Customer relationship management database',
    category: TemplateCategory.DATABASE,
    tags: ['crm', 'customers', 'sales', 'business'],
    icon: '👥',
    author: { type: 'system' },
    version: '1.0.0',
    visibility: 'public',
  },
  variables: [
    {
      name: 'dbName',
      label: 'Database Name',
      type: VariableType.TEXT,
      default: 'Customer Database',
      required: true,
    },
    {
      name: 'includePipeline',
      label: 'Include Sales Pipeline',
      type: VariableType.BOOLEAN,
      default: true,
      required: false,
    },
  ],
  content: {
    rootType: 'database',
    databaseSchema: {
      name: '{{dbName}}',
      icon: '👥',
      properties: [
        {
          name: 'Company',
          type: 'title',
          required: true,
        },
        {
          name: 'Contact Name',
          type: 'text',
        },
        {
          name: 'Email',
          type: 'email',
        },
        {
          name: 'Phone',
          type: 'phone',
        },
        {
          name: 'Status',
          type: 'select',
          config: {
            options: [
              { name: 'Lead', color: 'gray' },
              { name: 'Prospect', color: 'blue' },
              { name: 'Customer', color: 'green' },
              { name: 'Churned', color: 'red' },
            ],
          },
          default: 'Lead',
        },
        {
          name: 'Deal Value',
          type: 'number',
          config: { format: 'currency', currency: 'USD' },
        },
        {
          name: 'Next Follow-up',
          type: 'date',
        },
        {
          name: 'Notes',
          type: 'text',
        },
        {
          name: 'Tags',
          type: 'multi_select',
          config: {
            options: [
              { name: 'Enterprise', color: 'purple' },
              { name: 'SMB', color: 'blue' },
              { name: 'Startup', color: 'green' },
            ],
          },
        },
      ],
      views: [
        {
          name: 'All Contacts',
          type: 'table',
          config: {
            properties: ['Company', 'Contact Name', 'Email', 'Status', 'Deal Value'],
            sort: [{ property: 'Company', direction: 'asc' }],
          },
        },
        {
          name: 'Pipeline',
          type: 'board',
          config: {
            groupBy: 'Status',
          },
          condition: { variable: 'includePipeline', operator: 'eq', value: true },
        },
        {
          name: 'Follow-ups',
          type: 'calendar',
          config: {
            dateProperty: 'Next Follow-up',
          },
        },
      ],
    },
  },
  preview: {
    thumbnail: '/templates/crm-database.png',
  },
};
```

---

## 5. AI-Powered Templates

### 5.1 AI Options

```typescript
interface TemplateAIOptions {
  // Enable AI content generation
  enabled: boolean;
  
  // AI-generated sections
  sections: TemplateAISection[];
  
  // Model preferences
  model?: string;
  
  // Temperature for generation
  temperature?: number;
}

interface TemplateAISection {
  // Target block ID
  targetId: string;
  
  // Generation type
  type: 'generate' | 'suggest' | 'expand';
  
  // Prompt template
  prompt: string;
  
  // Max tokens for generation
  maxTokens?: number;
  
  // Whether to auto-apply or show as suggestion
  autoApply: boolean;
}

interface TemplateAIBlock {
  // Prompt for generation
  prompt: string;
  
  // Context variables to include
  context?: string[];
  
  // Output format
  format: 'text' | 'list' | 'table';
  
  // Auto-apply or show as suggestion
  autoApply: boolean;
}
```

### 5.2 AI Template Example

```typescript
const meetingNotesTemplate: Template = {
  id: 'ai-meeting-notes',
  metadata: {
    name: 'AI Meeting Notes',
    description: 'Meeting notes with AI-generated action items and summary',
    category: TemplateCategory.MEETING,
    tags: ['meeting', 'notes', 'ai', 'action-items'],
    icon: '📝',
    author: { type: 'system' },
    version: '1.0.0',
    visibility: 'public',
  },
  variables: [
    {
      name: 'meetingTitle',
      label: 'Meeting Title',
      type: VariableType.TEXT,
      required: true,
    },
    {
      name: 'attendees',
      label: 'Attendees',
      type: VariableType.MULTI_SELECT,
      required: false,
    },
    {
      name: 'meetingDate',
      label: 'Meeting Date',
      type: VariableType.DATE,
      default: '{{today}}',
      required: true,
    },
  ],
  aiOptions: {
    enabled: true,
    sections: [
      {
        targetId: 'summary-placeholder',
        type: 'generate',
        prompt: 'Based on the meeting notes above, generate a concise summary in 2-3 sentences.',
        autoApply: false,
      },
      {
        targetId: 'action-items-placeholder',
        type: 'generate',
        prompt: 'Extract action items from the meeting notes. Format as a list with assignees and due dates if mentioned.',
        autoApply: false,
      },
    ],
  },
  content: {
    rootType: 'page',
    blocks: [
      {
        tempId: 'root',
        type: BlockType.PAGE,
        data: {
          title: '{{meetingTitle}} - {{meetingDate}}',
          icon: '📝',
        },
        children: [
          {
            tempId: 'info',
            type: BlockType.TEXT,
            data: {
              content: '**Date:** {{meetingDate}}\n**Attendees:** {{attendees}}',
            },
          },
          {
            tempId: 'divider1',
            type: BlockType.DIVIDER,
            data: {},
          },
          {
            tempId: 'notes-heading',
            type: BlockType.HEADING,
            data: { content: 'Meeting Notes', level: 2 },
          },
          {
            tempId: 'notes',
            type: BlockType.TEXT,
            data: { content: '' },
          },
          {
            tempId: 'divider2',
            type: BlockType.DIVIDER,
            data: {},
          },
          {
            tempId: 'summary-heading',
            type: BlockType.HEADING,
            data: { content: 'Summary', level: 2 },
          },
          {
            tempId: 'summary-placeholder',
            type: BlockType.AI_SUGGESTION,
            data: {
              suggestion: '',
              reason: 'AI will generate a summary based on your notes',
              confidence: 0,
            },
            aiGenerate: {
              prompt: 'Generate a brief summary of the meeting notes',
              format: 'text',
              autoApply: false,
            },
          },
          {
            tempId: 'actions-heading',
            type: BlockType.HEADING,
            data: { content: 'Action Items', level: 2 },
          },
          {
            tempId: 'action-items-placeholder',
            type: BlockType.AI_SUGGESTION,
            data: {
              suggestion: '',
              reason: 'AI will extract action items from your notes',
              confidence: 0,
            },
            aiGenerate: {
              prompt: 'Extract action items as todos with assignees',
              format: 'list',
              autoApply: false,
            },
          },
        ],
      },
    ],
  },
  preview: {
    thumbnail: '/templates/ai-meeting-notes.png',
  },
};
```

---

## 6. Template Engine

### 6.1 Variable Substitution

```typescript
class TemplateEngine {
  async instantiate(
    template: Template,
    variables: Record<string, any>,
    options: InstantiationOptions
  ): Promise<InstantiationResult> {
    // Validate required variables
    const validation = this.validateVariables(template.variables, variables);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    
    // Build context
    const context = this.buildContext(variables);
    
    // Process blocks
    const blocks = await this.processBlocks(template.content.blocks, context);
    
    // Create database if needed
    let databaseId: string | undefined;
    if (template.content.databaseSchema) {
      databaseId = await this.createDatabase(template.content.databaseSchema, context);
    }
    
    // Create blocks
    const createdBlocks = await this.createBlocks(blocks, options.parentId);
    
    // Create automations if present
    if (template.content.automations) {
      await this.createAutomations(template.content.automations, context, createdBlocks);
    }
    
    // Generate AI content if enabled
    if (template.aiOptions?.enabled) {
      await this.generateAIContent(template.aiOptions, createdBlocks, context);
    }
    
    return {
      success: true,
      rootBlockId: createdBlocks[0].id,
      createdBlocks: createdBlocks.map(b => b.id),
      databaseId,
    };
  }
  
  private buildContext(variables: Record<string, any>): TemplateContext {
    return {
      ...variables,
      today: new Date().toISOString().split('T')[0],
      now: new Date().toISOString(),
      timestamp: Date.now(),
    };
  }
  
  private resolveValue(value: TemplateValue, context: TemplateContext): any {
    if (typeof value !== 'string') return value;
    
    // Replace variable references: {{variableName}}
    return value.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      return this.evaluateExpression(expression.trim(), context);
    });
  }
  
  private evaluateExpression(expression: string, context: TemplateContext): any {
    // Simple variable lookup
    if (context[expression] !== undefined) {
      return context[expression];
    }
    
    // Date arithmetic: {{today + 7d}}
    const dateMatch = expression.match(/^(\w+)\s*([+-])\s*(\d+)([dhmy])$/);
    if (dateMatch) {
      const [, base, op, amount, unit] = dateMatch;
      const baseDate = new Date(context[base] || context.today);
      const multiplier = op === '+' ? 1 : -1;
      const value = parseInt(amount) * multiplier;
      
      switch (unit) {
        case 'd': baseDate.setDate(baseDate.getDate() + value); break;
        case 'h': baseDate.setHours(baseDate.getHours() + value); break;
        case 'm': baseDate.setMonth(baseDate.getMonth() + value); break;
        case 'y': baseDate.setFullYear(baseDate.getFullYear() + value); break;
      }
      
      return baseDate.toISOString().split('T')[0];
    }
    
    // Return the original expression wrapped in braces if no match
    return `{{${expression}}}`;
  }
}
```

---

## 7. Template Management

### 7.1 Template CRUD

```typescript
interface TemplateService {
  // List templates
  list(filter?: TemplateFilter): Promise<Template[]>;
  
  // Get template by ID
  get(id: string): Promise<Template | null>;
  
  // Create user template
  create(template: Omit<Template, 'id'>): Promise<Template>;
  
  // Update template
  update(id: string, updates: Partial<Template>): Promise<Template>;
  
  // Delete template
  delete(id: string): Promise<void>;
  
  // Duplicate template
  duplicate(id: string, name: string): Promise<Template>;
  
  // Instantiate template
  instantiate(
    id: string,
    variables: Record<string, any>,
    options: InstantiationOptions
  ): Promise<InstantiationResult>;
  
  // Create template from existing content
  createFromBlocks(
    blockIds: string[],
    metadata: TemplateMetadata
  ): Promise<Template>;
}

interface TemplateFilter {
  category?: TemplateCategory;
  tags?: string[];
  author?: { type: 'system' | 'user' | 'workspace'; id?: string };
  search?: string;
}
```

### 7.2 Template Sharing

```typescript
interface TemplateSharingService {
  // Share template with workspace
  shareWithWorkspace(templateId: string, workspaceId: string): Promise<void>;
  
  // Unshare template
  unshare(templateId: string, workspaceId: string): Promise<void>;
  
  // Export template for sharing
  exportTemplate(templateId: string): Promise<string>;  // JSON
  
  // Import template from JSON
  importTemplate(json: string): Promise<Template>;
}
```

---

## 8. Preview System

### 8.1 Template Preview

```typescript
interface TemplatePreview {
  // Static thumbnail image
  thumbnail: string;
  
  // Interactive demo URL
  demoUrl?: string;
  
  // Preview blocks (simplified for display)
  previewBlocks?: TemplateBlock[];
  
  // Sample data for preview
  sampleData?: Record<string, any>;
}

interface PreviewRenderer {
  // Render preview with sample data
  render(template: Template): Promise<PreviewResult>;
  
  // Generate thumbnail
  generateThumbnail(template: Template): Promise<string>;
}
```

---

## 9. Validation

### 9.1 Template Validation

```typescript
interface TemplateValidator {
  validate(template: Template): ValidationResult;
}

class DefaultTemplateValidator implements TemplateValidator {
  validate(template: Template): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Validate metadata
    if (!template.metadata.name) {
      errors.push({ field: 'metadata.name', message: 'Name is required' });
    }
    
    // Validate variables
    for (const variable of template.variables) {
      if (!variable.name) {
        errors.push({ field: 'variable.name', message: 'Variable name is required' });
      }
      if (!variable.type) {
        errors.push({ field: 'variable.type', message: 'Variable type is required' });
      }
    }
    
    // Validate blocks
    for (const block of template.content.blocks) {
      this.validateBlock(block, errors);
    }
    
    // Validate variable references
    const usedVariables = this.extractVariableReferences(template);
    const definedVariables = new Set(template.variables.map(v => v.name));
    
    for (const used of usedVariables) {
      if (!definedVariables.has(used) && !this.isBuiltinVariable(used)) {
        errors.push({ 
          field: 'variable',
          message: `Variable "${used}" is referenced but not defined`,
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  private isBuiltinVariable(name: string): boolean {
    return ['today', 'now', 'timestamp'].includes(name);
  }
}
```

---

## 10. Usage Examples

### 10.1 Create from Template (API)

```typescript
// POST /api/templates/simple-project/instantiate
{
  "variables": {
    "projectName": "Q4 Marketing Campaign",
    "startDate": "2024-10-01",
    "endDate": "2024-12-31",
    "teamMembers": ["user-1", "user-2", "user-3"]
  },
  "options": {
    "parentId": "workspace-root"
  }
}

// Response
{
  "success": true,
  "rootBlockId": "page-abc123",
  "createdBlocks": ["page-abc123", "board-xyz789", "column-1", "column-2", "column-3"],
  "message": "Created project 'Q4 Marketing Campaign'"
}
```

### 10.2 Create Template from Selection

```typescript
// POST /api/templates/create-from-blocks
{
  "blockIds": ["page-existing-123"],
  "metadata": {
    "name": "My Project Template",
    "description": "Based on existing project structure",
    "category": "project",
    "visibility": "private"
  },
  "extractVariables": true  // Auto-detect values that should be variables
}
```

---

## References

- [AI Native Architecture](./AI_NATIVE_ARCHITECTURE.md)
- [Block Architecture](./BLOCK_ARCHITECTURE.md)
- [Automation Engine](./AUTOMATION_ENGINE.md)
