// @ts-nocheck
export const DROPPABLE_ID_SEPARATOR = ':';

export const buildDroppableId = (columnId, swimlaneId = null) => {
  const normalizedColumnId = String(columnId);
  const normalizedSwimlaneId = swimlaneId === null || swimlaneId === undefined
    ? 'null'
    : String(swimlaneId);

  return `${normalizedColumnId}${DROPPABLE_ID_SEPARATOR}${normalizedSwimlaneId}`;
};

export const parseDroppableId = (droppableId) => {
  if (typeof droppableId !== 'string') {
    return null;
  }

  const [columnPart, swimlanePart] = droppableId.split(DROPPABLE_ID_SEPARATOR);

  if (!columnPart) {
    return null;
  }

  const columnId = Number(columnPart);
  const swimlaneId = swimlanePart === undefined || swimlanePart === '' || swimlanePart === 'null'
    ? null
    : Number(swimlanePart);

  if (Number.isNaN(columnId) || (swimlanePart !== undefined && swimlaneId !== null && Number.isNaN(swimlaneId))) {
    return null;
  }

  return { columnId, swimlaneId };
};

const matchesLocation = (task, { columnId, swimlaneId }) => {
  const normalizedSwimlaneId = swimlaneId === undefined ? null : swimlaneId;
  const taskSwimlane = task.swimlane_id === undefined ? null : task.swimlane_id;

  return task.column_id === columnId && taskSwimlane === normalizedSwimlaneId;
};

const normalizeGroup = (tasks, { sort = true } = {}) => {
  const tasksToNormalize = sort
    ? [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : [...tasks];

  return tasksToNormalize.map((task, index) => ({ ...task, position: index }));
};

export const reorderTasksAfterMove = (
  tasks,
  movedTaskId,
  sourceDroppableId,
  destinationDroppableId,
  destinationIndex
) => {
  const normalizedTasks = Array.isArray(tasks) ? tasks : [];
  const sourceLocation = parseDroppableId(sourceDroppableId);
  const destinationLocation = parseDroppableId(destinationDroppableId);

  if (!sourceLocation || !destinationLocation) {
    return normalizedTasks;
  }

  const movedTask = normalizedTasks.find(task => String(task.id) === String(movedTaskId));

  if (!movedTask) {
    return normalizedTasks;
  }

  const sameLocation =
    sourceLocation.columnId === destinationLocation.columnId &&
    (sourceLocation.swimlaneId ?? null) === (destinationLocation.swimlaneId ?? null);

  const remainingTasks = normalizedTasks
    .filter(task => String(task.id) !== String(movedTaskId))
    .map(task => ({ ...task }));

  if (!sameLocation) {
    const normalizedSource = normalizeGroup(
      remainingTasks.filter(task => matchesLocation(task, sourceLocation))
    );

    const sourceMap = new Map(normalizedSource.map(task => [task.id, task]));

    for (let index = 0; index < remainingTasks.length; index += 1) {
      const task = remainingTasks[index];
      if (sourceMap.has(task.id)) {
        remainingTasks[index] = sourceMap.get(task.id);
      }
    }
  }

  const destinationGroup = remainingTasks
    .filter(task => matchesLocation(task, destinationLocation))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const movedTaskForDestination = {
    ...movedTask,
    column_id: destinationLocation.columnId,
    swimlane_id: destinationLocation.swimlaneId,
  };

  if (destinationIndex >= 0 && destinationIndex <= destinationGroup.length) {
    destinationGroup.splice(destinationIndex, 0, movedTaskForDestination);
  } else {
    destinationGroup.push(movedTaskForDestination);
  }

  const normalizedDestination = normalizeGroup(destinationGroup, { sort: false });
  const destinationMap = new Map(normalizedDestination.map(task => [task.id, task]));

  const tasksWithoutDestination = remainingTasks.filter(
    task => !destinationMap.has(task.id)
  );

  return [...tasksWithoutDestination, ...normalizedDestination];
};

export const groupTasksByColumnAndSwimlane = (board, tasks) => {
  if (!board) {
    return {};
  }

  const columns = Array.isArray(board.columns) ? board.columns : [];
  const swimlanes = Array.isArray(board.swimlanes) ? board.swimlanes : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const grouped = {};

  columns.forEach(column => {
    grouped[column.id] = { null: [] };
    swimlanes.forEach(swimlane => {
      grouped[column.id][swimlane.id] = [];
    });
  });

  safeTasks.forEach(task => {
    const columnId = task.column_id;
    const swimlaneId = task.swimlane_id ?? 'null';

    if (!grouped[columnId]) {
      return;
    }

    if (!grouped[columnId][swimlaneId]) {
      grouped[columnId][swimlaneId] = [];
    }

    grouped[columnId][swimlaneId].push(task);
  });

  Object.keys(grouped).forEach(columnId => {
    Object.keys(grouped[columnId]).forEach(swimlaneId => {
      grouped[columnId][swimlaneId] = grouped[columnId][swimlaneId]
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    });
  });

  return grouped;
};
