/**
 * @fileoverview Tests for Chronos Time Intelligence System routes
 */

const request = require('supertest');
const app = require('../src/app');
const { initDatabase } = require('../src/utils/database');

let authToken;
let testUserId;
let testBlockId;

beforeAll(async () => {
  // Initialize test database
  await initDatabase();
  
  // Login to get auth token
  const loginResponse = await request(app)
    .post('/api/users/login')
    .send({
      username: 'demo',
      password: 'demo123'
    });
  
  authToken = loginResponse.body.token;
  testUserId = loginResponse.body.user.id;
});

describe('Chronos Time Blocks', () => {
  test('should create a time block', async () => {
    const response = await request(app)
      .post('/api/chronos/time-blocks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Block',
        description: 'Test description',
        date: '2025-01-15',
        start_time: '09:00',
        end_time: '10:00',
        category: 'deep_work',
        energy_required: 'high'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Block');
    testBlockId = response.body.id;
  });

  test('should get time blocks for date range', async () => {
    const response = await request(app)
      .get('/api/chronos/time-blocks?startDate=2025-01-01&endDate=2025-01-31')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('should update a time block', async () => {
    const response = await request(app)
      .put(`/api/chronos/time-blocks/${testBlockId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Updated Block',
        end_time: '11:00'
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Block');
    expect(response.body.end_time).toBe('11:00');
  });

  test('should detect conflicts', async () => {
    const response = await request(app)
      .post('/api/chronos/time-blocks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Conflicting Block',
        date: '2025-01-15',
        start_time: '09:30',
        end_time: '10:30',
        category: 'meeting'
      });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('conflicts');
  });
});

describe('Chronos Time Sessions', () => {
  let testSessionId;

  test('should start a time session', async () => {
    const response = await request(app)
      .post('/api/chronos/time-sessions/start')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Session',
        category: 'deep_work'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('active');
    testSessionId = response.body.id;
  });

  test('should get active session', async () => {
    const response = await request(app)
      .get('/api/chronos/time-sessions/active')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe('active');
  });

  test('should pause a session', async () => {
    const response = await request(app)
      .post(`/api/chronos/time-sessions/${testSessionId}/pause`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('paused');
  });

  test('should resume a session', async () => {
    const response = await request(app)
      .post(`/api/chronos/time-sessions/${testSessionId}/resume`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('active');
  });

  test('should stop a session', async () => {
    const response = await request(app)
      .post(`/api/chronos/time-sessions/${testSessionId}/stop`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        energy_level: 4,
        focus_quality: 5,
        productivity_rating: 4,
        interruptions: 2,
        notes: 'Good session'
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('completed');
    expect(response.body.energy_level).toBe(4);
  });
});

describe('Chronos Analytics', () => {
  test('should get weekly analytics', async () => {
    const response = await request(app)
      .get('/api/chronos/analytics/weekly')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('period');
    expect(response.body).toHaveProperty('plannedVsActual');
    expect(response.body).toHaveProperty('categoryBreakdown');
    expect(response.body).toHaveProperty('energyPatterns');
    expect(response.body).toHaveProperty('focusAnalysis');
  });

  test('should get productivity score', async () => {
    const response = await request(app)
      .get('/api/chronos/analytics/productivity-score?days=7')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('score');
    expect(response.body).toHaveProperty('metrics');
    expect(typeof response.body.score).toBe('number');
  });
});

describe('Chronos Settings', () => {
  test('should get Chronos settings', async () => {
    const response = await request(app)
      .get('/api/chronos/settings')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('work_hours_start');
    expect(response.body).toHaveProperty('pomodoro_work_duration');
  });

  test('should update Chronos settings', async () => {
    const response = await request(app)
      .put('/api/chronos/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        work_hours_start: '08:00',
        work_hours_end: '18:00',
        pomodoro_work_duration: 30
      });

    expect(response.status).toBe(200);
    expect(response.body.work_hours_start).toBe('08:00');
    expect(response.body.pomodoro_work_duration).toBe(30);
  });
});

describe('Chronos Templates', () => {
  let templateId;

  test('should create a time template', async () => {
    const response = await request(app)
      .post('/api/chronos/templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Morning Routine',
        title: 'Morning Exercise',
        start_time: '07:00',
        duration: 60,
        category: 'health',
        recurrence_pattern: 'daily',
        days_of_week: '1,2,3,4,5'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Morning Routine');
    templateId = response.body.id;
  });

  test('should get all templates', async () => {
    const response = await request(app)
      .get('/api/chronos/templates')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('should delete a template', async () => {
    const response = await request(app)
      .delete(`/api/chronos/templates/${templateId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
  });
});

describe('Chronos Integration', () => {
  test('should sync daily blocks', async () => {
    const response = await request(app)
      .get('/api/chronos/integrate/daily-blocks/2025-01-15')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('blocks');
    expect(response.body).toHaveProperty('priorities');
  });
});

// Cleanup
afterAll(async () => {
  // Delete test time block
  if (testBlockId) {
    await request(app)
      .delete(`/api/chronos/time-blocks/${testBlockId}`)
      .set('Authorization', `Bearer ${authToken}`);
  }
});
