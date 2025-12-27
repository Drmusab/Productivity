/**
 * @fileoverview Tests for Graph Service (Phase E)
 */

// @ts-nocheck
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

import { initDatabase, clearDatabase } from '../src/utils/database';
import { NoteService } from '../src/services/noteService';
import { GraphService } from '../src/services/graphService';

describe('Graph Service - Phase E', () => {
  let noteService: NoteService;
  let graphService: GraphService;
  
  beforeAll(async () => {
    await initDatabase();
  });
  
  beforeEach(async () => {
    await clearDatabase();
    await initDatabase();
    noteService = new NoteService();
    graphService = new GraphService();
  });
  
  describe('Outgoing Links', () => {
    test('returns notes referenced by current note', async () => {
      // Create target notes
      const targetId1 = await noteService.createNote({
        title: 'Target 1',
        contentMarkdown: 'Content 1',
      });
      
      const targetId2 = await noteService.createNote({
        title: 'Target 2',
        contentMarkdown: 'Content 2',
      });
      
      // Create source note with links
      const sourceId = await noteService.createNote({
        title: 'Source',
        contentMarkdown: '[[Target 1]] and [[Target 2]]',
      });
      
      const outgoing = await graphService.getOutgoingLinks(sourceId);
      expect(outgoing).toHaveLength(2);
      expect(outgoing.map(n => n.title).sort()).toEqual(['Target 1', 'Target 2']);
    });
    
    test('includes unresolved targets by title', async () => {
      const sourceId = await noteService.createNote({
        title: 'Source',
        contentMarkdown: '[[Existing]] and [[Missing]]',
      });
      
      await noteService.createNote({
        title: 'Existing',
        contentMarkdown: 'Content',
      });
      
      const outgoing = await graphService.getOutgoingLinks(sourceId);
      expect(outgoing).toHaveLength(2);
      
      const titles = outgoing.map(n => n.title).sort();
      expect(titles).toContain('Existing');
      expect(titles).toContain('Missing');
      
      // Check that unresolved link has placeholder ID
      const unresolved = outgoing.find(n => n.title === 'Missing');
      expect(unresolved?.id).toContain('unresolved:');
    });
    
    test('returns empty array for note with no links', async () => {
      const noteId = await noteService.createNote({
        title: 'Isolated',
        contentMarkdown: 'No links here',
      });
      
      const outgoing = await graphService.getOutgoingLinks(noteId);
      expect(outgoing).toHaveLength(0);
    });
  });
  
  describe('Backlinks', () => {
    test('returns notes that link to current note', async () => {
      const targetId = await noteService.createNote({
        title: 'Target',
        contentMarkdown: 'Content',
      });
      
      await noteService.createNote({
        title: 'Source 1',
        contentMarkdown: '[[Target]]',
      });
      
      await noteService.createNote({
        title: 'Source 2',
        contentMarkdown: '[[Target]]',
      });
      
      const backlinks = await graphService.getBacklinks(targetId);
      expect(backlinks).toHaveLength(2);
      expect(backlinks.map(n => n.title).sort()).toEqual(['Source 1', 'Source 2']);
    });
    
    test('returns empty array for note with no backlinks', async () => {
      const noteId = await noteService.createNote({
        title: 'Unloved',
        contentMarkdown: 'Nobody links to me',
      });
      
      const backlinks = await graphService.getBacklinks(noteId);
      expect(backlinks).toHaveLength(0);
    });
  });
  
  describe('Neighbors (Depth-N Traversal)', () => {
    test('depth 0 returns only origin node', async () => {
      const noteId = await noteService.createNote({
        title: 'Origin',
        contentMarkdown: '[[Other]]',
      });
      
      const result = await graphService.getNeighbors(noteId, 0);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].noteId).toBe(noteId);
      expect(result.nodes[0].depth).toBe(0);
      expect(result.edges).toHaveLength(0);
    });
    
    test('depth 1 returns direct neighbors', async () => {
      // Create a simple graph: A -> B, C -> A
      const bId = await noteService.createNote({
        title: 'B',
        contentMarkdown: 'Content B',
      });
      
      const aId = await noteService.createNote({
        title: 'A',
        contentMarkdown: '[[B]]',
      });
      
      await noteService.createNote({
        title: 'C',
        contentMarkdown: '[[A]]',
      });
      
      const result = await graphService.getNeighbors(aId, 1);
      expect(result.nodes).toHaveLength(3); // A, B, C
      
      const depths = result.nodes.map(n => ({ title: n.title, depth: n.depth }));
      expect(depths.find(d => d.title === 'A')?.depth).toBe(0);
      expect(depths.find(d => d.title === 'B')?.depth).toBe(1);
      expect(depths.find(d => d.title === 'C')?.depth).toBe(1);
      
      expect(result.edges).toHaveLength(2);
    });
    
    test('depth 2 traverses two hops', async () => {
      // Create a chain: A -> B -> C
      const cId = await noteService.createNote({
        title: 'C',
        contentMarkdown: 'End',
      });
      
      const bId = await noteService.createNote({
        title: 'B',
        contentMarkdown: '[[C]]',
      });
      
      const aId = await noteService.createNote({
        title: 'A',
        contentMarkdown: '[[B]]',
      });
      
      const result = await graphService.getNeighbors(aId, 2);
      expect(result.nodes).toHaveLength(3); // A, B, C
      
      const depths = result.nodes.map(n => ({ title: n.title, depth: n.depth }));
      expect(depths.find(d => d.title === 'A')?.depth).toBe(0);
      expect(depths.find(d => d.title === 'B')?.depth).toBe(1);
      expect(depths.find(d => d.title === 'C')?.depth).toBe(2);
    });
    
    test('prevents infinite loops in cycles', async () => {
      // Create a cycle: A -> B -> C -> A
      const aId = await noteService.createNote({
        title: 'A',
        contentMarkdown: '[[B]]',
      });
      
      const bId = await noteService.createNote({
        title: 'B',
        contentMarkdown: '[[C]]',
      });
      
      const cId = await noteService.createNote({
        title: 'C',
        contentMarkdown: '[[A]]',
      });
      
      // Update links after creating all notes
      await noteService.updateNote({
        id: aId,
        contentMarkdown: '[[B]]',
      });
      
      const result = await graphService.getNeighbors(aId, 10);
      expect(result.nodes).toHaveLength(3); // Should still only have A, B, C
      expect(result.edges.length).toBeGreaterThan(0);
      
      // Each node should appear only once
      const nodeIds = result.nodes.map(n => n.noteId);
      const uniqueIds = new Set(nodeIds);
      expect(uniqueIds.size).toBe(nodeIds.length);
    });
    
    test('handles disconnected notes gracefully', async () => {
      const noteId = await noteService.createNote({
        title: 'Isolated',
        contentMarkdown: 'No connections',
      });
      
      const result = await graphService.getNeighbors(noteId, 5);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].noteId).toBe(noteId);
      expect(result.edges).toHaveLength(0);
    });
    
    test('returns empty result for non-existent note', async () => {
      const result = await graphService.getNeighbors('non-existent-id', 1);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });
  });
  
  describe('Unresolved Links', () => {
    test('detects missing notes', async () => {
      await noteService.createNote({
        title: 'Note 1',
        contentMarkdown: '[[Missing A]] and [[Missing B]]',
      });
      
      await noteService.createNote({
        title: 'Note 2',
        contentMarkdown: '[[Missing A]]',
      });
      
      const unresolved = await graphService.getUnresolvedLinks();
      expect(unresolved.length).toBeGreaterThanOrEqual(2);
      
      const titles = unresolved.map(u => u.missingTitle);
      expect(titles).toContain('Missing A');
      expect(titles).toContain('Missing B');
      
      // Check counts
      const missingA = unresolved.find(u => u.missingTitle === 'Missing A');
      expect(missingA?.count).toBeGreaterThanOrEqual(1);
    });
    
    test('returns empty array when all links are resolved', async () => {
      const targetId = await noteService.createNote({
        title: 'Target',
        contentMarkdown: 'Content',
      });
      
      await noteService.createNote({
        title: 'Source',
        contentMarkdown: '[[Target]]',
      });
      
      const unresolved = await graphService.getUnresolvedLinks();
      expect(unresolved).toHaveLength(0);
    });
  });
  
  describe('Orphan Notes', () => {
    test('identifies notes with no links', async () => {
      const orphanId = await noteService.createNote({
        title: 'Orphan',
        contentMarkdown: 'Isolated content',
      });
      
      const connectedId2 = await noteService.createNote({
        title: 'Connected 2',
        contentMarkdown: 'Content',
      });
      
      const connectedId1 = await noteService.createNote({
        title: 'Connected 1',
        contentMarkdown: '[[Connected 2]]',
      });
      
      const orphans = await graphService.getOrphanNotes();
      expect(orphans.length).toBeGreaterThanOrEqual(1);
      expect(orphans.map(n => n.title)).toContain('Orphan');
      expect(orphans.map(n => n.title)).not.toContain('Connected 1');
      expect(orphans.map(n => n.title)).not.toContain('Connected 2');
    });
    
    test('returns empty array when all notes are connected', async () => {
      const note2Id = await noteService.createNote({
        title: 'Note 2',
        contentMarkdown: 'Content',
      });
      
      const note1Id = await noteService.createNote({
        title: 'Note 1',
        contentMarkdown: '[[Note 2]]',
      });
      
      const orphans = await graphService.getOrphanNotes();
      expect(orphans).toHaveLength(0);
    });
  });
  
  describe('Connected Notes', () => {
    test('identifies notes with at least one link', async () => {
      await noteService.createNote({
        title: 'Orphan',
        contentMarkdown: 'No links',
      });
      
      const connected2Id = await noteService.createNote({
        title: 'Connected 2',
        contentMarkdown: 'Content',
      });
      
      const connected1Id = await noteService.createNote({
        title: 'Connected 1',
        contentMarkdown: '[[Connected 2]]',
      });
      
      const connected = await graphService.getConnectedNotes();
      expect(connected.length).toBeGreaterThanOrEqual(2);
      expect(connected.map(n => n.title)).toContain('Connected 1');
      expect(connected.map(n => n.title)).toContain('Connected 2');
      expect(connected.map(n => n.title)).not.toContain('Orphan');
    });
    
    test('returns empty array when all notes are orphans', async () => {
      await noteService.createNote({
        title: 'Orphan 1',
        contentMarkdown: 'No links',
      });
      
      await noteService.createNote({
        title: 'Orphan 2',
        contentMarkdown: 'Also no links',
      });
      
      const connected = await graphService.getConnectedNotes();
      expect(connected).toHaveLength(0);
    });
  });
});
