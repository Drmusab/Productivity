/**
 * @fileoverview Tests for calendar API endpoints.
 * Validates FullCalendar event transformation and date range filtering.
 */

const request = require('supertest');
const app = require('../src/app');
const { initDatabase, clearDatabase, runAsync, allAsync } = require('../src/utils/database');

describe('Calendar API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
    await initDatabase();
  });

  describe('GET /api/calendar/events', () => {
    it('should return empty array when no tasks with due dates exist', async () => {
      const response = await request(app)
        .get('/api/calendar/events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return tasks as FullCalendar events', async () => {
      // Get existing board and column from seeded data
      const boards = await allAsync('SELECT id FROM boards');
      const columns = await allAsync('SELECT id FROM columns WHERE board_id = ?', [boards[0].id]);
      
      await runAsync(
        `INSERT INTO tasks (title, description, column_id, position, priority, due_date, pinned) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Test Task', 'Test Description', columns[0].id, 0, 'high', '2025-12-30T14:00:00', 1]
      );

      const response = await request(app)
        .get('/api/calendar/events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      
      const event = response.body[0];
      expect(event.title).toContain('📌'); // Pinned indicator
      expect(event.title).toContain('Test Task');
      expect(event.start).toBe('2025-12-30T14:00:00');
      expect(event.backgroundColor).toBe('#ef4444'); // High priority color
      expect(event.borderColor).toBe('#ef4444');
      expect(event.extendedProps.priority).toBe('high');
      expect(event.extendedProps.pinned).toBe(true);
      expect(event.extendedProps.description).toBe('Test Description');
    });

    it('should filter tasks by date range', async () => {
      const columns = await allAsync('SELECT id FROM columns');
      const columnId = columns[0].id;

      // Create tasks with different due dates
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, due_date) VALUES (?, ?, ?, ?)`,
        ['Task 1', columnId, 0, '2025-12-01T10:00:00']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, due_date) VALUES (?, ?, ?, ?)`,
        ['Task 2', columnId, 1, '2025-12-15T10:00:00']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, due_date) VALUES (?, ?, ?, ?)`,
        ['Task 3', columnId, 2, '2026-01-15T10:00:00']
      );

      const response = await request(app)
        .get('/api/calendar/events')
        .query({ start: '2025-12-01', end: '2026-01-01' })
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body.some(e => e.title === 'Task 1')).toBe(true);
      expect(response.body.some(e => e.title === 'Task 2')).toBe(true);
      expect(response.body.some(e => e.title === 'Task 3')).toBe(false);
    });

    it('should filter tasks by board', async () => {
      // Get first board and column
      const boards = await allAsync('SELECT id FROM boards');
      const columns1 = await allAsync('SELECT id FROM columns WHERE board_id = ?', [boards[0].id]);

      // Create second board and column
      const board2 = await runAsync('INSERT INTO boards (name) VALUES (?)', ['Board 2']);
      const column2 = await runAsync('INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)', [board2.lastID, 'Column 2', 0]);

      // Create tasks in different boards
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, due_date) VALUES (?, ?, ?, ?)`,
        ['Task Board 1', columns1[0].id, 0, '2025-12-15T10:00:00']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, due_date) VALUES (?, ?, ?, ?)`,
        ['Task Board 2', column2.lastID, 0, '2025-12-15T10:00:00']
      );

      const response = await request(app)
        .get('/api/calendar/events')
        .query({ boardId: boards[0].id })
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Task Board 1');
    });

    it('should apply correct priority colors', async () => {
      const columns = await allAsync('SELECT id FROM columns');
      const columnId = columns[0].id;

      // Create tasks with different priorities
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, priority, due_date) VALUES (?, ?, ?, ?, ?)`,
        ['Low Priority', columnId, 0, 'low', '2025-12-15T10:00:00']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, priority, due_date) VALUES (?, ?, ?, ?, ?)`,
        ['Medium Priority', columnId, 1, 'medium', '2025-12-16T10:00:00']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, priority, due_date) VALUES (?, ?, ?, ?, ?)`,
        ['High Priority', columnId, 2, 'high', '2025-12-17T10:00:00']
      );

      const response = await request(app)
        .get('/api/calendar/events')
        .expect(200);

      const lowTask = response.body.find(e => e.title === 'Low Priority');
      const mediumTask = response.body.find(e => e.title === 'Medium Priority');
      const highTask = response.body.find(e => e.title === 'High Priority');

      expect(lowTask.backgroundColor).toBe('#10b981'); // green
      expect(mediumTask.backgroundColor).toBe('#f59e0b'); // orange
      expect(highTask.backgroundColor).toBe('#ef4444'); // red
    });

    it('should validate date parameters', async () => {
      await request(app)
        .get('/api/calendar/events')
        .query({ start: 'invalid-date' })
        .expect(400);
    });

    it('should validate boardId parameter', async () => {
      await request(app)
        .get('/api/calendar/events')
        .query({ boardId: 'invalid' })
        .expect(400);
    });

    it('should not return tasks without due dates', async () => {
      const columns = await allAsync('SELECT id FROM columns');
      const columnId = columns[0].id;

      await runAsync(
        `INSERT INTO tasks (title, column_id, position, due_date) VALUES (?, ?, ?, ?)`,
        ['Task with date', columnId, 0, '2025-12-15T10:00:00']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position) VALUES (?, ?, ?)`,
        ['Task without date', columnId, 1]
      );

      const response = await request(app)
        .get('/api/calendar/events')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Task with date');
    });
  });
});
