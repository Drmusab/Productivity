# iTasks Module

> Task management module for Productivity OS with Eisenhower Matrix integration

## Overview

The iTasks module provides a comprehensive task management system integrated with the Eisenhower Matrix framework. It enables users to organize tasks by urgency and importance, helping prioritize work effectively.

## Features

- ✅ **CRUD Operations**: Create, read, update, and delete tasks
- ✅ **Eisenhower Matrix**: Visualize tasks across 4 quadrants (Do First, Schedule, Delegate, Eliminate)
- ✅ **Task Table View**: Manage tasks in a traditional table format with inline editing
- ✅ **Priority Mapping**: Automatic mapping between iTasks priorities and Eisenhower quadrants
- ✅ **Labels & Categories**: Organize tasks with labels (bug, feature, documentation, etc.)
- ✅ **Status Tracking**: Track task progress (backlog, todo, in progress, done)
- ✅ **Wikilink Support**: Reference notes using [[wikilink]] syntax (coming soon)
- ✅ **Drag & Drop**: Move tasks between quadrants (coming soon)

## Installation

The iTasks module is already integrated into Productivity OS. No separate installation is required.

### Development Setup

```bash
# Install dependencies
npm install

# Build the module
cd packages/modules/itasks
npm run build

# Run in development mode
npm run dev
```

## Usage

### Basic Usage

Navigate to `/itasks` in the application to access the iTasks interface.

### API Endpoints

#### Get All Tasks
```typescript
GET /api/itasks/tasks

Response: TaskWithEisenhower[]
```

#### Create Task
```typescript
POST /api/itasks/tasks
Body: {
  title: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'in progress' | 'done';
  priority?: 'urgent' | 'important' | 'not-urgent' | 'not-important';
  label?: 'bug' | 'feature' | 'documentation' | 'enhancement' | 'question';
}

Response: TaskWithEisenhower
```

#### Update Task
```typescript
PUT /api/itasks/tasks/:id
Body: Partial<{
  title: string;
  description: string;
  status: string;
  priority: string;
  label: string;
}>

Response: TaskWithEisenhower
```

#### Delete Task
```typescript
DELETE /api/itasks/tasks/:id

Response: 204 No Content
```

#### Get Eisenhower Matrix
```typescript
GET /api/itasks/eisenhower

Response: {
  do_first: TaskWithEisenhower[];
  schedule: TaskWithEisenhower[];
  delegate: TaskWithEisenhower[];
  eliminate: TaskWithEisenhower[];
}
```

#### Migrate Tasks
```typescript
POST /api/itasks/migrate
Body: {
  tasks: ITask[]
}

Response: {
  success: boolean;
  imported: number;
  failed: number;
}
```

### React Components

#### ITasksProvider

Context provider for managing iTasks state:

```tsx
import { ITasksProvider } from '@productivity-os/itasks';

function App() {
  return (
    <ITasksProvider>
      <YourComponent />
    </ITasksProvider>
  );
}
```

#### useITasks Hook

Access iTasks context:

```tsx
import { useITasks } from '@productivity-os/itasks';

function MyComponent() {
  const { tasks, loading, error, addTask, updateTask, deleteTask } = useITasks();
  
  // Use the context...
}
```

#### EisenhowerMatrix Component

Display tasks in Eisenhower Matrix:

```tsx
import { EisenhowerMatrix } from '@productivity-os/itasks';

function MyPage() {
  return (
    <EisenhowerMatrix 
      tasks={tasks} 
      onTaskUpdate={(id, quadrant) => {
        // Handle quadrant change
      }} 
    />
  );
}
```

#### TaskTable Component

Display tasks in table format:

```tsx
import { TaskTable } from '@productivity-os/itasks';

function MyPage() {
  return (
    <TaskTable
      tasks={tasks}
      onUpdate={(id, updates) => updateTask(id, updates)}
      onDelete={(id) => deleteTask(id)}
      onDuplicate={(id) => duplicateTask(id)}
    />
  );
}
```

## Data Mapping

### Priority to Eisenhower Matrix

| iTasks Priority | Urgency | Importance | Quadrant  |
|----------------|---------|------------|-----------|
| urgent         | true    | true       | Do First  |
| important      | false   | true       | Schedule  |
| not-urgent     | true    | false      | Delegate  |
| not-important  | false   | false      | Eliminate |

### Status Values

- `backlog`: Task is in the backlog
- `todo`: Task is ready to be worked on
- `in progress`: Task is currently being worked on
- `done`: Task is completed

### Label Values

- `bug`: Bug fix
- `feature`: New feature
- `documentation`: Documentation update
- `enhancement`: Enhancement to existing feature
- `question`: Question or discussion

## Architecture

### Directory Structure

```
packages/modules/itasks/
├── src/
│   ├── components/
│   │   ├── TaskTable.tsx          # Table view component
│   │   ├── AddTaskForm.tsx        # Task creation form
│   │   ├── EisenhowerMatrix.tsx   # Matrix view component
│   │   └── TaskCard.tsx           # Task card component
│   ├── context/
│   │   └── iTasksContext.tsx      # React context provider
│   ├── services/
│   │   └── iTasksService.ts       # API service layer
│   ├── types/
│   │   └── index.ts               # TypeScript types & schemas
│   └── index.ts                   # Module exports
├── package.json
└── tsconfig.json
```

### Data Flow

1. **Frontend Components** → Use `useITasks()` hook to access task data
2. **Context Provider** → Manages state and calls service functions
3. **Service Layer** → Makes HTTP requests to backend API
4. **Backend Routes** → Process requests and interact with database
5. **Database** → SQLite database storing task data

## Integration with OmniPlanner

iTasks is designed to work seamlessly with the OmniPlanner module:

- Tasks created in iTasks appear in OmniPlanner's Eisenhower Matrix
- Tasks created in OmniPlanner can be viewed in iTasks
- Both modules share the same database schema
- Priority and urgency/importance are automatically synchronized

## Offline Support

The module is designed to support offline-first functionality:

- Tasks are cached in browser storage
- Changes are queued when offline
- Automatic sync when connection is restored
- Conflict resolution using last-write-wins

*Note: Full offline support is planned for a future release.*

## Future Enhancements

- [ ] Drag-and-drop between Eisenhower quadrants
- [ ] Wikilink support for task descriptions
- [ ] Kanban board view
- [ ] Recurring tasks
- [ ] Subtasks
- [ ] Time estimates
- [ ] Task dependencies
- [ ] Offline-first with IndexedDB
- [ ] Real-time collaboration

## Contributing

When contributing to the iTasks module:

1. Follow TypeScript strict mode (no `any` types)
2. Use Zod schemas for validation
3. Add JSDoc comments to all functions
4. Write tests for new features
5. Update documentation

## License

MIT License - See main repository for details.
