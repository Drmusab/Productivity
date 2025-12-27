import {
  buildDroppableId,
  parseDroppableId,
  reorderTasksAfterMove,
  groupTasksByColumnAndSwimlane
} from '../boardUtils';

const baseBoard = {
  columns: [
    { id: 1, name: 'To Do' },
    { id: 2, name: 'In Progress' }
  ],
  swimlanes: [
    { id: 10, name: 'Backlog' },
    { id: 20, name: 'Today' }
  ]
};

describe('boardUtils', () => {
  test('buildDroppableId and parseDroppableId round-trip correctly', () => {
    const droppableId = buildDroppableId(5, null);
    expect(droppableId).toBe('5:null');

    const parsed = parseDroppableId(droppableId);
    expect(parsed).toEqual({ columnId: 5, swimlaneId: null });

    const swimlaneDroppable = buildDroppableId(3, 7);
    expect(swimlaneDroppable).toBe('3:7');
    expect(parseDroppableId(swimlaneDroppable)).toEqual({ columnId: 3, swimlaneId: 7 });
  });

  test('groupTasksByColumnAndSwimlane organizes tasks correctly', () => {
    const tasks = [
      { id: 1, column_id: 1, swimlane_id: null, position: 0 },
      { id: 2, column_id: 1, swimlane_id: 10, position: 1 },
      { id: 3, column_id: 2, swimlane_id: 20, position: 0 }
    ];

    const grouped = groupTasksByColumnAndSwimlane(baseBoard, tasks);

    expect(grouped[1].null).toHaveLength(1);
    expect(grouped[1][10]).toHaveLength(1);
    expect(grouped[2][20]).toHaveLength(1);
  });

  test('reorderTasksAfterMove moves tasks across columns and normalizes positions', () => {
    const tasks = [
      { id: 1, column_id: 1, swimlane_id: null, position: 0 },
      { id: 2, column_id: 1, swimlane_id: null, position: 1 },
      { id: 3, column_id: 2, swimlane_id: null, position: 0 }
    ];

    const updated = reorderTasksAfterMove(
      tasks,
      2,
      buildDroppableId(1, null),
      buildDroppableId(2, null),
      1
    );

    const movedTask = updated.find(task => task.id === 2);
    expect(movedTask.column_id).toBe(2);
    expect(movedTask.position).toBe(1);

    const destinationTasks = updated.filter(task => task.column_id === 2);
    const positions = destinationTasks.map(task => task.position);
    expect(positions).toEqual([0, 1]);

    const sourceTasks = updated.filter(task => task.column_id === 1);
    expect(sourceTasks[0].position).toBe(0);
  });

  test('reorderTasksAfterMove reorders within the same column', () => {
    const tasks = [
      { id: 1, column_id: 1, swimlane_id: null, position: 0 },
      { id: 2, column_id: 1, swimlane_id: null, position: 1 },
      { id: 3, column_id: 1, swimlane_id: null, position: 2 }
    ];

    const updated = reorderTasksAfterMove(
      tasks,
      3,
      buildDroppableId(1, null),
      buildDroppableId(1, null),
      0
    );

    const reorderedPositions = updated
      .filter(task => task.column_id === 1)
      .sort((a, b) => a.position - b.position)
      .map(task => task.id);

    expect(reorderedPositions).toEqual([3, 1, 2]);
  });

  test('parseDroppableId returns null for invalid input', () => {
    expect(parseDroppableId(null)).toBe(null);
    expect(parseDroppableId(undefined)).toBe(null);
    expect(parseDroppableId(123)).toBe(null);
    expect(parseDroppableId('')).toBe(null);
  });

  test('parseDroppableId handles invalid column IDs', () => {
    expect(parseDroppableId('invalid:null')).toBe(null);
    expect(parseDroppableId('abc:123')).toBe(null);
  });

  test('parseDroppableId treats missing swimlane segment as null', () => {
    expect(parseDroppableId('7:')).toEqual({ columnId: 7, swimlaneId: null });
  });

  test('groupTasksByColumnAndSwimlane handles empty board', () => {
    const emptyBoard = { columns: [], swimlanes: [] };
    const tasks = [{ id: 1, column_id: 1, swimlane_id: null, position: 0 }];
    
    const grouped = groupTasksByColumnAndSwimlane(emptyBoard, tasks);
    expect(grouped).toEqual({});
  });

  test('groupTasksByColumnAndSwimlane handles null board', () => {
    const tasks = [{ id: 1, column_id: 1, swimlane_id: null, position: 0 }];

    const grouped = groupTasksByColumnAndSwimlane(null, tasks);
    expect(grouped).toEqual({});
  });

  test('groupTasksByColumnAndSwimlane handles missing tasks gracefully', () => {
    const grouped = groupTasksByColumnAndSwimlane(baseBoard, null);

    expect(Object.keys(grouped)).toEqual(['1', '2']);
    expect(grouped[1].null).toEqual([]);
    expect(grouped[2].null).toEqual([]);
  });

  test('reorderTasksAfterMove handles missing task', () => {
    const tasks = [
      { id: 1, column_id: 1, swimlane_id: null, position: 0 }
    ];

    const updated = reorderTasksAfterMove(
      tasks,
      999, // non-existent task
      buildDroppableId(1, null),
      buildDroppableId(2, null),
      0
    );

    expect(updated).toEqual(tasks);
  });

  test('reorderTasksAfterMove with swimlanes', () => {
    const tasks = [
      { id: 1, column_id: 1, swimlane_id: 10, position: 0 },
      { id: 2, column_id: 1, swimlane_id: 10, position: 1 },
      { id: 3, column_id: 2, swimlane_id: 20, position: 0 }
    ];

    const updated = reorderTasksAfterMove(
      tasks,
      1,
      buildDroppableId(1, 10),
      buildDroppableId(2, 20),
      1
    );

    const movedTask = updated.find(task => task.id === 1);
    expect(movedTask.column_id).toBe(2);
    expect(movedTask.swimlane_id).toBe(20);
    expect(movedTask.position).toBe(1);
  });
});
