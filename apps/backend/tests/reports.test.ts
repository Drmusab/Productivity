// @ts-nocheck
"use strict";
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
import request from 'supertest';
import app from '../src/app';
import { initDatabase, clearDatabase, runAsync } from '../src/utils/database';
describe('Reports API', () => {
    let boardId;
    let columnIds = {};
    beforeAll(async () => {
        await initDatabase();
    });
    beforeEach(async () => {
        await clearDatabase();
        // Create a test board
        const board = await runAsync('INSERT INTO boards (name, description) VALUES (?, ?)', ['Test Board', 'Board for reports tests']);
        boardId = board.lastID;
        // Create test columns
        const toDo = await runAsync('INSERT INTO columns (board_id, name, position, color) VALUES (?, ?, ?, ?)', [boardId, 'To Do', 0, '#3498db']);
        columnIds['To Do'] = toDo.lastID;
        const done = await runAsync('INSERT INTO columns (board_id, name, position, color) VALUES (?, ?, ?, ?)', [boardId, 'Done', 1, '#2ecc71']);
        columnIds['Done'] = done.lastID;
    });
    describe('GET /api/reports/weekly', () => {
        it('should return weekly report with summary and metrics', async () => {
            const response = await request(app)
                .get('/api/reports/weekly')
                .expect(200);
            expect(response.body).toHaveProperty('period');
            expect(response.body.period).toHaveProperty('start');
            expect(response.body.period).toHaveProperty('end');
            expect(response.body.period).toHaveProperty('days', 7);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary).toHaveProperty('tasksCreated');
            expect(response.body.summary).toHaveProperty('tasksCompleted');
            expect(response.body.summary).toHaveProperty('tasksOverdue');
            expect(response.body.summary).toHaveProperty('completionRate');
            expect(response.body.summary).toHaveProperty('avgCompletionTimeHours');
            expect(response.body).toHaveProperty('tasksByColumn');
            expect(Array.isArray(response.body.tasksByColumn)).toBe(true);
            expect(response.body).toHaveProperty('tasksByPriority');
            expect(Array.isArray(response.body.tasksByPriority)).toBe(true);
            expect(response.body).toHaveProperty('activeBoards');
            expect(Array.isArray(response.body.activeBoards)).toBe(true);
        });
    });
    describe('GET /api/reports/custom', () => {
        it('should return error when missing date parameters', async () => {
            const response = await request(app)
                .get('/api/reports/custom')
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('startDate');
            expect(response.body.error).toContain('endDate');
        });
        it('should return custom report for valid date range', async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const endDate = new Date();
            const response = await request(app)
                .get('/api/reports/custom')
                .query({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
                .expect(200);
            expect(response.body).toHaveProperty('period');
            expect(response.body.period).toHaveProperty('start');
            expect(response.body.period).toHaveProperty('end');
            expect(response.body.period).toHaveProperty('days');
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary).toHaveProperty('tasksCreated');
            expect(response.body.summary).toHaveProperty('tasksCompleted');
            expect(response.body.summary).toHaveProperty('completionRate');
            expect(response.body).toHaveProperty('tasksByColumn');
            expect(Array.isArray(response.body.tasksByColumn)).toBe(true);
        });
    });
    describe('GET /api/reports/analytics', () => {
        it('should return productivity analytics with default 30 days', async () => {
            const response = await request(app)
                .get('/api/reports/analytics')
                .expect(200);
            expect(response.body).toHaveProperty('period');
            expect(response.body.period).toHaveProperty('days', 30);
            expect(response.body.period).toHaveProperty('start');
            expect(response.body.period).toHaveProperty('end');
            expect(response.body).toHaveProperty('dailyCompletions');
            expect(Array.isArray(response.body.dailyCompletions)).toBe(true);
            expect(response.body).toHaveProperty('userProductivity');
            expect(Array.isArray(response.body.userProductivity)).toBe(true);
            expect(response.body).toHaveProperty('velocity');
            expect(Array.isArray(response.body.velocity)).toBe(true);
        });
        it('should return analytics for custom time period', async () => {
            const response = await request(app)
                .get('/api/reports/analytics')
                .query({ days: 7 })
                .expect(200);
            expect(response.body).toHaveProperty('period');
            expect(response.body.period).toHaveProperty('days', 7);
        });
    });
    describe('POST /api/reports/weekly/send-to-n8n', () => {
        it('should attempt to send weekly report to n8n', async () => {
            const response = await request(app)
                .post('/api/reports/weekly/send-to-n8n')
                .expect(200);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
        });
    });
    describe('POST /api/reports/custom/send-to-n8n', () => {
        it('should return error when missing date parameters', async () => {
            const response = await request(app)
                .post('/api/reports/custom/send-to-n8n')
                .send({})
                .expect(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('startDate');
            expect(response.body.error).toContain('endDate');
        });
        it('should attempt to send custom report to n8n', async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const endDate = new Date();
            const response = await request(app)
                .post('/api/reports/custom/send-to-n8n')
                .send({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
                .expect(200);
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('message');
        });
    });
});
//# sourceMappingURL=reports.test.js.map