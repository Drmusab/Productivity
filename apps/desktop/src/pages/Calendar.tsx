// @ts-nocheck
/**
 * @fileoverview Calendar page component with FullCalendar integration.
 * Provides a comprehensive calendar view for task management with create/edit functionality.
 * @module pages/Calendar
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TaskCalendar from '../components/Calendar/TaskCalendar';
import TaskDialog from '../components/TaskDialog';
import { useNotification } from '../contexts/NotificationContext';
import { createTask, updateTask, deleteTask } from '../services/taskService';
import { getBoards, getBoard } from '../services/boardService';

/**
 * Calendar page component.
 * Displays tasks in a calendar view and allows creating/editing tasks.
 * 
 * @returns {JSX.Element} Calendar page component
 */
const Calendar = () => {
  const { showError, showSuccess } = useNotification();
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [boardColumns, setBoardColumns] = useState([]);
  const [boardSwimlanes, setBoardSwimlanes] = useState([]);
  const [boardTags, setBoardTags] = useState([]);
  const [boardUsers, setBoardUsers] = useState([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Loads available boards from the API.
   */
  const loadBoards = useCallback(async () => {
    try {
      const response = await getBoards();
      const boardsList = response.data || [];
      setBoards(boardsList);
      
      // Auto-select first board if none selected
      if (!selectedBoardId && boardsList.length > 0) {
        setSelectedBoardId(boardsList[0].id);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      showError('فشل تحميل اللوحات');
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId, showError]);

  /**
   * Loads board details including columns, swimlanes, and tags.
   * 
   * @param {number} boardId - Board ID to load details for
   */
  const loadBoardDetails = useCallback(async (boardId) => {
    if (!boardId) return;
    
    try {
      const response = await getBoard(boardId);
      const boardData = response.data || {};
      
      setBoardColumns(boardData.columns || []);
      setBoardSwimlanes(boardData.swimlanes || []);
      setBoardTags(boardData.tags || []);
      setBoardUsers(boardData.users || []);
    } catch (error) {
      console.error('Error loading board details:', error);
      showError('فشل تحميل تفاصيل اللوحة');
    }
  }, [showError]);

  /**
   * Broadcasts task change event to update all listening components.
   */
  const broadcastTasksChange = () => {
    window.dispatchEvent(new Event('tasks:changed'));
  };

  /**
   * Handles event click - opens task dialog for editing.
   * 
   * @param {Object} task - Task data from calendar event
   */
  const handleEventClick = useCallback((task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  }, []);

  /**
   * Handles date click - opens task dialog for creating new task.
   * 
   * @param {Date} date - Selected date from calendar
   */
  const handleDateClick = useCallback((date) => {
    if (boardColumns.length === 0) {
      showError('يرجى اختيار لوحة أولاً');
      return;
    }
    
    setEditingTask({
      title: '',
      description: '',
      column_id: boardColumns[0]?.id || '',
      swimlane_id: null,
      priority: 'medium',
      due_date: date,
      tags: [],
      subtasks: [],
      pinned: false,
    });
    setTaskDialogOpen(true);
  }, [boardColumns, showError]);

  /**
   * Handles FAB click - opens task dialog for creating new task.
   */
  const handleFabClick = () => {
    if (boardColumns.length === 0) {
      showError('يرجى اختيار لوحة أولاً');
      return;
    }
    
    setEditingTask({
      title: '',
      description: '',
      column_id: boardColumns[0]?.id || '',
      swimlane_id: null,
      priority: 'medium',
      due_date: new Date(),
      tags: [],
      subtasks: [],
      pinned: false,
    });
    setTaskDialogOpen(true);
  };

  /**
   * Handles task save - creates or updates task.
   * 
   * @param {Object} taskData - Task data to save
   */
  const handleSaveTask = async (taskData) => {
    const normalizedTask = {
      ...taskData,
      column_id: taskData.column_id || taskData.columnId,
    };

    if (!normalizedTask.column_id) {
      showError('يرجى اختيار عمود للمهمة');
      return;
    }

    try {
      if (normalizedTask.id) {
        await updateTask(normalizedTask.id, normalizedTask);
        showSuccess('تم تحديث المهمة');
      } else {
        await createTask(normalizedTask);
        showSuccess('تم إنشاء المهمة');
      }
      
      setTaskDialogOpen(false);
      setEditingTask(null);
      broadcastTasksChange();
    } catch (error) {
      console.error('Error saving task:', error);
      showError('فشل حفظ المهمة');
    }
  };

  /**
   * Handles task deletion.
   * 
   * @param {number} taskId - ID of task to delete
   */
  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      showSuccess('تم حذف المهمة');
      setTaskDialogOpen(false);
      setEditingTask(null);
      broadcastTasksChange();
    } catch (error) {
      console.error('Error deleting task:', error);
      showError('فشل حذف المهمة');
    }
  };

  /**
   * Handles board selection change.
   * 
   * @param {Event} event - Select change event
   */
  const handleBoardChange = (event) => {
    setSelectedBoardId(event.target.value);
  };

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  // Load board details when board selection changes
  useEffect(() => {
    if (selectedBoardId) {
      loadBoardDetails(selectedBoardId);
    }
  }, [selectedBoardId, loadBoardDetails]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700 }}>
            📅 التقويم
          </Typography>
        </Stack>
        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.9)', mt: 1 }}>
          عرض وإدارة المهام في التقويم
        </Typography>
      </Paper>

      {/* Board Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="medium" sx={{ maxWidth: 400 }}>
          <InputLabel id="calendar-board-select-label">اللوحة</InputLabel>
          <Select
            labelId="calendar-board-select-label"
            id="calendar-board-select"
            value={selectedBoardId || ''}
            label="اللوحة"
            onChange={handleBoardChange}
            disabled={loading || boards.length === 0}
          >
            {boards.map((board) => (
              <MenuItem key={board.id} value={board.id}>
                {board.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Calendar Component */}
      {selectedBoardId && (
        <TaskCalendar
          boardId={selectedBoardId}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
        />
      )}

      {/* No Board Selected Message */}
      {!selectedBoardId && !loading && boards.length > 0 && (
        <Paper
          elevation={1}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" color="text.secondary">
            يرجى اختيار لوحة لعرض المهام
          </Typography>
        </Paper>
      )}

      {/* No Boards Available Message */}
      {!loading && boards.length === 0 && (
        <Paper
          elevation={1}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" color="text.secondary">
            لا توجد لوحات متاحة
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            قم بإنشاء لوحة أولاً لعرض المهام في التقويم
          </Typography>
        </Paper>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add task"
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
        }}
        onClick={handleFabClick}
        disabled={!selectedBoardId || boardColumns.length === 0}
      >
        <AddIcon />
      </Fab>

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        task={editingTask}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        availableColumns={boardColumns}
        availableSwimlanes={boardSwimlanes}
        availableTags={boardTags}
        availableUsers={boardUsers}
      />
    </Box>
  );
};

export default Calendar;
