// @ts-nocheck
"use strict";
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

import request from 'supertest';
import app from '../src/app';
import { initDatabase, clearDatabase, runAsync, getAsync } from '../src/utils/database';

/**
 * Helper function to create a board with columns for testing
 */
const createBoardWithColumns = async () => {
  const timestamp = Date.now();
  const board = await runAsync(
    'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
    [`Test Board ${timestamp}`, 'Board for iTasks tests', 0]
  );

  const column = await runAsync(
    'INSERT INTO columns (board_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?)',
    [board.lastID, 'iTasks', '#3498db', null, 0]
  );

  return {
    boardId: board.lastID,
    columnId: column.lastID,
  };
};

describe('iTasks API Integration Tests', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/itasks/tasks', () => {
    test('should create a task with priority mapping to Eisenhower matrix', async () => {
      const { columnId } = await createBoardWithColumns();

      const response = await request(app)
        .post('/api/itasks/tasks')
        .send({
          title: 'Urgent Task',
          description: 'This is urgent and important',
          status: 'todo',
          priority: 'urgent',
          label: 'bug',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe('Urgent Task');
      expect(response.body.priority).toBe('urgent');
      expect(response.body.urgency).toBe(true);
      expect(response.body.importance).toBe(true);
      expect(response.body.quadrant).toBe('do_first');
    });

    test('should map "important" priority to schedule quadrant', async () => {
      await createBoardWithColumns();

      const response = await request(app)
        .post('/api/itasks/tasks')
        .send({
          title: 'Important Task',
          priority: 'important',
        });

      expect(response.status).toBe(201);
      expect(response.body.urgency).toBe(false);
      expect(response.body.importance).toBe(true);
      expect(response.body.quadrant).toBe('schedule');
    });

    test('should validate required title field', async () => {
      await createBoardWithColumns();

      const response = await request(app)
        .post('/api/itasks/tasks')
        .send({
          description: 'No title provided',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/itasks/tasks', () => {
    test('should retrieve all iTasks', async () => {
      const { columnId } = await createBoardWithColumns();

      // Create test tasks
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Task 1', columnId, 0, true, true, 'todo', 'bug']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Task 2', columnId, 1, false, true, 'in progress', 'feature']
      );

      const response = await request(app).get('/api/itasks/tasks');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      const task1 = response.body.find((t) => t.title === 'Task 1');
      expect(task1.quadrant).toBe('do_first');
      expect(task1.priority).toBe('urgent');
    });
  });

  describe('PUT /api/itasks/tasks/:id', () => {
    test('should update task priority and map to Eisenhower matrix', async () => {
      const { columnId } = await createBoardWithColumns();

      // Create a task
      const createResult = await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Update Me', columnId, 0, false, false, 'todo']
      );

      const taskId = createResult.lastID;

      // Update the task
      const response = await request(app)
        .put(`/api/itasks/tasks/${taskId}`)
        .send({
          priority: 'urgent',
          status: 'in progress',
        });

      expect(response.status).toBe(200);
      expect(response.body.urgency).toBe(true);
      expect(response.body.importance).toBe(true);
      expect(response.body.quadrant).toBe('do_first');
      expect(response.body.status).toBe('in progress');
    });

    test('should return 404 for non-existent task', async () => {
      await createBoardWithColumns();

      const response = await request(app)
        .put('/api/itasks/tasks/99999')
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/itasks/tasks/:id', () => {
    test('should delete a task', async () => {
      const { columnId } = await createBoardWithColumns();

      const createResult = await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Delete Me', columnId, 0, false, false, 'todo']
      );

      const taskId = createResult.lastID;

      const response = await request(app).delete(`/api/itasks/tasks/${taskId}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const deleted = await getAsync('SELECT * FROM tasks WHERE id = ?', [taskId]);
      expect(deleted).toBeUndefined();
    });

    test('should return 404 for non-existent task', async () => {
      await createBoardWithColumns();

      const response = await request(app).delete('/api/itasks/tasks/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/itasks/eisenhower', () => {
    test('should group tasks by Eisenhower quadrant', async () => {
      const { columnId } = await createBoardWithColumns();

      // Create tasks in each quadrant
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Do First', columnId, 0, true, true, 'todo']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Schedule', columnId, 1, false, true, 'todo']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Delegate', columnId, 2, true, false, 'todo']
      );
      await runAsync(
        `INSERT INTO tasks (title, column_id, position, urgency, importance, gtd_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Eliminate', columnId, 3, false, false, 'todo']
      );

      const response = await request(app).get('/api/itasks/eisenhower');

      expect(response.status).toBe(200);
      expect(response.body.do_first).toBeDefined();
      expect(response.body.schedule).toBeDefined();
      expect(response.body.delegate).toBeDefined();
      expect(response.body.eliminate).toBeDefined();

      expect(response.body.do_first.length).toBeGreaterThanOrEqual(1);
      expect(response.body.schedule.length).toBeGreaterThanOrEqual(1);
      expect(response.body.delegate.length).toBeGreaterThanOrEqual(1);
      expect(response.body.eliminate.length).toBeGreaterThanOrEqual(1);

      const doFirstTask = response.body.do_first.find((t) => t.title === 'Do First');
      expect(doFirstTask).toBeDefined();
    });
  });

  describe('POST /api/itasks/migrate', () => {
    test('should migrate tasks from iTasks format', async () => {
      await createBoardWithColumns();

      const tasksToMigrate = [
        {
          id: 'uuid-1',
          title: 'Migrated Task 1',
          description: 'Description 1',
          status: 'todo',
          priority: 'urgent',
          label: 'bug',
        },
        {
          id: 'uuid-2',
          title: 'Migrated Task 2',
          description: 'Description 2',
          status: 'done',
          priority: 'important',
          label: 'feature',
        },
      ];

      const response = await request(app)
        .post('/api/itasks/migrate')
        .send({ tasks: tasksToMigrate });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.imported).toBe(2);
      expect(response.body.failed).toBe(0);
      expect(response.body.tasks.length).toBe(2);
    });

    test('should handle migration errors gracefully', async () => {
      await createBoardWithColumns();

      const tasksToMigrate = [
        {
          // Missing required title field
          status: 'todo',
          priority: 'urgent',
        },
      ];

      const response = await request(app)
        .post('/api/itasks/migrate')
        .send({ tasks: tasksToMigrate });

      // Should still return 200 but with errors
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.failed).toBeGreaterThan(0);
    });
  });
});
