/**
 * @fileoverview TaskCard component for displaying individual tasks
 * @module modules/itasks/components
 */

import React from 'react';
import { Paper, Typography, Stack, Chip, Box } from '@mui/material';
import {
  BugReport,
  Lightbulb,
  Description,
  BuildCircle,
  HelpOutline,
} from '@mui/icons-material';
import type { TaskWithEisenhower } from '../types';

const LABEL_ICONS: Record<string, React.ReactNode> = {
  bug: <BugReport />,
  feature: <Lightbulb />,
  documentation: <Description />,
  enhancement: <BuildCircle />,
  question: <HelpOutline />,
};

const LABEL_COLORS: Record<string, string> = {
  bug: '#e74c3c',
  feature: '#3498db',
  documentation: '#9b59b6',
  enhancement: '#1abc9c',
  question: '#f39c12',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#95a5a6',
  todo: '#3498db',
  'in progress': '#f39c12',
  done: '#27ae60',
};

interface TaskCardProps {
  task: TaskWithEisenhower;
  onEdit?: (task: TaskWithEisenhower) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  return (
    <Paper
      variant="outlined"
      draggable
      onDragStart={handleDragStart}
      sx={{
        p: 1.5,
        cursor: 'grab',
        '&:hover': { backgroundColor: 'action.hover' },
        '&:active': { cursor: 'grabbing' },
      }}
    >
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight="medium">
          {task.title}
        </Typography>

        {task.description && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {task.description}
          </Typography>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            size="small"
            label={task.status}
            sx={{
              backgroundColor: STATUS_COLORS[task.status] || '#95a5a6',
              color: 'white',
              fontSize: '0.7rem',
            }}
          />
          {task.label && (
            <Chip
              size="small"
              icon={
                <Box sx={{ color: 'white', display: 'flex', alignItems: 'center' }}>
                  {LABEL_ICONS[task.label]}
                </Box>
              }
              label={task.label}
              sx={{
                backgroundColor: LABEL_COLORS[task.label] || '#95a5a6',
                color: 'white',
                fontSize: '0.7rem',
              }}
            />
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};
