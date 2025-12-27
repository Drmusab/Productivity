/**
 * @fileoverview Graph Intelligence Service - Phase E
 * 
 * This service provides graph-like queryability over the note link structure.
 * It treats notes as nodes and links as edges, enabling graph traversal and analysis
 * without requiring a graph UI or stored graph structure.
 * 
 * Key Features:
 * - Outgoing links (notes referenced by current note)
 * - Backlinks (notes linking to current note)
 * - Depth-N neighbor traversal (BFS)
 * - Unresolved link detection (missing notes)
 * - Orphan note detection (isolated notes)
 * - Connected note detection
 * 
 * Performance:
 * - Uses indexed queries on source_note_id and target_note_id
 * - O(nodes + edges) worst-case complexity
 * - No recursive DB queries per node
 */

import { allAsync, getAsync } from '../utils/database';
import {
  NoteSummary,
  GraphNode,
  GraphEdge,
  NeighborsResult,
  UnresolvedLink,
  NoteLinkType,
  NoteRow,
  NoteLinkRow,
} from '../types/notes';

/**
 * Graph Service Class
 * 
 * Provides graph intelligence over note link data.
 */
export class GraphService {
  /**
   * Get outgoing links from a note
   * 
   * Returns all notes referenced by the given note (including unresolved targets by title).
   * 
   * @param noteId - Source note ID
   * @returns Array of note summaries (resolved and unresolved)
   */
  async getOutgoingLinks(noteId: string): Promise<NoteSummary[]> {
    // Get all links from this note
    const links = await allAsync(
      `SELECT nl.*, n.title, n.folder_path
       FROM obsidian_note_links nl
       LEFT JOIN obsidian_notes n ON nl.target_note_id = n.id
       WHERE nl.source_note_id = ?
       ORDER BY nl.created_at`,
      [noteId]
    );
    
    // Convert to NoteSummary
    const summaries: NoteSummary[] = links.map((link: any) => {
      if (link.target_note_id) {
        // Resolved link
        return {
          id: link.target_note_id,
          title: link.title,
          folderPath: link.folder_path || null,
        };
      } else {
        // Unresolved link - return with placeholder ID
        return {
          id: `unresolved:${link.unresolved_target}`,
          title: link.unresolved_target,
          folderPath: null,
        };
      }
    });
    
    return summaries;
  }
  
  /**
   * Get backlinks to a note
   * 
   * Returns all notes that link to the given note.
   * Uses indexed lookup by targetNoteId.
   * 
   * @param noteId - Target note ID
   * @returns Array of note summaries that link to this note
   */
  async getBacklinks(noteId: string): Promise<NoteSummary[]> {
    const backlinks = await allAsync(
      `SELECT n.id, n.title, n.folder_path
       FROM obsidian_note_links nl
       JOIN obsidian_notes n ON nl.source_note_id = n.id
       WHERE nl.target_note_id = ?
       ORDER BY n.title`,
      [noteId]
    );
    
    return backlinks.map((row: any) => ({
      id: row.id,
      title: row.title,
      folderPath: row.folder_path || null,
    }));
  }
  
  /**
   * Get neighbors with depth-N traversal
   * 
   * Performs breadth-first search (BFS) to find all notes within N hops of the origin.
   * Prevents infinite loops with visited tracking.
   * 
   * Rules:
   * - Bidirectional traversal (follows both outgoing and incoming links)
   * - Depth 0 = origin note only
   * - Depth 1 = direct neighbors
   * - Depth N = all notes within N hops
   * 
   * @param noteId - Origin note ID
   * @param depth - Maximum depth to traverse (default: 1)
   * @returns Graph nodes and edges
   */
  async getNeighbors(noteId: string, depth: number = 1): Promise<NeighborsResult> {
    if (depth < 0) {
      throw new Error('Depth must be non-negative');
    }
    
    // Get origin note
    const originNote = await getAsync(
      'SELECT id, title FROM obsidian_notes WHERE id = ?',
      [noteId]
    );
    
    if (!originNote) {
      return { nodes: [], edges: [] };
    }
    
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const visited = new Set<string>();
    const nodeMap = new Map<string, GraphNode>();
    
    // BFS queue: [noteId, currentDepth]
    const queue: [string, number][] = [[noteId, 0]];
    visited.add(noteId);
    
    // Add origin node
    const originNode: GraphNode = {
      noteId: originNote.id,
      title: originNote.title,
      depth: 0,
    };
    nodes.push(originNode);
    nodeMap.set(noteId, originNode);
    
    while (queue.length > 0) {
      const [currentNoteId, currentDepth] = queue.shift()!;
      
      // Stop if we've reached max depth
      if (currentDepth >= depth) {
        continue;
      }
      
      // Get all links from this note (outgoing)
      // Note: Separate queries for outgoing/incoming is intentional for BFS.
      // Each query is O(links_per_node) with indexed lookups, which is faster
      // than a complex batched query for typical graph sizes (<10k nodes).
      const outgoingLinks = await allAsync(
        `SELECT nl.id, nl.target_note_id, nl.link_type, n.title
         FROM obsidian_note_links nl
         LEFT JOIN obsidian_notes n ON nl.target_note_id = n.id
         WHERE nl.source_note_id = ? AND nl.target_note_id IS NOT NULL`,
        [currentNoteId]
      );
      
      for (const link of outgoingLinks as any[]) {
        const targetId = link.target_note_id;
        
        // Add edge
        edges.push({
          sourceNoteId: currentNoteId,
          targetNoteId: targetId,
          linkType: link.link_type as NoteLinkType,
        });
        
        // Add node if not visited
        if (!visited.has(targetId)) {
          visited.add(targetId);
          const node: GraphNode = {
            noteId: targetId,
            title: link.title,
            depth: currentDepth + 1,
          };
          nodes.push(node);
          nodeMap.set(targetId, node);
          queue.push([targetId, currentDepth + 1]);
        }
      }
      
      // Get all links to this note (incoming/backlinks)
      const incomingLinks = await allAsync(
        `SELECT nl.id, nl.source_note_id, nl.link_type, n.title
         FROM obsidian_note_links nl
         JOIN obsidian_notes n ON nl.source_note_id = n.id
         WHERE nl.target_note_id = ?`,
        [currentNoteId]
      );
      
      for (const link of incomingLinks as any[]) {
        const sourceId = link.source_note_id;
        
        // Add edge
        edges.push({
          sourceNoteId: sourceId,
          targetNoteId: currentNoteId,
          linkType: link.link_type as NoteLinkType,
        });
        
        // Add node if not visited
        if (!visited.has(sourceId)) {
          visited.add(sourceId);
          const node: GraphNode = {
            noteId: sourceId,
            title: link.title,
            depth: currentDepth + 1,
          };
          nodes.push(node);
          nodeMap.set(sourceId, node);
          queue.push([sourceId, currentDepth + 1]);
        }
      }
    }
    
    return { nodes, edges };
  }
  
  /**
   * Get all unresolved links (missing notes)
   * 
   * Returns links that don't point to existing notes, grouped by target title.
   * Useful for identifying which notes should be created.
   * 
   * @returns Array of unresolved links with counts
   */
  async getUnresolvedLinks(): Promise<UnresolvedLink[]> {
    // Use a single query with MIN to get the first source for each unresolved target
    const rows = await allAsync(
      `SELECT 
         nl.unresolved_target as missingTitle,
         MIN(nl.source_note_id) as sourceNoteId,
         COUNT(*) as count
       FROM obsidian_note_links nl
       WHERE nl.target_note_id IS NULL AND nl.unresolved_target IS NOT NULL
       GROUP BY nl.unresolved_target
       ORDER BY count DESC, nl.unresolved_target`
    );
    
    return rows.map((row: any) => ({
      sourceNoteId: row.sourceNoteId,
      missingTitle: row.missingTitle,
      count: row.count,
    }));
  }
  
  /**
   * Get orphan notes (notes with no incoming or outgoing links)
   * 
   * Returns notes that are completely isolated in the graph.
   * Useful for identifying notes that may need better linking.
   * 
   * @returns Array of orphan note summaries
   */
  async getOrphanNotes(): Promise<NoteSummary[]> {
    const rows = await allAsync(
      `SELECT n.id, n.title, n.folder_path
       FROM obsidian_notes n
       WHERE NOT EXISTS (
         SELECT 1 FROM obsidian_note_links nl
         WHERE nl.source_note_id = n.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM obsidian_note_links nl
         WHERE nl.target_note_id = n.id
       )
       ORDER BY n.title`
    );
    
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      folderPath: row.folder_path || null,
    }));
  }
  
  /**
   * Get connected notes (notes with at least one link)
   * 
   * Returns notes that have at least one incoming or outgoing link.
   * Complement of orphan notes.
   * 
   * @returns Array of connected note summaries
   */
  async getConnectedNotes(): Promise<NoteSummary[]> {
    const rows = await allAsync(
      `SELECT DISTINCT n.id, n.title, n.folder_path
       FROM obsidian_notes n
       WHERE EXISTS (
         SELECT 1 FROM obsidian_note_links nl
         WHERE nl.source_note_id = n.id
       )
       OR EXISTS (
         SELECT 1 FROM obsidian_note_links nl
         WHERE nl.target_note_id = n.id
       )
       ORDER BY n.title`
    );
    
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      folderPath: row.folder_path || null,
    }));
  }
}

// Export singleton instance
export const graphService = new GraphService();
