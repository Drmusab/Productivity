process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const { initDatabase, clearDatabase, getAsync } = require('../src/utils/database');

describe('Settings API', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /api/settings/report-schedule', () => {
    it('should upsert schedule settings even when they do not yet exist', async () => {
      const payload = { day: 1, hour: 9, minute: 15 };

      const response = await request(app)
        .post('/api/settings/report-schedule')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('schedule');
      expect(response.body.schedule).toEqual(payload);

      const day = await getAsync('SELECT value FROM settings WHERE key = ?', ['report_schedule_day']);
      const hour = await getAsync('SELECT value FROM settings WHERE key = ?', ['report_schedule_hour']);
      const minute = await getAsync('SELECT value FROM settings WHERE key = ?', ['report_schedule_minute']);

      expect(day?.value).toBe(payload.day.toString());
      expect(hour?.value).toBe(payload.hour.toString());
      expect(minute?.value).toBe(payload.minute.toString());
    });
  });
});
