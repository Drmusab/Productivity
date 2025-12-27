/**
 * @fileoverview TaskCalendar component integrating FullCalendar with task management.
 * Provides a comprehensive calendar view with multiple layouts, RTL support, and theming.
 * @module components/Calendar/TaskCalendar
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Box, Paper, useTheme as useMuiTheme, CircularProgress, useMediaQuery } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { useTheme } from '../../contexts/ThemeContext';
import { getCalendarEvents } from '../../services/calendarService';
import { updateTask } from '../../services/taskService';
import { useNotification } from '../../contexts/NotificationContext';

interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  column_id?: number;
  swimlane_id?: number;
  assigned_to?: number;
  pinned?: boolean;
  tags?: string[];
  subtasks?: any[];
  recurring_rule?: string;
}

interface TaskCalendarProps {
  boardId?: number;
  onEventClick?: (task: Task) => void;
  onDateClick?: (date: Date) => void;
}

/**
 * TaskCalendar component that displays tasks in a FullCalendar view.
 * 
 * @param {Object} props - Component properties
 * @param {number} [props.boardId] - Board ID to filter events
 * @param {Function} props.onEventClick - Callback when an event is clicked
 * @param {Function} props.onDateClick - Callback when a date is clicked
 * @returns {JSX.Element} TaskCalendar component
 */
const TaskCalendar: React.FC<TaskCalendarProps> = ({ boardId, onEventClick, onDateClick }) => {
  const calendarRef = useRef<FullCalendar>(null);
  const muiTheme = useMuiTheme();
  const { mode } = useTheme();
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(false);
  const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('md'));

  /**
   * Fetches calendar events from the API based on visible date range.
   * 
   * @param {Object} fetchInfo - FullCalendar fetch info object
   * @param {Function} successCallback - Callback to pass events to FullCalendar
   * @param {Function} failureCallback - Callback on failure
   */
  const fetchEvents = useCallback(
    async (fetchInfo: any, successCallback: (events: any[]) => void, failureCallback: (error: any) => void) => {
      try {
        setLoading(true);
        const params: any = {
          start: fetchInfo.startStr,
          end: fetchInfo.endStr,
        };
        
        if (boardId) {
          params.boardId = boardId;
        }
        
        const response = await getCalendarEvents(params);
        const fetchedEvents = response.data || [];
        
        successCallback(fetchedEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        showError('فشل تحميل الأحداث');
        failureCallback(error);
      } finally {
        setLoading(false);
      }
    },
    [boardId, showError]
  );

  /**
   * Handles event click - opens task dialog for editing.
   * 
   * @param {Object} info - FullCalendar event click info
   */
  const handleEventClick = useCallback(
    (info: any) => {
      const taskId = parseInt(info.event.id, 10);
      const extendedProps = info.event.extendedProps;
      
      // Build task object from event data
      const task: Task = {
        id: taskId,
        title: info.event.title.replace('📌 ', ''), // Remove pin emoji
        description: extendedProps.description,
        due_date: info.event.start?.toISOString(),
        priority: extendedProps.priority,
        column_id: extendedProps.columnId,
        swimlane_id: extendedProps.swimlaneId,
        assigned_to: extendedProps.assignedTo,
        pinned: extendedProps.pinned,
        tags: extendedProps.tags,
        subtasks: extendedProps.subtasks,
        recurring_rule: extendedProps.recurringRule,
      };
      
      if (onEventClick) {
        onEventClick(task);
      }
    },
    [onEventClick]
  );

  /**
   * Handles date click - opens task dialog for creating new task.
   * 
   * @param {Object} info - FullCalendar date click info
   */
  const handleDateClick = useCallback(
    (info: any) => {
      if (onDateClick) {
        onDateClick(info.date);
      }
    },
    [onDateClick]
  );

  /**
   * Handles event drop (drag and drop) - updates task due date.
   * 
   * @param {Object} info - FullCalendar event drop info
   */
  const handleEventDrop = useCallback(
    async (info: any) => {
      try {
        const taskId = parseInt(info.event.id, 10);
        const newDueDate = info.event.start;
        
        await updateTask(taskId, {
          due_date: newDueDate.toISOString(),
        });
        
        showSuccess('تم تحديث تاريخ المهمة');
        
        // Broadcast change to other components
        window.dispatchEvent(new Event('tasks:changed'));
      } catch (error) {
        console.error('Error updating task due date:', error);
        showError('فشل تحديث تاريخ المهمة');
        info.revert(); // Revert the change on error
      }
    },
    [showError, showSuccess]
  );

  /**
   * Handles event resize - updates task due date.
   * 
   * @param {Object} info - FullCalendar event resize info
   */
  const handleEventResize = useCallback(
    async (info: any) => {
      try {
        const taskId = parseInt(info.event.id, 10);
        const newDueDate = info.event.start;
        
        await updateTask(taskId, {
          due_date: newDueDate.toISOString(),
        });
        
        showSuccess('تم تحديث تاريخ المهمة');
        
        // Broadcast change to other components
        window.dispatchEvent(new Event('tasks:changed'));
      } catch (error) {
        console.error('Error updating task due date:', error);
        showError('فشل تحديث تاريخ المهمة');
        info.revert(); // Revert the change on error
      }
    },
    [showError, showSuccess]
  );

  /**
   * Refreshes calendar events when external changes occur.
   */
  useEffect(() => {
    const handleTasksChanged = () => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.refetchEvents();
      }
    };

    window.addEventListener('tasks:changed', handleTasksChanged);
    return () => {
      window.removeEventListener('tasks:changed', handleTasksChanged);
    };
  }, []);

  /**
   * Keep events in sync when the selected board changes.
   */
  useEffect(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.refetchEvents();
    }
  }, [boardId]);

  // Calendar styling based on theme
  const calendarStyles = {
    // Calendar container
    '& .fc': {
      fontFamily: muiTheme.typography.fontFamily,
      direction: 'rtl',
    },
    
    // Toolbar
    '& .fc .fc-toolbar-title': {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: muiTheme.palette.text.primary,
    },
    '& .fc .fc-button': {
      backgroundColor: muiTheme.palette.primary.main,
      borderColor: muiTheme.palette.primary.main,
      color: '#fff',
      textTransform: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      fontWeight: 500,
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: muiTheme.palette.primary.dark,
        transform: 'translateY(-1px)',
      },
      '&:disabled': {
        opacity: 0.5,
      },
    },
    '& .fc .fc-button-primary:not(:disabled).fc-button-active': {
      backgroundColor: muiTheme.palette.primary.dark,
    },
    
    // Day headers
    '& .fc .fc-col-header-cell': {
      backgroundColor: mode === 'light' ? '#f8fafc' : '#1e293b',
      borderColor: muiTheme.palette.divider,
      padding: '12px 8px',
      fontWeight: 600,
      color: muiTheme.palette.text.primary,
    },
    
    // Day cells
    '& .fc .fc-daygrid-day': {
      backgroundColor: muiTheme.palette.background.paper,
      borderColor: muiTheme.palette.divider,
      '&:hover': {
        backgroundColor: mode === 'light' ? '#f1f5f9' : '#334155',
      },
    },
    '& .fc .fc-daygrid-day-number': {
      color: muiTheme.palette.text.primary,
      padding: '8px',
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    '& .fc .fc-daygrid-day.fc-day-today': {
      backgroundColor: mode === 'light' ? '#e0e7ff' : '#312e81',
      '& .fc-daygrid-day-number': {
        color: muiTheme.palette.primary.main,
        fontWeight: 700,
      },
    },
    '& .fc .fc-day-other .fc-daygrid-day-number': {
      opacity: 0.4,
    },
    
    // Events
    '& .fc-event': {
      cursor: 'pointer',
      borderRadius: '6px',
      padding: '2px 6px',
      fontSize: '0.813rem',
      fontWeight: 500,
      border: 'none',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        transform: 'scale(1.02)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      },
    },
    '& .fc-event-title': {
      fontWeight: 500,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    
    // Time grid
    '& .fc .fc-timegrid-slot': {
      height: '3em',
      borderColor: muiTheme.palette.divider,
    },
    '& .fc .fc-timegrid-axis': {
      color: muiTheme.palette.text.secondary,
    },
    
    // List view
    '& .fc-list': {
      borderColor: muiTheme.palette.divider,
    },
    '& .fc-list-event': {
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: mode === 'light' ? '#f1f5f9' : '#334155',
      },
    },
    '& .fc-list-event-title': {
      color: muiTheme.palette.text.primary,
    },
    '& .fc-list-event-time': {
      color: muiTheme.palette.text.secondary,
    },
    '& .fc-list-day-cushion': {
      backgroundColor: mode === 'light' ? '#f8fafc' : '#1e293b',
    },
    
    // Scrollbar styling
    '& .fc-scroller': {
      '&::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: mode === 'light' ? '#f1f5f9' : '#1e293b',
      },
      '&::-webkit-scrollbar-thumb': {
        background: mode === 'light' ? '#cbd5e1' : '#475569',
        borderRadius: '4px',
        '&:hover': {
          background: mode === 'light' ? '#94a3b8' : '#64748b',
        },
      },
    },
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 3,
        position: 'relative',
        overflowX: 'auto',
        ...calendarStyles
      }}
      aria-label="تقويم المهام"
      aria-busy={loading}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            zIndex: 10,
            borderRadius: 3,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: isSmallScreen ? 'dayGridMonth,timeGridWeek,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        buttonText={{
          today: 'اليوم',
          month: 'شهر',
          week: 'أسبوع',
          day: 'يوم',
          list: 'قائمة',
        }}
        locale="ar"
        direction="rtl"
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={fetchEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        height="auto"
        contentHeight="auto"
        aspectRatio={isSmallScreen ? 1 : 1.8}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false,
        }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false,
        }}
        firstDay={6} // Saturday as first day for Arabic calendar
        eventDisplay="block"
        displayEventTime={true}
        displayEventEnd={false}
        navLinks={true}
        nowIndicator={true}
      />
    </Paper>
  );
};

export default TaskCalendar;
