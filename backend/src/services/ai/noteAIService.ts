/**
 * @fileoverview Note AI Service (Phase G)
 * 
 * Core AI service for note intelligence features:
 * - summarizeNote(): Generate concise summaries
 * - generateTasksFromNote(): Extract actionable tasks
 * - suggestLinks(): Suggest note connections
 * - answerFromVault(): RAG-based Q&A
 * 
 * Design Principles:
 * - Async execution
 * - Deterministic outputs (low temperature)
 * - Confidence scores for all AI outputs
 * - Never silently modify user data
 * - Safe caching with content hash validation
 */

import { createHash } from 'crypto';
import { noteService } from '../noteService';
import { unifiedSearchService } from '../unifiedSearchService';
import { getDefaultAIProvider, IAIProvider } from './aiProvider';
import {
  SUMMARIZE_SYSTEM_PROMPT,
  GENERATE_TASKS_SYSTEM_PROMPT,
  SUGGEST_LINKS_SYSTEM_PROMPT,
  VAULT_QA_SYSTEM_PROMPT,
  createSummarizeUserPrompt,
  createGenerateTasksUserPrompt,
  createSuggestLinksUserPrompt,
  createVaultQAUserPrompt,
  DEFAULT_AI_CONFIG,
} from './prompts';
import {
  SummarizeNoteInput,
  NoteSummaryResult,
  GenerateTasksInput,
  GenerateTasksResult,
  GeneratedTask,
  SuggestLinksInput,
  SuggestLinksResult,
  SuggestedLink,
  VaultQuestionInput,
  VaultAnswerResult,
  NoteChunk,
  CandidateNote,
  AIMessage,
} from '../../types/ai';

/**
 * Note AI Service Class
 * 
 * Provides AI-powered intelligence features for notes.
 */
export class NoteAIService {
  private aiProvider: IAIProvider;
  
  constructor(aiProvider?: IAIProvider) {
    this.aiProvider = aiProvider || getDefaultAIProvider();
  }
  
  /**
   * Generate a concise summary of a note
   * 
   * Rules:
   * - Does NOT modify the original note
   * - Summary is returned, not stored
   * - Deterministic prompt style
   * 
   * @param input - Note ID and content
   * @returns Summary result with bullets and key concepts
   */
  async summarizeNote(input: SummarizeNoteInput): Promise<NoteSummaryResult> {
    const { noteId, contentMarkdown } = input;
    
    if (!contentMarkdown || contentMarkdown.trim().length === 0) {
      return {
        noteId,
        summary: 'Empty note - no content to summarize.',
        bullets: [],
        keyConcepts: [],
        confidence: 1.0,
        generatedAt: new Date().toISOString(),
      };
    }
    
    // Create messages for AI
    const messages: AIMessage[] = [
      { role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
      { role: 'user', content: createSummarizeUserPrompt(contentMarkdown) },
    ];
    
    try {
      const response = await this.aiProvider.chat(messages, {
        temperature: DEFAULT_AI_CONFIG.temperature,
        maxTokens: DEFAULT_AI_CONFIG.maxTokens,
      });
      
      // Parse JSON response
      const parsed = this.parseJSONResponse(response.content);
      
      return {
        noteId,
        summary: parsed.summary || 'Unable to generate summary.',
        bullets: parsed.bullets || [],
        keyConcepts: parsed.keyConcepts || [],
        confidence: this.calculateConfidence(parsed),
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to summarize note: ${error.message}`);
    }
  }
  
  /**
   * Generate actionable tasks from a note
   * 
   * Rules:
   * - Tasks must be specific and actionable
   * - Tasks are NOT auto-created - user must approve
   * - Each task has a confidence score
   * 
   * @param input - Note ID and content
   * @returns Array of generated tasks pending approval
   */
  async generateTasksFromNote(input: GenerateTasksInput): Promise<GenerateTasksResult> {
    const { noteId, contentMarkdown } = input;
    
    if (!contentMarkdown || contentMarkdown.trim().length === 0) {
      return {
        noteId,
        tasks: [],
        confidence: 1.0,
        generatedAt: new Date().toISOString(),
      };
    }
    
    // Create messages for AI
    const messages: AIMessage[] = [
      { role: 'system', content: GENERATE_TASKS_SYSTEM_PROMPT },
      { role: 'user', content: createGenerateTasksUserPrompt(contentMarkdown) },
    ];
    
    try {
      const response = await this.aiProvider.chat(messages, {
        temperature: DEFAULT_AI_CONFIG.temperature,
        maxTokens: DEFAULT_AI_CONFIG.maxTokens,
      });
      
      // Parse JSON response
      const parsed = this.parseJSONResponse(response.content);
      
      const tasks: GeneratedTask[] = (parsed.tasks || []).map((task: any) => ({
        title: task.title || 'Untitled task',
        description: task.description,
        confidence: Math.min(1, Math.max(0, task.confidence || 0.5)),
        sourceNoteId: noteId,
        suggestedPriority: this.normalizePriority(task.suggestedPriority),
        suggestedDueDate: task.suggestedDueDate,
      }));
      
      // Sort by confidence descending
      tasks.sort((a, b) => b.confidence - a.confidence);
      
      return {
        noteId,
        tasks,
        confidence: tasks.length > 0 ? tasks.reduce((sum, t) => sum + t.confidence, 0) / tasks.length : 0,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to generate tasks: ${error.message}`);
    }
  }
  
  /**
   * Suggest links to other notes
   * 
   * Rules:
   * - Never auto-insert links
   * - Suggestions ranked by relevance
   * - Avoid suggesting already-linked notes
   * - Explain why each link is useful
   * 
   * @param input - Note ID, content, existing links, and candidates
   * @returns Array of suggested links
   */
  async suggestLinks(input: SuggestLinksInput): Promise<SuggestLinksResult> {
    const { noteId, contentMarkdown, existingLinks, candidateNotes } = input;
    
    if (!contentMarkdown || candidateNotes.length === 0) {
      return {
        noteId,
        suggestions: [],
        generatedAt: new Date().toISOString(),
      };
    }
    
    // Filter out already-linked notes
    const filteredCandidates = candidateNotes.filter(
      (c) => !existingLinks.includes(c.id) && c.id !== noteId
    );
    
    if (filteredCandidates.length === 0) {
      return {
        noteId,
        suggestions: [],
        generatedAt: new Date().toISOString(),
      };
    }
    
    // Get the current note's title
    const currentNote = await noteService.getNote(noteId);
    const noteTitle = currentNote?.title || 'Untitled';
    
    // Create messages for AI
    const messages: AIMessage[] = [
      { role: 'system', content: SUGGEST_LINKS_SYSTEM_PROMPT },
      { role: 'user', content: createSuggestLinksUserPrompt(contentMarkdown, noteTitle, filteredCandidates) },
    ];
    
    try {
      const response = await this.aiProvider.chat(messages, {
        temperature: DEFAULT_AI_CONFIG.temperature,
        maxTokens: DEFAULT_AI_CONFIG.maxTokens,
      });
      
      // Parse JSON response
      const parsed = this.parseJSONResponse(response.content);
      
      const suggestions: SuggestedLink[] = (parsed.suggestions || [])
        .filter((s: any) => s.targetNoteId && filteredCandidates.some(c => c.id === s.targetNoteId))
        .map((suggestion: any) => {
          const candidate = filteredCandidates.find(c => c.id === suggestion.targetNoteId);
          return {
            targetNoteId: suggestion.targetNoteId,
            targetNoteTitle: candidate?.title || 'Unknown',
            reason: suggestion.reason || 'Related content',
            confidence: Math.min(1, Math.max(0, suggestion.confidence || 0.5)),
          };
        });
      
      // Sort by confidence descending
      suggestions.sort((a, b) => b.confidence - a.confidence);
      
      return {
        noteId,
        suggestions,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to suggest links: ${error.message}`);
    }
  }
  
  /**
   * Answer questions using vault content (RAG)
   * 
   * RAG Pipeline:
   * 1. Retrieval: Search notes using full-text search
   * 2. Augmentation: Inject note chunks into prompt
   * 3. Generation: Generate answer with source citations
   * 
   * Rules:
   * - Answer ONLY from vault content
   * - If not found, say "Not found in your notes"
   * - Always cite source notes
   * 
   * @param input - User question
   * @returns Answer with source citations
   */
  async answerFromVault(input: VaultQuestionInput): Promise<VaultAnswerResult> {
    const { question, maxNotes = 5 } = input;
    
    if (!question || question.trim().length === 0) {
      return {
        answer: 'Please provide a question.',
        sources: [],
        foundInVault: false,
        confidence: 0,
        generatedAt: new Date().toISOString(),
      };
    }
    
    // Step 1: Retrieval - Search notes using full-text search
    const noteChunks = await this.retrieveRelevantNotes(question, maxNotes);
    
    if (noteChunks.length === 0) {
      return {
        answer: 'Not found in your notes. No relevant notes were found for your question.',
        sources: [],
        foundInVault: false,
        confidence: 1.0,
        generatedAt: new Date().toISOString(),
      };
    }
    
    // Step 2 & 3: Augmentation & Generation
    const messages: AIMessage[] = [
      { role: 'system', content: VAULT_QA_SYSTEM_PROMPT },
      { role: 'user', content: createVaultQAUserPrompt(question, noteChunks) },
    ];
    
    try {
      const response = await this.aiProvider.chat(messages, {
        temperature: DEFAULT_AI_CONFIG.temperature,
        maxTokens: DEFAULT_AI_CONFIG.maxTokensQA,
      });
      
      // Parse JSON response
      const parsed = this.parseJSONResponse(response.content);
      
      // Check if answer was found
      const foundInVault = parsed.foundInVault !== false &&
        !parsed.answer?.toLowerCase().includes('not found in your notes');
      
      return {
        answer: parsed.answer || 'Unable to generate an answer.',
        sources: (parsed.sources || []).map((s: any) => ({
          noteId: s.noteId,
          title: s.title,
          excerpt: s.excerpt,
        })),
        foundInVault,
        confidence: foundInVault ? 0.8 : 0.2,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to answer question: ${error.message}`);
    }
  }
  
  /**
   * Retrieve relevant notes for a question
   * 
   * Uses full-text search to find notes relevant to the question.
   * 
   * @param query - Search query
   * @param maxNotes - Maximum number of notes to retrieve
   * @returns Array of note chunks
   */
  private async retrieveRelevantNotes(query: string, maxNotes: number): Promise<NoteChunk[]> {
    // Search for notes matching the query
    const searchResults = await unifiedSearchService.searchNotesOnly(query, maxNotes * 2);
    
    // If no direct matches, try with individual words
    if (searchResults.length === 0) {
      const words = query.split(/\s+/).filter(w => w.length > 3);
      for (const word of words.slice(0, 3)) {
        const wordResults = await unifiedSearchService.searchNotesOnly(word, maxNotes);
        if (wordResults.length > 0) {
          searchResults.push(...wordResults);
        }
      }
    }
    
    // Get full note content for top matches
    const noteChunks: NoteChunk[] = [];
    const seenIds = new Set<string>();
    
    for (const result of searchResults.slice(0, maxNotes)) {
      if (seenIds.has(result.id)) continue;
      seenIds.add(result.id);
      
      const note = await noteService.getNote(result.id);
      if (note) {
        // Limit content to avoid token limits
        const content = note.contentMarkdown.length > 2000
          ? note.contentMarkdown.substring(0, 2000) + '...'
          : note.contentMarkdown;
        
        noteChunks.push({
          noteId: note.id,
          noteTitle: note.title,
          content,
          relevanceScore: result.score,
        });
      }
    }
    
    return noteChunks;
  }
  
  /**
   * Parse JSON response from AI
   * 
   * Handles cases where the AI might include markdown code blocks.
   */
  private parseJSONResponse(content: string): any {
    // Remove potential markdown code blocks
    let jsonContent = content.trim();
    
    // Handle ```json ... ``` format
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }
    
    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      // If JSON parsing fails, try to extract JSON object
      const objectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          // Return empty object if all parsing fails
          return {};
        }
      }
      return {};
    }
  }
  
  /**
   * Calculate confidence score based on parsed response
   */
  private calculateConfidence(parsed: any): number {
    if (!parsed || Object.keys(parsed).length === 0) {
      return 0.1;
    }
    
    let confidence = 0.5;
    
    if (parsed.summary && parsed.summary.length > 20) {
      confidence += 0.2;
    }
    
    if (parsed.bullets && parsed.bullets.length > 0) {
      confidence += 0.15;
    }
    
    if (parsed.keyConcepts && parsed.keyConcepts.length > 0) {
      confidence += 0.15;
    }
    
    return Math.min(1, confidence);
  }
  
  /**
   * Normalize priority value
   */
  private normalizePriority(priority: string | undefined): 'low' | 'medium' | 'high' | 'critical' | undefined {
    if (!priority) return undefined;
    
    const normalized = priority.toLowerCase();
    if (['low', 'medium', 'high', 'critical'].includes(normalized)) {
      return normalized as 'low' | 'medium' | 'high' | 'critical';
    }
    
    return undefined;
  }
  
  /**
   * Generate content hash for caching
   */
  generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

// Export singleton instance
export const noteAIService = new NoteAIService();
