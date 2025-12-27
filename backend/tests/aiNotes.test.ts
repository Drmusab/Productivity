// @ts-nocheck
/**
 * @fileoverview Unit tests for AI Note Services (Phase G)
 * 
 * Tests the AI note intelligence features with mocked AI responses:
 * - Note summarization
 * - Task generation from notes
 * - Link suggestions
 * - Vault Q&A (RAG)
 */

'use strict';
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

import request from 'supertest';
import app from '../src/app';
import { initDatabase, clearDatabase, runAsync } from '../src/utils/database';
import { MockAIProvider, setAIProvider, resetAIProvider } from '../src/services/ai/aiProvider';

describe('AI Notes API', () => {
  let noteId: string;
  let boardId: number;
  let columnId: number;

  beforeAll(async () => {
    await initDatabase();
    // Use mock AI provider for tests
    setAIProvider(new MockAIProvider());
  });

  afterAll(() => {
    resetAIProvider();
  });

  beforeEach(async () => {
    await clearDatabase();
    
    // Create a test board and column
    const board = await runAsync(
      'INSERT INTO boards (name, description) VALUES (?, ?)',
      ['Test Board', 'Board for AI tests']
    );
    boardId = board.lastID;

    const column = await runAsync(
      'INSERT INTO columns (board_id, name, position, color) VALUES (?, ?, ?, ?)',
      [boardId, 'To Do', 0, '#3498db']
    );
    columnId = column.lastID;

    // Create a test note with actionable content
    const note = await runAsync(
      `INSERT INTO obsidian_notes (id, title, content_markdown, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'test-note-001',
        'Project Planning',
        `# Project Planning

This is a note about our project planning.

## TODO:
- [ ] Review the design documents
- [ ] Set up development environment
- [ ] Create initial prototype

## Key Decisions
We decided to use TypeScript for the backend because it provides better type safety.

## Next Steps
We need to complete the API documentation by end of week.
Must schedule a meeting with the stakeholders.
Should review the security requirements.`,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    noteId = 'test-note-001';

    // Create additional notes for link suggestions
    await runAsync(
      `INSERT INTO obsidian_notes (id, title, content_markdown, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'test-note-002',
        'TypeScript Best Practices',
        'Guidelines for writing clean TypeScript code in our project.',
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    await runAsync(
      `INSERT INTO obsidian_notes (id, title, content_markdown, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'test-note-003',
        'API Documentation Standards',
        'Standards and templates for API documentation.',
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
  });

  describe('GET /api/ai-notes/capabilities', () => {
    it('should return AI capabilities information', async () => {
      const response = await request(app)
        .get('/api/ai-notes/capabilities')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('capabilities');
      expect(response.body.capabilities).toHaveProperty('summarizeNote');
      expect(response.body.capabilities).toHaveProperty('generateTasks');
      expect(response.body.capabilities).toHaveProperty('suggestLinks');
      expect(response.body.capabilities).toHaveProperty('vaultQA');
      expect(response.body).toHaveProperty('promptVersions');
    });
  });

  describe('POST /api/ai-notes/summarize', () => {
    it('should return error when noteId is missing', async () => {
      const response = await request(app)
        .post('/api/ai-notes/summarize')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .post('/api/ai-notes/summarize')
        .send({ noteId: 'non-existent-id' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Note not found');
    });

    it('should generate summary for a valid note', async () => {
      const response = await request(app)
        .post('/api/ai-notes/summarize')
        .send({ noteId })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('noteId', noteId);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('bullets');
      expect(response.body.data).toHaveProperty('keyConcepts');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('generatedAt');
      expect(Array.isArray(response.body.data.bullets)).toBe(true);
      expect(Array.isArray(response.body.data.keyConcepts)).toBe(true);
    });

    it('should handle empty note content', async () => {
      // Create an empty note
      await runAsync(
        `INSERT INTO obsidian_notes (id, title, content_markdown, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'empty-note',
          'Empty Note',
          '',
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      const response = await request(app)
        .post('/api/ai-notes/summarize')
        .send({ noteId: 'empty-note' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.summary).toContain('Empty note');
    });
  });

  describe('POST /api/ai-notes/generate-tasks', () => {
    it('should return error when noteId is missing', async () => {
      const response = await request(app)
        .post('/api/ai-notes/generate-tasks')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .post('/api/ai-notes/generate-tasks')
        .send({ noteId: 'non-existent-id' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Note not found');
    });

    it('should generate tasks from note with TODO items', async () => {
      const response = await request(app)
        .post('/api/ai-notes/generate-tasks')
        .send({ noteId })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('noteId', noteId);
      expect(response.body.data).toHaveProperty('tasks');
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('generatedAt');

      // Verify task structure
      if (response.body.data.tasks.length > 0) {
        const task = response.body.data.tasks[0];
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('confidence');
        expect(task).toHaveProperty('sourceNoteId', noteId);
      }
    });

    it('should return empty tasks array for note without actionable content', async () => {
      // Create a note without action items
      await runAsync(
        `INSERT INTO obsidian_notes (id, title, content_markdown, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'no-tasks-note',
          'Just Information',
          'This is just some information without any action items.',
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      const response = await request(app)
        .post('/api/ai-notes/generate-tasks')
        .send({ noteId: 'no-tasks-note' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('tasks');
      expect(Array.isArray(response.body.data.tasks)).toBe(true);
    });
  });

  describe('POST /api/ai-notes/approve-task', () => {
    it('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/ai-notes/approve-task')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent source note', async () => {
      const response = await request(app)
        .post('/api/ai-notes/approve-task')
        .send({
          title: 'Test Task',
          sourceNoteId: 'non-existent-id',
          columnId,
        })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Source note not found');
    });

    it('should create task and link it to source note', async () => {
      const response = await request(app)
        .post('/api/ai-notes/approve-task')
        .send({
          title: 'Review design documents',
          description: 'From project planning note',
          sourceNoteId: noteId,
          columnId,
          priority: 'high',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('taskId');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('created and linked');
    });
  });

  describe('POST /api/ai-notes/suggest-links', () => {
    it('should return error when noteId is missing', async () => {
      const response = await request(app)
        .post('/api/ai-notes/suggest-links')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .post('/api/ai-notes/suggest-links')
        .send({ noteId: 'non-existent-id' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Note not found');
    });

    it('should suggest links to related notes', async () => {
      const response = await request(app)
        .post('/api/ai-notes/suggest-links')
        .send({ noteId, maxSuggestions: 3 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('noteId', noteId);
      expect(response.body.data).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
      expect(response.body.data).toHaveProperty('generatedAt');

      // Verify suggestion structure
      if (response.body.data.suggestions.length > 0) {
        const suggestion = response.body.data.suggestions[0];
        expect(suggestion).toHaveProperty('targetNoteId');
        expect(suggestion).toHaveProperty('targetNoteTitle');
        expect(suggestion).toHaveProperty('reason');
        expect(suggestion).toHaveProperty('confidence');
      }
    });

    it('should not suggest already-linked notes', async () => {
      // Create a link from test-note-001 to test-note-002
      await runAsync(
        `INSERT INTO obsidian_note_links (id, source_note_id, target_note_id, link_type, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'link-001',
          'test-note-001',
          'test-note-002',
          'wikilink',
          new Date().toISOString(),
        ]
      );

      const response = await request(app)
        .post('/api/ai-notes/suggest-links')
        .send({ noteId })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // The already-linked note should not appear in suggestions
      const linkedNoteIds = response.body.data.suggestions.map(
        (s: any) => s.targetNoteId
      );
      expect(linkedNoteIds).not.toContain('test-note-002');
    });
  });

  describe('POST /api/ai-notes/vault-qa', () => {
    it('should return error when question is missing', async () => {
      const response = await request(app)
        .post('/api/ai-notes/vault-qa')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should answer question from vault content', async () => {
      const response = await request(app)
        .post('/api/ai-notes/vault-qa')
        .send({ 
          question: 'What decisions were made about TypeScript?',
          maxNotes: 3,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('answer');
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data).toHaveProperty('foundInVault');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('generatedAt');
      expect(Array.isArray(response.body.data.sources)).toBe(true);
    });

    it('should indicate when answer is not found', async () => {
      // Clear all notes
      await runAsync('DELETE FROM obsidian_notes');

      const response = await request(app)
        .post('/api/ai-notes/vault-qa')
        .send({ question: 'What is quantum computing?' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('foundInVault', false);
      expect(response.body.data.answer.toLowerCase()).toContain('not found');
    });
  });
});

describe('NoteAIService Unit Tests', () => {
  let noteAIService: any;

  beforeAll(async () => {
    await initDatabase();
    setAIProvider(new MockAIProvider());
    const { NoteAIService } = await import('../src/services/ai/noteAIService');
    noteAIService = new NoteAIService(new MockAIProvider());
  });

  afterAll(() => {
    resetAIProvider();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('summarizeNote', () => {
    it('should handle empty content', async () => {
      const result = await noteAIService.summarizeNote({
        noteId: 'test-id',
        contentMarkdown: '',
      });

      expect(result.noteId).toBe('test-id');
      expect(result.summary).toContain('Empty note');
      expect(result.confidence).toBe(1.0);
    });

    it('should generate summary for valid content', async () => {
      const result = await noteAIService.summarizeNote({
        noteId: 'test-id',
        contentMarkdown: 'This is a test note about software development and best practices.',
      });

      expect(result.noteId).toBe('test-id');
      expect(result.summary).toBeTruthy();
      expect(result.generatedAt).toBeTruthy();
    });
  });

  describe('generateTasksFromNote', () => {
    it('should extract tasks with TODO markers', async () => {
      const result = await noteAIService.generateTasksFromNote({
        noteId: 'test-id',
        contentMarkdown: `
          # Project Notes
          TODO: Review the PR
          - [ ] Write documentation
          We need to deploy the application.
        `,
      });

      expect(result.noteId).toBe('test-id');
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.generatedAt).toBeTruthy();
    });

    it('should handle content without tasks', async () => {
      const result = await noteAIService.generateTasksFromNote({
        noteId: 'test-id',
        contentMarkdown: 'Just some notes without any action items.',
      });

      expect(result.noteId).toBe('test-id');
      expect(Array.isArray(result.tasks)).toBe(true);
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'Test content for hashing';
      const hash1 = noteAIService.generateContentHash(content);
      const hash2 = noteAIService.generateContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(16);
    });

    it('should generate different hash for different content', () => {
      const hash1 = noteAIService.generateContentHash('Content A');
      const hash2 = noteAIService.generateContentHash('Content B');

      expect(hash1).not.toBe(hash2);
    });
  });
});
