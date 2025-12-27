// @ts-nocheck
"use strict";
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
import request from 'supertest';
import app from '../src/app';
import { initDatabase, clearDatabase, runAsync } from '../src/utils/database';
describe('AI Commands API', () => {
    let boardId;
    let columnIds = {};
    beforeAll(async () => {
        await initDatabase();
    });
    beforeEach(async () => {
        await clearDatabase();
        // Create a test board
        const board = await runAsync('INSERT INTO boards (name, description) VALUES (?, ?)', ['Test Board', 'Board for AI tests']);
        boardId = board.lastID;
        // Create test columns
        const toDo = await runAsync('INSERT INTO columns (board_id, name, position, color) VALUES (?, ?, ?, ?)', [boardId, 'To Do', 0, '#3498db']);
        columnIds['To Do'] = toDo.lastID;
        const inProgress = await runAsync('INSERT INTO columns (board_id, name, position, color) VALUES (?, ?, ?, ?)', [boardId, 'In Progress', 1, '#f39c12']);
        columnIds['In Progress'] = inProgress.lastID;
        const done = await runAsync('INSERT INTO columns (board_id, name, position, color) VALUES (?, ?, ?, ?)', [boardId, 'Done', 2, '#2ecc71']);
        columnIds['Done'] = done.lastID;
    });
    describe('GET /api/ai/patterns', () => {
        it('should return available command patterns and examples', async () => {
            const response = await request(app)
                .get('/api/ai/patterns')
                .expect(200);
            expect(response.body).toHaveProperty('examples');
            expect(Array.isArray(response.body.examples)).toBe(true);
            expect(response.body.examples.length).toBeGreaterThan(0);
            expect(response.body).toHaveProperty('description');
            expect(response.body).toHaveProperty('supportedActions');
            expect(Array.isArray(response.body.supportedActions)).toBe(true);
        });
    });
    describe('POST /api/ai/command', () => {
        it('should return error when command is empty', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: '' })
                .expect(400);
            expect(response.body).toHaveProperty('errors');
        });
        it('should return error for unrecognized command', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'xyz unknown command abc' })
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Unable to understand');
        });
        it('should handle create task command', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Create task "Test AI Task" in To Do' });
            // Debug output
            if (response.status !== 200) {
                console.log('Error response:', response.body);
            }
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('action', 'create');
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('taskId');
            expect(response.body).toHaveProperty('message');
        });
        it('should handle create task with priority', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Create high priority task "Urgent Fix" in To Do' })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'create');
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('priority', 'high');
        });
        it('should handle list tasks command', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'List tasks in To Do' })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'list');
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('tasks');
            expect(Array.isArray(response.body.tasks)).toBe(true);
            expect(response.body).toHaveProperty('count');
        });
        it('should handle list all tasks command', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Show all tasks' })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'list');
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('tasks');
        });
        it('should handle report generation command', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Show weekly report' })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'report');
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('report');
            expect(response.body.report).toHaveProperty('summary');
        });
        it('should handle move task command', async () => {
            // First create a task
            await request(app)
                .post('/api/ai/command')
                .send({ command: 'Create task "Task to Move" in To Do' });
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Move task "Task to Move" to In Progress' })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'move');
            expect(response.body).toHaveProperty('success', true);
        });
        it('should handle complete task command', async () => {
            // First create a task
            await request(app)
                .post('/api/ai/command')
                .send({ command: 'Create task "Task to Complete" in To Do' });
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Complete task "Task to Complete"' })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'complete');
            expect(response.body).toHaveProperty('success', true);
        });
        it('should handle set due date command', async () => {
            // First create a task
            await request(app)
                .post('/api/ai/command')
                .send({ command: 'Create task "Task with Due Date" in To Do' });
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            const response = await request(app)
                .post('/api/ai/command')
                .send({
                command: `Set due date for task "Task with Due Date" to ${dueDate.toISOString()}`
            })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'set_due');
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('dueDate');
        });
        it('should handle set priority command', async () => {
            // First create a task
            await request(app)
                .post('/api/ai/command')
                .send({ command: 'Create task "Task Priority Change" in To Do' });
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Set task "Task Priority Change" priority to high' })
                .expect(200);
            expect(response.body).toHaveProperty('action', 'set_priority');
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('priority', 'high');
        });
        it('should return 404 for non-existent task', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Move task "NonExistentTask12345" to Done' })
                .expect(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('not found');
        });
        it('should return 404 for non-existent column', async () => {
            const response = await request(app)
                .post('/api/ai/command')
                .send({ command: 'Create task "Test" in NonExistentColumn12345' })
                .expect(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Column');
            expect(response.body.error).toContain('not found');
        });
    });
});
//# sourceMappingURL=ai.commands.test.js.map