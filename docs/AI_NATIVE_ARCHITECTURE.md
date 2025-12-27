# AI-Native Architecture Design Document

## Overview

This document defines the architecture for AI-native capabilities deeply integrated into the workspace (pages, blocks, databases, tasks). The AI system is designed to be:

- **Embedded, not bolted on** - AI is a core system, not a feature
- **Context-aware** - Understands the full workspace context
- **Proactive** - Can suggest actions and improvements
- **Automatable** - Supports rule-based and AI-augmented automation
- **Reversible** - All AI actions can be undone
- **Auditable** - Complete audit trail of AI actions

---

## 1. AI Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  AI Assist  │  │   Chat      │  │  Inline     │  │   Automation           │ │
│  │  Button     │  │   Panel     │  │  Suggestions│  │   Dashboard            │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                │                     │
          ▼                ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI GATEWAY LAYER                                    │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                        AI Request Router                                   │  │
│  │   • Request validation & authentication                                    │  │
│  │   • Rate limiting & quota management                                       │  │
│  │   • Tool call authorization                                                │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI CORE LAYER                                       │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         CONTEXT BUILDER                                  │    │
│  │   • Current page/block context                                           │    │
│  │   • Related blocks via embeddings                                        │    │
│  │   • Database relations                                                   │    │
│  │   • Recent activity                                                      │    │
│  │   • User preferences                                                     │    │
│  │   • Token budget management                                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│                                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         AI REASONING ENGINE                              │    │
│  │   • Intent classification                                                │    │
│  │   • Multi-step planning                                                  │    │
│  │   • Tool selection                                                       │    │
│  │   • Response generation                                                  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│                                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         TOOL CALLING SYSTEM                              │    │
│  │   • Block CRUD operations                                                │    │
│  │   • Task management                                                      │    │
│  │   • Database queries                                                     │    │
│  │   • Status updates                                                       │    │
│  │   • Automation triggers                                                  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              KNOWLEDGE LAYER                                     │
│                                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐    │
│  │  EMBEDDING ENGINE │  │  VECTOR INDEX     │  │  SEMANTIC SEARCH          │    │
│  │  • Block embeddings│  │  • Block vectors  │  │  • Meaning-based search   │    │
│  │  • Page embeddings │  │  • Page vectors   │  │  • Hybrid search          │    │
│  │  • Row embeddings  │  │  • Row vectors    │  │  • Permission-aware       │    │
│  └───────────────────┘  └───────────────────┘  └───────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                          │
│                                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐    │
│  │  BLOCK STORE      │  │  DATABASE ENGINE  │  │  AUDIT LOG                │    │
│  │  • Block tree     │  │  • Properties     │  │  • AI action history      │    │
│  │  • Block CRUD     │  │  • Views          │  │  • Reversibility data     │    │
│  │  • Version history│  │  • Relations      │  │  • Usage analytics        │    │
│  └───────────────────┘  └───────────────────┘  └───────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AUTOMATION LAYER                                    │
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         AUTOMATION ENGINE                                  │  │
│  │   • Event-driven triggers                                                  │  │
│  │   • Rule-based actions                                                     │  │
│  │   • AI-augmented decisions                                                 │  │
│  │   • Non-blocking async execution                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  Auto-Tagging   │  │  Due Date       │  │  Status Suggestions             │  │
│  │  Service        │  │  Predictor      │  │  Engine                         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Design Principles

### 2.1 AI ≠ UI
- AI logic is completely separated from presentation
- AI services expose clean APIs consumed by UI
- AI can operate headlessly for automation

### 2.2 AI ≠ Database
- AI never directly modifies storage
- All mutations go through the Block CRUD layer
- AI reads through the Context Builder

### 2.3 Stateless AI Calls
- Each AI call receives complete context
- No hidden state between calls
- Memory is explicit (stored in AI blocks or user preferences)

### 2.4 Reversible Actions
- Every AI action creates a reversible operation
- Undo stack maintained per session
- Audit log for all AI mutations

### 2.5 No Silent Mutations
- All AI changes are visible to user
- Changes require confirmation for destructive operations
- Transparent about what AI is doing

---

## 3. Component Details

### 3.1 AI Gateway Layer
```typescript
interface AIGateway {
  // Route AI requests to appropriate handlers
  route(request: AIRequest): Promise<AIResponse>;
  
  // Validate request permissions
  authorize(request: AIRequest, user: User): boolean;
  
  // Apply rate limiting
  checkQuota(user: User): boolean;
}

interface AIRequest {
  type: 'assist' | 'chat' | 'suggest' | 'automate';
  intent?: string;
  context: ContextPayload;
  tools?: string[];  // Allowed tools for this request
  user: User;
}

interface AIResponse {
  success: boolean;
  result?: any;
  actions?: AIAction[];  // Actions taken
  suggestions?: AISuggestion[];
  error?: AIError;
}
```

### 3.2 Context Builder
See [CONTEXT_BUILDER.md](./CONTEXT_BUILDER.md) for detailed specification.

### 3.3 Tool Calling System
See [TOOL_CALLING_CONTRACT.md](./TOOL_CALLING_CONTRACT.md) for detailed specification.

### 3.4 Automation Engine
See [AUTOMATION_ENGINE.md](./AUTOMATION_ENGINE.md) for detailed specification.

---

## 4. AI Capabilities Matrix

| Capability | Page | Block | Task | Database | Description |
|------------|------|-------|------|----------|-------------|
| Summarize | ✅ | ✅ | ✅ | ✅ | Generate summary of content |
| Rewrite | ✅ | ✅ | ✅ | ❌ | Improve tone, clarity, length |
| Expand | ✅ | ✅ | ✅ | ❌ | Turn notes into structured content |
| Translate | ✅ | ✅ | ✅ | ✅ | Multi-language translation |
| Extract Todos | ✅ | ✅ | ❌ | ❌ | Find action items in text |
| Generate Tasks | ✅ | ✅ | ❌ | ❌ | Create tasks from meeting notes |
| Convert to Kanban | ❌ | ❌ | ❌ | ✅ | Transform rows to cards |
| Suggest Breakdown | ❌ | ❌ | ✅ | ❌ | Break large tasks into subtasks |
| Chat Query | ✅ | ✅ | ✅ | ✅ | Natural language questions |
| Auto-Tag | ✅ | ✅ | ✅ | ✅ | AI-powered tagging |
| Predict Due Date | ❌ | ❌ | ✅ | ❌ | Suggest realistic due dates |
| Suggest Status | ❌ | ❌ | ✅ | ❌ | Recommend status updates |

---

## 5. Security & Privacy

### 5.1 Permission-Aware AI
- AI respects block permissions
- Never exposes content user cannot access
- Tool calls checked against user permissions

### 5.2 Data Boundaries
- Workspace data stays within the system
- No external API calls with user content (unless configured)
- Local embedding models supported

### 5.3 Audit Trail
```typescript
interface AIAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  requestType: string;
  toolsCalled: string[];
  blocksAffected: string[];
  reversible: boolean;
  undoData?: any;
}
```

---

## 6. Performance Considerations

### 6.1 Embedding Updates
- Batch embedding updates on content change
- Background queue for non-blocking updates
- Incremental updates for large pages

### 6.2 Context Size
- Token budget management (configurable)
- Relevance ranking for context selection
- Progressive context loading

### 6.3 Caching
- Embedding cache with TTL
- Search result caching
- Context memoization

---

## 7. Extensibility

### 7.1 Plugin Architecture
```typescript
interface AIPlugin {
  name: string;
  version: string;
  
  // Register custom tools
  tools?: AITool[];
  
  // Register custom block types for AI
  blockHandlers?: BlockAIHandler[];
  
  // Register custom automation rules
  automationRules?: AutomationRule[];
}
```

### 7.2 Custom Model Support
- Pluggable LLM providers
- Local model support (Ollama, LM Studio)
- Custom fine-tuned models

---

## 8. Implementation Phases

### Phase 1: Foundation
- [ ] Embedding infrastructure
- [ ] Vector index setup
- [ ] Context builder implementation
- [ ] Basic tool calling

### Phase 2: Core AI Features
- [ ] Page/block summarization
- [ ] Content rewriting
- [ ] Todo extraction
- [ ] Workspace chat

### Phase 3: Smart Automation
- [ ] Auto-tagging system
- [ ] Due date prediction
- [ ] Status suggestions
- [ ] Habit intelligence

### Phase 4: Advanced Features
- [ ] Multi-language support
- [ ] Custom model integration
- [ ] Plugin system
- [ ] Advanced analytics

---

## 9. Success Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| AI Response Time | < 2s | P95 latency for AI operations |
| Context Relevance | > 90% | User rating of context quality |
| Action Success Rate | > 95% | Tool calls that succeed |
| Undo Rate | < 10% | AI actions that users undo |
| Adoption Rate | > 60% | Users actively using AI features |

---

## References

- [Context Builder Specification](./CONTEXT_BUILDER.md)
- [Tool Calling Contract](./TOOL_CALLING_CONTRACT.md)
- [Automation Engine Design](./AUTOMATION_ENGINE.md)
- [Embedding Strategy](./EMBEDDING_STRATEGY.md)
- [Import/Export Flow](./IMPORT_EXPORT_FLOW.md)
- [Templates Schema](./TEMPLATES_SCHEMA.md)
