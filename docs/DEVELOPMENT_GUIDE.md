# Development Guide - Productivity OS

## Getting Started

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **Docker**: 20.10+ and Docker Compose
- **Git**: For version control
- **Code Editor**: VS Code recommended (with TypeScript extensions)

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Drmusab/Productivity.git
   cd Productivity
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies** (for local development):
   ```bash
   npm install
   ```

4. **Start development environment**:
   ```bash
   npm run dev
   ```

This will start Docker Compose with the dev profile, which includes:
- Backend API on `http://localhost:3001`
- Frontend app on `http://localhost:3000`
- Hot reload enabled for both

## Development Workflow

### Using Docker (Recommended)

**Start development environment**:
```bash
docker compose --profile dev up
```

**Rebuild after dependency changes**:
```bash
docker compose --profile dev up --build
```

**View logs**:
```bash
docker compose logs -f
```

**Stop services**:
```bash
docker compose down
```

### Local Development (Without Docker)

**Backend**:
```bash
cd apps/backend
npm install
npm run dev
```

**Frontend**:
```bash
cd apps/desktop
npm install
npm start
```

**Build packages**:
```bash
# Build all packages
npm run build --workspaces

# Build specific package
cd packages/core
npm run build
```

## Project Structure

### Monorepo Organization

```
productivity-os/
├── apps/                    # Applications
│   ├── backend/            # Node.js API
│   └── desktop/            # React frontend
├── packages/               # Shared packages
│   ├── core/              # Types, markdown, graph
│   ├── db/                # Database & sync
│   ├── ui/                # UI components
│   ├── modules/           # Feature modules
│   └── shared/            # Legacy (migrating to core)
├── infra/docker/          # Docker configuration
├── docs/                  # Documentation
└── scripts/               # CLI utilities
```

### Working with Packages

**Adding a new package**:

1. Create package directory:
   ```bash
   mkdir -p packages/my-package/src
   cd packages/my-package
   ```

2. Initialize package.json:
   ```json
   {
     "name": "@productivity-os/my-package",
     "version": "1.0.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch"
     }
   }
   ```

3. Create tsconfig.json:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"]
   }
   ```

4. Add to root tsconfig.json references:
   ```json
   {
     "references": [
       { "path": "./packages/my-package" }
     ]
   }
   ```

## TypeScript Development

### Strict Mode Rules

All code must comply with strict TypeScript:

❌ **Forbidden**:
```typescript
function bad(data: any) { // NO 'any' types
  return data.value;
}

let x; // NO implicit any
x = 5;
```

✅ **Correct**:
```typescript
function good<T>(data: T): T {
  return data;
}

let x: number;
x = 5;

// Or use Zod for runtime validation
const schema = z.object({
  value: z.string(),
});
```

### Using Zod Schemas

All data structures should have Zod schemas:

```typescript
import { z } from 'zod';

// Define schema
export const MyDataSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  count: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
});

// Infer TypeScript type
export type MyData = z.infer<typeof MyDataSchema>;

// Validate at runtime
const data = MyDataSchema.parse(unknownData);
```

### Project References

Build specific packages:

```bash
# Build core package only
tsc --build packages/core

# Build all packages
tsc --build

# Watch mode
tsc --build --watch
```

## Working with Markdown

### Parsing Wikilinks

```typescript
import { parseWikilinks } from '@productivity-os/core';

const content = "Check [[Other Note]] and [[Note|Alias]]";
const links = parseWikilinks(content);
// [
//   { text: '[[Other Note]]', target: 'Other Note' },
//   { text: '[[Note|Alias]]', target: 'Note', alias: 'Alias' }
// ]
```

### Frontmatter

```typescript
import { parseFrontmatter, updateFrontmatter } from '@productivity-os/core';

const content = `---
title: My Note
tags: [productivity]
---
# Content here`;

const frontmatter = parseFrontmatter(content);
// { title: 'My Note', tags: ['productivity'] }

const updated = updateFrontmatter(content, {
  ...frontmatter,
  author: 'User',
});
```

### Knowledge Graph

```typescript
import { createKnowledgeGraph } from '@productivity-os/core';

const graph = createKnowledgeGraph();

// Add notes
graph.addNote({
  id: '1',
  title: 'Note 1',
  content: 'Links to [[Note 2]]',
  // ...
});

// Get backlinks
const backlinks = graph.getBacklinks('2');

// Find related notes
const related = graph.getRelatedNotes('1');
```

## Database Operations

### IndexedDB (Frontend)

```typescript
import { createIndexedDB } from '@productivity-os/db';

const db = createIndexedDB();
await db.init();

// Add note
await db.addNote({
  id: crypto.randomUUID(),
  title: 'My Note',
  content: 'Content',
  // ...
});

// Query notes
const notes = await db.getAllNotes();
const tagged = await db.getNotesByTag('productivity');
```

### Sync Engine

```typescript
import { createSyncEngine } from '@productivity-os/db';

const sync = createSyncEngine({
  clientId: 'client-123',
  serverUrl: 'http://localhost:3001',
  autoSync: true,
});

// Listen to changes
sync.onChange('note', (operation) => {
  console.log('Note changed:', operation);
});

// Manual sync
await sync.sync('bidirectional');
```

## UI Components

### Command Palette

```typescript
import { CommandPalette, Command } from '@productivity-os/ui';

const commands: Command[] = [
  {
    id: 'new-note',
    title: 'Create New Note',
    category: 'Notes',
    keywords: ['new', 'create'],
    handler: async () => {
      // Create note
    },
    shortcut: 'Cmd+N',
  },
];

function App() {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <CommandPalette
      commands={commands}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
```

## Modules

### Kanban Module

```typescript
import { createKanbanModule } from '@productivity-os/modules';

const kanban = createKanbanModule();

// Create board
const board = kanban.createBoard('My Board');

// Add columns
const todoCol = kanban.addColumn(board.id, 'To Do', {
  color: '#ff5722',
  wipLimit: 5,
});

// Move task to column
kanban.moveTaskToColumn(task, todoCol.id);

// Get stats
const stats = kanban.getBoardStats(board.id);
```

### Pomodoro Module

```typescript
import { createPomodoroModule } from '@productivity-os/modules';

const pomodoro = createPomodoroModule({
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
});

// Subscribe to updates
pomodoro.subscribe((state, timeRemaining) => {
  console.log(`State: ${state}, Time: ${timeRemaining}s`);
});

// Start session
pomodoro.start(taskId);

// Pause/resume
pomodoro.pause();
pomodoro.resume();

// Complete
pomodoro.complete();
```

## Testing

### Running Tests

```bash
# All tests
npm test

# Specific package
cd packages/core
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Writing Tests

**Unit test example**:
```typescript
import { parseWikilinks } from '../markdown';

describe('parseWikilinks', () => {
  it('should parse simple wikilinks', () => {
    const content = '[[Note Title]]';
    const links = parseWikilinks(content);
    
    expect(links).toHaveLength(1);
    expect(links[0].target).toBe('Note Title');
  });
  
  it('should parse wikilinks with aliases', () => {
    const content = '[[Note|Alias]]';
    const links = parseWikilinks(content);
    
    expect(links[0].target).toBe('Note');
    expect(links[0].alias).toBe('Alias');
  });
});
```

## Debugging

### Backend Debugging

Add to `apps/backend/package.json`:
```json
{
  "scripts": {
    "debug": "node --inspect=0.0.0.0:9229 -r ts-node/register src/app.ts"
  }
}
```

In VS Code, create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Backend",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    }
  ]
}
```

### Frontend Debugging

Use React DevTools and browser DevTools.

**Enable source maps** in production:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

## Performance

### Web Workers

Create a web worker for heavy tasks:

```typescript
// workers/markdown-parser.worker.ts
import { parseMarkdown } from '@productivity-os/core';

self.addEventListener('message', async (e) => {
  const { content } = e.data;
  const ast = await parseMarkdown(content);
  self.postMessage({ ast });
});

// Usage
const worker = new Worker('./markdown-parser.worker.ts');
worker.postMessage({ content: markdownText });
worker.addEventListener('message', (e) => {
  const { ast } = e.data;
  // Use AST
});
```

### Memoization

```typescript
import { useMemo } from 'react';

function NoteList({ notes, filter }) {
  const filteredNotes = useMemo(() => {
    return notes.filter(note => 
      note.title.includes(filter)
    );
  }, [notes, filter]);
  
  return <div>{/* Render notes */}</div>;
}
```

## Common Issues

### TypeScript Errors

**Issue**: `Cannot find module '@productivity-os/core'`

**Solution**: Build the package first
```bash
cd packages/core
npm run build
```

### Docker Issues

**Issue**: Containers won't start

**Solution**: Check logs and rebuild
```bash
docker compose logs
docker compose down
docker compose up --build
```

### Hot Reload Not Working

**Issue**: Changes not reflected in browser

**Solution**: Ensure polling is enabled in `.env`
```
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

## Code Style

### Naming Conventions

- **Files**: kebab-case (`markdown-parser.ts`)
- **Components**: PascalCase (`CommandPalette.tsx`)
- **Functions**: camelCase (`parseWikilinks`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types**: PascalCase (`Note`, `SyncOperation`)

### File Organization

```typescript
// 1. Imports
import { z } from 'zod';
import type { Note } from './types';

// 2. Types and interfaces
export interface Config {
  // ...
}

// 3. Schemas
export const ConfigSchema = z.object({
  // ...
});

// 4. Functions
export function doSomething(): void {
  // ...
}

// 5. Classes
export class MyClass {
  // ...
}

// 6. Exports
export { otherFunction } from './utils';
```

### Comments

Use JSDoc for functions:

```typescript
/**
 * Parses wikilinks from markdown content
 * 
 * @param content - Markdown content to parse
 * @returns Array of wikilink objects
 * @throws {Error} If content is invalid
 * 
 * @example
 * ```typescript
 * const links = parseWikilinks('[[Note]]');
 * // [{ target: 'Note', text: '[[Note]]' }]
 * ```
 */
export function parseWikilinks(content: string): Wikilink[] {
  // Implementation
}
```

## Best Practices

### 1. Local-First Development

Always implement local storage first:
```typescript
// ✅ Good
await db.addNote(note);
syncQueue.enqueue(note);

// ❌ Bad
await fetch('/api/notes', { method: 'POST', body: note });
```

### 2. Type Safety

Use Zod for validation:
```typescript
// ✅ Good
const validated = NoteSchema.parse(data);

// ❌ Bad
const note = data as Note;
```

### 3. Error Handling

Always handle errors gracefully:
```typescript
// ✅ Good
try {
  await db.addNote(note);
} catch (error) {
  logger.error('Failed to add note', error);
  showErrorToUser('Could not save note');
}
```

### 4. Performance

Offload heavy tasks:
```typescript
// ✅ Good
const worker = new Worker('./parser.worker.ts');
worker.postMessage({ content });

// ❌ Bad (blocks UI)
const ast = await parseMarkdown(content);
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev/)
- [React Documentation](https://react.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [Yjs Guide](https://docs.yjs.dev/)

## Getting Help

- Check existing [GitHub Issues](https://github.com/Drmusab/Productivity/issues)
- Review [Architecture Documentation](./ARCHITECTURE.md)
- Ask in project discussions
