import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Avatar,
  Tooltip,
  alpha
} from '@mui/material';
import {
  MoreVert,
  PushPin,
  CalendarToday,
  SubdirectoryArrowRight,
  Edit,
  ContentCopy,
  Delete,
  Flag
} from '@mui/icons-material';
import { format, isPast, isToday } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ConfirmDialog from './ConfirmDialog';

const TaskCard = ({ task, index, onEdit, onDelete, onDuplicate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    onEdit(task);
    handleMenuClose();
  };

  const handleDelete = () => {
    handleMenuClose();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(task);
    }
    handleMenuClose();
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      critical: { 
        color: '#ef4444', 
        bg: 'rgba(239, 68, 68, 0.1)', 
        border: 'rgba(239, 68, 68, 0.3)',
        label: 'حرج'
      },
      high: { 
        color: '#f97316', 
        bg: 'rgba(249, 115, 22, 0.1)', 
        border: 'rgba(249, 115, 22, 0.3)',
        label: 'عالي'
      },
      medium: { 
        color: '#eab308', 
        bg: 'rgba(234, 179, 8, 0.1)', 
        border: 'rgba(234, 179, 8, 0.3)',
        label: 'متوسط'
      },
      low: { 
        color: '#22c55e', 
        bg: 'rgba(34, 197, 94, 0.1)', 
        border: 'rgba(34, 197, 94, 0.3)',
        label: 'منخفض'
      },
    };
    return configs[priority] || { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.3)', label: priority };
  };

  const priorityConfig = getPriorityConfig(task.priority);
  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  return (
    <>
      <Card
        sx={{
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: task.pinned ? 'primary.main' : 'transparent',
          backgroundColor: 'white',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.light',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
            '& .task-menu-btn': {
              opacity: 1,
            },
          },
          '&::before': task.pinned ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          } : {},
        }}
        onClick={() => onEdit(task)}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${task.title}`}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit(task);
          }
        }}
      >
        {/* Priority indicator bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 4,
            height: '100%',
            backgroundColor: priorityConfig.color,
            opacity: 0.8,
          }}
        />
        
        <CardContent sx={{ p: 2.5, pr: 3.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ flex: 1, pr: 1 }}>
              <Typography 
                variant="subtitle1" 
                fontWeight={600}
                sx={{ 
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {task.pinned && (
                  <Tooltip title="مثبت">
                    <PushPin sx={{ fontSize: 16, color: 'primary.main' }} />
                  </Tooltip>
                )}
                {task.title}
              </Typography>
            </Box>
            <IconButton 
              className="task-menu-btn"
              size="small" 
              onClick={handleMenuClick}
              aria-label="Task options"
              aria-haspopup="true"
              sx={{
                opacity: 0.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  opacity: 1,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                },
              }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
          
          {task.description && (
            <Box sx={{ mb: 2 }}>
              {!showDescription ? (
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {task.description.substring(0, 80)}
                  {task.description.length > 80 && (
                    <>
                      {'...'}
                      <Box
                        component="span"
                        sx={{ 
                          color: 'primary.main', 
                          cursor: 'pointer', 
                          ml: 0.5,
                          fontWeight: 500,
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDescription(true);
                        }}
                      >
                        المزيد
                      </Box>
                    </>
                  )}
                </Typography>
              ) : (
                <Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.6 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {task.description}
                    </ReactMarkdown>
                  </Box>
                  <Box
                    component="span"
                    sx={{ 
                      color: 'primary.main', 
                      cursor: 'pointer', 
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDescription(false);
                    }}
                  >
                    أقل
                  </Box>
                </Box>
              )}
            </Box>
          )}
          
          {/* Chips row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: totalSubtasks > 0 ? 2 : 0 }}>
            {/* Priority chip */}
            <Chip
              icon={<Flag sx={{ fontSize: '14px !important' }} />}
              label={priorityConfig.label}
              size="small"
              sx={{
                height: 26,
                backgroundColor: priorityConfig.bg,
                color: priorityConfig.color,
                border: `1px solid ${priorityConfig.border}`,
                fontWeight: 600,
                fontSize: '0.75rem',
                '& .MuiChip-icon': {
                  color: priorityConfig.color,
                },
              }}
            />
            
            {/* Due date chip */}
            {task.due_date && (
              <Tooltip title={format(new Date(task.due_date), 'PPP p')}>
                <Chip
                  icon={<CalendarToday sx={{ fontSize: '14px !important' }} />}
                  label={format(new Date(task.due_date), 'MMM dd')}
                  size="small"
                  sx={{
                    height: 26,
                    backgroundColor: isOverdue 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : isDueToday 
                        ? 'rgba(234, 179, 8, 0.1)'
                        : 'rgba(99, 102, 241, 0.1)',
                    color: isOverdue 
                      ? '#ef4444' 
                      : isDueToday
                        ? '#d97706'
                        : '#6366f1',
                    border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.3)' : isDueToday ? 'rgba(234, 179, 8, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': {
                      color: isOverdue ? '#ef4444' : isDueToday ? '#d97706' : '#6366f1',
                    },
                  }}
                />
              </Tooltip>
            )}
            
            {/* Assigned user */}
            {task.assigned_to_name && (
              <Tooltip title={`مسند إلى: ${task.assigned_to_name}`}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      width: 26, 
                      height: 26, 
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    {task.assigned_to_name.charAt(0).toUpperCase()}
                  </Avatar>
                </Box>
              </Tooltip>
            )}
          </Box>
          
          {/* Subtasks progress */}
          {totalSubtasks > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SubdirectoryArrowRight sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    المهام الفرعية
                  </Typography>
                </Box>
                <Typography 
                  variant="caption" 
                  fontWeight={600}
                  color={completedSubtasks === totalSubtasks ? 'success.main' : 'text.secondary'}
                >
                  {completedSubtasks}/{totalSubtasks}
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${subtaskProgress}%`,
                    borderRadius: 2,
                    background: completedSubtasks === totalSubtasks 
                      ? 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          )}
          
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {task.tags.slice(0, 3).map(tag => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  sx={{
                    height: 22,
                    backgroundColor: alpha(tag.color, 0.12),
                    color: tag.color,
                    border: `1px solid ${alpha(tag.color, 0.3)}`,
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              ))}
              {task.tags.length > 3 && (
                <Chip
                  label={`+${task.tags.length - 3}`}
                  size="small"
                  sx={{
                    height: 22,
                    backgroundColor: 'rgba(0,0,0,0.06)',
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        aria-label="Task actions menu"
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 160,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.25,
              borderRadius: 1.5,
              mx: 1,
              my: 0.25,
              gap: 1.5,
              fontSize: '0.875rem',
            },
          },
        }}
      >
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ fontSize: 18, color: 'text.secondary' }} />
          تعديل
        </MenuItem>
        {onDuplicate && (
          <MenuItem onClick={handleDuplicate}>
            <ContentCopy sx={{ fontSize: 18, color: 'text.secondary' }} />
            تكرار
          </MenuItem>
        )}
        <Divider sx={{ my: 0.5 }} />
        {onDelete && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete sx={{ fontSize: 18 }} />
            حذف
          </MenuItem>
        )}
      </Menu>
      
      <ConfirmDialog
        open={showDeleteConfirm}
        title="حذف المهمة"
        message={`هل أنت متأكد من حذف "${task.title}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        cancelText="إلغاء"
        dangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default TaskCard;