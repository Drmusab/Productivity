const { initDatabase, runAsync, getAsync } = require('../src/utils/database');
const { createRecurringTask } = require('../src/services/tasks');

const createTestTask = async ({ dueDate, recurringRule }) => {
  const timestamp = Date.now();
  const board = await runAsync(
    'INSERT INTO boards (name, description, template) VALUES (?, ?, ?)',
    [`QA Board ${timestamp}`, 'Board for recurring task tests', 0]
  );

  const column = await runAsync(
    'INSERT INTO columns (board_id, name, color, icon, position) VALUES (?, ?, ?, ?, ?)',
    [board.lastID, `QA Column ${timestamp}`, '#ffffff', null, 0]
  );

  const taskRes = await runAsync(
    `INSERT INTO tasks (title, description, column_id, position, priority, due_date, recurring_rule, created_by, assigned_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `Recurring Task ${timestamp}`,
      'Original recurring task',
      column.lastID,
      1,
      'medium',
      dueDate,
      JSON.stringify(recurringRule),
      null,
      null,
    ]
  );

  const task = await getAsync('SELECT * FROM tasks WHERE id = ?', [taskRes.lastID]);

  return {
    boardId: board.lastID,
    task,
  };
};

describe('createRecurringTask', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  test('creates a new recurring task with the expected due date', async () => {
    const dueDate = new Date();
    const recurringRule = { frequency: 'daily', interval: 2 };

    const { task, boardId } = await createTestTask({
      dueDate: dueDate.toISOString(),
      recurringRule,
    });

    const newTaskId = await createRecurringTask(task, recurringRule);
    const newTask = await getAsync('SELECT * FROM tasks WHERE id = ?', [newTaskId]);

    const expectedDueDate = new Date(dueDate.getTime());
    expectedDueDate.setDate(expectedDueDate.getDate() + recurringRule.interval);

    expect(newTask).toBeDefined();
    expect(newTask.column_id).toBe(task.column_id);
    expect(newTask.priority).toBe(task.priority);
    expect(newTask.due_date).toBe(expectedDueDate.toISOString());

    await runAsync('DELETE FROM boards WHERE id = ?', [boardId]);
  });

  test('rejects when the original task due date is missing or invalid', async () => {
    const recurringRule = { frequency: 'weekly', interval: 1 };

    const { task, boardId } = await createTestTask({
      dueDate: 'not-a-valid-date',
      recurringRule,
    });

    await expect(createRecurringTask(task, recurringRule)).rejects.toThrow(
      'Cannot create recurring task without a valid due date'
    );

    await runAsync('DELETE FROM boards WHERE id = ?', [boardId]);
  });

  test('does not create more tasks than the maxOccurrences limit', async () => {
    const dueDate = new Date();
    const recurringRule = { frequency: 'daily', interval: 1, maxOccurrences: 2 };

    const { task, boardId } = await createTestTask({
      dueDate: dueDate.toISOString(),
      recurringRule,
    });

    const firstTaskId = await createRecurringTask(task, recurringRule);
    expect(firstTaskId).toBeDefined();

    const secondTaskId = await createRecurringTask(task, recurringRule);
    expect(secondTaskId).toBeNull();

    await runAsync('DELETE FROM boards WHERE id = ?', [boardId]);
  });
});
