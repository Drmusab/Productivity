/**
 * @fileoverview Note Service - Handles CRUD operations and lifecycle logic for obsidian_notes
 * 
 * This service manages:
 * - Note creation, reading, updating, and deletion
 * - Automatic link parsing and updating on note save
 * - Link resolution (matching note titles to IDs)
 * - Backlink management (incoming links)
 * - Task-note relationship management
 */

import { randomUUID } from 'crypto';
import { runAsync, getAsync, allAsync } from '../utils/database';
import {
  Note,
  NoteLink,
  TaskNoteRelation,
  CreateNoteParams,
  UpdateNoteParams,
  CreateTaskNoteRelationParams,
  NoteLinkType,
  TaskNoteRelationType,
  NoteRow,
  NoteLinkRow,
  TaskNoteRelationRow,
  NoteWithBacklinks,
  NoteWithLinks,
  NoteWithTasks,
  NoteFullContext,
  NoteFrontmatter,
  BacklinkItem,
  NoteWithBacklinkSnippets,
} from '../types/notes';
import {
  extractWikilinks,
  determineLinkType,
  normalizeNoteTitle,
} from '../utils/markdownLinkParser';
import {
  extractWikilinkSnippet,
} from '../utils/snippetExtractor';

/**
 * Note Service Class
 * 
 * Provides high-level operations for managing notes, links, and task-note relations.
 */
export class NoteService {
  /**
   * Create a new note
   * 
   * @param params - Note creation parameters
   * @returns Created note ID
   */
  async createNote(params: CreateNoteParams): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const frontmatterJson = params.frontmatter ? JSON.stringify(params.frontmatter) : null;
    
    await runAsync(
      `INSERT INTO obsidian_notes (id, title, folder_path, content_markdown, frontmatter, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.title,
        params.folderPath || null,
        params.contentMarkdown || '',
        frontmatterJson,
        params.createdBy || null,
        now,
        now,
      ]
    );
    
    // Parse and create links if there's content
    if (params.contentMarkdown) {
      await this.updateNoteLinks(id, params.contentMarkdown);
    }
    
    return id;
  }
  
  /**
   * Get a note by ID
   * 
   * @param noteId - Note ID
   * @returns Note or null if not found
   */
  async getNote(noteId: string): Promise<Note | null> {
    const row = await getAsync('SELECT * FROM obsidian_notes WHERE id = ?', [noteId]);
    
    if (!row) {
      return null;
    }
    
    return this.rowToNote(row as NoteRow);
  }
  
  /**
   * Get note by title
   * 
   * @param title - Note title (case-insensitive)
   * @returns Note or null if not found
   */
  async getNoteByTitle(title: string): Promise<Note | null> {
    // Get all obsidian_notes and find by normalized title
    // SQLite doesn't have great case-insensitive support for all scenarios
    const rows = await allAsync('SELECT * FROM obsidian_notes');
    
    for (const row of rows) {
      if (normalizeNoteTitle(row.title) === normalizeNoteTitle(title)) {
        return this.rowToNote(row as NoteRow);
      }
    }
    
    return null;
  }
  
  /**
   * List all obsidian_notes
   * 
   * @param options - Query options
   * @returns Array of obsidian_notes
   */
  async listNotes(options?: {
    folderPath?: string;
    createdBy?: number;
    limit?: number;
    offset?: number;
  }): Promise<Note[]> {
    let query = 'SELECT * FROM obsidian_notes WHERE 1=1';
    const params: any[] = [];
    
    if (options?.folderPath !== undefined) {
      query += ' AND folder_path = ?';
      params.push(options.folderPath);
    }
    
    if (options?.createdBy !== undefined) {
      query += ' AND created_by = ?';
      params.push(options.createdBy);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    if (options?.limit !== undefined) {
      query += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset !== undefined) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const rows = await allAsync(query, params);
    return rows.map((row: any) => this.rowToNote(row as NoteRow));
  }
  
  /**
   * Update a note
   * 
   * @param params - Update parameters
   */
  async updateNote(params: UpdateNoteParams): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (params.title !== undefined) {
      updates.push('title = ?');
      values.push(params.title);
    }
    
    if (params.folderPath !== undefined) {
      updates.push('folder_path = ?');
      values.push(params.folderPath);
    }
    
    if (params.contentMarkdown !== undefined) {
      updates.push('content_markdown = ?');
      values.push(params.contentMarkdown);
    }
    
    if (params.frontmatter !== undefined) {
      updates.push('frontmatter = ?');
      values.push(JSON.stringify(params.frontmatter));
    }
    
    if (updates.length === 0) {
      return;
    }
    
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    
    values.push(params.id);
    
    await runAsync(
      `UPDATE obsidian_notes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Re-parse links if content was updated
    if (params.contentMarkdown !== undefined) {
      await this.updateNoteLinks(params.id, params.contentMarkdown);
    }
  }
  
  /**
   * Delete a note
   * 
   * @param noteId - Note ID to delete
   */
  async deleteNote(noteId: string): Promise<void> {
    // Mark incoming links as unresolved
    const incomingLinks = await allAsync(
      'SELECT * FROM obsidian_note_links WHERE target_note_id = ?',
      [noteId]
    );
    
    for (const link of incomingLinks) {
      // Get the source note to find the link text
      const sourceNote = await this.getNote(link.source_note_id);
      if (sourceNote) {
        // Set target to null and mark as unresolved
        await runAsync(
          `UPDATE obsidian_note_links 
           SET target_note_id = NULL, 
               unresolved_target = (SELECT title FROM obsidian_notes WHERE id = ?)
           WHERE id = ?`,
          [noteId, link.id]
        );
      }
    }
    
    // Delete the note (cascades will delete outgoing links and task relations)
    await runAsync('DELETE FROM obsidian_notes WHERE id = ?', [noteId]);
  }
  
  /**
   * Update note links by parsing markdown content
   * 
   * This is called automatically on note save.
   * 
   * @param noteId - Note ID
   * @param markdown - Markdown content
   */
  private async updateNoteLinks(noteId: string, markdown: string): Promise<void> {
    // Delete existing links for this note
    await runAsync('DELETE FROM obsidian_note_links WHERE source_note_id = ?', [noteId]);
    
    // Extract wikilinks from markdown
    const wikilinks = extractWikilinks(markdown);
    
    // Create new link entries
    for (const wikilink of wikilinks) {
      const linkId = randomUUID();
      const linkType = determineLinkType(wikilink);
      
      // Try to resolve the link
      const targetNote = await this.getNoteByTitle(wikilink.noteTitle);
      
      await runAsync(
        `INSERT INTO obsidian_note_links (id, source_note_id, target_note_id, unresolved_target, link_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          linkId,
          noteId,
          targetNote ? targetNote.id : null,
          targetNote ? null : wikilink.noteTitle,
          linkType,
          new Date().toISOString(),
        ]
      );
    }
  }
  
  /**
   * Get backlinks for a note (incoming links)
   * 
   * @param noteId - Note ID
   * @returns Array of obsidian_notes that link to this note
   */
  async getBacklinks(noteId: string): Promise<Array<{
    noteId: string;
    noteTitle: string;
    linkType: NoteLinkType;
  }>> {
    const rows = await allAsync(
      `SELECT nl.link_type, n.id, n.title
       FROM obsidian_note_links nl
       JOIN obsidian_notes n ON nl.source_note_id = n.id
       WHERE nl.target_note_id = ?
       ORDER BY n.title`,
      [noteId]
    );
    
    return rows.map((row: any) => ({
      noteId: row.id,
      noteTitle: row.title,
      linkType: row.link_type as NoteLinkType,
    }));
  }
  
  /**
   * Get backlinks with context snippets (Phase C)
   * 
   * This method provides an Obsidian-like feeling by showing where each backlink appears.
   * - Uses indexed lookup by targetNoteId (O(n) over backlinks only)
   * - Extracts ~40-80 char snippets without re-parsing markdown
   * - Falls back to note title if snippet extraction fails
   * 
   * @param noteId - Note ID
   * @returns Array of backlinks with context snippets
   */
  async getBacklinksWithSnippets(noteId: string): Promise<BacklinkItem[]> {
    // Get target note to know what title to look for in snippets
    const targetNote = await this.getNote(noteId);
    if (!targetNote) {
      return [];
    }
    
    // Query backlinks with source note content (indexed lookup)
    const rows = await allAsync(
      `SELECT nl.link_type, nl.source_note_id, n.id, n.title, n.content_markdown
       FROM obsidian_note_links nl
       JOIN obsidian_notes n ON nl.source_note_id = n.id
       WHERE nl.target_note_id = ?
       ORDER BY n.title`,
      [noteId]
    );
    
    // Build backlink items with snippets
    return rows.map((row: any) => {
      // Extract snippet from the source note's markdown
      const snippet = extractWikilinkSnippet(
        row.content_markdown || '',
        targetNote.title,
        row.title // Fallback to source note title
      );
      
      return {
        sourceNoteId: row.id,
        sourceNoteTitle: row.title,
        linkType: row.link_type as NoteLinkType,
        snippet,
        position: undefined, // Could be enhanced with position tracking
      };
    });
  }
  
  /**
   * Get outgoing links for a note
   * 
   * @param noteId - Note ID
   * @returns Array of links from this note
   */
  async getOutgoingLinks(noteId: string): Promise<NoteLink[]> {
    const rows = await allAsync(
      'SELECT * FROM obsidian_note_links WHERE source_note_id = ? ORDER BY created_at',
      [noteId]
    );
    
    return rows.map((row: any) => this.rowToNoteLink(row as NoteLinkRow));
  }
  
  /**
   * Get note with backlinks
   * 
   * @param noteId - Note ID
   * @returns Note with backlinks or null
   */
  async getNoteWithBacklinks(noteId: string): Promise<NoteWithBacklinks | null> {
    const note = await this.getNote(noteId);
    if (!note) {
      return null;
    }
    
    const backlinks = await this.getBacklinks(noteId);
    
    return {
      ...note,
      backlinks,
    };
  }
  
  /**
   * Get note with outgoing links
   * 
   * @param noteId - Note ID
   * @returns Note with links or null
   */
  async getNoteWithLinks(noteId: string): Promise<NoteWithLinks | null> {
    const note = await this.getNote(noteId);
    if (!note) {
      return null;
    }
    
    const links = await this.getOutgoingLinks(noteId);
    
    return {
      ...note,
      links,
    };
  }
  
  /**
   * Get note with backlinks including snippets (Phase C)
   * 
   * Provides the Obsidian-like experience of seeing contextual backlinks.
   * 
   * @param noteId - Note ID
   * @returns Note with backlink snippets or null
   */
  async getNoteWithBacklinkSnippets(noteId: string): Promise<NoteWithBacklinkSnippets | null> {
    const note = await this.getNote(noteId);
    if (!note) {
      return null;
    }
    
    const backlinks = await this.getBacklinksWithSnippets(noteId);
    
    return {
      ...note,
      backlinks,
    };
  }
  
  /**
   * Get full note context (with backlinks, links, and tasks)
   * 
   * @param noteId - Note ID
   * @returns Full note context or null
   */
  async getNoteFullContext(noteId: string): Promise<NoteFullContext | null> {
    const note = await this.getNote(noteId);
    if (!note) {
      return null;
    }
    
    const [backlinks, links, relatedTasks] = await Promise.all([
      this.getBacklinks(noteId),
      this.getOutgoingLinks(noteId),
      this.getRelatedTasks(noteId),
    ]);
    
    return {
      ...note,
      backlinks,
      links,
      relatedTasks,
    };
  }
  
  /**
   * Create a task-note relation
   * 
   * @param params - Relation parameters
   * @returns Created relation ID
   */
  async createTaskNoteRelation(params: CreateTaskNoteRelationParams): Promise<string> {
    const id = randomUUID();
    
    await runAsync(
      `INSERT INTO obsidian_task_note_relations (id, task_id, note_id, relation_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, params.taskId, params.noteId, params.relationType, new Date().toISOString()]
    );
    
    return id;
  }
  
  /**
   * Delete a task-note relation
   * 
   * @param relationId - Relation ID
   */
  async deleteTaskNoteRelation(relationId: string): Promise<void> {
    await runAsync('DELETE FROM obsidian_task_note_relations WHERE id = ?', [relationId]);
  }
  
  /**
   * Get related tasks for a note
   * 
   * @param noteId - Note ID
   * @returns Array of related tasks
   */
  async getRelatedTasks(noteId: string): Promise<Array<{
    taskId: number;
    taskTitle: string;
    relationType: TaskNoteRelationType;
  }>> {
    const rows = await allAsync(
      `SELECT tnr.task_id, tnr.relation_type, t.title
       FROM obsidian_task_note_relations tnr
       JOIN tasks t ON tnr.task_id = t.id
       WHERE tnr.note_id = ?
       ORDER BY tnr.created_at DESC`,
      [noteId]
    );
    
    return rows.map((row: any) => ({
      taskId: row.task_id,
      taskTitle: row.title,
      relationType: row.relation_type as TaskNoteRelationType,
    }));
  }
  
  /**
   * Get related obsidian_notes for a task
   * 
   * @param taskId - Task ID
   * @returns Array of related obsidian_notes
   */
  async getRelatedNotes(taskId: number): Promise<Array<{
    noteId: string;
    noteTitle: string;
    relationType: TaskNoteRelationType;
  }>> {
    const rows = await allAsync(
      `SELECT tnr.note_id, tnr.relation_type, n.title
       FROM obsidian_task_note_relations tnr
       JOIN obsidian_notes n ON tnr.note_id = n.id
       WHERE tnr.task_id = ?
       ORDER BY tnr.created_at DESC`,
      [taskId]
    );
    
    return rows.map((row: any) => ({
      noteId: row.note_id,
      noteTitle: row.title,
      relationType: row.relation_type as TaskNoteRelationType,
    }));
  }
  
  /**
   * Search obsidian_notes by content or title
   * 
   * @param query - Search query
   * @param options - Search options
   * @returns Array of matching obsidian_notes
   */
  async searchNotes(query: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Note[]> {
    const searchPattern = `%${query}%`;
    
    let sql = `
      SELECT * FROM obsidian_notes 
      WHERE title LIKE ? OR content_markdown LIKE ?
      ORDER BY updated_at DESC
    `;
    
    const params: any[] = [searchPattern, searchPattern];
    
    if (options?.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      
      if (options?.offset !== undefined) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }
    
    const rows = await allAsync(sql, params);
    return rows.map((row: any) => this.rowToNote(row as NoteRow));
  }
  
  /**
   * Get unresolved links (links that don't point to existing notes)
   * 
   * @returns Array of unresolved link information
   */
  async getUnresolvedLinks(): Promise<Array<{
    linkId: string;
    sourceNoteId: string;
    sourceNoteTitle: string;
    unresolvedTarget: string;
    linkType: NoteLinkType;
  }>> {
    const rows = await allAsync(
      `SELECT nl.id, nl.source_note_id, nl.unresolved_target, nl.link_type, n.title
       FROM obsidian_note_links nl
       JOIN obsidian_notes n ON nl.source_note_id = n.id
       WHERE nl.target_note_id IS NULL AND nl.unresolved_target IS NOT NULL
       ORDER BY nl.unresolved_target, n.title`
    );
    
    return rows.map((row: any) => ({
      linkId: row.id,
      sourceNoteId: row.source_note_id,
      sourceNoteTitle: row.title,
      unresolvedTarget: row.unresolved_target,
      linkType: row.link_type as NoteLinkType,
    }));
  }
  
  /**
   * Resolve links after a new note is created
   * 
   * This checks if any unresolved links can now be resolved with the new note.
   * 
   * @param noteId - Newly created note ID
   */
  async resolveLinksForNewNote(noteId: string): Promise<void> {
    const note = await this.getNote(noteId);
    if (!note) {
      return;
    }
    
    // Find all unresolved links that match this note's title
    const unresolvedLinks = await allAsync(
      `SELECT * FROM obsidian_note_links 
       WHERE target_note_id IS NULL 
       AND unresolved_target IS NOT NULL`
    );
    
    for (const link of unresolvedLinks as NoteLinkRow[]) {
      if (link.unresolved_target && normalizeNoteTitle(link.unresolved_target) === normalizeNoteTitle(note.title)) {
        // Resolve the link
        await runAsync(
          `UPDATE obsidian_note_links 
           SET target_note_id = ?, unresolved_target = NULL 
           WHERE id = ?`,
          [noteId, link.id]
        );
      }
    }
  }
  
  // ===== Helper Methods =====
  
  /**
   * Convert database row to Note object
   */
  private rowToNote(row: NoteRow): Note {
    return {
      id: row.id,
      title: row.title,
      folderPath: row.folder_path || undefined,
      contentMarkdown: row.content_markdown,
      frontmatter: row.frontmatter || undefined,
      createdBy: row.created_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  
  /**
   * Convert database row to NoteLink object
   */
  private rowToNoteLink(row: NoteLinkRow): NoteLink {
    return {
      id: row.id,
      sourceNoteId: row.source_note_id,
      targetNoteId: row.target_note_id || undefined,
      unresolvedTarget: row.unresolved_target || undefined,
      linkType: row.link_type as NoteLinkType,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const noteService = new NoteService();
