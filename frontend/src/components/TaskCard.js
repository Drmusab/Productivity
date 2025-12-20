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
  Tooltip
} from '@mui/material';
import {
  MoreVert,
  PushPin,
  CalendarToday,
  SubdirectoryArrowRight
} from '@mui/icons-material';
import { format } from 'date-fns';
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return '#e74c3c';
      case 'high':
        return '#e67e22';
      case 'medium':
        return '#f39c12';
      case 'low':
        return '#2ecc71';
      default:
        return '#95a5a6';
    }
  };

  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

  return (
    <>
    <Card
      sx={{
        cursor: 'pointer',
        border: task.pinned ? '2px solid #3498db' : '1px solid #e0e0e0',
        backgroundColor: task.pinned ? '#f8f9fa' : 'white',
        '&:hover': {
          boxShadow: 3
        }
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
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, pr: 1 }}>
            {task.title}
            {task.pinned && <PushPin sx={{ fontSize: 16, ml: 1, color: '#3498db' }} />}
          </Typography>
          <IconButton 
            size="small" 
            onClick={handleMenuClick}
            aria-label="Task options"
            aria-haspopup="true"
          >
            <MoreVert />
          </IconButton>
        </Box>
        
        {task.description && (
          <Box sx={{ mt: 1 }}>
            {!showDescription ? (
              <Typography variant="body2" color="text.secondary">
                {task.description.substring(0, 100)}
                {task.description.length > 100 && '...'}
                {task.description.length > 100 && (
                  <Box
                    component="span"
                    sx={{ color: 'primary.main', cursor: 'pointer', ml: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDescription(true);
                    }}
                  >
                    Show more
                  </Box>
                )}
              </Typography>
            ) : (
              <Box>
                <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {task.description}
                  </ReactMarkdown>
                </Box>
                <Box
                  component="span"
                  sx={{ color: 'primary.main', cursor: 'pointer', fontSize: '0.875rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDescription(false);
                  }}
                >
                  Show less
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={task.priority}
              size="small"
              sx={{
                backgroundColor: getPriorityColor(task.priority),
                color: 'white',
                fontWeight: 'bold',
                mr: 1
              }}
            />
            
            {task.due_date && (
              <Tooltip title={`Due: ${format(new Date(task.due_date), 'PPP p')}`}>
                <Chip
                  icon={<CalendarToday sx={{ fontSize: 14 }} />}
                  label={format(new Date(task.due_date), 'MMM dd')}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
              </Tooltip>
            )}
            
            {task.assigned_to_name && (
              <Tooltip title={`Assigned to: ${task.assigned_to_name}`}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', mr: 1 }}>
                  {task.assigned_to_name.charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            )}
          </Box>
          
          {totalSubtasks > 0 && (
            <Chip
              icon={<SubdirectoryArrowRight sx={{ fontSize: 14 }} />}
              label={`${completedSubtasks}/${totalSubtasks}`}
              size="small"
              variant="outlined"
              color={completedSubtasks === totalSubtasks ? 'success' : 'default'}
            />
          )}
        </Box>
        
        {task.tags && task.tags.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {task.tags.map(tag => (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                sx={{
                  backgroundColor: tag.color + '20',
                  color: tag.color,
                  border: `1px solid ${tag.color}`,
                  fontSize: '0.7rem'
                }}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        aria-label="Task actions menu"
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <Divider />
        {onDuplicate && <MenuItem onClick={handleDuplicate}>Duplicate</MenuItem>}
        <Divider />
        {onDelete && <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>}
      </Menu>
      
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        dangerous={true}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default TaskCard;