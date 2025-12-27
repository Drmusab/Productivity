/**
 * @fileoverview Unified Search Service - Phase D
 * 
 * This service implements unified search across notes and tasks.
 * It powers the command palette / quick switcher experience.
 * 
 * Features:
 * - Text search across notes and tasks
 * - Simple ranking (title match > body match)
 * - Related entity discovery (notes linked to tasks, tasks linked to notes)
 * - Fast in-memory search suitable for small datasets
 * - <100ms response time constraint
 */

import { allAsync } from '../utils/database';
import { SearchResult, UnifiedSearchOptions } from '../types/notes';
import { extractSearchSnippet } from '../utils/snippetExtractor';

/**
 * Unified Search Service Class
 */
export class UnifiedSearchService {
  /**
   * Search across both notes and tasks
   * 
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of search results
   */
  async search(query: string, options?: UnifiedSearchOptions): Promise<SearchResult[]> {
    const {
      limit = 50,
      offset = 0,
      types = ['note', 'task'],
      includeRelated = true,
    } = options || {};
    
    // Normalize query
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }
    
    // Search in parallel
    const [noteResults, taskResults] = await Promise.all([
      types.includes('note') ? this.searchNotes(normalizedQuery) : Promise.resolve([]),
      types.includes('task') ? this.searchTasks(normalizedQuery) : Promise.resolve([]),
    ]);
    
    // Merge and rank results
    const mergedResults = this.mergeAndRank([...noteResults, ...taskResults]);
    
    // Attach related entities if requested
    if (includeRelated) {
      await this.attachRelatedEntities(mergedResults);
    }
    
    // Apply pagination
    return mergedResults.slice(offset, offset + limit);
  }
  
  /**
   * Search notes by title and content
   * 
   * @param query - Normalized search query
   * @returns Array of note search results
   */
  private async searchNotes(query: string): Promise<SearchResult[]> {
    const searchPattern = `%${query}%`;
    
    const rows = await allAsync(
      `SELECT id, title, content_markdown, 
              CASE 
                WHEN LOWER(title) LIKE ? THEN 100
                WHEN LOWER(content_markdown) LIKE ? THEN 50
                ELSE 0
              END as score
       FROM obsidian_notes
       WHERE LOWER(title) LIKE ? OR LOWER(content_markdown) LIKE ?
       ORDER BY score DESC, updated_at DESC`,
      [searchPattern, searchPattern, searchPattern, searchPattern]
    );
    
    return rows.map((row: any) => {
      // Determine if match is in title or content
      const titleMatch = row.title.toLowerCase().includes(query);
      const snippet = titleMatch
        ? row.title
        : extractSearchSnippet(row.content_markdown || '', query);
      
      return {
        id: row.id,
        type: 'note' as const,
        title: row.title,
        snippet,
        score: row.score,
      };
    });
  }
  
  /**
   * Search tasks by title and description
   * 
   * @param query - Normalized search query
   * @returns Array of task search results
   */
  private async searchTasks(query: string): Promise<SearchResult[]> {
    const searchPattern = `%${query}%`;
    
    const rows = await allAsync(
      `SELECT id, title, description,
              CASE 
                WHEN LOWER(title) LIKE ? THEN 100
                WHEN LOWER(description) LIKE ? THEN 50
                ELSE 0
              END as score
       FROM tasks
       WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ?
       ORDER BY score DESC, updated_at DESC`,
      [searchPattern, searchPattern, searchPattern, searchPattern]
    );
    
    return rows.map((row: any) => {
      // Determine if match is in title or description
      const titleMatch = row.title.toLowerCase().includes(query);
      const snippet = titleMatch
        ? row.title
        : extractSearchSnippet(row.description || '', query);
      
      return {
        id: String(row.id),
        type: 'task' as const,
        title: row.title,
        snippet,
        score: row.score,
      };
    });
  }
  
  /**
   * Merge and rank search results
   * 
   * Ranking rules (simple):
   * - Title match > body match (already handled by score)
   * - Exact match > partial match
   * - Higher score = better ranking
   * 
   * @param results - Array of search results
   * @returns Sorted array of results
   */
  private mergeAndRank(results: SearchResult[]): SearchResult[] {
    return results.sort((a, b) => {
      // Sort by score descending
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // If scores are equal, prefer notes over tasks
      if (a.type === 'note' && b.type === 'task') {
        return -1;
      }
      if (a.type === 'task' && b.type === 'note') {
        return 1;
      }
      
      return 0;
    });
  }
  
  /**
   * Attach related entities to search results
   * 
   * For each result:
   * - If it's a note, attach related tasks
   * - If it's a task, attach related notes
   * 
   * @param results - Array of search results to enhance
   */
  private async attachRelatedEntities(results: SearchResult[]): Promise<void> {
    for (const result of results) {
      if (result.type === 'note') {
        // Get related tasks
        const relatedTaskRows = await allAsync(
          `SELECT t.id, t.title
           FROM obsidian_task_note_relations tnr
           JOIN tasks t ON tnr.task_id = t.id
           WHERE tnr.note_id = ?
           LIMIT 5`,
          [result.id]
        );
        
        if (relatedTaskRows.length > 0) {
          result.related = {
            tasks: relatedTaskRows.map((row: any) => String(row.id)),
          };
        }
      } else if (result.type === 'task') {
        // Get related notes
        const taskId = parseInt(result.id, 10);
        
        // Skip if ID is not a valid number
        if (isNaN(taskId)) {
          continue;
        }
        
        const relatedNoteRows = await allAsync(
          `SELECT n.id, n.title
           FROM obsidian_task_note_relations tnr
           JOIN obsidian_notes n ON tnr.note_id = n.id
           WHERE tnr.task_id = ?
           LIMIT 5`,
          [taskId]
        );
        
        if (relatedNoteRows.length > 0) {
          result.related = {
            notes: relatedNoteRows.map((row: any) => row.id),
          };
        }
      }
    }
  }
  
  /**
   * Quick search - optimized for command palette
   * 
   * Returns top 10 results without related entities for fast response.
   * 
   * @param query - Search query
   * @returns Top 10 search results
   */
  async quickSearch(query: string): Promise<SearchResult[]> {
    return this.search(query, {
      limit: 10,
      includeRelated: false,
    });
  }
  
  /**
   * Search notes only
   * 
   * @param query - Search query
   * @param limit - Maximum results
   * @returns Note search results
   */
  async searchNotesOnly(query: string, limit: number = 20): Promise<SearchResult[]> {
    return this.search(query, {
      limit,
      types: ['note'],
      includeRelated: false,
    });
  }
  
  /**
   * Search tasks only
   * 
   * @param query - Search query
   * @param limit - Maximum results
   * @returns Task search results
   */
  async searchTasksOnly(query: string, limit: number = 20): Promise<SearchResult[]> {
    return this.search(query, {
      limit,
      types: ['task'],
      includeRelated: false,
    });
  }
}

// Export singleton instance
export const unifiedSearchService = new UnifiedSearchService();
