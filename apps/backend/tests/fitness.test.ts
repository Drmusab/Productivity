// @ts-nocheck
"use strict";
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
import request from 'supertest';
import app from '../src/app';
import { initDatabase, clearDatabase, runAsync, getAsync, allAsync } from '../src/utils/database';
describe('Fitness API operations', () => {
    beforeAll(async () => {
        await initDatabase();
    });
    beforeEach(async () => {
        await clearDatabase();
        // Re-seed default muscle groups and exercises
        await initDatabase();
    });
    describe('Muscle Groups', () => {
        test('returns all muscle groups', async () => {
            const response = await request(app).get('/api/fitness/muscle-groups');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            // Check structure
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('name');
            expect(response.body[0]).toHaveProperty('subGroups');
        });
    });
    describe('Exercises', () => {
        test('returns all exercises', async () => {
            const response = await request(app).get('/api/fitness/exercises');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
        test('creates a custom exercise', async () => {
            const exerciseData = {
                name: 'Custom Press',
                equipment: 'Dumbbells',
                difficulty: 'intermediate'
            };
            const response = await request(app)
                .post('/api/fitness/exercises')
                .send(exerciseData);
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(exerciseData.name);
        });
        test('filters exercises by search', async () => {
            const response = await request(app)
                .get('/api/fitness/exercises')
                .query({ search: 'Bench' });
            expect(response.status).toBe(200);
            expect(response.body.every(e => e.name.includes('Bench'))).toBe(true);
        });
    });
    describe('Workout Templates', () => {
        test('creates a workout template', async () => {
            const templateData = {
                name: 'Push Day',
                description: 'Chest, shoulders, triceps',
                frequency: 3,
                goal: 'hypertrophy'
            };
            const response = await request(app)
                .post('/api/fitness/templates')
                .send(templateData);
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(templateData.name);
        });
        test('retrieves workout templates', async () => {
            // Create a template first
            await request(app)
                .post('/api/fitness/templates')
                .send({ name: 'Test Template', frequency: 4 });
            const response = await request(app).get('/api/fitness/templates');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
        test('retrieves a specific template with workout days', async () => {
            // Create a template
            const createRes = await request(app)
                .post('/api/fitness/templates')
                .send({ name: 'Full Body', frequency: 3 });
            const templateId = createRes.body.id;
            // Add a workout day
            await request(app)
                .post(`/api/fitness/templates/${templateId}/days`)
                .send({ name: 'Day A' });
            const response = await request(app).get(`/api/fitness/templates/${templateId}`);
            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Full Body');
            expect(response.body.workoutDays).toBeDefined();
            expect(response.body.workoutDays.length).toBe(1);
        });
    });
    describe('Workout Sessions', () => {
        test('creates a workout session', async () => {
            const sessionData = {
                date: '2024-12-20',
                notes: 'Good workout',
                energyLevel: 4
            };
            const response = await request(app)
                .post('/api/fitness/sessions')
                .send(sessionData);
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.date).toBe(sessionData.date);
        });
        test('retrieves workout sessions', async () => {
            await request(app)
                .post('/api/fitness/sessions')
                .send({ date: '2024-12-20' });
            const response = await request(app).get('/api/fitness/sessions');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
        test('logs an exercise set in a session', async () => {
            // Create a session
            const sessionRes = await request(app)
                .post('/api/fitness/sessions')
                .send({ date: '2024-12-20' });
            const sessionId = sessionRes.body.id;
            // Get an exercise ID
            const exercisesRes = await request(app).get('/api/fitness/exercises');
            const exerciseId = exercisesRes.body[0].id;
            // Log a set
            const logRes = await request(app)
                .post(`/api/fitness/sessions/${sessionId}/logs`)
                .send({
                exerciseId,
                setNumber: 1,
                reps: 10,
                weight: 60
            });
            expect(logRes.status).toBe(201);
            expect(logRes.body.id).toBeDefined();
        });
    });
    describe('Body Measurements', () => {
        test('adds a body measurement', async () => {
            const measurementData = {
                date: '2024-12-20',
                weight: 75.5,
                bodyFatPercent: 15
            };
            const response = await request(app)
                .post('/api/fitness/measurements')
                .send(measurementData);
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
        });
        test('retrieves body measurements', async () => {
            await request(app)
                .post('/api/fitness/measurements')
                .send({ date: '2024-12-20', weight: 75 });
            const response = await request(app).get('/api/fitness/measurements');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
    });
    describe('Fitness Goals', () => {
        test('creates a fitness goal', async () => {
            const goalData = {
                goalType: 'strength',
                targetDescription: 'Bench press 100kg',
                deadline: '2025-06-01'
            };
            const response = await request(app)
                .post('/api/fitness/goals')
                .send(goalData);
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.goalType).toBe(goalData.goalType);
        });
        test('retrieves active fitness goals', async () => {
            await request(app)
                .post('/api/fitness/goals')
                .send({ goalType: 'weight_loss', targetDescription: 'Lose 5kg' });
            const response = await request(app)
                .get('/api/fitness/goals')
                .query({ status: 'active' });
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
    describe('Progress & Analytics', () => {
        test('retrieves weekly stats', async () => {
            const response = await request(app).get('/api/fitness/stats/weekly');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalSessions');
            expect(response.body).toHaveProperty('totalSets');
            expect(response.body).toHaveProperty('totalVolume');
        });
        test('retrieves today workout data', async () => {
            const response = await request(app).get('/api/fitness/today');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('todaySession');
            expect(response.body).toHaveProperty('weekSessionCount');
        });
    });
    describe('Personal Records', () => {
        test('retrieves personal records', async () => {
            const response = await request(app).get('/api/fitness/personal-records');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
        test('detects and records a PR when logging a heavy set', async () => {
            // Create a session
            const sessionRes = await request(app)
                .post('/api/fitness/sessions')
                .send({ date: '2024-12-20' });
            const sessionId = sessionRes.body.id;
            // Get an exercise ID
            const exercisesRes = await request(app).get('/api/fitness/exercises');
            const exerciseId = exercisesRes.body[0].id;
            // Log a set - should be a PR since it's the first
            const logRes = await request(app)
                .post(`/api/fitness/sessions/${sessionId}/logs`)
                .send({
                exerciseId,
                setNumber: 1,
                reps: 5,
                weight: 100
            });
            expect(logRes.status).toBe(201);
            expect(logRes.body.isPR).toBe(true);
            // Check PR was recorded
            const prsRes = await request(app)
                .get('/api/fitness/personal-records')
                .query({ exerciseId });
            expect(prsRes.body.length).toBeGreaterThan(0);
            expect(prsRes.body[0].value).toBe(100);
        });
    });
});
//# sourceMappingURL=fitness.test.js.map