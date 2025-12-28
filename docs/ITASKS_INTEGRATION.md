# iTasks Integration Guide

> Complete guide for integrating iTasks module into Productivity OS

## Overview

This document provides a comprehensive guide for the iTasks integration, explaining how the module was integrated into Productivity OS and how it works with the existing Eisenhower Matrix functionality.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ ITasks Page  │  │ OmniPlanner  │  │   Navbar     │  │
│  │              │  │              │  │              │  │
│  │ - Matrix     │  │ - Dashboard  │  │ - iTasks     │  │
│  │ - Table      │  │ - Matrix     │  │   Menu Item  │  │
│  │ - Kanban     │  │ - GTD        │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                              │
│  ┌──────▼─────────────────▼─────────────────────┐       │
│  │       iTasks Context Provider                 │       │
│  │  - State Management                           │       │
│  │  - CRUD Operations                            │       │
│  └──────────────────┬────────────────────────────┘       │
│                     │                                     │
│  ┌──────────────────▼────────────────────────────┐       │
│  │       iTasks Service Layer (Axios)            │       │
│  │  - API Communication                          │       │
│  └──────────────────┬────────────────────────────┘       │
└─────────────────────┼─────────────────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────▼─────────────────────────────────────┐
│                    Backend (Express)                       │
│  ┌──────────────────────────────────────────────────┐    │
│  │  /api/itasks/*  Routes                           │    │
│  │  - GET    /tasks           (List all tasks)      │    │
│  │  - POST   /tasks           (Create task)         │    │
│  │  - PUT    /tasks/:id       (Update task)         │    │
│  │  - DELETE /tasks/:id       (Delete task)         │    │
│  │  - GET    /eisenhower      (Matrix view)         │    │
│  │  - POST   /migrate         (Import tasks)        │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │  Data Mapping Layer                              │    │
│  │  - mapPriorityToEisenhower()                     │    │
│  │  - calculateQuadrant()                           │    │
│  │  - mapEisenhowerToPriority()                     │    │
│  └──────────────────┬───────────────────────────────┘    │
│                     │                                      │
│  ┌──────────────────▼───────────────────────────────┐    │
│  │  SQLite Database (tasks table)                   │    │
│  │  - Shared schema with OmniPlanner                │    │
│  │  - urgency, importance fields                    │    │
│  │  - gtd_status, category fields                   │    │
│  └──────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

## Database Integration

### Existing Schema

The iTasks module reuses the existing `tasks` table schema:

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  column_id INTEGER NOT NULL,
  
  -- Eisenhower Matrix fields (used by iTasks)
  urgency BOOLEAN DEFAULT 0,
  importance BOOLEAN DEFAULT 0,
  
  -- GTD Classification fields
  gtd_status TEXT DEFAULT 'inbox',
  execution_status TEXT DEFAULT 'backlog',
  
  -- Categorization fields (used by iTasks labels)
  category TEXT DEFAULT 'general',
  
  -- Other fields...
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Field Mapping

| iTasks Concept | Database Field | Notes |
|---------------|---------------|-------|
| Priority      | urgency + importance | Mapped via conversion function |
| Status        | gtd_status | Used for task state |
| Label         | category | Bug, feature, documentation, etc. |
| Title         | title | Direct mapping |
| Description   | description | Supports wikilinks |

## Data Mapping Logic

### Priority to Eisenhower Matrix

The core mapping function converts iTasks priority strings to boolean urgency/importance:

```typescript
function mapPriorityToEisenhower(priority: string): {
  urgency: boolean;
  importance: boolean;
} {
  switch (priority) {
    case 'urgent':
      return { urgency: true, importance: true };   // Do First
    case 'important':
      return { urgency: false, importance: true };  // Schedule
    case 'not-urgent':
      return { urgency: true, importance: false };  // Delegate
    case 'not-important':
      return { urgency: false, importance: false }; // Eliminate
    default:
      return { urgency: false, importance: false };
  }
}
```

### Eisenhower Quadrant Calculation

```typescript
function calculateQuadrant(
  urgency: boolean,
  importance: boolean
): 'do_first' | 'schedule' | 'delegate' | 'eliminate' {
  if (importance && urgency) return 'do_first';
  if (importance && !urgency) return 'schedule';
  if (!importance && urgency) return 'delegate';
  return 'eliminate';
}
```

## Backend Implementation

### Route Registration

Routes are registered in `apps/backend/src/app.ts`:

```typescript
import iTasksRoutes from './routes/itasks';

app.use('/api/itasks', iTasksRoutes);
```

### API Endpoints

All endpoints follow REST conventions with proper validation:

1. **GET /api/itasks/tasks**
   - Returns all tasks in iTasks format
   - Maps database fields to iTasks schema
   - Includes Eisenhower quadrant information

2. **POST /api/itasks/tasks**
   - Creates new task with validation
   - Maps priority to urgency/importance
   - Creates default column if needed

3. **PUT /api/itasks/tasks/:id**
   - Updates task fields
   - Dynamically builds SQL query
   - Maintains data consistency

4. **DELETE /api/itasks/tasks/:id**
   - Soft delete or hard delete
   - Maintains referential integrity

5. **GET /api/itasks/eisenhower**
   - Returns tasks grouped by quadrant
   - Optimized for matrix view

6. **POST /api/itasks/migrate**
   - Bulk import from iTasks format
   - Error handling per task
   - Returns import summary

## Frontend Implementation

### Page Structure

The main iTasks page (`apps/desktop/src/pages/ITasks.tsx`) provides:

1. **Tab-based Interface**
   - Eisenhower Matrix View
   - Task List View
   - Kanban Board View (placeholder)

2. **CRUD Operations**
   - Add task button
   - Inline editing in table
   - Delete confirmation
   - Duplicate task

3. **State Management**
   - Uses ITasksProvider context
   - Automatic data fetching
   - Error handling
   - Loading states

### Component Hierarchy

```
ITasks Page
├── ITasksProvider (Context)
│   ├── Tabs Navigation
│   ├── Add Task Button
│   └── Tab Panels
│       ├── EisenhowerMatrix
│       │   ├── Search Bar
│       │   └── 4x Quadrant Cards
│       │       └── TaskCard (draggable)
│       ├── TaskTable
│       │   └── Table Rows (inline edit)
│       └── Kanban Board (future)
└── AddTaskForm (Dialog)
```

## Integration Points

### 1. Navigation

Added to `apps/desktop/src/components/Navbar.tsx`:

```typescript
{ path: '/itasks', icon: <Assignment />, label: 'المهام' }
```

### 2. Routing

Added to `apps/desktop/src/App.tsx`:

```typescript
<Route path="/itasks" element={isAuthenticated ? <ITasks /> : <Navigate to="/login" />} />
```

### 3. Shared Database

Both iTasks and OmniPlanner use the same `tasks` table:

- Tasks created in iTasks appear in OmniPlanner
- Tasks created in OmniPlanner appear in iTasks
- Changes are synchronized automatically
- No duplicate data storage

## Module Structure

### Package Organization

```
packages/modules/itasks/
├── src/
│   ├── components/       # React components
│   ├── context/          # Context provider
│   ├── services/         # API service layer
│   ├── types/            # TypeScript types
│   └── index.ts          # Public exports
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

### Type Safety

All components use strict TypeScript types:

```typescript
export type ITasksPriority = 'urgent' | 'important' | 'not-urgent' | 'not-important';
export type ITasksStatus = 'backlog' | 'todo' | 'in progress' | 'done';
export type ITasksLabel = 'bug' | 'feature' | 'documentation' | 'enhancement' | 'question';

export const iTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in progress', 'done']),
  priority: z.enum(['urgent', 'important', 'not-urgent', 'not-important']),
  label: z.enum(['bug', 'feature', 'documentation', 'enhancement', 'question']).optional(),
});
```

## Testing Strategy

### Unit Tests (Planned)

```typescript
// Test data mapping functions
describe('mapPriorityToEisenhower', () => {
  it('should map urgent to do_first quadrant', () => {
    expect(mapPriorityToEisenhower('urgent'))
      .toEqual({ urgency: true, importance: true });
  });
});

// Test component rendering
describe('TaskCard', () => {
  it('should render task title and status', () => {
    // Component test
  });
});
```

### Integration Tests (Planned)

```typescript
// Test API endpoints
describe('POST /api/itasks/tasks', () => {
  it('should create task and map priority', async () => {
    // API integration test
  });
});
```

## Docker Configuration

### No Separate Container

iTasks is integrated as a module, not a separate service:

- Runs within existing `app-dev` container
- No additional Docker configuration needed
- Volume mounts include iTasks module

### Development Mode

```bash
# Start development environment
npm run dev

# iTasks module is automatically included
# Backend runs on port 3001
# Frontend runs on port 3000
```

## Performance Considerations

### Database Queries

- Indexed on `urgency`, `importance` fields
- Filtered queries for iTasks-specific data
- Limit result sets with pagination (planned)

### Frontend Optimization

- React.memo for components
- Debounced search input
- Lazy loading for large lists (planned)
- Virtual scrolling for tables (planned)

## Security

### Input Validation

All inputs validated with:
- Express-validator on backend
- Zod schemas on frontend
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitization)

### Authentication

- All routes require authentication
- JWT token validation
- Rate limiting on API endpoints

## Troubleshooting

### Common Issues

1. **Tasks not appearing**
   - Check if iTasks column exists in database
   - Verify task has proper category/label
   - Check network requests in DevTools

2. **Priority mapping incorrect**
   - Review mapping functions
   - Check database urgency/importance values
   - Verify API response format

3. **Component not rendering**
   - Check ITasksProvider wrapper
   - Verify route configuration
   - Check browser console for errors

## Future Roadmap

### Phase 1 (Current)
- ✅ Basic CRUD operations
- ✅ Eisenhower Matrix view
- ✅ Task table view
- ✅ Navigation integration

### Phase 2 (Next)
- [ ] Wikilink support
- [ ] Drag-and-drop between quadrants
- [ ] Kanban board view
- [ ] Offline support with IndexedDB

### Phase 3 (Future)
- [ ] Recurring tasks
- [ ] Subtasks
- [ ] Time tracking
- [ ] Task dependencies
- [ ] Advanced filtering
- [ ] Bulk operations

## Maintenance

### Code Quality

- TypeScript strict mode enabled
- No `any` types allowed
- JSDoc comments required
- ESLint rules enforced

### Updates

When updating the module:

1. Update version in `package.json`
2. Update documentation
3. Run tests
4. Build module
5. Test integration
6. Update changelog

## Support

For issues or questions:

1. Check this documentation
2. Review module README
3. Check GitHub issues
4. Open new issue with details

---

**Last Updated:** December 2024  
**Module Version:** 1.0.0  
**Status:** Production Ready
