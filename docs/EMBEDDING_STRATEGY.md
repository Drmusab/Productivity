# Embedding & Semantic Search Strategy

## Overview

This document defines the embedding and semantic search strategy for enabling AI-powered workspace intelligence. The system supports meaning-based search, context building, and smart recommendations.

---

## 1. Embedding Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EMBEDDING PIPELINE                                     │
│                                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Content    │───▶│  Chunking   │───▶│  Embedding  │───▶│  Vector     │       │
│  │  Ingestion  │    │  Strategy   │    │  Model      │    │  Index      │       │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘       │
│         │                  │                  │                  │               │
│         ▼                  ▼                  ▼                  ▼               │
│  • Block changes    • Semantic chunks  • Text → Vector   • HNSW index           │
│  • Page changes     • Overlap handling • Batch processing• Fast retrieval       │
│  • DB row changes   • Size optimization• Model selection • Similarity search    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Content Types for Embedding

| Content Type | Embedding Strategy | Update Trigger |
|--------------|-------------------|----------------|
| Text Block | Full content | On change |
| Heading Block | Title + context | On change |
| Todo Block | Title + description | On change |
| Page Block | Title + description + child summary | On change, child change |
| Kanban Card | Title + description + tags | On change |
| Database Row | Property values concatenated | On change |
| Code Block | Code + language context | On change |

---

## 2. Embedding Model Strategy

### 2.1 Model Selection

```typescript
interface EmbeddingModelConfig {
  // Primary model for general content
  primaryModel: {
    name: string;                    // e.g., 'text-embedding-3-small'
    dimensions: number;              // e.g., 1536
    maxTokens: number;               // e.g., 8191
    type: 'api' | 'local';
  };
  
  // Optional specialized models
  codeModel?: {
    name: string;                    // e.g., 'code-embedding-ada'
    dimensions: number;
    maxTokens: number;
    type: 'api' | 'local';
  };
  
  // Local model fallback
  localFallback?: {
    name: string;                    // e.g., 'all-MiniLM-L6-v2'
    dimensions: number;              // e.g., 384
    path: string;
  };
}
```

### 2.2 Recommended Models

| Use Case | Model | Dimensions | Notes |
|----------|-------|------------|-------|
| General content | text-embedding-3-small | 1536 | Best quality/cost balance |
| High accuracy | text-embedding-3-large | 3072 | For critical searches |
| Local/offline | all-MiniLM-L6-v2 | 384 | Fast, no API needed |
| Code blocks | code-embedding-ada | 1536 | Code-specific training |

---

## 3. Chunking Strategy

### 3.1 Semantic Chunking Rules

```typescript
interface ChunkingConfig {
  // Maximum chunk size in tokens
  maxChunkTokens: number;           // Default: 512
  
  // Overlap between chunks for context continuity
  overlapTokens: number;            // Default: 50
  
  // Minimum chunk size (avoid tiny chunks)
  minChunkTokens: number;           // Default: 100
  
  // Split boundaries (in priority order)
  splitBoundaries: SplitBoundary[];
}

enum SplitBoundary {
  PARAGRAPH = 'paragraph',          // Double newline
  SENTENCE = 'sentence',            // Period + space
  BLOCK = 'block',                  // Block boundary
  HARD_LIMIT = 'hard_limit',        // Force split at max tokens
}
```

### 3.2 Block-Specific Chunking

```typescript
const chunkingRules: Record<BlockType, ChunkingRule> = {
  [BlockType.TEXT]: {
    strategy: 'semantic',
    boundaries: [SplitBoundary.PARAGRAPH, SplitBoundary.SENTENCE],
    includeContext: true,
  },
  
  [BlockType.PAGE]: {
    strategy: 'hierarchical',
    includeTitle: true,
    summarizeChildren: true,
    maxChildDepth: 2,
  },
  
  [BlockType.TODO]: {
    strategy: 'single',              // Embed as single unit
    includePriority: true,
    includeDueDate: true,
  },
  
  [BlockType.KANBAN_CARD]: {
    strategy: 'single',
    includeTags: true,
    includeStatus: true,
  },
  
  [BlockType.CODE]: {
    strategy: 'code_aware',          // Respect code structure
    useCodeModel: true,
    includeLanguage: true,
  },
  
  [BlockType.DB_ROW]: {
    strategy: 'property_concat',     // Concatenate property values
    includePropertyNames: true,
  },
};
```

---

## 4. Vector Index Design

### 4.1 Index Structure

```typescript
interface VectorIndex {
  // Index metadata
  id: string;
  workspaceId: string;
  modelName: string;
  dimensions: number;
  createdAt: string;
  updatedAt: string;
  
  // Index configuration
  config: {
    algorithm: 'hnsw' | 'flat' | 'ivf';
    metric: 'cosine' | 'euclidean' | 'dot_product';
    
    // HNSW parameters
    hnsw?: {
      m: number;                     // Default: 16
      efConstruction: number;        // Default: 100
      efSearch: number;              // Default: 50
    };
  };
}

interface VectorEntry {
  id: string;                        // Unique vector ID
  blockId: string;                   // Source block ID
  blockType: BlockType;              // Block type
  chunkIndex: number;                // Chunk number (0 if single)
  vector: number[];                  // Embedding vector
  content: string;                   // Original content (for display)
  metadata: {
    pageId?: string;                 // Parent page
    databaseId?: string;             // Database if DB row
    permissions: string[];           // Permission groups
    createdAt: string;
    updatedAt: string;
  };
}
```

### 4.2 Index Operations

```typescript
interface VectorIndexOperations {
  // Add vectors
  upsert(entries: VectorEntry[]): Promise<void>;
  
  // Remove vectors
  delete(ids: string[]): Promise<void>;
  
  // Search vectors
  search(query: SearchQuery): Promise<SearchResult[]>;
  
  // Hybrid search (vector + keyword)
  hybridSearch(query: HybridQuery): Promise<SearchResult[]>;
  
  // Rebuild index
  rebuild(): Promise<void>;
}
```

---

## 5. Semantic Search Implementation

### 5.1 Search Types

```typescript
// Pure vector similarity search
interface VectorSearch {
  type: 'vector';
  query: string;                     // Natural language query
  topK: number;                      // Number of results
  threshold?: number;                // Minimum similarity (0-1)
  filters?: SearchFilter[];          // Metadata filters
}

// Keyword-based full-text search
interface KeywordSearch {
  type: 'keyword';
  query: string;
  fields?: string[];                 // Fields to search
  fuzzy?: boolean;                   // Allow fuzzy matching
}

// Hybrid search combining both
interface HybridSearch {
  type: 'hybrid';
  query: string;
  vectorWeight: number;              // 0-1, weight for vector results
  keywordWeight: number;             // 0-1, weight for keyword results
  topK: number;
  filters?: SearchFilter[];
}
```

### 5.2 Search Filters

```typescript
interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  IN = 'in',
  NOT_IN = 'nin',
  CONTAINS = 'contains',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EXISTS = 'exists',
}

// Example filters
const exampleFilters: SearchFilter[] = [
  { field: 'blockType', operator: 'in', value: ['todo', 'kanban_card'] },
  { field: 'metadata.pageId', operator: 'eq', value: 'page-123' },
  { field: 'metadata.permissions', operator: 'contains', value: 'user-456' },
];
```

### 5.3 Permission-Aware Search

```typescript
interface PermissionContext {
  userId: string;
  teamIds: string[];
  workspaceId: string;
}

class PermissionAwareSearch {
  async search(
    query: SearchQuery,
    permissions: PermissionContext
  ): Promise<SearchResult[]> {
    // Add permission filters to query
    const permissionFilter: SearchFilter = {
      field: 'metadata.permissions',
      operator: 'in',
      value: [
        `user:${permissions.userId}`,
        ...permissions.teamIds.map(t => `team:${t}`),
        `workspace:${permissions.workspaceId}`,
        'public',
      ],
    };
    
    const filteredQuery = {
      ...query,
      filters: [...(query.filters || []), permissionFilter],
    };
    
    return this.vectorIndex.search(filteredQuery);
  }
}
```

---

## 6. Search Result Ranking

### 6.1 Ranking Signals

```typescript
interface RankingSignals {
  // Semantic similarity (0-1)
  semanticScore: number;
  
  // Keyword match score (0-1)
  keywordScore: number;
  
  // Recency boost (newer content ranks higher)
  recencyScore: number;
  
  // Interaction signals (views, edits)
  engagementScore: number;
  
  // Block type relevance (tasks might rank higher for task queries)
  typeRelevance: number;
}

function computeFinalScore(signals: RankingSignals): number {
  const weights = {
    semantic: 0.40,
    keyword: 0.25,
    recency: 0.15,
    engagement: 0.10,
    typeRelevance: 0.10,
  };
  
  return (
    signals.semanticScore * weights.semantic +
    signals.keywordScore * weights.keyword +
    signals.recencyScore * weights.recency +
    signals.engagementScore * weights.engagement +
    signals.typeRelevance * weights.typeRelevance
  );
}
```

### 6.2 Query Understanding

```typescript
interface QueryAnalysis {
  // Original query
  originalQuery: string;
  
  // Detected intent
  intent: 'search' | 'question' | 'command' | 'navigation';
  
  // Extracted entities
  entities: {
    blockTypes?: BlockType[];
    timeRange?: { start: string; end: string };
    tags?: string[];
    people?: string[];
  };
  
  // Expanded query for better matching
  expandedQuery: string;
  
  // Suggested filters based on query
  suggestedFilters: SearchFilter[];
}

class QueryAnalyzer {
  analyze(query: string): QueryAnalysis {
    // Detect intent from query structure
    const intent = this.detectIntent(query);
    
    // Extract entities (dates, names, tags)
    const entities = this.extractEntities(query);
    
    // Expand query with synonyms/related terms
    const expandedQuery = this.expandQuery(query);
    
    return {
      originalQuery: query,
      intent,
      entities,
      expandedQuery,
      suggestedFilters: this.generateFilters(entities),
    };
  }
}
```

---

## 7. Embedding Updates

### 7.1 Update Pipeline

```typescript
interface EmbeddingUpdateEvent {
  type: 'create' | 'update' | 'delete';
  blockId: string;
  blockType: BlockType;
  content?: string;
  priority: 'high' | 'normal' | 'low';
  timestamp: string;
}

class EmbeddingUpdateQueue {
  private queue: EmbeddingUpdateEvent[] = [];
  
  // Enqueue update
  enqueue(event: EmbeddingUpdateEvent): void {
    // Deduplicate - only keep latest update per block
    this.queue = this.queue.filter(e => e.blockId !== event.blockId);
    this.queue.push(event);
    
    if (event.priority === 'high') {
      this.processImmediate(event);
    }
  }
  
  // Process queue in batches
  async processBatch(batchSize: number = 100): Promise<void> {
    const batch = this.queue.splice(0, batchSize);
    
    // Group by operation type
    const creates = batch.filter(e => e.type === 'create');
    const updates = batch.filter(e => e.type === 'update');
    const deletes = batch.filter(e => e.type === 'delete');
    
    // Process in parallel
    await Promise.all([
      this.processCreates(creates),
      this.processUpdates(updates),
      this.processDeletes(deletes),
    ]);
  }
}
```

### 7.2 Incremental Updates

```typescript
interface IncrementalUpdateStrategy {
  // Only re-embed changed chunks
  detectChangedChunks(
    oldContent: string,
    newContent: string
  ): ChunkDiff[];
  
  // Update only affected vectors
  updateAffectedVectors(
    blockId: string,
    changedChunks: ChunkDiff[]
  ): Promise<void>;
}

interface ChunkDiff {
  chunkIndex: number;
  operation: 'add' | 'update' | 'delete';
  oldContent?: string;
  newContent?: string;
}
```

---

## 8. Performance Optimization

### 8.1 Caching Strategy

```typescript
interface EmbeddingCache {
  // Cache embeddings by content hash
  get(contentHash: string): number[] | null;
  set(contentHash: string, embedding: number[]): void;
  
  // LRU eviction with TTL
  config: {
    maxSize: number;                 // Max entries
    ttlMs: number;                   // Time to live
  };
}

interface SearchCache {
  // Cache search results by query hash
  get(queryHash: string): CachedSearchResult | null;
  set(queryHash: string, result: SearchResult[]): void;
  
  // Invalidate on content changes
  invalidateForBlock(blockId: string): void;
}
```

### 8.2 Batch Processing

```typescript
interface BatchEmbeddingConfig {
  // Maximum batch size for embedding API calls
  maxBatchSize: number;              // Default: 100
  
  // Maximum concurrent batches
  maxConcurrent: number;             // Default: 5
  
  // Retry configuration
  retryAttempts: number;             // Default: 3
  retryDelayMs: number;              // Default: 1000
}
```

---

## 9. Monitoring & Metrics

### 9.1 Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Embedding Latency | Time to generate embedding | < 100ms per block |
| Index Latency | Time to index embedding | < 50ms per entry |
| Search Latency | Time for search query | < 200ms P95 |
| Queue Depth | Pending embedding updates | < 1000 |
| Cache Hit Rate | Embedding cache effectiveness | > 70% |
| Search Relevance | User satisfaction with results | > 90% |

### 9.2 Health Checks

```typescript
interface EmbeddingHealthCheck {
  // Model availability
  modelStatus: 'healthy' | 'degraded' | 'unavailable';
  
  // Index status
  indexStatus: 'synced' | 'syncing' | 'stale';
  
  // Queue status
  queueDepth: number;
  oldestPendingAge: number;          // Seconds
  
  // Performance
  avgEmbeddingLatency: number;       // ms
  avgSearchLatency: number;          // ms
}
```

---

## 10. Storage Requirements

### 10.1 Size Estimation

| Component | Formula | Example (100K blocks) |
|-----------|---------|----------------------|
| Vectors | blocks × dimensions × 4 bytes | 100K × 1536 × 4 = 614 MB |
| Metadata | blocks × ~500 bytes | 100K × 500 = 50 MB |
| Index overhead | vectors × 1.5 | 614 MB × 1.5 = 921 MB |
| **Total** | | **~1.5 GB** |

### 10.2 Scaling Guidelines

| Workspace Size | Recommended Setup |
|----------------|-------------------|
| < 10K blocks | SQLite + in-memory index |
| 10K - 100K blocks | SQLite + persistent HNSW |
| 100K - 1M blocks | PostgreSQL + pgvector |
| > 1M blocks | Dedicated vector DB (Pinecone, Qdrant) |

---

## References

- [AI Native Architecture](./AI_NATIVE_ARCHITECTURE.md)
- [Context Builder Specification](./CONTEXT_BUILDER.md)
- [Block Architecture](./BLOCK_ARCHITECTURE.md)
