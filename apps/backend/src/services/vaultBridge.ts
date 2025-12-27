/**
 * @fileoverview Knowledge Vault Integration Bridge
 * Provides seamless integration between legacy modules and the unified Knowledge Vault
 * Allows existing modules to read/write to vault while maintaining backward compatibility
 * @module services/vaultBridge
 */

import { KnowledgeVaultService, VaultItemType, PARACategory } from './knowledgeVault';

/**
 * Bridge service for integrating legacy modules with Knowledge Vault
 */
export class VaultBridgeService {
  
  /**
   * Auto-save a thought to vault when created
   */
  static async syncThoughtToVault(thought: { id: number; content?: string; category: string; is_processed?: boolean; session_id?: string; created_by: number }): Promise<string | null> {
    try {
      const category = this.mapThoughtCategoryToPARA(thought.category);
      
      const vaultItem = await KnowledgeVaultService.createVaultItem({
        type: VaultItemType.THOUGHT,
        title: thought.content?.substring(0, 100) || 'Untitled Thought',
        content: thought.content || '',
        para_category: category,
        tags: [thought.category],
        metadata: {
          original_category: thought.category,
          is_processed: thought.is_processed || false,
          session_id: thought.session_id,
        },
        created_by: thought.created_by,
        source_table: 'thoughts',
        source_id: thought.id.toString(),
      });

      return vaultItem.id;
    } catch (error) {
      console.error('Failed to sync thought to vault:', error);
      return null;
    }
  }

  /**
   * Auto-save an idea to vault when created
   */
  static async syncIdeaToVault(idea: { id: number; title: string; description?: string; status: string; priority?: string; category?: string; tags?: string; created_by: number }): Promise<string | null> {
    try {
      const category = this.mapIdeaStatusToPARA(idea.status);
      
      const vaultItem = await KnowledgeVaultService.createVaultItem({
        type: VaultItemType.IDEA,
        title: idea.title,
        content: idea.description || '',
        para_category: category,
        tags: idea.tags ? JSON.parse(idea.tags) : [],
        metadata: {
          status: idea.status,
          priority: idea.priority,
          category: idea.category,
        },
        created_by: idea.created_by,
        source_table: 'ideas',
        source_id: idea.id.toString(),
      });

      return vaultItem.id;
    } catch (error) {
      console.error('Failed to sync idea to vault:', error);
      return null;
    }
  }

  /**
   * Auto-save an article to vault when created
   */
  static async syncArticleToVault(article: { id: number; title: string; content?: string; status: string; type?: string; word_count?: number; target_word_count?: number; excerpt?: string; tags?: string; created_by: number }): Promise<string | null> {
    try {
      const category = this.mapArticleStatusToPARA(article.status);
      
      const vaultItem = await KnowledgeVaultService.createVaultItem({
        type: VaultItemType.ARTICLE,
        title: article.title,
        content: article.content || '',
        para_category: category,
        tags: article.tags ? JSON.parse(article.tags) : [],
        metadata: {
          status: article.status,
          type: article.type,
          word_count: article.word_count,
          target_word_count: article.target_word_count,
          excerpt: article.excerpt,
        },
        created_by: article.created_by,
        source_table: 'articles',
        source_id: article.id.toString(),
      });

      return vaultItem.id;
    } catch (error) {
      console.error('Failed to sync article to vault:', error);
      return null;
    }
  }

  /**
   * Auto-save a note to vault when created
   */
  static async syncNoteToVault(note: { id: string; title: string; content_markdown?: string; folder_path?: string; frontmatter?: string; created_by: number }): Promise<string | null> {
    try {
      const vaultItem = await KnowledgeVaultService.createVaultItem({
        type: VaultItemType.NOTE,
        title: note.title,
        content: note.content_markdown || '',
        para_category: null, // User will categorize manually
        folder_path: note.folder_path,
        tags: [],
        metadata: {
          frontmatter: note.frontmatter ? JSON.parse(note.frontmatter) : {},
        },
        created_by: note.created_by,
        source_table: 'obsidian_notes',
        source_id: note.id,
      });

      return vaultItem.id;
    } catch (error) {
      console.error('Failed to sync note to vault:', error);
      return null;
    }
  }

  /**
   * Auto-save a quote to vault when created
   */
  static async syncQuoteToVault(quote: { id: number; content: string; author?: string; source?: string; category?: string; is_favorite?: boolean; created_by: number }): Promise<string | null> {
    try {
      const vaultItem = await KnowledgeVaultService.createVaultItem({
        type: VaultItemType.QUOTE,
        title: `Quote by ${quote.author || 'Unknown'}`,
        content: quote.content,
        para_category: PARACategory.RESOURCE,
        tags: [quote.category].filter(Boolean),
        metadata: {
          author: quote.author,
          source: quote.source,
          is_favorite: quote.is_favorite || false,
        },
        created_by: quote.created_by,
        source_table: 'quotes',
        source_id: quote.id.toString(),
      });

      return vaultItem.id;
    } catch (error) {
      console.error('Failed to sync quote to vault:', error);
      return null;
    }
  }

  /**
   * Auto-save a word to vault when created
   */
  static async syncWordToVault(word: { id: number; word: string; definition?: string; pronunciation?: string; part_of_speech?: string; example_sentence?: string; origin?: string; synonyms?: string; antonyms?: string; category?: string; mastery_level?: number; created_by: number }): Promise<string | null> {
    try {
      const vaultItem = await KnowledgeVaultService.createVaultItem({
        type: VaultItemType.WORD,
        title: word.word,
        content: word.definition || '',
        para_category: PARACategory.RESOURCE,
        tags: [word.category, word.part_of_speech].filter(Boolean),
        metadata: {
          pronunciation: word.pronunciation,
          example_sentence: word.example_sentence,
          origin: word.origin,
          synonyms: word.synonyms ? JSON.parse(word.synonyms) : [],
          antonyms: word.antonyms ? JSON.parse(word.antonyms) : [],
          mastery_level: word.mastery_level || 0,
        },
        created_by: word.created_by,
        source_table: 'words',
        source_id: word.id.toString(),
      });

      return vaultItem.id;
    } catch (error) {
      console.error('Failed to sync word to vault:', error);
      return null;
    }
  }

  /**
   * Find related vault items for a given item
   */
  static async findRelatedItems(itemId: string, limit: number = 10): Promise<any[]> {
    try {
      const item = await KnowledgeVaultService.getVaultItem(itemId);
      if (!item) return [];

      // Find items with similar tags
      const allItems = await KnowledgeVaultService.getVaultItems({
        created_by: item.created_by,
      });

      // Calculate similarity score based on tags
      const scored = allItems
        .filter(i => i.id !== itemId)
        .map(i => {
          const commonTags = i.tags.filter(tag => item.tags.includes(tag));
          const score = commonTags.length;
          return { item: i, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scored.map(({ item }) => item);
    } catch (error) {
      console.error('Failed to find related items:', error);
      return [];
    }
  }

  /**
   * Link a task to vault items based on description
   */
  static async autoLinkTaskToVault(taskId: number, description: string, userId: number): Promise<string[]> {
    try {
      // Extract potential note references from task description
      // Look for patterns like [[Note Title]] or #tag
      const wikiLinkPattern = /\[\[(.*?)\]\]/g;
      const matches = [...description.matchAll(wikiLinkPattern)];
      
      const linkedItems: string[] = [];

      for (const match of matches) {
        const noteTitle = match[1];
        
        // Search for vault items with matching title
        const searchResults = await KnowledgeVaultService.searchVault(noteTitle, userId);
        
        if (searchResults.length > 0) {
          const targetItem = searchResults[0]; // Use best match
          
          // Create a vault item for the task if it doesn't exist
          const taskVaultItem = await KnowledgeVaultService.createVaultItem({
            type: VaultItemType.TASK,
            title: `Task #${taskId}`,
            content: description,
            para_category: PARACategory.PROJECT,
            tags: ['task'],
            metadata: { task_id: taskId },
            created_by: userId,
            source_table: 'tasks',
            source_id: taskId.toString(),
          });

          // Create link
          await KnowledgeVaultService.createVaultLink(
            taskVaultItem.id,
            targetItem.id,
            'reference'
          );

          linkedItems.push(targetItem.id);
        }
      }

      return linkedItems;
    } catch (error) {
      console.error('Failed to auto-link task:', error);
      return [];
    }
  }

  /**
   * Map thought category to PARA
   */
  private static mapThoughtCategoryToPARA(category: string): PARACategory {
    switch (category) {
      case 'actions':
        return PARACategory.PROJECT;
      case 'questions':
        return PARACategory.AREA;
      default:
        return PARACategory.RESOURCE;
    }
  }

  /**
   * Map idea status to PARA
   */
  private static mapIdeaStatusToPARA(status: string): PARACategory {
    switch (status) {
      case 'new':
      case 'exploring':
      case 'developing':
        return PARACategory.PROJECT;
      case 'on_hold':
        return PARACategory.AREA;
      case 'completed':
        return PARACategory.ARCHIVE;
      default:
        return PARACategory.RESOURCE;
    }
  }

  /**
   * Map article status to PARA
   */
  private static mapArticleStatusToPARA(status: string): PARACategory {
    switch (status) {
      case 'idea':
      case 'research':
      case 'outline':
      case 'draft':
      case 'editing':
      case 'review':
        return PARACategory.PROJECT;
      case 'published':
      case 'archived':
        return PARACategory.ARCHIVE;
      default:
        return PARACategory.RESOURCE;
    }
  }

  /**
   * Suggest PARA category for an item based on content analysis
   */
  static suggestPARACategory(title: string, content: string, metadata: any): PARACategory {
    const text = (title + ' ' + content).toLowerCase();

    // Project indicators
    const projectKeywords = ['goal', 'deadline', 'project', 'complete', 'finish', 'deliver', 'milestone'];
    if (projectKeywords.some(kw => text.includes(kw))) {
      return PARACategory.PROJECT;
    }

    // Area indicators
    const areaKeywords = ['responsibility', 'maintain', 'ongoing', 'continuous', 'manage', 'track'];
    if (areaKeywords.some(kw => text.includes(kw))) {
      return PARACategory.AREA;
    }

    // Archive indicators
    const archiveKeywords = ['completed', 'archived', 'finished', 'done', 'closed'];
    if (archiveKeywords.some(kw => text.includes(kw))) {
      return PARACategory.ARCHIVE;
    }

    // Default to resource
    return PARACategory.RESOURCE;
  }

  /**
   * Get vault summary for dashboard
   */
  static async getVaultSummary(userId: number): Promise<{
    total: number;
    recent: any[];
    topTags: string[];
    paraDistribution: Record<string, number>;
  }> {
    try {
      const [stats, items] = await Promise.all([
        KnowledgeVaultService.getVaultStats(userId),
        KnowledgeVaultService.getVaultItems({ created_by: userId }),
      ]);

      // Get recent items (last 5)
      const recent = items
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);

      // Calculate top tags
      const tagCounts: Record<string, number> = {};
      items.forEach(item => {
        item.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

      return {
        total: stats.total,
        recent,
        topTags,
        paraDistribution: stats.by_para,
      };
    } catch (error) {
      console.error('Failed to get vault summary:', error);
      return {
        total: 0,
        recent: [],
        topTags: [],
        paraDistribution: {},
      };
    }
  }
}
