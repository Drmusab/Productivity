import type { Note, Graph, GraphNode, GraphEdge } from './types';
import { parseWikilinks } from './markdown';

/**
 * Knowledge Graph utilities for note relationships
 * Manages wikilinks, backlinks, and graph queries
 */

export class KnowledgeGraph {
  private notes: Map<string, Note>;
  private graph: Graph;

  constructor() {
    this.notes = new Map();
    this.graph = { nodes: [], edges: [] };
  }

  /**
   * Add or update a note in the graph
   */
  addNote(note: Note): void {
    this.notes.set(note.id, note);
    this.updateGraph();
  }

  /**
   * Remove a note from the graph
   */
  removeNote(noteId: string): void {
    this.notes.delete(noteId);
    this.updateGraph();
  }

  /**
   * Get all notes linked from a given note (outgoing links)
   */
  getOutgoingLinks(noteId: string): Note[] {
    const note = this.notes.get(noteId);
    if (!note) return [];

    const wikilinks = parseWikilinks(note.content);
    const linkedNotes: Note[] = [];

    for (const wikilink of wikilinks) {
      const targetNote = this.findNoteByTitle(wikilink.target);
      if (targetNote) {
        linkedNotes.push(targetNote);
      }
    }

    return linkedNotes;
  }

  /**
   * Get all notes that link to a given note (backlinks)
   */
  getBacklinks(noteId: string): Note[] {
    const targetNote = this.notes.get(noteId);
    if (!targetNote) return [];

    const backlinks: Note[] = [];

    for (const note of this.notes.values()) {
      if (note.id === noteId) continue;

      const wikilinks = parseWikilinks(note.content);
      const linksToTarget = wikilinks.some(
        (wikilink) => this.findNoteByTitle(wikilink.target)?.id === noteId
      );

      if (linksToTarget) {
        backlinks.push(note);
      }
    }

    return backlinks;
  }

  /**
   * Get unresolved links (links to notes that don't exist)
   */
  getUnresolvedLinks(): Array<{ noteId: string; target: string }> {
    const unresolved: Array<{ noteId: string; target: string }> = [];

    for (const note of this.notes.values()) {
      const wikilinks = parseWikilinks(note.content);

      for (const wikilink of wikilinks) {
        const targetNote = this.findNoteByTitle(wikilink.target);
        if (!targetNote) {
          unresolved.push({
            noteId: note.id,
            target: wikilink.target,
          });
        }
      }
    }

    return unresolved;
  }

  /**
   * Find a note by its title
   */
  findNoteByTitle(title: string): Note | undefined {
    for (const note of this.notes.values()) {
      if (note.title.toLowerCase() === title.toLowerCase()) {
        return note;
      }
    }
    return undefined;
  }

  /**
   * Get notes by tag
   */
  getNotesByTag(tag: string): Note[] {
    return Array.from(this.notes.values()).filter((note) =>
      note.tags.includes(tag)
    );
  }

  /**
   * Get all tags with their note counts
   */
  getAllTags(): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();

    for (const note of this.notes.values()) {
      for (const tag of note.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get the full graph representation
   */
  getGraph(): Graph {
    return this.graph;
  }

  /**
   * Update the internal graph structure
   */
  private updateGraph(): void {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const tagNodes = new Map<string, GraphNode>();

    // Create nodes for all notes
    for (const note of this.notes.values()) {
      nodes.push({
        id: note.id,
        title: note.title,
        type: 'note',
        weight: this.getBacklinks(note.id).length + this.getOutgoingLinks(note.id).length,
      });

      // Create tag nodes
      for (const tag of note.tags) {
        if (!tagNodes.has(tag)) {
          tagNodes.set(tag, {
            id: `tag:${tag}`,
            title: tag,
            type: 'tag',
            weight: 0,
          });
        }
      }
    }

    // Add tag nodes
    nodes.push(...tagNodes.values());

    // Create edges for wikilinks
    for (const note of this.notes.values()) {
      const wikilinks = parseWikilinks(note.content);

      for (const wikilink of wikilinks) {
        const targetNote = this.findNoteByTitle(wikilink.target);
        if (targetNote) {
          edges.push({
            source: note.id,
            target: targetNote.id,
            type: 'wikilink',
            weight: 1,
          });
        }
      }

      // Create edges for tags
      for (const tag of note.tags) {
        edges.push({
          source: note.id,
          target: `tag:${tag}`,
          type: 'tag',
          weight: 1,
        });
      }
    }

    this.graph = { nodes, edges };
  }

  /**
   * Get orphan notes (notes with no links)
   */
  getOrphanNotes(): Note[] {
    return Array.from(this.notes.values()).filter((note) => {
      const hasOutgoing = this.getOutgoingLinks(note.id).length > 0;
      const hasBacklinks = this.getBacklinks(note.id).length > 0;
      return !hasOutgoing && !hasBacklinks;
    });
  }

  /**
   * Get hub notes (notes with many connections)
   */
  getHubNotes(minConnections = 5): Note[] {
    return Array.from(this.notes.values())
      .filter((note) => {
        const connections = this.getOutgoingLinks(note.id).length + this.getBacklinks(note.id).length;
        return connections >= minConnections;
      })
      .sort((a, b) => {
        const aConnections = this.getOutgoingLinks(a.id).length + this.getBacklinks(a.id).length;
        const bConnections = this.getOutgoingLinks(b.id).length + this.getBacklinks(b.id).length;
        return bConnections - aConnections;
      });
  }

  /**
   * Get related notes (notes that share links or tags)
   */
  getRelatedNotes(noteId: string, limit = 10): Note[] {
    const note = this.notes.get(noteId);
    if (!note) return [];

    const relatedScores = new Map<string, number>();

    // Score based on shared outgoing links
    const outgoingLinks = this.getOutgoingLinks(noteId);
    for (const linkedNote of outgoingLinks) {
      const backlinksToLinked = this.getBacklinks(linkedNote.id);
      for (const backlink of backlinksToLinked) {
        if (backlink.id !== noteId) {
          relatedScores.set(backlink.id, (relatedScores.get(backlink.id) || 0) + 2);
        }
      }
    }

    // Score based on shared tags
    for (const otherNote of this.notes.values()) {
      if (otherNote.id === noteId) continue;

      const sharedTags = note.tags.filter((tag) => otherNote.tags.includes(tag));
      if (sharedTags.length > 0) {
        relatedScores.set(otherNote.id, (relatedScores.get(otherNote.id) || 0) + sharedTags.length);
      }
    }

    // Sort by score and return top N
    return Array.from(relatedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.notes.get(id)!)
      .filter(Boolean);
  }

  /**
   * Export graph data for visualization
   */
  exportForVisualization(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: this.graph.nodes,
      edges: this.graph.edges,
    };
  }
}

export const createKnowledgeGraph = (): KnowledgeGraph => new KnowledgeGraph();
