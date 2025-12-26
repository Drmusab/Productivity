process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const { initDatabase, clearDatabase, runAsync, getAsync } = require('../src/utils/database');

const createBoardWithColumns = async () => {
  const timestamp = Date.now();
  const board = await runAsync(
    'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
    [`Test Board ${timestamp}`, 'Board for CRUD tests', 0]
  );

  const firstColumn = await runAsync(
    'INSERT INTO columns (board_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?)',
    [board.lastID, 'Todo', '#e0e0e0', null, 0]
  );

  const secondColumn = await runAsync(
    'INSERT INTO columns (board_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?)',
    [board.lastID, 'Doing', '#d0d0d0', null, 1]
  );

  return {
    boardId: board.lastID,
    columnIds: [firstColumn.lastID, secondColumn.lastID]
  };
};

const createTask = async ({ columnId, title = 'Sample Task', position = 0 }) => {
  const result = await runAsync(
    `INSERT INTO tasks (title, description, column_id, position, priority, pinned)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, 'Description', columnId, position, 'medium', 0]
  );

  return result.lastID;
};

const createTag = async (name = 'Tag', color = '#000000') => {
  const tag = await runAsync(
    'INSERT INTO tags (name, color) VALUES (?, ?)',
    [name, color]
  );

  return tag.lastID;
};

describe('Tasks API CRUD operations', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  test('creates a task via the REST API', async () => {
    const { columnIds } = await createBoardWithColumns();

    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'API Task', column_id: columnIds[0] });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();

    const storedTask = await getAsync('SELECT * FROM tasks WHERE id = ?', [response.body.id]);
    expect(storedTask.title).toBe('API Task');
    expect(storedTask.column_id).toBe(columnIds[0]);
  });

  test('updates task column and position', async () => {
    const { boardId, columnIds } = await createBoardWithColumns();
    const taskId = await createTask({ columnId: columnIds[0], title: 'Move me', position: 0 });
    await createTask({ columnId: columnIds[1], title: 'Existing task', position: 0 });

    const updateResponse = await request(app)
      .put(`/api/tasks/${taskId}`)
      .send({ column_id: columnIds[1], position: 1 });

    expect(updateResponse.status).toBe(200);

    const updatedTask = await getAsync('SELECT * FROM tasks WHERE id = ?', [taskId]);
    expect(updatedTask.column_id).toBe(columnIds[1]);
    expect(updatedTask.position).toBe(1);

    const fetchedTasks = await request(app)
      .get('/api/tasks')
      .query({ boardId });

    expect(fetchedTasks.status).toBe(200);
    expect(fetchedTasks.body.length).toBeGreaterThanOrEqual(2);
  });

  test('filters tasks by board identifier', async () => {
    const { boardId, columnIds } = await createBoardWithColumns();
    await createTask({ columnId: columnIds[0], title: 'Board specific task', position: 0 });

    const response = await request(app)
      .get('/api/tasks')
      .query({ boardId });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].column_id).toBe(columnIds[0]);
  });

  test('filters tasks by tag identifiers', async () => {
    const { boardId, columnIds } = await createBoardWithColumns();
    const importantTagId = await createTag('Important', '#ff0000');

    const taggedTaskId = await createTask({ columnId: columnIds[0], title: 'Tagged task', position: 0 });
    await createTask({ columnId: columnIds[0], title: 'Untagged task', position: 1 });

    await runAsync('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taggedTaskId, importantTagId]);

    const response = await request(app)
      .get('/api/tasks')
      .query({ boardId, tags: `${importantTagId}` });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(taggedTaskId);
    expect(response.body[0].tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: importantTagId, name: 'Important' })
      ])
    );
  });
});
