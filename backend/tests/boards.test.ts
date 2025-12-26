process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const { initDatabase, clearDatabase, runAsync, getAsync, allAsync } = require('../src/utils/database');

describe('Boards API operations', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  test('creates a new board', async () => {
    const boardData = {
      name: 'Test Board',
      description: 'Test description'
    };

    const response = await request(app)
      .post('/api/boards')
      .send(boardData);

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.board.name).toBe(boardData.name);

    const storedBoard = await getAsync('SELECT * FROM boards WHERE id = ?', [response.body.id]);
    expect(storedBoard.name).toBe(boardData.name);
    expect(storedBoard.description).toBe(boardData.description);
  });

  test('retrieves all boards', async () => {
    await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Board 1', 'Description 1', 0]
    );
    await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Board 2', 'Description 2', 0]
    );

    const response = await request(app).get('/api/boards');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].name).toBe('Board 1');
    expect(response.body[1].name).toBe('Board 2');
  });

  test('retrieves a specific board by ID', async () => {
    const board = await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Specific Board', 'Specific Description', 0]
    );

    const response = await request(app).get(`/api/boards/${board.lastID}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(board.lastID);
    expect(response.body.name).toBe('Specific Board');
    expect(response.body.columns).toBeDefined();
    expect(response.body.swimlanes).toBeDefined();
  });

  test('updates an existing board', async () => {
    const board = await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Original Board', 'Original Description', 0]
    );

    const updateData = {
      name: 'Updated Board',
      description: 'Updated Description'
    };

    const response = await request(app)
      .put(`/api/boards/${board.lastID}`)
      .send(updateData);

    expect(response.status).toBe(200);

    const updatedBoard = await getAsync('SELECT * FROM boards WHERE id = ?', [board.lastID]);
    expect(updatedBoard.name).toBe(updateData.name);
    expect(updatedBoard.description).toBe(updateData.description);
  });

  test('deletes a board', async () => {
    const board = await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Board to Delete', 'Will be deleted', 0]
    );

    const response = await request(app).delete(`/api/boards/${board.lastID}`);

    expect(response.status).toBe(200);

    const deletedBoard = await getAsync('SELECT * FROM boards WHERE id = ?', [board.lastID]);
    expect(deletedBoard).toBeUndefined();
  });

  test('creates a column for a board', async () => {
    const board = await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Board with Column', 'Test', 0]
    );

    const columnData = {
      name: 'To Do',
      color: '#3498db',
      position: 0
    };

    const response = await request(app)
      .post(`/api/boards/${board.lastID}/columns`)
      .send(columnData);

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();

    const storedColumn = await getAsync('SELECT * FROM columns WHERE id = ?', [response.body.id]);
    expect(storedColumn.board_id).toBe(board.lastID);
    expect(storedColumn.name).toBe(columnData.name);
    expect(storedColumn.color).toBe(columnData.color);
  });

  test('creates a swimlane for a board', async () => {
    const board = await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Board with Swimlane', 'Test', 0]
    );

    const swimlaneData = {
      name: 'Feature Development',
      color: '#2ecc71',
      position: 0
    };

    const response = await request(app)
      .post(`/api/boards/${board.lastID}/swimlanes`)
      .send(swimlaneData);

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();

    const storedSwimlane = await getAsync('SELECT * FROM swimlanes WHERE id = ?', [response.body.id]);
    expect(storedSwimlane.board_id).toBe(board.lastID);
    expect(storedSwimlane.name).toBe(swimlaneData.name);
    expect(storedSwimlane.color).toBe(swimlaneData.color);
  });

  test('updates a column', async () => {
    const board = await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Board', 'Test', 0]
    );

    const column = await runAsync(
      'INSERT INTO columns (board_id, name, color, position) VALUES (?, ?, ?, ?)',
      [board.lastID, 'Old Name', '#000000', 0]
    );

    const updateData = {
      name: 'New Name',
      color: '#ff0000'
    };

    const response = await request(app)
      .put(`/api/boards/${board.lastID}/columns/${column.lastID}`)
      .send(updateData);

    expect(response.status).toBe(200);

    const updatedColumn = await getAsync('SELECT * FROM columns WHERE id = ?', [column.lastID]);
    expect(updatedColumn.name).toBe(updateData.name);
    expect(updatedColumn.color).toBe(updateData.color);
  });

  test('deletes a column', async () => {
    const board = await runAsync(
      'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
      ['Board', 'Test', 0]
    );

    const column = await runAsync(
      'INSERT INTO columns (board_id, name, color, position) VALUES (?, ?, ?, ?)',
      [board.lastID, 'Column to Delete', '#000000', 0]
    );

    const response = await request(app)
      .delete(`/api/boards/${board.lastID}/columns/${column.lastID}`);

    expect(response.status).toBe(200);

    const deletedColumn = await getAsync('SELECT * FROM columns WHERE id = ?', [column.lastID]);
    expect(deletedColumn).toBeUndefined();
  });

  test('returns 404 for non-existent board', async () => {
    const response = await request(app).get('/api/boards/99999');

    expect(response.status).toBe(404);
  });

  test('validates required fields when creating a board', async () => {
    const response = await request(app)
      .post('/api/boards')
      .send({});

    expect(response.status).toBe(400);
  });
});
