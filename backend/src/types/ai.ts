/**
 * @fileoverview Type definitions for AI Note Services (Phase G)
 * 
 * This file defines the types for AI-powered note intelligence features:
 * - Note summarization
 * - Task generation from notes
 * - Link suggestions
 * - Vault Q&A (RAG)
 */

// ===== Note Summarization =====

/**
 * Input for note summarization
 */
export interface SummarizeNoteInput {
  /** Note ID */
  noteId: string;
  /** Markdown content of the note */
  contentMarkdown: string;
}

/**
 * Result of note summarization
 */
export interface NoteSummaryResult {
  /** Note ID */
  noteId: string;
  /** Concise summary text */
  summary: string;
  /** Key bullet points extracted from the note */
  bullets?: string[];
  /** Key concepts/topics identified */
  keyConcepts?: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Timestamp of when summary was generated */
  generatedAt: string;
}

// ===== Task Generation =====

/**
 * Input for task generation from note
 */
export interface GenerateTasksInput {
  /** Note ID */
  noteId: string;
  /** Markdown content of the note */
  contentMarkdown: string;
}

/**
 * A generated task extracted from a note
 */
export interface GeneratedTask {
  /** Task title */
  title: string;
  /** Optional task description */
  description?: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** ID of the source note */
  sourceNoteId: string;
  /** Priority suggestion (optional) */
  suggestedPriority?: 'low' | 'medium' | 'high' | 'critical';
  /** Due date suggestion (optional) */
  suggestedDueDate?: string;
}

/**
 * Result of task generation
 */
export interface GenerateTasksResult {
  /** Note ID */
  noteId: string;
  /** Array of generated tasks */
  tasks: GeneratedTask[];
  /** Overall confidence in the extraction */
  confidence: number;
  /** Timestamp of generation */
  generatedAt: string;
}

// ===== Link Suggestions =====

/**
 * Candidate note for link suggestion
 */
export interface CandidateNote {
  /** Note ID */
  id: string;
  /** Note title */
  title: string;
  /** Summary or first part of content for context */
  contentPreview?: string;
}

/**
 * Input for link suggestion
 */
export interface SuggestLinksInput {
  /** Note ID */
  noteId: string;
  /** Markdown content of the note */
  contentMarkdown: string;
  /** IDs of notes already linked */
  existingLinks: string[];
  /** Candidate notes to consider for linking */
  candidateNotes: CandidateNote[];
}

/**
 * A suggested link between notes
 */
export interface SuggestedLink {
  /** Target note ID to link to */
  targetNoteId: string;
  /** Target note title */
  targetNoteTitle: string;
  /** Reason for suggesting this link */
  reason: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Result of link suggestion
 */
export interface SuggestLinksResult {
  /** Source note ID */
  noteId: string;
  /** Array of suggested links */
  suggestions: SuggestedLink[];
  /** Timestamp of generation */
  generatedAt: string;
}

// ===== Vault Q&A (RAG) =====

/**
 * A chunk of note content for RAG
 */
export interface NoteChunk {
  /** Note ID */
  noteId: string;
  /** Note title */
  noteTitle: string;
  /** Content chunk */
  content: string;
  /** Relevance score (optional, from retrieval) */
  relevanceScore?: number;
}

/**
 * Input for vault Q&A
 */
export interface VaultQuestionInput {
  /** User's question */
  question: string;
  /** Maximum number of notes to retrieve */
  maxNotes?: number;
}

/**
 * Source citation for an answer
 */
export interface AnswerSource {
  /** Note ID */
  noteId: string;
  /** Note title */
  title: string;
  /** Relevant excerpt from the note */
  excerpt?: string;
}

/**
 * Result of vault Q&A
 */
export interface VaultAnswerResult {
  /** Generated answer */
  answer: string;
  /** Source notes used to generate the answer */
  sources: AnswerSource[];
  /** Whether the answer was found in the vault */
  foundInVault: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Timestamp of generation */
  generatedAt: string;
}

// ===== AI Provider Interface =====

/**
 * Configuration for AI provider
 */
export interface AIProviderConfig {
  /** API key for the AI service */
  apiKey?: string;
  /** Base URL for the AI service */
  baseUrl?: string;
  /** Model to use */
  model?: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Maximum tokens for response */
  maxTokens?: number;
}

/**
 * Message in a conversation
 */
export interface AIMessage {
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant';
  /** Message content */
  content: string;
}

/**
 * Response from AI provider
 */
export interface AIResponse {
  /** Generated content */
  content: string;
  /** Token usage (optional) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ===== Approval Workflow =====

/**
 * Status of an AI-generated item pending approval
 */
export interface PendingApproval<T> {
  /** Unique ID for this pending item */
  id: string;
  /** Type of item */
  type: 'task' | 'link' | 'summary';
  /** The generated data */
  data: T;
  /** Source note ID */
  sourceNoteId: string;
  /** Timestamp of creation */
  createdAt: string;
  /** Status */
  status: 'pending' | 'approved' | 'rejected';
}

// ===== Cached AI Results =====

/**
 * Cached AI result for a note
 */
export interface CachedAIResult {
  /** Note ID */
  noteId: string;
  /** Type of cached result */
  type: 'summary' | 'tasks' | 'links';
  /** Cached data (JSON string) */
  data: string;
  /** Content hash when cached (to detect changes) */
  contentHash: string;
  /** Timestamp of caching */
  cachedAt: string;
}
