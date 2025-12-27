# Graph Intelligence & Daily Notes Documentation

## Overview

This document describes the Graph Intelligence layer (Phase E) and Daily Notes system (Phase F) implemented in the AI-Integrated Task Manager. These features enable Obsidian-like knowledge management capabilities without requiring a graph visualization UI.

---

## Phase E: Graph Intelligence Layer

### Concept

The graph intelligence layer treats notes as **nodes** and links as **edges**, enabling powerful graph-based queries without requiring a stored graph structure or visualization. The graph is **derived data** - it's computed on-demand from the existing `obsidian_notes` and `obsidian_note_links` tables.

### Key Features

1. **Queryability without Visualization**: Access graph data programmatically even without a UI
2. **Indexed Performance**: All queries use database indexes on `source_note_id` and `target_note_id`
3. **O(nodes + edges) Complexity**: Graph traversals are optimized to avoid recursive queries
4. **Cycle Detection**: BFS traversal prevents infinite loops
5. **Unresolved Link Tracking**: Identifies "missing" notes that should exist

### Graph Properties

- **Directed Graph**: Links have direction (source → target)
- **Virtual Nodes**: Unresolved links represent notes that don't exist yet
- **Bidirectional Traversal**: Neighbor queries follow both outgoing and incoming links

---

## API Reference - Graph Intelligence

### 1. Get Outgoing Links

Get all notes referenced by a given note (including unresolved targets).

```http
GET /api/obsidian-notes/:id/graph/outgoing
```

**Response:**
```json
[
  {
    "id": "uuid-123",
    "title": "Resolved Note",
    "folderPath": "Work/Projects"
  },
  {
    "id": "unresolved:Future Note",
    "title": "Future Note",
    "folderPath": null
  }
]
```

**Use Cases:**
- Show what a note references
- Build "what this note talks about" section
- Find unresolved dependencies

---

### 2. Get Backlinks

Get all notes that link to a given note.

```http
GET /api/obsidian-notes/:id/graph/backlinks
```

**Response:**
```json
[
  {
    "id": "uuid-456",
    "title": "Source Note 1",
    "folderPath": "Daily"
  },
  {
    "id": "uuid-789",
    "title": "Source Note 2",
    "folderPath": null
  }
]
```

**Use Cases:**
- Show what links to this note
- Find related context
- Build "mentioned in" section

---

### 3. Get Neighbors (Depth-N Traversal)

Perform breadth-first search to find all notes within N hops of the origin.

```http
GET /api/obsidian-notes/:id/graph/neighbors?depth=2
```

**Parameters:**
- `depth` (query): Maximum traversal depth (0-10, default: 1)

**Response:**
```json
{
  "nodes": [
    {
      "noteId": "uuid-origin",
      "title": "Origin Note",
      "depth": 0
    },
    {
      "noteId": "uuid-neighbor1",
      "title": "Direct Neighbor",
      "depth": 1
    },
    {
      "noteId": "uuid-neighbor2",
      "title": "Second-Degree Neighbor",
      "depth": 2
    }
  ],
  "edges": [
    {
      "sourceNoteId": "uuid-origin",
      "targetNoteId": "uuid-neighbor1",
      "linkType": "wikilink"
    },
    {
      "sourceNoteId": "uuid-neighbor1",
      "targetNoteId": "uuid-neighbor2",
      "linkType": "wikilink"
    }
  ]
}
```

**Use Cases:**
- Find related notes within X hops
- Build local knowledge clusters
- Discover connections between concepts
- Power AI reasoning over knowledge graph

**Depth Meanings:**
- `depth=0`: Origin note only
- `depth=1`: Direct neighbors (one hop away)
- `depth=2`: Neighbors and their neighbors
- `depth=N`: All notes within N hops

---

### 4. Get Unresolved Links

Get all missing notes that are referenced but don't exist.

```http
GET /api/obsidian-notes/graph/unresolved
```

**Response:**
```json
[
  {
    "sourceNoteId": "uuid-123",
    "missingTitle": "Future Project",
    "count": 3
  },
  {
    "sourceNoteId": "uuid-456",
    "missingTitle": "Research Topic",
    "count": 1
  }
]
```

**Use Cases:**
- Show "create missing note" suggestions
- Find gaps in knowledge base
- Prioritize note creation by link count
- Build "wanted pages" view (like Wikipedia)

---

### 5. Get Orphan Notes

Get all notes with no incoming or outgoing links.

```http
GET /api/obsidian-notes/graph/orphans
```

**Response:**
```json
[
  {
    "id": "uuid-789",
    "title": "Isolated Note",
    "folderPath": "Drafts"
  }
]
```

**Use Cases:**
- Find notes that need better linking
- Identify stale/forgotten notes
- Surface content that might be valuable but disconnected

---

### 6. Get Connected Notes

Get all notes with at least one link (incoming or outgoing).

```http
GET /api/obsidian-notes/graph/connected
```

**Response:**
```json
[
  {
    "id": "uuid-123",
    "title": "Well-Connected Note",
    "folderPath": "Knowledge Base"
  }
]
```

**Use Cases:**
- Show active knowledge areas
- Complement of orphan notes
- Measure knowledge base health

---

## Performance Characteristics

All graph queries are optimized for performance:

| Query | Complexity | Indexes Used |
|-------|-----------|--------------|
| Outgoing Links | O(outgoing links) | `idx_obsidian_note_links_source` |
| Backlinks | O(incoming links) | `idx_obsidian_note_links_target` |
| Neighbors (depth N) | O(nodes + edges) | Both source and target indexes |
| Unresolved Links | O(unresolved links) | Target index (for NULL checks) |
| Orphan Notes | O(all notes) | Both indexes for NOT EXISTS |
| Connected Notes | O(all notes) | Both indexes for EXISTS |

---

## Phase F: Daily Notes System

### Concept

Daily notes provide a consistent entry point for journaling, task planning, habit tracking, and knowledge linking. Each day gets its own note that automatically integrates with the graph and task system.

### Key Features

1. **Idempotent Creation**: Calling multiple times for the same date returns the same note
2. **Template System**: Customizable daily note templates with variable substitution
3. **Auto-Linking**: Wikilinks in daily notes participate in backlinks and graph
4. **Date-Based Organization**: Notes stored in "Daily/" folder with YYYY-MM-DD titles

---

## API Reference - Daily Notes

### 1. Get or Create Today's Daily Note

```http
POST /api/obsidian-notes/daily
```

**Response:**
```json
{
  "id": "uuid-daily-123",
  "title": "2024-12-27",
  "folderPath": "Daily",
  "contentMarkdown": "## 📝 Tasks Today\n- [ ] \n\n## 🔁 Habits\n...",
  "frontmatter": "{\"type\":\"daily\",\"date\":\"2024-12-27\"}",
  "createdAt": "2024-12-27T10:00:00Z",
  "updatedAt": "2024-12-27T10:00:00Z"
}
```

**Use Cases:**
- One-click daily entry point
- Quick capture for tasks and thoughts
- Daily planning workflow

---

### 2. Get or Create Daily Note for Specific Date

```http
GET /api/obsidian-notes/daily/:date
```

**Parameters:**
- `date` (path): Date in YYYY-MM-DD format

**Example:**
```http
GET /api/obsidian-notes/daily/2024-01-15
```

**Response:** Same as above but for the specified date

**Use Cases:**
- Review past daily notes
- Plan future dates
- Fill in missed days

---

### 3. Get Daily Template

```http
GET /api/obsidian-notes/templates/daily
```

**Response:**
```json
{
  "content": "## 📝 Tasks Today\n- [ ] \n\n## 🔁 Habits\n- [ ] Sleep 7–8h\n...",
  "frontmatter": {
    "type": "daily"
  }
}
```

---

### 4. Update Daily Template

```http
PUT /api/obsidian-notes/templates/daily
```

**Request Body:**
```json
{
  "content": "# {{date}} - {{weekday}}\n\n## Goals\n- \n\n## Notes\n",
  "frontmatter": {
    "type": "daily",
    "custom": "value"
  }
}
```

**Template Variables:**
- `{{date}}`: Replaced with YYYY-MM-DD
- `{{weekday}}`: Replaced with day name (e.g., "Monday")

---

### 5. Reset Template to Default

```http
POST /api/obsidian-notes/templates/daily/reset
```

---

## Daily Note Template Variables

Daily note templates support variable substitution:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{date}}` | Date in YYYY-MM-DD format | `2024-12-27` |
| `{{weekday}}` | Day of week name | `Friday` |

**Example Template:**
```markdown
# {{date}} - {{weekday}}

## 📝 Tasks Today
- [ ] 

## 🔁 Habits
- [ ] Sleep 7–8h
- [ ] Exercise
- [ ] Study
- [ ] Journal

## 💭 Reflection
-

## 🔗 Linked Projects
- [[Project A]]
- [[Project B]]
```

---

## Integration Examples

### Example 1: Command Palette - Quick Note Switcher

```javascript
// Fetch neighbors to show related notes
const response = await fetch(`/api/obsidian-notes/${currentNoteId}/graph/neighbors?depth=1`);
const { nodes } = await response.json();

// Display as quick-switcher suggestions
nodes.forEach(node => {
  addSuggestion({
    title: node.title,
    type: node.depth === 0 ? 'current' : 'neighbor',
    action: () => openNote(node.noteId)
  });
});
```

---

### Example 2: AI Reasoning - Find Related Context

```javascript
// Get all neighbors within 2 hops for AI context
const response = await fetch(`/api/obsidian-notes/${noteId}/graph/neighbors?depth=2`);
const { nodes, edges } = await response.json();

// Build context for AI
const context = nodes.map(node => ({
  title: node.title,
  depth: node.depth,
  // Fetch content if needed
}));

// Send to AI for reasoning
const aiResponse = await aiService.analyze({
  currentNote: currentNoteContent,
  relatedNotes: context,
  question: userQuestion
});
```

---

### Example 3: Daily Planning Workflow

```javascript
// Create/open today's daily note
const response = await fetch('/api/obsidian-notes/daily', {
  method: 'POST'
});
const dailyNote = await response.json();

// Show in editor
editor.open(dailyNote);

// Daily note automatically has:
// - Template structure
// - Frontmatter with date
// - Links to projects that participate in graph
```

---

### Example 4: Knowledge Gap Analysis

```javascript
// Find all unresolved links
const response = await fetch('/api/obsidian-notes/graph/unresolved');
const unresolved = await response.json();

// Show "Create these notes" suggestions
unresolved
  .sort((a, b) => b.count - a.count) // Most referenced first
  .slice(0, 10)
  .forEach(link => {
    showSuggestion({
      title: `Create "${link.missingTitle}"`,
      description: `Referenced ${link.count} time(s)`,
      action: () => createNote(link.missingTitle)
    });
  });
```

---

### Example 5: Orphan Note Detection

```javascript
// Find lonely notes that need linking
const response = await fetch('/api/obsidian-notes/graph/orphans');
const orphans = await response.json();

// Show warning panel
if (orphans.length > 0) {
  showWarning(`You have ${orphans.length} orphan notes that might need linking`);
  orphans.forEach(note => {
    showOrphan({
      title: note.title,
      action: () => openNote(note.id)
    });
  });
}
```

---

## Future Enhancements

### Graph Visualization (Phase E+)
- Canvas-based force-directed graph
- Interactive node exploration
- Cluster detection and visualization
- Link strength/frequency visualization

### AI Integration (Phase E+)
- Graph-based recommendation engine
- "Notes you should link" suggestions
- Automatic cluster/topic detection
- Knowledge gap identification

### Daily Notes Enhancements (Phase F+)
- Weekly/monthly note templates
- Habit tracking integration with visual charts
- Task extraction from daily notes
- Automatic project link suggestions
- Time-based analytics (daily note streaks)

---

## Performance Best Practices

1. **Use appropriate depth for neighbor queries**: Higher depths exponentially increase query time
2. **Cache orphan/connected note lists**: These are expensive queries, cache for 5-10 minutes
3. **Index management**: Ensure indexes exist on `source_note_id` and `target_note_id`
4. **Batch operations**: When creating multiple notes, resolve links once at the end

---

## Testing

Comprehensive test suites are provided:

- **Graph Service Tests**: 17 tests covering all graph queries, cycles, depth traversal
- **Daily Notes Tests**: 17 tests covering templates, variable substitution, link integration

Run tests:
```bash
npm test -- graphService.test.ts
npm test -- dailyNotesService.test.ts
```

---

## Summary

The Graph Intelligence and Daily Notes features provide a solid foundation for:
- Knowledge graph exploration without visualization
- AI-powered reasoning over connected notes
- Consistent daily workflow
- Obsidian-like second brain functionality

All features are backend-ready and can be consumed by any UI or AI system.
