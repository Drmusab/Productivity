// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Add,
  MoreVert,
  DragIndicator,
  Edit,
  Delete,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dayjs from 'dayjs';

import { getTasks, updateTask, createTask, deleteTask } from '../services/taskService';
import {
  getBoard,
  updateColumn,
  updateSwimlane,
  createColumn,
  createSwimlane,
  deleteColumn,
  deleteSwimlane
} from '../services/boardService';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import TaskCard from '../components/TaskCard';
import TaskDialog from '../components/TaskDialog';
import ColumnDialog from '../components/ColumnDialog';
import SwimlaneDialog from '../components/SwimlaneDialog';
import {
  buildDroppableId,
  groupTasksByColumnAndSwimlane,
  parseDroppableId,
  reorderTasksAfterMove
} from '../utils/boardUtils';

// Default user ID for system operations when user is not authenticated
const DEFAULT_USER_ID = 1;

const Board = () => {
  const { id } = useParams();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  
  const [board, setBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [swimlaneDialogOpen, setSwimlaneDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedSwimlane, setSelectedSwimlane] = useState(null);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [swimlaneMenuAnchor, setSwimlaneMenuAnchor] = useState(null);
  const [selectedColumnForMenu, setSelectedColumnForMenu] = useState(null);
  const [selectedSwimlaneForMenu, setSelectedSwimlaneForMenu] = useState(null);

  const availableColumns = board?.columns || [];
  const availableSwimlanes = board?.swimlanes || [];

  const availableTags = useMemo(() => {
    const tagMap = new Map();

    tasks.forEach(task => {
      (task.tags || []).forEach(tag => {
        const tagId = tag.id ?? tag.tag_id;

        if (!tagId || tagMap.has(tagId)) {
          return;
        }

        tagMap.set(tagId, {
          id: tagId,
          name: tag.name ?? tag.tag_name ?? `Tag ${tagId}`,
          color: tag.color ?? tag.tag_color ?? '#3498db'
        });
      });
    });

    return Array.from(tagMap.values());
  }, [tasks]);

  const availableUsers = useMemo(() => {
    const userMap = new Map();

    tasks.forEach(task => {
      if (task.created_by && task.created_by_name && !userMap.has(task.created_by)) {
        userMap.set(task.created_by, {
          id: task.created_by,
          username: task.created_by_name
        });
      }

      if (task.assigned_to && task.assigned_to_name && !userMap.has(task.assigned_to)) {
        userMap.set(task.assigned_to, {
          id: task.assigned_to,
          username: task.assigned_to_name
        });
      }
    });

    return Array.from(userMap.values());
  }, [tasks]);

  const broadcastTasksChange = useCallback(() => {
    window.dispatchEvent(new Event('tasks:changed'));
  }, []);

  const refreshTasks = useCallback(async () => {
    const tasksResponse = await getTasks({ boardId: id });
    setTasks(tasksResponse.data);
  }, [id]);

  useEffect(() => {
    const fetchBoardData = async () => {
      try {
        const boardResponse = await getBoard(id);
        setBoard(boardResponse.data);

        await refreshTasks();

        setLoading(false);
      } catch (error) {
        showError('فشل تحميل بيانات اللوحة');
        setLoading(false);
      }
    };

    fetchBoardData();
  }, [id, showError, refreshTasks]);

  useEffect(() => {
    const handleExternalTaskChange = () => {
      refreshTasks();
    };

    window.addEventListener('tasks:changed', handleExternalTaskChange);
    return () => {
      window.removeEventListener('tasks:changed', handleExternalTaskChange);
    };
  }, [refreshTasks]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'column') {
      if (!board || !Array.isArray(board.columns)) {
        return;
      }

      const reorderedColumns = Array.from(board.columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      reorderedColumns.splice(destination.index, 0, movedColumn);

      const columnsWithUpdatedPositions = reorderedColumns.map((column, index) => ({
        ...column,
        position: index,
      }));

      try {
        await Promise.all(
          columnsWithUpdatedPositions.map(column =>
            updateColumn(board.id, column.id, { position: column.position })
          )
        );

        setBoard(prev => (prev ? { ...prev, columns: columnsWithUpdatedPositions } : prev));
        showSuccess('تم إعادة ترتيب الأعمدة بنجاح');
      } catch (error) {
        showError('فشل إعادة ترتيب الأعمدة');
        try {
          const boardResponse = await getBoard(id);
          setBoard(boardResponse.data);
        } catch (refreshError) {
          console.error('Failed to refresh board after column reorder error:', refreshError);
        }
      }
      return;
    }

    const task = tasks.find(t => String(t.id) === String(draggableId));
    if (!task) {
      return;
    }

    const destinationLocation = parseDroppableId(destination.droppableId);
    const sourceLocation = parseDroppableId(source.droppableId);

    if (!destinationLocation || !sourceLocation) {
      return;
    }

    const updatedTasks = reorderTasksAfterMove(
      tasks,
      draggableId,
      source.droppableId,
      destination.droppableId,
      destination.index
    );

    try {
      setTasks(updatedTasks);

      await persistTaskOrdering(
        updatedTasks,
        sourceLocation,
        destinationLocation
      );
      broadcastTasksChange();
      showSuccess('تم نقل المهمة بنجاح');
    } catch (error) {
      setTasks(tasks);
      showError('فشل نقل المهمة');
      try {
        const tasksResponse = await getTasks({ boardId: id });
        setTasks(tasksResponse.data);
      } catch (refreshError) {
        console.error('Failed to refresh tasks after move error:', refreshError);
      }
    }
  };

  const normalizeRecurringRule = (rule) => {
    if (!rule) return null;
    if (typeof rule === 'object') return rule;
    try {
      return JSON.parse(rule);
    } catch (error) {
      return null;
    }
  };

  const persistTaskOrdering = useCallback(async (updatedTaskList, sourceLocation, destinationLocation) => {
    const buildLocationKey = (location) => `${location.columnId}:${location.swimlaneId ?? 'null'}`;
    const seen = new Set();
    const updates = [];

    [sourceLocation, destinationLocation].forEach(location => {
      if (!location) return;
      const key = buildLocationKey(location);
      if (seen.has(key)) return;
      seen.add(key);

      const tasksForLocation = updatedTaskList
        .filter(task =>
          task.column_id === location.columnId &&
          (task.swimlane_id ?? null) === (location.swimlaneId ?? null)
        )
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      tasksForLocation.forEach((task, index) => {
        updates.push(updateTask(task.id, {
          column_id: location.columnId,
          swimlane_id: location.swimlaneId,
          position: index,
          ...(task.recurring_rule
            ? { recurring_rule: typeof task.recurring_rule === 'string'
              ? task.recurring_rule
              : JSON.stringify(task.recurring_rule)
            }
            : {})
        }));
      });
    });

    await Promise.all(updates);
  }, []);

  const ensureRoutineTasksReset = useCallback(async (currentTasks = []) => {
    if (!board?.columns?.length) return;

    const now = dayjs();
    const defaultColumnId = board.columns[0]?.id;
    const updates = [];
    const updatedTasks = [...currentTasks];

    currentTasks.forEach((task, index) => {
      const recurringRule = normalizeRecurringRule(task.recurring_rule);
      if (!recurringRule || recurringRule.status === 'paused') return;

      const interval = Math.max(1, Number(recurringRule.interval) || 1);
      const lastReset = recurringRule.lastResetAt ? dayjs(recurringRule.lastResetAt) : null;
      const targetColumnId = recurringRule.columnId ?? defaultColumnId;
      if (!targetColumnId) return;

      const needsReset = (() => {
        if (!lastReset) return true;
        if (recurringRule.frequency === 'weekly') {
          return now.diff(lastReset, 'week') >= interval;
        }
        if (recurringRule.frequency === 'custom') {
          return now.diff(lastReset, 'day') >= interval;
        }
        return now.diff(lastReset, 'day') >= interval;
      })();

      if (!needsReset) return;

      updates.push(updateTask(task.id, {
        column_id: targetColumnId,
        swimlane_id: null,
        position: 0,
        recurring_rule: JSON.stringify({ ...recurringRule, lastResetAt: now.toISOString() })
      }));

      updatedTasks[index] = {
        ...task,
        column_id: targetColumnId,
        swimlane_id: null,
        position: 0,
        recurring_rule: { ...recurringRule, lastResetAt: now.toISOString() }
      };
    });

    if (updates.length) {
      setTasks(updatedTasks);
      await Promise.all(updates);
      broadcastTasksChange();
    }
  }, [board?.columns, broadcastTasksChange]);

  useEffect(() => {
    ensureRoutineTasksReset(tasks);
  }, [tasks, ensureRoutineTasksReset]);

  const handleAddTask = (columnId, swimlaneId = null) => {
    const normalizedSwimlaneId = swimlaneId === undefined ? null : swimlaneId;
    setSelectedTask({
      title: '',
      description: '',
      column_id: columnId,
      swimlane_id: normalizedSwimlaneId,
      priority: 'medium',
      tags: [],
      subtasks: []
    });
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async (task) => {
    try {
      if (task.id) {
        await updateTask(task.id, task);
        showSuccess('تم تحديث المهمة بنجاح');
      } else {
        await createTask(task);
        showSuccess('تم إنشاء المهمة بنجاح');
      }

      await refreshTasks();
      broadcastTasksChange();

      setTaskDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      showError('فشل حفظ المهمة');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const deletedBy = user?.id || DEFAULT_USER_ID;
      await deleteTask(taskId, deletedBy);
      showSuccess('تم حذف المهمة بنجاح');
      
      await refreshTasks();
      broadcastTasksChange();
      
      setTaskDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      showError('فشل حذف المهمة');
    }
  };

  const handleDuplicateTask = async (task) => {
    try {
      const duplicatedTask = {
        ...task,
        id: undefined,
        title: `${task.title} (Copy)`,
        created_at: undefined,
        updated_at: undefined
      };
      
      await createTask(duplicatedTask);
      showSuccess('تم تكرار المهمة بنجاح');
      
      await refreshTasks();
      broadcastTasksChange();
    } catch (error) {
      showError('فشل تكرار المهمة');
    }
  };

  const handleAddColumn = () => {
    setSelectedColumn({
      name: '',
      color: '#3498db',
      icon: '',
      position: board?.columns?.length ?? 0
    });
    setColumnDialogOpen(true);
  };

  const handleEditColumn = (column) => {
    setSelectedColumn(column);
    setColumnDialogOpen(true);
  };

  const handleSaveColumn = async (column) => {
    try {
      if (column.id) {
        await updateColumn(board.id, column.id, column);
        showSuccess('تم تحديث العمود بنجاح');
      } else {
        await createColumn(board.id, column);
        showSuccess('تم إنشاء العمود بنجاح');
      }
      
      // Refresh board
      const boardResponse = await getBoard(id);
      setBoard(boardResponse.data);
      
      setColumnDialogOpen(false);
      setSelectedColumn(null);
    } catch (error) {
      showError('فشل حفظ العمود');
    }
  };

  const handleAddSwimlane = () => {
    setSelectedSwimlane({
      name: '',
      color: '#ecf0f1',
      position: board?.swimlanes?.length ?? 0,
      collapsed: false
    });
    setSwimlaneDialogOpen(true);
  };

  const handleEditSwimlane = (swimlane) => {
    setSelectedSwimlane(swimlane);
    setSwimlaneDialogOpen(true);
  };

  const handleSaveSwimlane = async (swimlane) => {
    try {
      if (swimlane.id) {
        await updateSwimlane(board.id, swimlane.id, swimlane);
        showSuccess('تم تحديث المسار بنجاح');
      } else {
        await createSwimlane(board.id, swimlane);
        showSuccess('تم إنشاء المسار بنجاح');
      }
      
      // Refresh board
      const boardResponse = await getBoard(id);
      setBoard(boardResponse.data);
      
      setSwimlaneDialogOpen(false);
      setSelectedSwimlane(null);
    } catch (error) {
      showError('فشل حفظ المسار');
    }
  };

  const handleColumnMenuClick = (event, column) => {
    setColumnMenuAnchor(event.currentTarget);
    setSelectedColumnForMenu(column);
  };

  const handleColumnMenuClose = () => {
    setColumnMenuAnchor(null);
    setSelectedColumnForMenu(null);
  };

  const handleSwimlaneMenuClick = (event, swimlane) => {
    setSwimlaneMenuAnchor(event.currentTarget);
    setSelectedSwimlaneForMenu(swimlane);
  };

  const handleSwimlaneMenuClose = () => {
    setSwimlaneMenuAnchor(null);
    setSelectedSwimlaneForMenu(null);
  };

  const refreshBoardAndTasks = async () => {
    const [boardResponse, tasksResponse] = await Promise.all([
      getBoard(id),
      getTasks({ boardId: id })
    ]);

    setBoard(boardResponse.data);
    setTasks(tasksResponse.data);
  };

  const handleDeleteColumn = async (column) => {
    if (!column) {
      return;
    }

    try {
      await deleteColumn(board.id, column.id);
      await refreshBoardAndTasks();
      showSuccess('تم حذف العمود بنجاح');
    } catch (error) {
      showError('فشل حذف العمود');
    } finally {
      handleColumnMenuClose();
    }
  };

  const handleDeleteSwimlane = async (swimlane) => {
    if (!swimlane) {
      return;
    }

    try {
      await deleteSwimlane(board.id, swimlane.id);
      await refreshBoardAndTasks();
      showSuccess('تم حذف المسار بنجاح');
    } catch (error) {
      showError('فشل حذف المسار');
    } finally {
      handleSwimlaneMenuClose();
    }
  };

  const toggleSwimlaneCollapse = async (swimlane) => {
    try {
      await updateSwimlane(board.id, swimlane.id, { collapsed: swimlane.collapsed ? 0 : 1 });

      const boardResponse = await getBoard(id);
      setBoard(boardResponse.data);

      showSuccess(`تم ${swimlane.collapsed ? 'توسيع' : 'طي'} المسار بنجاح`);
    } catch (error) {
      showError('فشل تغيير حالة المسار');
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh' 
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            جاري تحميل اللوحة...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!board) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh' 
        }}
      >
        <Typography variant="h6" color="error">
          لم يتم العثور على اللوحة
        </Typography>
      </Box>
    );
  }

  const tasksByColumnAndSwimlane = groupTasksByColumnAndSwimlane(board, tasks);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">{board.name}</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddSwimlane}
            sx={{ mr: 1 }}
          >
            إضافة مسار
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddColumn}
          >
            إضافة عمود
          </Button>
        </Box>
      </Box>
      
      {board.description && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {board.description}
          </ReactMarkdown>
        </Paper>
      )}
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="columns" direction="horizontal" type="column">
          {(provided) => (
            <Box
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}
            >
              {board.columns.map((column, columnIndex) => (
                <Draggable key={column.id} draggableId={column.id.toString()} index={columnIndex}>
                  {(provided, snapshot) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{
                        minWidth: 300,
                        maxWidth: 300,
                        backgroundColor: column.color + '20',
                        borderLeft: `4px solid ${column.color}`,
                        opacity: snapshot.isDragging ? 0.8 : 1
                      }}
                    >
                      <Box
                        {...provided.dragHandleProps}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DragIndicator sx={{ mr: 1, color: '#999' }} />
                          <Typography variant="h6">{column.name}</Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleColumnMenuClick(e, column)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ p: 1 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => handleAddTask(column.id)}
                          sx={{ mb: 1 }}
                        >
                          إضافة مهمة
                        </Button>
                      </Box>
                      
      {(board.swimlanes?.length ?? 0) > 0 ? (
        // Render swimlanes
        board.swimlanes.map(swimlane => (
                          <Box
                            key={swimlane.id}
                            sx={{
                              p: 1,
                              borderTop: '1px solid #eee',
                              backgroundColor: swimlane.collapsed ? '#f5f5f5' : 'transparent'
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 1
                              }}
                            >
                              <Typography variant="subtitle2">{swimlane.name}</Typography>
                              <Box>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleSwimlaneCollapse(swimlane)}
                                >
                                  {swimlane.collapsed ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleSwimlaneMenuClick(e, swimlane)}
                                >
                                  <MoreVert />
                                </IconButton>
                              </Box>
                            </Box>
                            
                            {!swimlane.collapsed && (
                              <Droppable
                                droppableId={buildDroppableId(column.id, swimlane.id)}
                                type="task"
                              >
                                {(provided, snapshot) => (
                                  <Box
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    sx={{
                                      minHeight: 100,
                                      backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent',
                                      borderRadius: 1,
                                      p: 1
                                    }}
                                  >
                                    {(tasksByColumnAndSwimlane[column.id]?.[swimlane.id] || []).map((task, index) => (
                                      <Draggable
                                        key={task.id}
                                        draggableId={task.id.toString()}
                                        index={index}
                                      >
                                        {(taskProvided) => (
                                          <Box
                                            ref={taskProvided.innerRef}
                                            {...taskProvided.draggableProps}
                                            {...taskProvided.dragHandleProps}
                                            sx={{ mb: 1, '&:last-child': { mb: 0 } }}
                                          >
                                            <TaskCard
                                              task={task}
                                              index={index}
                                              onEdit={handleEditTask}
                                              onDelete={handleDeleteTask}
                                              onDuplicate={handleDuplicateTask}
                                            />
                                          </Box>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </Box>
                                )}
                              </Droppable>
                            )}
                          </Box>
                        ))
                      ) : (
                        // Render tasks without swimlanes
                        <Droppable droppableId={buildDroppableId(column.id, null)} type="task">
                          {(provided, snapshot) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              sx={{
                                minHeight: 200,
                                backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent',
                                borderRadius: 1,
                                p: 1
                              }}
                            >
                              {(tasksByColumnAndSwimlane[column.id]?.['null'] || []).map((task, index) => (
                                <Draggable
                                  key={task.id}
                                  draggableId={task.id.toString()}
                                  index={index}
                                >
                                  {(taskProvided) => (
                                    <Box
                                      ref={taskProvided.innerRef}
                                      {...taskProvided.draggableProps}
                                      {...taskProvided.dragHandleProps}
                                      sx={{ mb: 1, '&:last-child': { mb: 0 } }}
                                    >
                                      <TaskCard
                                        task={task}
                                        index={index}
                                        onEdit={handleEditTask}
                                        onDelete={handleDeleteTask}
                                        onDuplicate={handleDuplicateTask}
                                      />
                                    </Box>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      )}
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>
      
      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        task={selectedTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        availableColumns={availableColumns}
        availableSwimlanes={availableSwimlanes}
        availableTags={availableTags}
        availableUsers={availableUsers}
        onClose={() => setTaskDialogOpen(false)}
      />
      
      {/* Column Dialog */}
      <ColumnDialog
        open={columnDialogOpen}
        column={selectedColumn}
        onClose={() => setColumnDialogOpen(false)}
        onSave={handleSaveColumn}
      />
      
      {/* Swimlane Dialog */}
      <SwimlaneDialog
        open={swimlaneDialogOpen}
        swimlane={selectedSwimlane}
        onClose={() => setSwimlaneDialogOpen(false)}
        onSave={handleSaveSwimlane}
      />
      
      {/* Column Menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={handleColumnMenuClose}
      >
        <MenuItem
          disabled={!selectedColumnForMenu}
          onClick={() => {
            if (selectedColumnForMenu) {
              handleEditColumn(selectedColumnForMenu);
            }
            handleColumnMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} /> تعديل
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={!selectedColumnForMenu}
          onClick={() => handleDeleteColumn(selectedColumnForMenu)}
        >
          <Delete sx={{ mr: 1 }} /> حذف
        </MenuItem>
      </Menu>
      
      {/* Swimlane Menu */}
      <Menu
        anchorEl={swimlaneMenuAnchor}
        open={Boolean(swimlaneMenuAnchor)}
        onClose={handleSwimlaneMenuClose}
      >
        <MenuItem
          disabled={!selectedSwimlaneForMenu}
          onClick={() => {
            if (selectedSwimlaneForMenu) {
              handleEditSwimlane(selectedSwimlaneForMenu);
            }
            handleSwimlaneMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} /> تعديل
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={!selectedSwimlaneForMenu}
          onClick={() => handleDeleteSwimlane(selectedSwimlaneForMenu)}
        >
          <Delete sx={{ mr: 1 }} /> حذف
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Board;