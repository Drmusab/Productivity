/**
 * @fileoverview Tests for Backlinks with Snippets (Phase C) and Unified Search (Phase D)
 */

// @ts-nocheck
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

import { initDatabase, clearDatabase, runAsync } from '../src/utils/database';
import { NoteService } from '../src/services/noteService';
import { UnifiedSearchService } from '../src/services/unifiedSearchService';
import { TaskNoteRelationType } from '../src/types/notes';

describe('Phase C & D - Backlinks and Unified Search', () => {
  let noteService: NoteService;
  let searchService: UnifiedSearchService;
  
  beforeAll(async () => {
    await initDatabase();
  });
  
  beforeEach(async () => {
    await clearDatabase();
    await initDatabase();
    noteService = new NoteService();
    searchService = new UnifiedSearchService();
  });
  
  describe('Phase C - Backlinks with Snippets', () => {
    test('gets backlinks with context snippets', async () => {
      // Create target note
      const targetId = await noteService.createNote({
        title: 'Popular Note',
        contentMarkdown: 'This is the target note.',
      });
      
      // Create source notes with links
      await noteService.createNote({
        title: 'Note A',
        contentMarkdown: 'Before text [[Popular Note]] after text.',
      });
      
      await noteService.createNote({
        title: 'Note B',
        contentMarkdown: 'Different context with [[Popular Note]] here.',
      });
      
      // Get backlinks with snippets
      const backlinks = await noteService.getBacklinksWithSnippets(targetId);
      
      expect(backlinks).toHaveLength(2);
      
      // Check that snippets are included
      expect(backlinks[0].snippet).toBeDefined();
      expect(backlinks[1].snippet).toBeDefined();
      
      // Snippets should contain the link and surrounding context
      const snippets = backlinks.map(b => b.snippet.toLowerCase());
      expect(snippets.some(s => s.includes('popular note'))).toBe(true);
    });
    
    test('snippet extraction works with markdown formatting', async () => {
      const targetId = await noteService.createNote({
        title: 'Target',
        contentMarkdown: 'Target content.',
      });
      
      await noteService.createNote({
        title: 'Source',
        contentMarkdown: `
# Heading

Some **bold** text before [[Target]] and more text.

## Another section
        `,
      });
      
      const backlinks = await noteService.getBacklinksWithSnippets(targetId);
      
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].snippet).toContain('Target');
    });
    
    test('getNoteWithBacklinkSnippets returns note with snippet backlinks', async () => {
      const targetId = await noteService.createNote({
        title: 'Main Note',
        contentMarkdown: 'Main content.',
      });
      
      await noteService.createNote({
        title: 'Reference',
        contentMarkdown: 'Check [[Main Note]] for details.',
      });
      
      const noteWithBacklinks = await noteService.getNoteWithBacklinkSnippets(targetId);
      
      expect(noteWithBacklinks).toBeDefined();
      expect(noteWithBacklinks!.title).toBe('Main Note');
      expect(noteWithBacklinks!.backlinks).toHaveLength(1);
      expect(noteWithBacklinks!.backlinks[0].snippet).toBeDefined();
    });
    
    test('backlinks query uses indexed lookup (performance)', async () => {
      // Create a target note
      const targetId = await noteService.createNote({
        title: 'Performance Test',
        contentMarkdown: 'Test',
      });
      
      // Create multiple source notes
      const notePromises = [];
      for (let i = 0; i < 50; i++) {
        notePromises.push(
          noteService.createNote({
            title: `Source ${i}`,
            contentMarkdown: `Link to [[Performance Test]] from note ${i}.`,
          })
        );
      }
      await Promise.all(notePromises);
      
      // Measure performance
      const startTime = Date.now();
      const backlinks = await noteService.getBacklinksWithSnippets(targetId);
      const endTime = Date.now();
      
      expect(backlinks).toHaveLength(50);
      
      // Should be fast (< 100ms for 50 backlinks)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200); // Allow some margin
    });
  });
  
  describe('Phase D - Unified Search', () => {
    let boardId: number;
    let columnId: number;
    
    beforeEach(async () => {
      // Create board and column for tasks
      const boardResult = await runAsync(
        'INSERT INTO boards (name, description) VALUES (?, ?)',
        ['Test Board', 'Test']
      );
      boardId = boardResult.lastID;
      
      const columnResult = await runAsync(
        'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)',
        [boardId, 'Todo', 0]
      );
      columnId = columnResult.lastID;
    });
    
    test('searches across notes and tasks', async () => {
      // Create notes
      await noteService.createNote({
        title: 'Meeting Notes Alpha',
        contentMarkdown: 'Discussion about alpha project.',
      });
      
      await noteService.createNote({
        title: 'Ideas',
        contentMarkdown: 'Alpha ideas for the future.',
      });
      
      // Create tasks
      await runAsync(
        'INSERT INTO tasks (title, description, column_id, position) VALUES (?, ?, ?, ?)',
        ['Alpha Task', 'Work on alpha feature', columnId, 0]
      );
      
      await runAsync(
        'INSERT INTO tasks (title, description, column_id, position) VALUES (?, ?, ?, ?)',
        ['Beta Task', 'Contains alpha in description', columnId, 1]
      );
      
      // Search for "alpha"
      const results = await searchService.search('alpha');
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should have both notes and tasks
      const types = [...new Set(results.map(r => r.type))];
      expect(types).toContain('note');
      expect(types).toContain('task');
      
      // Check that results have required fields
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.type).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.snippet).toBeDefined();
      });
    });
    
    test('ranks title matches higher than body matches', async () => {
      await noteService.createNote({
        title: 'Important Title',
        contentMarkdown: 'Some content.',
      });
      
      await noteService.createNote({
        title: 'Other Note',
        contentMarkdown: 'This has important in the content.',
      });
      
      const results = await searchService.search('important');
      
      expect(results.length).toBeGreaterThan(0);
      
      // First result should be the title match
      expect(results[0].title).toBe('Important Title');
      expect(results[0].score).toBeGreaterThan(results[1]?.score || 0);
    });
    
    test('attaches related entities when requested', async () => {
      const noteId = await noteService.createNote({
        title: 'Project Note',
        contentMarkdown: 'Project details.',
      });
      
      const taskInsertResult = await runAsync(
        'INSERT INTO tasks (title, description, column_id, position) VALUES (?, ?, ?, ?)',
        ['Project Task', 'Task for the project', columnId, 0]
      );
      
      // Link task and note
      await noteService.createTaskNoteRelation({
        taskId: taskInsertResult.lastID,
        noteId,
        relationType: TaskNoteRelationType.REFERENCE,
      });
      
      // Search with related entities
      const results = await searchService.search('project', { includeRelated: true });
      
      const noteResult = results.find(r => r.type === 'note');
      const taskResult = results.find(r => r.type === 'task');
      
      // Note should have related tasks
      if (noteResult) {
        expect(noteResult.related?.tasks).toBeDefined();
        expect(noteResult.related!.tasks!.length).toBeGreaterThan(0);
      }
      
      // Task should have related notes
      if (taskResult) {
        expect(taskResult.related?.notes).toBeDefined();
        expect(taskResult.related!.notes!.length).toBeGreaterThan(0);
      }
    });
    
    test('filters by type when specified', async () => {
      await noteService.createNote({
        title: 'Note with keyword',
        contentMarkdown: 'Content.',
      });
      
      await runAsync(
        'INSERT INTO tasks (title, description, column_id, position) VALUES (?, ?, ?, ?)',
        ['Task with keyword', 'Description', columnId, 0]
      );
      
      // Search only notes
      const noteResults = await searchService.search('keyword', { types: ['note'] });
      expect(noteResults.every(r => r.type === 'note')).toBe(true);
      
      // Search only tasks
      const taskResults = await searchService.search('keyword', { types: ['task'] });
      expect(taskResults.every(r => r.type === 'task')).toBe(true);
    });
    
    test('quick search returns top results without related entities', async () => {
      // Create multiple notes
      for (let i = 0; i < 15; i++) {
        await noteService.createNote({
          title: `Note ${i}`,
          contentMarkdown: `Content with search term ${i}.`,
        });
      }
      
      const results = await searchService.quickSearch('search');
      
      // Should return max 10 results
      expect(results.length).toBeLessThanOrEqual(10);
      
      // Should not have related entities
      results.forEach(result => {
        expect(result.related).toBeUndefined();
      });
    });
    
    test('search performs well with many documents', async () => {
      // Create 100 notes
      const notePromises = [];
      for (let i = 0; i < 100; i++) {
        notePromises.push(
          noteService.createNote({
            title: `Document ${i}`,
            contentMarkdown: `Content ${i % 10 === 0 ? 'special' : 'normal'}`,
          })
        );
      }
      await Promise.all(notePromises);
      
      // Create 100 tasks
      const taskPromises = [];
      for (let i = 0; i < 100; i++) {
        taskPromises.push(
          runAsync(
            'INSERT INTO tasks (title, description, column_id, position) VALUES (?, ?, ?, ?)',
            [`Task ${i}`, `Description ${i % 10 === 0 ? 'special' : 'normal'}`, columnId, i]
          )
        );
      }
      await Promise.all(taskPromises);
      
      // Search should complete in < 100ms
      const startTime = Date.now();
      const results = await searchService.search('special');
      const endTime = Date.now();
      
      expect(results.length).toBeGreaterThan(0);
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });
    
    test('search handles empty query gracefully', async () => {
      const results = await searchService.search('');
      expect(results).toEqual([]);
    });
    
    test('search handles no results gracefully', async () => {
      const results = await searchService.search('nonexistent-term-xyz-123');
      expect(results).toEqual([]);
    });
  });
});
