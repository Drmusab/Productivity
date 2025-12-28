/**
 * @fileoverview Eisenhower Matrix component for iTasks
 * @module modules/itasks/components
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Paper,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search, Warning, Schedule, Person, Delete } from '@mui/icons-material';
import type { TaskWithEisenhower, EisenhowerQuadrant } from '../types';
import { TaskCard } from './TaskCard';

interface QuadrantConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const QUADRANTS: Record<EisenhowerQuadrant, QuadrantConfig> = {
  do_first: {
    label: 'Do First',
    color: '#e74c3c',
    icon: <Warning />,
    description: 'Urgent & Important',
  },
  schedule: {
    label: 'Schedule',
    color: '#3498db',
    icon: <Schedule />,
    description: 'Important, Not Urgent',
  },
  delegate: {
    label: 'Delegate',
    color: '#f39c12',
    icon: <Person />,
    description: 'Urgent, Not Important',
  },
  eliminate: {
    label: 'Eliminate',
    color: '#95a5a6',
    icon: <Delete />,
    description: 'Neither',
  },
};

interface EisenhowerMatrixProps {
  tasks: TaskWithEisenhower[];
  onTaskUpdate?: (id: string, quadrant: EisenhowerQuadrant) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({ tasks, onTaskUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTasks, setFilteredTasks] = useState(tasks);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTasks(tasks);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredTasks(
        tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(term) ||
            task.description?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, tasks]);

  const getQuadrantTasks = (quadrant: EisenhowerQuadrant) => {
    return filteredTasks.filter((task) => task.quadrant === quadrant);
  };

  const handleDrop = (quadrant: EisenhowerQuadrant, taskId: string) => {
    if (onTaskUpdate) {
      onTaskUpdate(taskId, quadrant);
    }
  };

  const renderQuadrant = (quadrant: EisenhowerQuadrant) => {
    const config = QUADRANTS[quadrant];
    const quadrantTasks = getQuadrantTasks(quadrant);

    return (
      <Card
        sx={{
          borderTop: `4px solid ${config.color}`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const taskId = e.dataTransfer.getData('taskId');
          if (taskId) {
            handleDrop(quadrant, taskId);
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <Box sx={{ color: config.color }}>{config.icon}</Box>
            <Typography variant="h6" fontWeight="bold">
              {config.label}
            </Typography>
            <Chip
              size="small"
              label={quadrantTasks.length}
              sx={{ backgroundColor: config.color, color: 'white' }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {config.description}
          </Typography>
          <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '400px' }}>
            {quadrantTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center" py={4}>
                No tasks in this quadrant
              </Typography>
            ) : (
              <Stack spacing={1}>
                {quadrantTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Eisenhower Matrix Grid */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          {renderQuadrant('do_first')}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderQuadrant('schedule')}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderQuadrant('delegate')}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderQuadrant('eliminate')}
        </Grid>
      </Grid>
    </Box>
  );
};
