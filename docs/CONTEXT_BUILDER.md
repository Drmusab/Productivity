# Context Builder Specification

## Overview

The Context Builder is the **most critical component** of the AI system. It dynamically assembles relevant context from the workspace to provide to the AI model, ensuring:

- **Relevance** - Only include information that helps answer the query
- **Efficiency** - Stay within token budgets
- **Privacy** - Respect permissions
- **Coherence** - Maintain logical context structure

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CONTEXT BUILDER                                        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       INPUT LAYER                                        │    │
│  │  • User Query                                                            │    │
│  │  • Current Block/Page Focus                                              │    │
│  │  • Conversation History (if chat)                                        │    │
│  │  • User Context (preferences, recent activity)                           │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     CONTEXT COLLECTORS                                   │    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │   Focus     │  │   Semantic  │  │   Relation  │  │   Activity  │     │    │
│  │  │   Collector │  │   Collector │  │   Collector │  │   Collector │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     RELEVANCE RANKER                                     │    │
│  │  • Score each context piece                                              │    │
│  │  • Consider query intent                                                 │    │
│  │  • Apply recency boost                                                   │    │
│  │  • Apply structural proximity boost                                      │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     TOKEN BUDGET MANAGER                                 │    │
│  │  • Total budget allocation                                               │    │
│  │  • Category budgets (focus, semantic, relations)                         │    │
│  │  • Greedy selection with cutoff                                          │    │
│  │  • Truncation strategies                                                 │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     CONTEXT ASSEMBLER                                    │    │
│  │  • Format context for model                                              │    │
│  │  • Add section markers                                                   │    │
│  │  • Include metadata hints                                                │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│                          FINAL CONTEXT PAYLOAD                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Interfaces

### 2.1 Context Builder Interface

```typescript
interface ContextBuilder {
  /**
   * Build context for an AI request
   */
  build(request: ContextRequest): Promise<ContextPayload>;
  
  /**
   * Estimate token count for built context
   */
  estimateTokens(payload: ContextPayload): number;
  
  /**
   * Validate context meets requirements
   */
  validate(payload: ContextPayload): ContextValidationResult;
}

interface ContextRequest {
  // The user's query or request
  query: string;
  
  // Current focus point
  focus?: {
    blockId?: string;
    pageId?: string;
    databaseId?: string;
  };
  
  // Request type affects context selection
  type: 'assist' | 'chat' | 'search' | 'automate';
  
  // User making the request
  user: User;
  
  // Conversation history for chat
  conversationHistory?: ConversationMessage[];
  
  // Token budget
  tokenBudget: TokenBudget;
  
  // Custom context requirements
  hints?: ContextHints;
}

interface TokenBudget {
  total: number;                     // Total tokens available for context
  focus: number;                     // Reserved for focused content
  semantic: number;                  // Reserved for semantic search results
  relations: number;                 // Reserved for related content
  history: number;                   // Reserved for conversation history
  system: number;                    // Reserved for system prompts
}

interface ContextHints {
  // Block types to prioritize
  prioritizeTypes?: BlockType[];
  
  // Time range to focus on
  timeRange?: { start: string; end: string };
  
  // Specific blocks to include
  includeBlocks?: string[];
  
  // Blocks to exclude
  excludeBlocks?: string[];
  
  // Depth of tree traversal
  maxDepth?: number;
}
```

### 2.2 Context Payload

```typescript
interface ContextPayload {
  // Structured context sections
  sections: ContextSection[];
  
  // Metadata about the context
  metadata: {
    totalTokens: number;
    focusBlockId?: string;
    focusPageId?: string;
    timestamp: string;
    
    // Debug info
    collectorsUsed: string[];
    blocksIncluded: number;
    blocksConsidered: number;
  };
  
  // Serialized for model input
  serialized: string;
}

interface ContextSection {
  // Section identifier
  type: 'focus' | 'semantic' | 'relations' | 'activity' | 'history' | 'system';
  
  // Section title for model context
  title: string;
  
  // Content items in this section
  items: ContextItem[];
  
  // Token count for this section
  tokenCount: number;
}

interface ContextItem {
  // Source block ID
  blockId: string;
  
  // Block type
  blockType: BlockType;
  
  // Rendered content
  content: string;
  
  // Relevance score (0-1)
  relevance: number;
  
  // Additional metadata
  metadata?: {
    pageTitle?: string;
    path?: string[];              // Breadcrumb path
    lastModified?: string;
  };
}
```

---

## 3. Context Collectors

### 3.1 Focus Collector

Collects content directly around the user's focus point.

```typescript
class FocusCollector implements ContextCollector {
  async collect(request: ContextRequest): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    
    if (request.focus?.blockId) {
      // Get the focused block
      const block = await this.blockStore.get(request.focus.blockId);
      items.push(this.blockToItem(block, 1.0));  // Max relevance
      
      // Get parent chain (breadcrumb)
      const ancestors = await this.getAncestors(block, 3);  // Up to 3 levels
      ancestors.forEach((ancestor, i) => {
        items.push(this.blockToItem(ancestor, 0.9 - i * 0.1));
      });
      
      // Get siblings for context
      const siblings = await this.getSiblings(block, 2);  // 2 before, 2 after
      siblings.forEach((sibling, i) => {
        items.push(this.blockToItem(sibling, 0.8 - i * 0.05));
      });
      
      // Get children
      const children = await this.getChildren(block, 5);
      children.forEach((child, i) => {
        items.push(this.blockToItem(child, 0.85 - i * 0.05));
      });
    }
    
    if (request.focus?.pageId) {
      // Include page summary
      const page = await this.blockStore.get(request.focus.pageId);
      items.push(this.createPageSummary(page));
    }
    
    return items;
  }
}
```

### 3.2 Semantic Collector

Uses embeddings to find semantically related content.

```typescript
class SemanticCollector implements ContextCollector {
  async collect(request: ContextRequest): Promise<ContextItem[]> {
    // Search for semantically similar content
    const searchResults = await this.vectorSearch.search({
      query: request.query,
      topK: 20,                       // Get more than needed for ranking
      threshold: 0.7,                 // Minimum similarity
      filters: this.buildPermissionFilters(request.user),
    });
    
    // Convert to context items with relevance scores
    return searchResults.map(result => ({
      blockId: result.blockId,
      blockType: result.blockType,
      content: result.content,
      relevance: result.score,
      metadata: {
        pageTitle: result.metadata?.pageTitle,
        path: result.metadata?.path,
      },
    }));
  }
}
```

### 3.3 Relation Collector

Follows database relations and block links.

```typescript
class RelationCollector implements ContextCollector {
  async collect(request: ContextRequest): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    
    if (request.focus?.blockId) {
      const block = await this.blockStore.get(request.focus.blockId);
      
      // If it's a database row, get related rows
      if (block.type === BlockType.DB_ROW) {
        const relations = await this.getRelatedRows(block);
        relations.forEach(row => {
          items.push(this.rowToItem(row, 0.75));
        });
      }
      
      // Follow block links/references
      const linkedBlocks = await this.getLinkedBlocks(block);
      linkedBlocks.forEach(linked => {
        items.push(this.blockToItem(linked, 0.7));
      });
      
      // Get blocks that link TO this block
      const backlinks = await this.getBacklinks(block.id);
      backlinks.forEach(backlink => {
        items.push(this.blockToItem(backlink, 0.65));
      });
    }
    
    return items;
  }
}
```

### 3.4 Activity Collector

Collects recently accessed or modified content.

```typescript
class ActivityCollector implements ContextCollector {
  async collect(request: ContextRequest): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    
    // Get recently modified blocks by user
    const recentEdits = await this.getRecentEdits(request.user.id, 10);
    recentEdits.forEach((edit, i) => {
      items.push({
        ...this.blockToItem(edit.block, 0.6 - i * 0.02),
        metadata: {
          lastModified: edit.timestamp,
        },
      });
    });
    
    // Get recently viewed pages
    const recentViews = await this.getRecentViews(request.user.id, 5);
    recentViews.forEach((view, i) => {
      items.push(this.createPageSummary(view.page, 0.5 - i * 0.02));
    });
    
    return items;
  }
}
```

---

## 4. Relevance Ranking

### 4.1 Scoring Function

```typescript
interface RelevanceScorer {
  score(item: ContextItem, request: ContextRequest): number;
}

class CompositeRelevanceScorer implements RelevanceScorer {
  private weights = {
    semantic: 0.35,
    structural: 0.25,
    recency: 0.15,
    typeMatch: 0.15,
    userAffinity: 0.10,
  };
  
  score(item: ContextItem, request: ContextRequest): number {
    return (
      this.semanticScore(item, request) * this.weights.semantic +
      this.structuralScore(item, request) * this.weights.structural +
      this.recencyScore(item) * this.weights.recency +
      this.typeMatchScore(item, request) * this.weights.typeMatch +
      this.userAffinityScore(item, request) * this.weights.userAffinity
    );
  }
  
  private semanticScore(item: ContextItem, request: ContextRequest): number {
    // Already computed by semantic collector
    return item.relevance;
  }
  
  private structuralScore(item: ContextItem, request: ContextRequest): number {
    // Higher score for items closer in the tree
    if (!request.focus?.blockId) return 0.5;
    
    const distance = this.treeDistance(item.blockId, request.focus.blockId);
    return Math.max(0, 1 - distance * 0.1);
  }
  
  private recencyScore(item: ContextItem): number {
    if (!item.metadata?.lastModified) return 0.5;
    
    const age = Date.now() - new Date(item.metadata.lastModified).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Decay over 30 days
    return Math.max(0, 1 - age / (30 * dayMs));
  }
  
  private typeMatchScore(item: ContextItem, request: ContextRequest): number {
    // Prioritize certain types based on query intent
    const typeWeights: Record<string, number> = {
      todo: request.query.includes('task') ? 0.9 : 0.5,
      kanban_card: request.query.includes('task') ? 0.9 : 0.5,
      page: request.query.includes('summary') ? 0.8 : 0.5,
    };
    
    return typeWeights[item.blockType] || 0.5;
  }
}
```

---

## 5. Token Budget Management

### 5.1 Budget Allocation

```typescript
interface BudgetAllocator {
  allocate(
    items: ContextItem[],
    budget: TokenBudget
  ): AllocatedContext;
}

class GreedyBudgetAllocator implements BudgetAllocator {
  allocate(items: ContextItem[], budget: TokenBudget): AllocatedContext {
    // Sort by relevance
    const sorted = [...items].sort((a, b) => b.relevance - a.relevance);
    
    const allocated: ContextItem[] = [];
    let usedTokens = 0;
    
    for (const item of sorted) {
      const itemTokens = this.estimateTokens(item.content);
      
      if (usedTokens + itemTokens <= budget.total) {
        allocated.push(item);
        usedTokens += itemTokens;
      } else if (usedTokens + 100 < budget.total) {
        // Try truncating the item to fit
        const truncated = this.truncateToFit(item, budget.total - usedTokens);
        if (truncated) {
          allocated.push(truncated);
          usedTokens = budget.total;
        }
        break;
      } else {
        break;
      }
    }
    
    return {
      items: allocated,
      usedTokens,
      remainingBudget: budget.total - usedTokens,
    };
  }
}
```

### 5.2 Truncation Strategies

```typescript
enum TruncationStrategy {
  // Keep beginning of content
  KEEP_START = 'keep_start',
  
  // Keep end of content
  KEEP_END = 'keep_end',
  
  // Keep most important sentences
  EXTRACTIVE = 'extractive',
  
  // Use AI to summarize
  SUMMARIZE = 'summarize',
}

class ContentTruncator {
  truncate(
    content: string,
    maxTokens: number,
    strategy: TruncationStrategy
  ): string {
    switch (strategy) {
      case TruncationStrategy.KEEP_START:
        return this.truncateFromEnd(content, maxTokens);
        
      case TruncationStrategy.KEEP_END:
        return this.truncateFromStart(content, maxTokens);
        
      case TruncationStrategy.EXTRACTIVE:
        return this.extractImportantSentences(content, maxTokens);
        
      case TruncationStrategy.SUMMARIZE:
        return this.summarize(content, maxTokens);
    }
  }
}
```

---

## 6. Context Assembly

### 6.1 Format Template

```typescript
const CONTEXT_TEMPLATE = `
## Current Context

### Focused Content
{focus_section}

### Related Content
{semantic_section}

### Connected Items
{relations_section}

### Recent Activity
{activity_section}

---

User Query: {query}
`;

class ContextAssembler {
  assemble(sections: ContextSection[], query: string): string {
    let output = CONTEXT_TEMPLATE;
    
    for (const section of sections) {
      const sectionContent = this.formatSection(section);
      const placeholder = `{${section.type}_section}`;
      output = output.replace(placeholder, sectionContent);
    }
    
    output = output.replace('{query}', query);
    
    return output;
  }
  
  private formatSection(section: ContextSection): string {
    if (section.items.length === 0) {
      return '_No relevant content found._';
    }
    
    return section.items
      .map(item => this.formatItem(item))
      .join('\n\n');
  }
  
  private formatItem(item: ContextItem): string {
    const header = item.metadata?.pageTitle
      ? `[${item.metadata.pageTitle}] `
      : '';
    
    const typeTag = `[${item.blockType}]`;
    
    return `${header}${typeTag}\n${item.content}`;
  }
}
```

---

## 7. Configuration

### 7.1 Default Configuration

```typescript
const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  tokenBudget: {
    total: 4000,
    focus: 1500,
    semantic: 1200,
    relations: 800,
    activity: 300,
    history: 500,
    system: 200,
  },
  
  collectors: {
    focus: {
      enabled: true,
      ancestorDepth: 3,
      siblingCount: 2,
      childrenLimit: 5,
    },
    semantic: {
      enabled: true,
      topK: 15,
      minThreshold: 0.6,
    },
    relations: {
      enabled: true,
      maxDepth: 2,
      maxItems: 10,
    },
    activity: {
      enabled: true,
      recentEditCount: 10,
      recentViewCount: 5,
      maxAgeHours: 72,
    },
  },
  
  ranking: {
    weights: {
      semantic: 0.35,
      structural: 0.25,
      recency: 0.15,
      typeMatch: 0.15,
      userAffinity: 0.10,
    },
  },
  
  truncation: {
    defaultStrategy: TruncationStrategy.EXTRACTIVE,
    minContentLength: 50,
  },
};
```

---

## 8. Example Flows

### 8.1 Page Summarization

```typescript
const request: ContextRequest = {
  query: 'Summarize this page',
  focus: { pageId: 'page-123' },
  type: 'assist',
  user: currentUser,
  tokenBudget: {
    total: 3000,
    focus: 2500,       // Most budget to focus
    semantic: 200,
    relations: 200,
    activity: 0,
    history: 0,
    system: 100,
  },
};

// Result: Context heavily weighted toward page children
```

### 8.2 Workspace Chat Query

```typescript
const request: ContextRequest = {
  query: 'What tasks are overdue?',
  focus: undefined,                    // No specific focus
  type: 'chat',
  user: currentUser,
  tokenBudget: {
    total: 4000,
    focus: 0,
    semantic: 2500,                    // Most budget to search
    relations: 500,
    activity: 500,
    history: 300,
    system: 200,
  },
  hints: {
    prioritizeTypes: [BlockType.TODO, BlockType.KANBAN_CARD],
  },
};

// Result: Context with overdue tasks from semantic search
```

### 8.3 Task Breakdown Suggestion

```typescript
const request: ContextRequest = {
  query: 'Break this task into subtasks',
  focus: { blockId: 'task-456' },
  type: 'assist',
  user: currentUser,
  tokenBudget: {
    total: 2000,
    focus: 1200,                       // Include task details
    semantic: 500,                     // Similar tasks for patterns
    relations: 200,
    activity: 0,
    history: 0,
    system: 100,
  },
};

// Result: Context with task + similar tasks for breakdown patterns
```

---

## 9. Anti-Patterns (FORBIDDEN)

### ❌ Never Pass Entire Workspace

```typescript
// WRONG - Never do this
const allBlocks = await blockStore.getAll();
const context = allBlocks.map(b => b.content).join('\n');
```

### ❌ Never Ignore Permissions

```typescript
// WRONG - No permission check
const results = await vectorSearch.search({ query });
```

### ❌ Never Skip Token Budget

```typescript
// WRONG - Unbounded context
const context = items.map(i => i.content).join('\n');
// Could be 100K+ tokens
```

### ❌ Never Use Static Context

```typescript
// WRONG - Same context for all requests
const staticContext = 'You are a helpful assistant...';
```

---

## 10. Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Context Build Time | < 200ms | P95 latency |
| Token Estimation Accuracy | ±5% | Compared to actual |
| Relevance Precision | > 85% | User-rated relevance |
| Cache Hit Rate | > 60% | For semantic search |

---

## References

- [AI Native Architecture](./AI_NATIVE_ARCHITECTURE.md)
- [Embedding Strategy](./EMBEDDING_STRATEGY.md)
- [Tool Calling Contract](./TOOL_CALLING_CONTRACT.md)
