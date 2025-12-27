# Productivity OS - Architecture Documentation

## Overview

Productivity OS is an **offline-first**, **Docker-first** productivity platform built with **TypeScript end-to-end**. It combines Obsidian-style note-taking with modular productivity tools in a single cohesive workspace.

## Core Philosophy

### 1. Offline-First
- **User owns their data**: The app functions entirely without internet connection
- **Local storage**: IndexedDB for browser, SQLite for server
- **Sync queue**: All operations are queued and synced when online
- **CRDT conflict resolution**: Using Yjs for automatic conflict-free merges

### 2. Docker-First
- **Complete containerization**: From database to frontend
- **Reproducible environments**: Dev and production profiles
- **Volume management**: Persistent data across container restarts
- **Health checks**: Automated service monitoring

### 3. TypeScript End-to-End
- **Strict mode**: No `any` types allowed
- **Zod schemas**: Runtime validation with type inference
- **Project references**: Efficient incremental builds
- **Type safety**: Shared types across frontend and backend

## Monorepo Structure

```
/productivity-os
├── apps/
│   ├── desktop/              # React frontend (Electron-ready)
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   ├── pages/        # Page components
│   │   │   ├── services/     # API clients
│   │   │   └── utils/        # Utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── backend/              # Node.js API server
│       ├── src/
│       │   ├── routes/       # API endpoints
│       │   ├── services/     # Business logic
│       │   ├── middleware/   # Express middleware
│       │   └── utils/        # Database, logging
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── core/                 # Shared logic: Types, Markdown Parser, AST
│   │   ├── src/
│   │   │   ├── types.ts      # Zod schemas and TypeScript types
│   │   │   ├── markdown.ts   # Markdown parser with wikilinks
│   │   │   ├── graph.ts      # Knowledge graph utilities
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                   # Local-first DB logic & CRDT sync protocols
│   │   ├── src/
│   │   │   ├── indexeddb.ts  # IndexedDB adapter
│   │   │   ├── sync.ts       # CRDT sync engine (Yjs)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                   # Shared Tailwind/Radix UI components
│   │   ├── src/
│   │   │   ├── CommandPalette.tsx  # CMD+K command palette
│   │   │   ├── utils/        # Tailwind utilities
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── modules/              # Productivity plugins (Tasks, Calendar, Kanban)
│   │   ├── src/
│   │   │   ├── kanban.ts     # Kanban board module
│   │   │   ├── pomodoro.ts   # Pomodoro timer module
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/               # Legacy shared types (being migrated to core)
│
├── infra/
│   └── docker/               # Docker configuration
│       ├── docker-compose.yml
│       ├── Dockerfile.backend.dev
│       ├── Dockerfile.backend.prod
│       ├── Dockerfile.desktop.dev
│       └── Dockerfile.desktop.prod
│
├── docs/                     # Documentation
├── scripts/                  # CLI utilities
├── docker-compose.yml        # Root compose file
├── tsconfig.json            # Root TypeScript config
└── package.json             # Root package with workspaces
```

## Package Descriptions

### @productivity-os/core
**Purpose**: Foundation layer with type definitions, markdown parsing, and knowledge graph

**Key Features**:
- **Type System**: Zod schemas for runtime validation
- **Markdown Parser**: Supports wikilinks `[[Note Name]]`, frontmatter, and GFM
- **Knowledge Graph**: Backlinks, unresolved links, orphan notes, hub detection
- **AST Manipulation**: Using unified/remark for markdown processing

**Dependencies**: `zod`, `unified`, `remark`, `yaml`

**Exports**:
- Type definitions and schemas
- Markdown utilities (parsing, wikilinks, frontmatter)
- Knowledge graph class and utilities

### @productivity-os/db
**Purpose**: Local-first database layer with offline support and sync

**Key Features**:
- **IndexedDB Adapter**: Structured storage for notes, blocks, tasks
- **CRDT Sync**: Conflict-free replication using Yjs
- **Sync Queue**: Queues operations for eventual consistency
- **Offline Support**: Works without network connection

**Dependencies**: `idb`, `yjs`, `sqlite3`, `better-sqlite3`

**Exports**:
- IndexedDB adapter class
- Sync engine with CRDT support
- Database operation methods

### @productivity-os/ui
**Purpose**: Shared React components with Tailwind CSS

**Key Features**:
- **Command Palette**: Global CMD+K interface
- **Tailwind Utilities**: Class merging and composition
- **Design System**: Consistent styling across the app

**Dependencies**: `react`, `tailwindcss`, `clsx`, `tailwind-merge`

**Exports**:
- Command Palette component
- Tailwind utility functions

### @productivity-os/modules
**Purpose**: Productivity feature modules

**Key Features**:
- **Kanban Module**: Board and column management
- **Pomodoro Module**: Focus timer with session tracking
- **Task Management**: Integrated with other modules
- **Calendar Integration**: (Future)
- **PARA Method**: (Future)

**Dependencies**: `@productivity-os/core`, `@productivity-os/db`, `date-fns`

**Exports**:
- Kanban board and column classes
- Pomodoro timer with configuration
- Module-specific types and utilities

## Data Flow

### Offline-First Architecture

```
┌─────────────────┐
│   User Action   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React Component│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   IndexedDB     │◄───── Local Storage
│   (packages/db) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Sync Queue    │◄───── Queue for sync
└────────┬────────┘
         │
         ▼ (when online)
┌─────────────────┐
│  Backend API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite Server  │◄───── Server Storage
└─────────────────┘
```

### CRDT Sync Flow

```
Client A                Sync Engine              Client B
   │                         │                       │
   │──── Local Change ──────>│                       │
   │                         │                       │
   │                         │◄──── Get State ───────│
   │                         │                       │
   │                         │──── Send Update ─────>│
   │                         │                       │
   │                         │◄──── ACK ─────────────│
   │                         │                       │
   │◄──── Merged State ──────│──── Merged State ────>│
```

## TypeScript Configuration

### Monorepo Setup

The root `tsconfig.json` uses **project references** for efficient builds:

```json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/db" },
    { "path": "./packages/ui" },
    { "path": "./packages/modules" },
    { "path": "./apps/backend" },
    { "path": "./apps/desktop" }
  ]
}
```

### Strict Mode

All packages enforce strict TypeScript:
- `noImplicitAny`: true
- `strictNullChecks`: true
- `strictFunctionTypes`: true
- `strictBindCallApply`: true
- `strictPropertyInitialization`: true
- `noUnusedLocals`: true
- `noUnusedParameters`: true
- `noImplicitReturns`: true

## Docker Architecture

### Services

1. **api-dev** / **api-prod**: Backend API server
   - Port: 3001
   - Volumes: db_data, vault_data, attachments, backups
   - Health check: `/api/health`

2. **app-dev** / **app-prod**: Frontend application
   - Port: 3000
   - Depends on: api service
   - Hot reload in dev mode

3. **worker-dev** / **worker-prod** (optional): Background workers
   - Handles: Indexing, graph updates, scheduled tasks

### Volumes

- **vault_data**: Markdown notes and templates
- **db_data**: SQLite database file
- **app_config**: Application settings
- **attachments**: Uploaded files
- **backups**: Database backups

### Profiles

- **dev**: Development mode with hot reload
- **prod**: Production mode with optimized builds
- **worker**: Background processing (optional)

## Markdown & Knowledge Graph

### Wikilinks

Syntax: `[[Note Title]]` or `[[Note Title|Alias]]`

Block references: `[[Note#^block-id]]`

**Processing**:
1. Parse markdown to AST
2. Extract wikilinks using regex
3. Resolve to note IDs
4. Update knowledge graph
5. Track backlinks

### Frontmatter

YAML metadata at the start of notes:

```yaml
---
title: My Note
tags: [productivity, notes]
date: 2025-01-01
author: User
template: daily-note
---
```

Parsed using `yaml` library and validated with Zod.

### Knowledge Graph

**Features**:
- Automatic backlink detection
- Unresolved link tracking
- Orphan note detection
- Hub note identification (highly connected)
- Related notes based on shared links/tags

**Queries**:
- `getBacklinks(noteId)`: Notes linking to this note
- `getOutgoingLinks(noteId)`: Notes this note links to
- `getUnresolvedLinks()`: Broken wikilinks
- `getOrphanNotes()`: Notes with no connections
- `getHubNotes(minConnections)`: Highly connected notes
- `getRelatedNotes(noteId)`: Similar notes by links/tags

## Command Palette (CMD+K)

Global command interface accessible via keyboard shortcut.

**Features**:
- Fuzzy search across commands
- Keyboard navigation (arrows, enter, escape)
- Category grouping
- Keyboard shortcuts display
- Extensible command registration

**Usage**:
```typescript
const commands: Command[] = [
  {
    id: 'create-note',
    title: 'Create New Note',
    category: 'Notes',
    keywords: ['new', 'note', 'create'],
    handler: async () => {
      // Create note logic
    },
    shortcut: 'Cmd+N',
  },
];

<CommandPalette
  commands={commands}
  isOpen={isOpen}
  onClose={handleClose}
/>
```

## Performance Optimizations

### 60fps UI Target

1. **Web Workers**: Heavy computations offloaded
   - Markdown parsing
   - Knowledge graph updates
   - Search indexing

2. **Virtual Scrolling**: Large lists
3. **Debounced Updates**: User input handling
4. **Memoization**: React component optimization
5. **Code Splitting**: Lazy loading of routes

### Idempotency

All sync operations are idempotent:
- Same operation repeated = same result
- No duplicate data
- Safe retries on failure

## Security

### Data Ownership
- All data stored locally first
- User controls when to sync
- No vendor lock-in

### Authentication
- JWT tokens for API access
- API key for webhooks
- CSRF protection

### Sanitization
- Input sanitization middleware
- HTML sanitization for markdown
- SQL injection prevention (parameterized queries)

## Testing Strategy

### Unit Tests
- Package-level tests for core logic
- Zod schema validation tests
- Markdown parser tests
- Sync engine tests

### Integration Tests
- API endpoint tests
- Database operation tests
- Sync flow tests

### E2E Tests
- Critical user flows
- Offline functionality
- Sync conflict resolution

## Migration Path

### From Current Structure

1. **Types**: Migrate from `packages/shared` to `packages/core`
2. **Database**: Extract logic to `packages/db`
3. **Components**: Move reusable components to `packages/ui`
4. **Features**: Refactor into `packages/modules`

### Backwards Compatibility

- Keep existing API endpoints
- Support legacy data formats
- Gradual migration of features

## Future Enhancements

1. **Electron Desktop App**: Native desktop wrapper
2. **Mobile Apps**: React Native or PWA
3. **End-to-End Encryption**: Encrypted sync
4. **Plugin System**: Community extensions
5. **Graph Visualization**: Interactive knowledge graph
6. **AI Integration**: Smart suggestions and automation
7. **Collaboration**: Real-time collaborative editing

## References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Yjs CRDT Documentation](https://docs.yjs.dev/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Unified/Remark](https://unifiedjs.com/)
- [Zod Documentation](https://zod.dev/)
