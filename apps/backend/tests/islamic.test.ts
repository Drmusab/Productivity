// @ts-nocheck
"use strict";
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
import request from 'supertest';
import app from '../src/app';
import { initDatabase, clearDatabase } from '../src/utils/database';
describe('Islamic Tracker API operations', () => {
    beforeAll(async () => {
        await initDatabase();
    });
    beforeEach(async () => {
        await clearDatabase();
        await initDatabase();
    });
    const today = new Date().toISOString().split('T')[0];
    describe('Prayer Records', () => {
        test('returns today\'s prayers', async () => {
            const response = await request(app).get('/api/islamic/prayers/today');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(5); // 5 daily prayers
            expect(response.body[0]).toHaveProperty('prayerType');
            expect(response.body[0]).toHaveProperty('status');
        });
        test('logs a prayer successfully', async () => {
            const prayerData = {
                date: today,
                prayerType: 'fajr',
                status: 'prayed',
                onTime: true,
                withJamaah: true
            };
            const response = await request(app)
                .post('/api/islamic/prayers/log')
                .send(prayerData);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Prayer logged successfully');
            expect(response.body.prayerType).toBe('fajr');
        });
        test('returns prayer summary', async () => {
            // Log a prayer first
            await request(app)
                .post('/api/islamic/prayers/log')
                .send({ date: today, prayerType: 'dhuhr', status: 'prayed' });
            const response = await request(app).get('/api/islamic/prayers/summary');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('prayed');
            expect(response.body).toHaveProperty('byPrayer');
        });
        test('validates prayer type', async () => {
            const response = await request(app)
                .post('/api/islamic/prayers/log')
                .send({ date: today, prayerType: 'invalid', status: 'prayed' });
            expect(response.status).toBe(400);
        });
    });
    describe('Quran Logs', () => {
        test('logs Quran recitation', async () => {
            const quranData = {
                date: today,
                recitationType: 'tilawah',
                pages: 5,
                durationMinutes: 30
            };
            const response = await request(app)
                .post('/api/islamic/quran')
                .send(quranData);
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.message).toBe('Quran recitation logged successfully');
        });
        test('returns Quran summary', async () => {
            // Log some recitation
            await request(app)
                .post('/api/islamic/quran')
                .send({ date: today, pages: 3, durationMinutes: 15 });
            const response = await request(app).get('/api/islamic/quran/summary');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('sessions');
            expect(response.body).toHaveProperty('totalPages');
            expect(response.body).toHaveProperty('totalMinutes');
        });
    });
    describe('Dhikr Logs', () => {
        test('logs dhikr', async () => {
            const dhikrData = {
                date: today,
                dhikrType: 'morning_adhkar',
                count: 33,
                target: 33,
                completed: true
            };
            const response = await request(app)
                .post('/api/islamic/dhikr/log')
                .send(dhikrData);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Dhikr logged successfully');
        });
        test('retrieves dhikr logs for a date', async () => {
            // Log dhikr first
            await request(app)
                .post('/api/islamic/dhikr/log')
                .send({ date: today, dhikrType: 'evening_adhkar', count: 10, target: 33 });
            const response = await request(app)
                .get('/api/islamic/dhikr')
                .query({ date: today });
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
    describe('Fasting Records', () => {
        test('logs fasting', async () => {
            const fastingData = {
                date: today,
                fastType: 'monday_thursday',
                status: 'completed'
            };
            const response = await request(app)
                .post('/api/islamic/fasting')
                .send(fastingData);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Fasting record saved');
        });
        test('retrieves fasting records', async () => {
            // Log fasting first
            await request(app)
                .post('/api/islamic/fasting')
                .send({ date: today, fastType: 'voluntary', status: 'completed' });
            const response = await request(app)
                .get('/api/islamic/fasting')
                .query({ startDate: today, endDate: today });
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
    });
    describe('Jumuah Checklist', () => {
        test('saves Jumuah checklist', async () => {
            const checklistData = {
                date: today,
                ghusl: true,
                earlyArrival: true,
                sunnahPrayers: true,
                surahKahf: true,
                extraDua: false,
                specialAdhkar: false
            };
            const response = await request(app)
                .post('/api/islamic/jumuah')
                .send(checklistData);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Jumuah checklist saved');
        });
        test('retrieves Jumuah checklist', async () => {
            // Save checklist first
            await request(app)
                .post('/api/islamic/jumuah')
                .send({ date: today, ghusl: true, surahKahf: true });
            const response = await request(app)
                .get('/api/islamic/jumuah')
                .query({ date: today });
            expect(response.status).toBe(200);
            expect(response.body.ghusl).toBe(true);
            expect(response.body.surahKahf).toBe(true);
        });
    });
    describe('Dua Journal', () => {
        test('adds a dua', async () => {
            const duaData = {
                title: 'Test Dua',
                duaText: 'O Allah, help me',
                category: 'personal'
            };
            const response = await request(app)
                .post('/api/islamic/dua')
                .send(duaData);
            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.message).toBe('Dua added to journal');
        });
        test('retrieves duas', async () => {
            // Add a dua first
            await request(app)
                .post('/api/islamic/dua')
                .send({ title: 'Test', category: 'personal' });
            const response = await request(app).get('/api/islamic/dua');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
        test('marks dua as answered', async () => {
            // Add a dua first
            const createRes = await request(app)
                .post('/api/islamic/dua')
                .send({ title: 'Test', category: 'personal' });
            const response = await request(app)
                .patch(`/api/islamic/dua/${createRes.body.id}/answered`);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Dua marked as answered');
        });
    });
    describe('Spiritual Reflections', () => {
        test('saves reflection', async () => {
            const reflectionData = {
                date: today,
                prayerFocus: 'Focus on khushu',
                gratitude: 'Grateful for health',
                improvements: 'Wake up earlier for Fajr'
            };
            const response = await request(app)
                .post('/api/islamic/reflection')
                .send(reflectionData);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Reflection saved');
        });
        test('retrieves reflection', async () => {
            // Save reflection first
            await request(app)
                .post('/api/islamic/reflection')
                .send({ date: today, gratitude: 'Test' });
            const response = await request(app)
                .get('/api/islamic/reflection')
                .query({ date: today });
            expect(response.status).toBe(200);
            expect(response.body.gratitude).toBe('Test');
        });
    });
    describe('Dashboard', () => {
        test('returns comprehensive dashboard data', async () => {
            // Log some data first
            await request(app)
                .post('/api/islamic/prayers/log')
                .send({ date: today, prayerType: 'fajr', status: 'prayed' });
            const response = await request(app).get('/api/islamic/dashboard');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('date');
            expect(response.body).toHaveProperty('prayers');
            expect(response.body).toHaveProperty('prayerCompletion');
            expect(response.body).toHaveProperty('dhikr');
            expect(response.body).toHaveProperty('quran');
            expect(response.body).toHaveProperty('isFriday');
        });
    });
    describe('Settings', () => {
        test('returns default settings', async () => {
            const response = await request(app).get('/api/islamic/settings');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('calculationMethod');
            expect(response.body).toHaveProperty('notificationsEnabled');
        });
        test('saves settings', async () => {
            const settingsData = {
                calculationMethod: 'ISNA',
                latitude: 40.7128,
                longitude: -74.006,
                reminderMinutes: 10
            };
            const response = await request(app)
                .post('/api/islamic/settings')
                .send(settingsData);
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Islamic settings saved');
        });
    });
});
//# sourceMappingURL=islamic.test.js.map