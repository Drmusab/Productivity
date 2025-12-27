# Automation Rule Engine Design

## Overview

The Automation Engine enables the system to act automatically based on rules, signals, and AI predictions. It supports both deterministic rule-based automation and AI-augmented smart automation.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AUTOMATION ENGINE                                      │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         EVENT SOURCES                                    │    │
│  │                                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │    │
│  │  │   Block     │  │   Task      │  │   Time      │  │   External  │     │    │
│  │  │   Events    │  │   Events    │  │   Events    │  │   Webhooks  │     │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         EVENT BUS                                        │    │
│  │   • Event queuing                                                        │    │
│  │   • Event routing                                                        │    │
│  │   • Event filtering                                                      │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         RULE MATCHER                                     │    │
│  │   • Evaluate trigger conditions                                          │    │
│  │   • Check rule filters                                                   │    │
│  │   • Prioritize matching rules                                            │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         AI AUGMENTATION (Optional)                       │    │
│  │   • Classify content for auto-tagging                                    │    │
│  │   • Predict due dates                                                    │    │
│  │   • Suggest status changes                                               │    │
│  │   • Analyze patterns                                                     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         ACTION EXECUTOR                                  │    │
│  │   • Execute actions asynchronously                                       │    │
│  │   • Handle failures & retries                                            │    │
│  │   • Log all executions                                                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         AUDIT & EXPLAINABILITY                           │    │
│  │   • Execution logs                                                       │    │
│  │   • Explanation of why rule fired                                        │    │
│  │   • Rollback support                                                     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Types

### 2.1 Automation Rule

```typescript
interface AutomationRule {
  // Unique identifier
  id: string;
  
  // Human-readable name
  name: string;
  
  // Description of what this rule does
  description: string;
  
  // Rule status
  enabled: boolean;
  
  // Owner (user or workspace)
  ownerId: string;
  ownerType: 'user' | 'workspace';
  
  // Trigger configuration
  trigger: AutomationTrigger;
  
  // Optional conditions to filter
  conditions: AutomationCondition[];
  
  // Actions to execute
  actions: AutomationAction[];
  
  // Execution settings
  settings: {
    // Run asynchronously (non-blocking)
    async: boolean;
    
    // Retry on failure
    retryOnFailure: boolean;
    maxRetries: number;
    
    // Cooldown between executions
    cooldownMs: number;
    
    // Maximum executions per hour
    maxExecutionsPerHour: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
}
```

### 2.2 Triggers

```typescript
type AutomationTrigger =
  | BlockTrigger
  | TaskTrigger
  | TimeTrigger
  | WebhookTrigger
  | AITrigger;

// Block-based triggers
interface BlockTrigger {
  type: 'block';
  event: 'created' | 'updated' | 'deleted' | 'moved';
  blockTypes?: BlockType[];  // Filter by block type
  parentId?: string;         // Filter by parent
}

// Task-specific triggers
interface TaskTrigger {
  type: 'task';
  event: 
    | 'created'
    | 'updated'
    | 'completed'
    | 'moved'
    | 'status_changed'
    | 'due_soon'          // Approaching due date
    | 'overdue'           // Past due date
    | 'assigned'
    | 'unassigned';
  boardId?: string;         // Filter by board
  columnId?: string;        // Filter by column
}

// Time-based triggers
interface TimeTrigger {
  type: 'time';
  schedule: {
    // Cron expression or simple schedule
    cron?: string;           // e.g., '0 9 * * 1' (Monday 9am)
    interval?: string;       // e.g., 'every 1 hour'
    at?: string;             // e.g., '09:00'
    timezone: string;        // e.g., 'America/New_York'
  };
}

// External webhook triggers
interface WebhookTrigger {
  type: 'webhook';
  webhookId: string;        // Unique webhook endpoint ID
  secret?: string;          // HMAC secret for validation
}

// AI-powered triggers
interface AITrigger {
  type: 'ai';
  event:
    | 'content_classified'   // Content matches a classification
    | 'pattern_detected'     // Pattern detected (e.g., blocked task)
    | 'prediction_made';     // AI made a prediction
  config: {
    classification?: string;  // For content_classified
    pattern?: string;         // For pattern_detected
    predictionType?: string;  // For prediction_made
    confidence?: number;      // Minimum confidence threshold
  };
}
```

### 2.3 Conditions

```typescript
interface AutomationCondition {
  // Condition type
  type: 'property' | 'time' | 'user' | 'ai';
  
  // The field to check
  field: string;
  
  // Comparison operator
  operator: ConditionOperator;
  
  // Value to compare against
  value: any;
  
  // Logical operator for combining with other conditions
  logic?: 'and' | 'or';
}

enum ConditionOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  MATCHES_REGEX = 'matches',
}

// Example conditions
const exampleConditions: AutomationCondition[] = [
  // Task priority is high or critical
  { type: 'property', field: 'priority', operator: 'in', value: ['high', 'critical'] },
  
  // Due date is within next 24 hours
  { type: 'time', field: 'dueDate', operator: 'lt', value: 'now+24h', logic: 'and' },
  
  // Assigned to current user
  { type: 'user', field: 'assignedTo', operator: 'eq', value: '@current_user' },
  
  // AI confidence above threshold
  { type: 'ai', field: 'confidence', operator: 'gt', value: 0.8 },
];
```

### 2.4 Actions

```typescript
type AutomationAction =
  | BlockAction
  | NotificationAction
  | WebhookAction
  | AIAction
  | ChainAction;

// Block manipulation actions
interface BlockAction {
  type: 'block';
  operation: 'create' | 'update' | 'delete' | 'move' | 'duplicate';
  config: {
    blockType?: BlockType;
    data?: Record<string, any>;
    parentId?: string;
    targetColumnId?: string;  // For move
  };
}

// Notification actions
interface NotificationAction {
  type: 'notification';
  channel: 'in_app' | 'email' | 'webhook' | 'slack';
  config: {
    recipients: string[];      // User IDs or 'assignee', 'owner', etc.
    title: string;             // Supports templates
    message: string;           // Supports templates
    urgency?: 'low' | 'normal' | 'high';
  };
}

// Webhook actions
interface WebhookAction {
  type: 'webhook';
  config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;             // Template for request body
    timeout?: number;
  };
}

// AI-powered actions
interface AIAction {
  type: 'ai';
  operation:
    | 'auto_tag'              // Add tags based on content
    | 'suggest_due_date'      // Predict due date
    | 'suggest_status'        // Suggest status change
    | 'summarize'             // Generate summary
    | 'classify'              // Classify content
    | 'extract_tasks';        // Extract action items
  config: {
    targetBlockId?: string;
    targetProperty?: string;
    confidence?: number;       // Minimum confidence to apply
    autoApply?: boolean;       // Apply without confirmation
  };
}

// Chain multiple rules
interface ChainAction {
  type: 'chain';
  config: {
    ruleId: string;            // Another rule to trigger
    delay?: number;            // Delay before triggering (ms)
  };
}
```

---

## 3. Smart Automation Features

### 3.1 Auto-Tagging

```typescript
interface AutoTaggingConfig {
  // Tag categories
  categories: TagCategory[];
  
  // Classification model
  model: 'embeddings' | 'classifier' | 'llm';
  
  // Confidence threshold
  minConfidence: number;
  
  // Auto-apply or suggest
  autoApply: boolean;
}

interface TagCategory {
  name: string;
  tags: string[];
  keywords?: string[];        // Keyword hints for faster matching
  examples?: string[];        // Example content for training
}

class AutoTaggingService {
  async tagContent(content: string, config: AutoTaggingConfig): Promise<TagResult[]> {
    // Get embedding for content
    const embedding = await this.embeddingService.embed(content);
    
    // Compare against tag category embeddings
    const results: TagResult[] = [];
    
    for (const category of config.categories) {
      const similarity = await this.compareToCategory(embedding, category);
      
      if (similarity >= config.minConfidence) {
        results.push({
          tag: this.selectBestTag(category, similarity),
          confidence: similarity,
          category: category.name,
        });
      }
    }
    
    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }
}
```

### 3.2 Due Date Prediction

```typescript
interface DueDatePredictionConfig {
  // Consider historical data
  useHistory: boolean;
  
  // Consider similar tasks
  useSimilarTasks: boolean;
  
  // Consider task complexity
  estimateComplexity: boolean;
  
  // Buffer days to add
  bufferDays: number;
}

class DueDatePredictor {
  async predict(task: Task, config: DueDatePredictionConfig): Promise<DueDatePrediction> {
    const signals: PredictionSignal[] = [];
    
    // Analyze task type
    const taskType = await this.classifyTaskType(task);
    const typeAverage = await this.getTypeAverageDuration(taskType);
    if (typeAverage) {
      signals.push({ source: 'task_type', days: typeAverage, weight: 0.3 });
    }
    
    // Analyze similar tasks
    if (config.useSimilarTasks) {
      const similar = await this.findSimilarTasks(task);
      const avgDuration = this.calculateAverageDuration(similar);
      if (avgDuration) {
        signals.push({ source: 'similar_tasks', days: avgDuration, weight: 0.4 });
      }
    }
    
    // Analyze complexity
    if (config.estimateComplexity) {
      const complexity = await this.estimateComplexity(task);
      const complexityDays = this.complexityToDays(complexity);
      signals.push({ source: 'complexity', days: complexityDays, weight: 0.3 });
    }
    
    // Calculate weighted average
    let totalDays = 0;
    let totalWeight = 0;
    for (const signal of signals) {
      totalDays += signal.days * signal.weight;
      totalWeight += signal.weight;
    }
    
    const predictedDays = Math.ceil(totalDays / totalWeight) + config.bufferDays;
    const predictedDate = this.addBusinessDays(new Date(), predictedDays);
    
    return {
      predictedDate: predictedDate.toISOString(),
      confidence: this.calculateConfidence(signals),
      explanation: this.generateExplanation(signals),
      signals,
    };
  }
}
```

### 3.3 Status Suggestions

```typescript
interface StatusSuggestionConfig {
  // Patterns that indicate status
  patterns: StatusPattern[];
  
  // Check for inactivity
  inactivityThreshold: number;  // Days
  
  // AI analysis
  useAIAnalysis: boolean;
}

interface StatusPattern {
  status: string;
  indicators: string[];
  confidence: number;
}

class StatusSuggestionService {
  async analyze(task: Task): Promise<StatusSuggestion | null> {
    const suggestions: StatusSuggestion[] = [];
    
    // Check for blocking indicators
    if (this.hasBlockingIndicators(task)) {
      suggestions.push({
        status: 'blocked',
        reason: 'Task mentions blocking issues or dependencies',
        confidence: 0.8,
      });
    }
    
    // Check for completion indicators
    if (this.hasCompletionIndicators(task)) {
      suggestions.push({
        status: 'done',
        reason: 'All subtasks completed and task mentions completion',
        confidence: 0.85,
      });
    }
    
    // Check for inactivity
    const daysSinceUpdate = this.daysSince(task.updatedAt);
    if (daysSinceUpdate > 14) {
      suggestions.push({
        status: 'stale',
        reason: `No activity for ${daysSinceUpdate} days`,
        confidence: 0.7,
      });
    }
    
    // Return highest confidence suggestion
    return suggestions.length > 0
      ? suggestions.sort((a, b) => b.confidence - a.confidence)[0]
      : null;
  }
  
  private hasBlockingIndicators(task: Task): boolean {
    const blockingKeywords = [
      'blocked', 'waiting', 'depends on', 'pending', 'hold',
      'cannot proceed', 'need help', 'stuck'
    ];
    
    const content = `${task.title} ${task.description}`.toLowerCase();
    return blockingKeywords.some(kw => content.includes(kw));
  }
}
```

### 3.4 Habit Tracking Intelligence

```typescript
interface HabitAnalysisConfig {
  // Habit to analyze
  habitId: string;
  
  // Analysis period (days)
  period: number;
  
  // Generate suggestions
  generateSuggestions: boolean;
}

class HabitIntelligenceService {
  async analyzeHabit(config: HabitAnalysisConfig): Promise<HabitAnalysis> {
    const habit = await this.habitStore.get(config.habitId);
    const entries = await this.getEntries(config.habitId, config.period);
    
    // Calculate statistics
    const stats = this.calculateStats(entries);
    
    // Detect patterns
    const patterns = this.detectPatterns(entries);
    
    // Generate insights
    const insights = await this.generateInsights(habit, stats, patterns);
    
    return {
      habit,
      period: config.period,
      stats: {
        completionRate: stats.completionRate,
        longestStreak: stats.longestStreak,
        currentStreak: stats.currentStreak,
        bestDays: stats.bestDays,
        worstDays: stats.worstDays,
      },
      patterns,
      insights,
      suggestions: config.generateSuggestions
        ? await this.generateSuggestions(habit, stats, patterns)
        : [],
    };
  }
  
  private detectPatterns(entries: HabitEntry[]): HabitPattern[] {
    const patterns: HabitPattern[] = [];
    
    // Day of week patterns
    const byDayOfWeek = this.groupByDayOfWeek(entries);
    for (const [day, dayEntries] of Object.entries(byDayOfWeek)) {
      const rate = this.calculateCompletionRate(dayEntries);
      if (rate < 0.5) {
        patterns.push({
          type: 'weak_day',
          description: `Completion rate is low on ${day}s (${Math.round(rate * 100)}%)`,
          severity: rate < 0.3 ? 'high' : 'medium',
        });
      }
    }
    
    // Streak breaking patterns
    const streakBreaks = this.findStreakBreaks(entries);
    if (streakBreaks.length > 0) {
      const commonBreakDay = this.mostCommonDay(streakBreaks);
      patterns.push({
        type: 'streak_break_pattern',
        description: `Streaks often break on ${commonBreakDay}`,
        severity: 'medium',
      });
    }
    
    return patterns;
  }
}
```

---

## 4. Rule Execution Engine

### 4.1 Event Processing

```typescript
class AutomationEngine {
  private eventBus: EventBus;
  private ruleStore: RuleStore;
  private executor: ActionExecutor;
  private auditLog: AuditLog;
  
  constructor() {
    this.eventBus.subscribe('*', this.handleEvent.bind(this));
  }
  
  async handleEvent(event: WorkspaceEvent): Promise<void> {
    // Find matching rules
    const rules = await this.findMatchingRules(event);
    
    // Execute rules (non-blocking)
    for (const rule of rules) {
      if (rule.settings.async) {
        // Fire and forget
        this.executeRuleAsync(rule, event);
      } else {
        // Wait for completion
        await this.executeRule(rule, event);
      }
    }
  }
  
  private async findMatchingRules(event: WorkspaceEvent): Promise<AutomationRule[]> {
    // Get all enabled rules
    const allRules = await this.ruleStore.getEnabled();
    
    // Filter by trigger match
    const matchingRules = allRules.filter(rule => 
      this.triggerMatches(rule.trigger, event)
    );
    
    // Filter by conditions
    const conditionMatchingRules: AutomationRule[] = [];
    for (const rule of matchingRules) {
      if (await this.conditionsMatch(rule.conditions, event)) {
        conditionMatchingRules.push(rule);
      }
    }
    
    // Sort by priority (if defined)
    return conditionMatchingRules.sort((a, b) => 
      (b.settings.priority || 0) - (a.settings.priority || 0)
    );
  }
  
  private async executeRule(rule: AutomationRule, event: WorkspaceEvent): Promise<void> {
    const executionId = uuid();
    const startTime = Date.now();
    
    try {
      // Check cooldown
      if (!this.checkCooldown(rule)) {
        this.auditLog.log({
          executionId,
          ruleId: rule.id,
          status: 'skipped',
          reason: 'cooldown',
        });
        return;
      }
      
      // Check rate limit
      if (!this.checkRateLimit(rule)) {
        this.auditLog.log({
          executionId,
          ruleId: rule.id,
          status: 'skipped',
          reason: 'rate_limited',
        });
        return;
      }
      
      // Execute each action
      const results: ActionResult[] = [];
      for (const action of rule.actions) {
        const result = await this.executor.execute(action, event);
        results.push(result);
        
        if (!result.success && !rule.settings.continueOnError) {
          break;
        }
      }
      
      // Log execution
      this.auditLog.log({
        executionId,
        ruleId: rule.id,
        status: 'completed',
        duration: Date.now() - startTime,
        results,
        event,
      });
      
      // Update rule stats
      await this.ruleStore.recordExecution(rule.id);
      
    } catch (error) {
      // Handle failure
      this.auditLog.log({
        executionId,
        ruleId: rule.id,
        status: 'failed',
        error: error.message,
        event,
      });
      
      // Retry if configured
      if (rule.settings.retryOnFailure) {
        await this.scheduleRetry(rule, event, 1);
      }
    }
  }
}
```

### 4.2 Action Execution

```typescript
class ActionExecutor {
  async execute(action: AutomationAction, event: WorkspaceEvent): Promise<ActionResult> {
    switch (action.type) {
      case 'block':
        return this.executeBlockAction(action, event);
        
      case 'notification':
        return this.executeNotificationAction(action, event);
        
      case 'webhook':
        return this.executeWebhookAction(action, event);
        
      case 'ai':
        return this.executeAIAction(action, event);
        
      case 'chain':
        return this.executeChainAction(action, event);
        
      default:
        return { success: false, error: 'Unknown action type' };
    }
  }
  
  private async executeBlockAction(
    action: BlockAction, 
    event: WorkspaceEvent
  ): Promise<ActionResult> {
    const resolvedConfig = this.resolveTemplates(action.config, event);
    
    switch (action.operation) {
      case 'create':
        const created = await this.blockService.create(resolvedConfig);
        return { success: true, data: { blockId: created.id } };
        
      case 'update':
        await this.blockService.update(event.blockId!, resolvedConfig.data);
        return { success: true };
        
      case 'move':
        await this.blockService.move(event.blockId!, resolvedConfig.targetColumnId);
        return { success: true };
        
      // ... other operations
    }
  }
  
  private async executeAIAction(
    action: AIAction,
    event: WorkspaceEvent
  ): Promise<ActionResult> {
    switch (action.operation) {
      case 'auto_tag':
        const tags = await this.aiService.suggestTags(event.blockId!);
        if (action.config.autoApply && tags.length > 0) {
          await this.blockService.addTags(event.blockId!, tags);
        }
        return { success: true, data: { suggestedTags: tags } };
        
      case 'suggest_due_date':
        const prediction = await this.aiService.predictDueDate(event.blockId!);
        if (action.config.autoApply && prediction.confidence >= action.config.confidence!) {
          await this.blockService.setDueDate(event.blockId!, prediction.date);
        }
        return { success: true, data: prediction };
        
      // ... other AI operations
    }
  }
}
```

---

## 5. Template System

### 5.1 Template Variables

```typescript
interface TemplateContext {
  // Event data
  event: {
    type: string;
    timestamp: string;
    blockId?: string;
    blockType?: string;
  };
  
  // Block data (if applicable)
  block?: {
    id: string;
    type: string;
    title?: string;
    content?: string;
    [key: string]: any;
  };
  
  // User data
  user?: {
    id: string;
    name: string;
    email: string;
  };
  
  // Custom variables
  [key: string]: any;
}

// Template examples:
// "Task '{{block.title}}' was completed by {{user.name}}"
// "Overdue task in {{block.columnName}}: {{block.title}}"
// "Webhook received at {{event.timestamp}}"
```

### 5.2 Template Resolver

```typescript
class TemplateResolver {
  resolve(template: string, context: TemplateContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }
  
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => 
      current?.[key], obj
    );
  }
}
```

---

## 6. Recurring Tasks

### 6.1 Recurrence Configuration

```typescript
interface RecurrenceConfig {
  // Basic recurrence
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;           // Every N periods
  
  // Advanced options
  daysOfWeek?: number[];      // For weekly: 0=Sun, 1=Mon, etc.
  dayOfMonth?: number;        // For monthly: 1-31
  monthOfYear?: number;       // For yearly: 1-12
  
  // End conditions
  occurrences?: number;       // Max number of occurrences
  endDate?: string;           // End by date
  
  // AI-adjusted recurrence
  aiAdjusted?: {
    enabled: boolean;
    adjustFrequency: boolean;  // AI can suggest frequency changes
    smartSkip: boolean;        // Skip on holidays/weekends
    smartReschedule: boolean;  // Reschedule on conflicts
  };
}
```

### 6.2 Recurrence Service

```typescript
class RecurrenceService {
  async processRecurrences(): Promise<void> {
    const recurringTasks = await this.taskStore.getRecurring();
    const now = new Date();
    
    for (const task of recurringTasks) {
      const nextOccurrence = this.calculateNextOccurrence(task.recurrence, task.lastOccurrence);
      
      if (nextOccurrence <= now) {
        // Check AI adjustments
        if (task.recurrence.aiAdjusted?.smartSkip) {
          const shouldSkip = await this.shouldSkip(nextOccurrence);
          if (shouldSkip) {
            // Reschedule to next valid date
            const newDate = await this.findNextValidDate(task.recurrence, nextOccurrence);
            await this.taskStore.updateNextOccurrence(task.id, newDate);
            continue;
          }
        }
        
        // Create new instance
        await this.createTaskInstance(task);
        
        // Update last occurrence
        await this.taskStore.updateLastOccurrence(task.id, now);
      }
    }
  }
  
  private async shouldSkip(date: Date): Promise<boolean> {
    // Check if weekend
    const day = date.getDay();
    if (day === 0 || day === 6) return true;
    
    // Check if holiday
    const isHoliday = await this.holidayService.isHoliday(date);
    if (isHoliday) return true;
    
    return false;
  }
}
```

---

## 7. Explainability

### 7.1 Execution Explanation

```typescript
interface ExecutionExplanation {
  // What happened
  summary: string;
  
  // Why it happened
  triggerReason: string;
  
  // Conditions that were checked
  conditionResults: {
    condition: AutomationCondition;
    result: boolean;
    actualValue: any;
  }[];
  
  // Actions that were taken
  actionResults: {
    action: AutomationAction;
    result: ActionResult;
    explanation: string;
  }[];
  
  // AI reasoning (if applicable)
  aiReasoning?: {
    model: string;
    confidence: number;
    factors: { name: string; weight: number; value: any }[];
  };
}

class ExplanationService {
  generate(execution: ExecutionLog): ExecutionExplanation {
    return {
      summary: this.generateSummary(execution),
      triggerReason: this.explainTrigger(execution),
      conditionResults: this.explainConditions(execution),
      actionResults: this.explainActions(execution),
      aiReasoning: execution.aiData ? this.explainAI(execution.aiData) : undefined,
    };
  }
  
  private generateSummary(execution: ExecutionLog): string {
    const rule = execution.rule;
    const actionCount = rule.actions.length;
    const successCount = execution.results.filter(r => r.success).length;
    
    return `Rule "${rule.name}" executed ${successCount}/${actionCount} actions successfully`;
  }
}
```

---

## 8. Configuration Examples

### 8.1 Auto-Tag New Tasks

```typescript
const autoTagRule: AutomationRule = {
  id: 'auto-tag-tasks',
  name: 'Auto-tag new tasks',
  description: 'Automatically add tags to tasks based on content',
  enabled: true,
  trigger: {
    type: 'task',
    event: 'created',
  },
  conditions: [],
  actions: [
    {
      type: 'ai',
      operation: 'auto_tag',
      config: {
        confidence: 0.7,
        autoApply: true,
      },
    },
  ],
  settings: {
    async: true,
    retryOnFailure: false,
    maxRetries: 0,
    cooldownMs: 0,
    maxExecutionsPerHour: 1000,
  },
};
```

### 8.2 Overdue Task Notification

```typescript
const overdueNotificationRule: AutomationRule = {
  id: 'overdue-notification',
  name: 'Notify on overdue tasks',
  description: 'Send notification when a task becomes overdue',
  enabled: true,
  trigger: {
    type: 'task',
    event: 'overdue',
  },
  conditions: [
    { type: 'property', field: 'priority', operator: 'in', value: ['high', 'critical'] },
  ],
  actions: [
    {
      type: 'notification',
      channel: 'in_app',
      config: {
        recipients: ['{{block.assignedTo}}', '{{block.ownerId}}'],
        title: 'Overdue Task Alert',
        message: 'Task "{{block.title}}" is overdue (due {{block.dueDate}})',
        urgency: 'high',
      },
    },
  ],
  settings: {
    async: true,
    retryOnFailure: true,
    maxRetries: 3,
    cooldownMs: 3600000,  // 1 hour
    maxExecutionsPerHour: 100,
  },
};
```

### 8.3 Weekly Report Generation

```typescript
const weeklyReportRule: AutomationRule = {
  id: 'weekly-report',
  name: 'Generate weekly report',
  description: 'Generate and send weekly productivity report',
  enabled: true,
  trigger: {
    type: 'time',
    schedule: {
      cron: '0 9 * * 1',  // Monday 9am
      timezone: 'America/New_York',
    },
  },
  conditions: [],
  actions: [
    {
      type: 'ai',
      operation: 'summarize',
      config: {
        targetBlockId: 'workspace-root',
        autoApply: false,
      },
    },
    {
      type: 'webhook',
      config: {
        url: '{{settings.reportWebhookUrl}}',
        method: 'POST',
        body: '{"report": {{aiResult}}}',
      },
    },
  ],
  settings: {
    async: true,
    retryOnFailure: true,
    maxRetries: 2,
    cooldownMs: 0,
    maxExecutionsPerHour: 1,
  },
};
```

---

## 9. Anti-Patterns (FORBIDDEN)

### ❌ Non-deterministic Automations

```typescript
// WRONG - Random behavior
{
  actions: [{
    type: 'block',
    operation: 'update',
    config: {
      data: { priority: Math.random() > 0.5 ? 'high' : 'low' },  // ❌
    },
  }],
}
```

### ❌ Silent Mutations

```typescript
// WRONG - No audit log
async execute(action) {
  await blockStore.update(action.blockId, action.data);
  // No logging! ❌
}
```

### ❌ Infinite Loops

```typescript
// WRONG - Rule triggers itself
{
  trigger: { type: 'task', event: 'updated' },
  actions: [{
    type: 'block',
    operation: 'update',  // Will trigger 'updated' again! ❌
  }],
}
```

---

## 10. Performance Considerations

| Aspect | Recommendation |
|--------|----------------|
| Event Processing | Batch events, process async |
| Rule Matching | Index rules by trigger type |
| AI Actions | Cache predictions, batch requests |
| Audit Logging | Async writes, compression |
| Rate Limiting | Per-rule and global limits |

---

## References

- [AI Native Architecture](./AI_NATIVE_ARCHITECTURE.md)
- [Tool Calling Contract](./TOOL_CALLING_CONTRACT.md)
- [Context Builder Specification](./CONTEXT_BUILDER.md)
