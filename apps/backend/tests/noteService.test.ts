/**
 * @fileoverview Tests for Note Service
 */

// @ts-nocheck
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

import { initDatabase, clearDatabase, runAsync, getAsync, allAsync } from '../src/utils/database';
import { NoteService } from '../src/services/noteService';
import { TaskNoteRelationType } from '../src/types/notes';

describe('Note Service', () => {
  let noteService: NoteService;
  
  beforeAll(async () => {
    await initDatabase();
  });
  
  beforeEach(async () => {
    await clearDatabase();
    await initDatabase(); // Re-initialize to ensure tables exist
    noteService = new NoteService();
  });
  
  describe('Note CRUD Operations', () => {
    test('creates a note', async () => {
      const noteId = await noteService.createNote({
        title: 'Test Note',
        contentMarkdown: '# Test Note\n\nThis is a test.',
      });
      
      expect(noteId).toBeDefined();
      
      const note = await noteService.getNote(noteId);
      expect(note).toBeDefined();
      expect(note?.title).toBe('Test Note');
      expect(note?.contentMarkdown).toBe('# Test Note\n\nThis is a test.');
    });
    
    test('creates a note with path and frontmatter', async () => {
      const noteId = await noteService.createNote({
        title: 'Project Note',
        folderPath: 'Work/Projects',
        contentMarkdown: 'Project details...',
        frontmatter: {
          tags: ['project', 'important'],
          status: 'active',
        },
      });
      
      const note = await noteService.getNote(noteId);
      expect(note?.folderPath).toBe('Work/Projects');
      expect(note?.frontmatter).toBeDefined();
      
      const frontmatter = JSON.parse(note!.frontmatter!);
      expect(frontmatter.tags).toEqual(['project', 'important']);
      expect(frontmatter.status).toBe('active');
    });
    
    test('updates a note', async () => {
      const noteId = await noteService.createNote({
        title: 'Original Title',
        contentMarkdown: 'Original content',
      });
      
      await noteService.updateNote({
        id: noteId,
        title: 'Updated Title',
        contentMarkdown: 'Updated content',
      });
      
      const note = await noteService.getNote(noteId);
      expect(note?.title).toBe('Updated Title');
      expect(note?.contentMarkdown).toBe('Updated content');
    });
    
    test('deletes a note', async () => {
      const noteId = await noteService.createNote({
        title: 'To Delete',
        contentMarkdown: 'This will be deleted',
      });
      
      await noteService.deleteNote(noteId);
      
      const note = await noteService.getNote(noteId);
      expect(note).toBeNull();
    });
    
    test('gets note by title (case-insensitive)', async () => {
      const noteId = await noteService.createNote({
        title: 'My Note',
        contentMarkdown: 'Content',
      });
      
      const note1 = await noteService.getNoteByTitle('My Note');
      const note2 = await noteService.getNoteByTitle('my note');
      const note3 = await noteService.getNoteByTitle('MY NOTE');
      
      expect(note1?.id).toBe(noteId);
      expect(note2?.id).toBe(noteId);
      expect(note3?.id).toBe(noteId);
    });
    
    test('lists notes with filters', async () => {
      await noteService.createNote({
        title: 'Note 1',
        folderPath: 'Work',
        contentMarkdown: 'Content 1',
      });
      
      await noteService.createNote({
        title: 'Note 2',
        folderPath: 'Personal',
        contentMarkdown: 'Content 2',
      });
      
      await noteService.createNote({
        title: 'Note 3',
        folderPath: 'Work',
        contentMarkdown: 'Content 3',
      });
      
      const workNotes = await noteService.listNotes({ folderPath: 'Work' });
      expect(workNotes).toHaveLength(2);
      expect(workNotes.map(n => n.title).sort()).toEqual(['Note 1', 'Note 3']);
      
      const allNotes = await noteService.listNotes();
      expect(allNotes).toHaveLength(3);
    });
  });
  
  describe('Link Parsing and Resolution', () => {
    test('parses wikilinks on note creation', async () => {
      const markdown = `
# My Note

See [[Other Note]] for details.
Also check [[Another Note#Section]].
`;
      
      const noteId = await noteService.createNote({
        title: 'My Note',
        contentMarkdown: markdown,
      });
      
      const links = await noteService.getOutgoingLinks(noteId);
      expect(links).toHaveLength(2);
      
      // Links should be unresolved at first
      expect(links[0].unresolvedTarget).toBe('Other Note');
      expect(links[1].unresolvedTarget).toBe('Another Note');
    });
    
    test('resolves links when target note exists', async () => {
      // Create target note first
      const targetId = await noteService.createNote({
        title: 'Target Note',
        contentMarkdown: 'Target content',
      });
      
      // Create source note with link
      const sourceId = await noteService.createNote({
        title: 'Source Note',
        contentMarkdown: 'See [[Target Note]] for details.',
      });
      
      const links = await noteService.getOutgoingLinks(sourceId);
      expect(links).toHaveLength(1);
      expect(links[0].targetNoteId).toBe(targetId);
      expect(links[0].unresolvedTarget).toBeUndefined();
    });
    
    test('updates links when note content changes', async () => {
      const noteId = await noteService.createNote({
        title: 'My Note',
        contentMarkdown: 'Original [[Link A]]',
      });
      
      let links = await noteService.getOutgoingLinks(noteId);
      expect(links).toHaveLength(1);
      expect(links[0].unresolvedTarget).toBe('Link A');
      
      // Update content with different links
      await noteService.updateNote({
        id: noteId,
        contentMarkdown: 'Updated [[Link B]] and [[Link C]]',
      });
      
      links = await noteService.getOutgoingLinks(noteId);
      expect(links).toHaveLength(2);
      expect(links.map(l => l.unresolvedTarget).sort()).toEqual(['Link B', 'Link C']);
    });
    
    test('marks incoming links as unresolved when note is deleted', async () => {
      const targetId = await noteService.createNote({
        title: 'Target Note',
        contentMarkdown: 'Target',
      });
      
      const sourceId = await noteService.createNote({
        title: 'Source Note',
        contentMarkdown: 'See [[Target Note]]',
      });
      
      // Verify link is resolved
      let links = await noteService.getOutgoingLinks(sourceId);
      expect(links).toHaveLength(1);
      expect(links[0].targetNoteId).toBeDefined();
      expect(links[0].targetNoteId).toBe(targetId);
      
      // Delete target note
      await noteService.deleteNote(targetId);
      
      // Link should now be unresolved
      links = await noteService.getOutgoingLinks(sourceId);
      expect(links).toHaveLength(1);
      expect(links[0].targetNoteId).toBeUndefined();
      expect(links[0].unresolvedTarget).toBe('Target Note');
    });
    
    test('resolves previously unresolved links when target note is created', async () => {
      // Create source note with unresolved link
      const sourceId = await noteService.createNote({
        title: 'Source Note',
        contentMarkdown: 'See [[Future Note]]',
      });
      
      let links = await noteService.getOutgoingLinks(sourceId);
      expect(links[0].unresolvedTarget).toBe('Future Note');
      
      // Create the target note
      const targetId = await noteService.createNote({
        title: 'Future Note',
        contentMarkdown: 'Future content',
      });
      
      // Manually trigger resolution (in real app, this would be automatic)
      await noteService.resolveLinksForNewNote(targetId);
      
      // Link should now be resolved
      links = await noteService.getOutgoingLinks(sourceId);
      expect(links[0].targetNoteId).toBe(targetId);
      expect(links[0].unresolvedTarget).toBeUndefined();
    });
  });
  
  describe('Backlinks', () => {
    test('gets backlinks for a note', async () => {
      const targetId = await noteService.createNote({
        title: 'Popular Note',
        contentMarkdown: 'This note is linked by many others',
      });
      
      await noteService.createNote({
        title: 'Note A',
        contentMarkdown: 'See [[Popular Note]]',
      });
      
      await noteService.createNote({
        title: 'Note B',
        contentMarkdown: 'Check [[Popular Note#Section]]',
      });
      
      const backlinks = await noteService.getBacklinks(targetId);
      expect(backlinks).toHaveLength(2);
      expect(backlinks.map(b => b.noteTitle).sort()).toEqual(['Note A', 'Note B']);
    });
    
    test('gets note with backlinks', async () => {
      const targetId = await noteService.createNote({
        title: 'Target',
        contentMarkdown: 'Content',
      });
      
      await noteService.createNote({
        title: 'Source',
        contentMarkdown: '[[Target]]',
      });
      
      const noteWithBacklinks = await noteService.getNoteWithBacklinks(targetId);
      expect(noteWithBacklinks).toBeDefined();
      expect(noteWithBacklinks!.backlinks).toHaveLength(1);
      expect(noteWithBacklinks!.backlinks[0].noteTitle).toBe('Source');
    });
  });
  
  describe('Task-Note Relations', () => {
    test('creates task-note relation', async () => {
      // Create a task
      const boardResult = await runAsync(
        'INSERT INTO boards (name, description) VALUES (?, ?)',
        ['Test Board', 'Test']
      );
      const columnResult = await runAsync(
        'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)',
        [boardResult.lastID, 'Todo', 0]
      );
      const taskResult = await runAsync(
        'INSERT INTO tasks (title, column_id, position) VALUES (?, ?, ?)',
        ['Test Task', columnResult.lastID, 0]
      );
      
      const noteId = await noteService.createNote({
        title: 'Task Note',
        contentMarkdown: 'Task details',
      });
      
      const relationId = await noteService.createTaskNoteRelation({
        taskId: taskResult.lastID,
        noteId: noteId,
        relationType: TaskNoteRelationType.SPEC,
      });
      
      expect(relationId).toBeDefined();
    });
    
    test('gets related tasks for a note', async () => {
      // Create tasks
      const boardResult = await runAsync(
        'INSERT INTO boards (name, description) VALUES (?, ?)',
        ['Test Board', 'Test']
      );
      const columnResult = await runAsync(
        'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)',
        [boardResult.lastID, 'Todo', 0]
      );
      const task1 = await runAsync(
        'INSERT INTO tasks (title, column_id, position) VALUES (?, ?, ?)',
        ['Task 1', columnResult.lastID, 0]
      );
      const task2 = await runAsync(
        'INSERT INTO tasks (title, column_id, position) VALUES (?, ?, ?)',
        ['Task 2', columnResult.lastID, 1]
      );
      
      const noteId = await noteService.createNote({
        title: 'Meeting Notes',
        contentMarkdown: 'Meeting details',
      });
      
      await noteService.createTaskNoteRelation({
        taskId: task1.lastID,
        noteId: noteId,
        relationType: TaskNoteRelationType.MEETING,
      });
      
      await noteService.createTaskNoteRelation({
        taskId: task2.lastID,
        noteId: noteId,
        relationType: TaskNoteRelationType.MEETING,
      });
      
      const relatedTasks = await noteService.getRelatedTasks(noteId);
      expect(relatedTasks).toHaveLength(2);
      expect(relatedTasks.map(t => t.taskTitle).sort()).toEqual(['Task 1', 'Task 2']);
    });
    
    test('gets related notes for a task', async () => {
      const boardResult = await runAsync(
        'INSERT INTO boards (name, description) VALUES (?, ?)',
        ['Test Board', 'Test']
      );
      const columnResult = await runAsync(
        'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)',
        [boardResult.lastID, 'Todo', 0]
      );
      const taskResult = await runAsync(
        'INSERT INTO tasks (title, column_id, position) VALUES (?, ?, ?)',
        ['Task', columnResult.lastID, 0]
      );
      
      const note1Id = await noteService.createNote({
        title: 'Note 1',
        contentMarkdown: 'Content 1',
      });
      
      const note2Id = await noteService.createNote({
        title: 'Note 2',
        contentMarkdown: 'Content 2',
      });
      
      await noteService.createTaskNoteRelation({
        taskId: taskResult.lastID,
        noteId: note1Id,
        relationType: TaskNoteRelationType.REFERENCE,
      });
      
      await noteService.createTaskNoteRelation({
        taskId: taskResult.lastID,
        noteId: note2Id,
        relationType: TaskNoteRelationType.SPEC,
      });
      
      const relatedNotes = await noteService.getRelatedNotes(taskResult.lastID);
      expect(relatedNotes).toHaveLength(2);
      expect(relatedNotes.map(n => n.noteTitle).sort()).toEqual(['Note 1', 'Note 2']);
    });
    
    test('deletes task-note relation on task delete', async () => {
      const boardResult = await runAsync(
        'INSERT INTO boards (name, description) VALUES (?, ?)',
        ['Test Board', 'Test']
      );
      const columnResult = await runAsync(
        'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)',
        [boardResult.lastID, 'Todo', 0]
      );
      const taskResult = await runAsync(
        'INSERT INTO tasks (title, column_id, position) VALUES (?, ?, ?)',
        ['Task', columnResult.lastID, 0]
      );
      
      const noteId = await noteService.createNote({
        title: 'Note',
        contentMarkdown: 'Content',
      });
      
      await noteService.createTaskNoteRelation({
        taskId: taskResult.lastID,
        noteId: noteId,
        relationType: TaskNoteRelationType.REFERENCE,
      });
      
      // Verify relation exists
      let relatedNotes = await noteService.getRelatedNotes(taskResult.lastID);
      expect(relatedNotes).toHaveLength(1);
      
      // Delete task
      await runAsync('DELETE FROM tasks WHERE id = ?', [taskResult.lastID]);
      
      // Verify relation was deleted
      const relations = await allAsync(
        'SELECT * FROM obsidian_task_note_relations WHERE task_id = ?',
        [taskResult.lastID]
      );
      expect(relations).toHaveLength(0);
    });
  });
  
  describe('Search and Utilities', () => {
    test('searches notes by title', async () => {
      await noteService.createNote({
        title: 'Project Alpha',
        contentMarkdown: 'Alpha details',
      });
      
      await noteService.createNote({
        title: 'Project Beta',
        contentMarkdown: 'Beta details',
      });
      
      await noteService.createNote({
        title: 'Meeting Notes',
        contentMarkdown: 'Alpha project discussion',
      });
      
      const results = await noteService.searchNotes('Alpha');
      expect(results).toHaveLength(2); // Found in title and content
    });
    
    test('gets unresolved links', async () => {
      await noteService.createNote({
        title: 'Note A',
        contentMarkdown: '[[Unresolved 1]] and [[Unresolved 2]]',
      });
      
      await noteService.createNote({
        title: 'Note B',
        contentMarkdown: '[[Unresolved 1]] again',
      });
      
      const unresolved = await noteService.getUnresolvedLinks();
      expect(unresolved.length).toBeGreaterThan(0);
      
      const unresolvedTargets = unresolved.map(u => u.unresolvedTarget);
      expect(unresolvedTargets).toContain('Unresolved 1');
      expect(unresolvedTargets).toContain('Unresolved 2');
    });
    
    test('gets full note context', async () => {
      // Create a board and column for tasks
      const boardResult = await runAsync(
        'INSERT INTO boards (name, description) VALUES (?, ?)',
        ['Test Board', 'Test']
      );
      const columnResult = await runAsync(
        'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)',
        [boardResult.lastID, 'Todo', 0]
      );
      const taskResult = await runAsync(
        'INSERT INTO tasks (title, column_id, position) VALUES (?, ?, ?)',
        ['Test Task', columnResult.lastID, 0]
      );
      
      const targetId = await noteService.createNote({
        title: 'Central Note',
        contentMarkdown: 'See [[Other Note]]',
      });
      
      await noteService.createNote({
        title: 'Other Note',
        contentMarkdown: 'Content',
      });
      
      await noteService.createNote({
        title: 'Source Note',
        contentMarkdown: '[[Central Note]]',
      });
      
      await noteService.createTaskNoteRelation({
        taskId: taskResult.lastID,
        noteId: targetId,
        relationType: TaskNoteRelationType.REFERENCE,
      });
      
      const context = await noteService.getNoteFullContext(targetId);
      expect(context).toBeDefined();
      expect(context!.backlinks).toHaveLength(1);
      expect(context!.links).toHaveLength(1);
      expect(context!.relatedTasks).toHaveLength(1);
    });
  });
});
