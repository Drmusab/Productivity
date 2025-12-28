/**
 * @fileoverview TaskTable component for displaying tasks in a table format
 * @module modules/itasks/components
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Select,
  MenuItem,
  Stack,
  Box,
} from '@mui/material';
import { Edit, Delete, ContentCopy, Save, Cancel } from '@mui/icons-material';
import type { TaskWithEisenhower, ITasksPriority, ITasksStatus, ITasksLabel } from '../types';

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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#e74c3c',
  important: '#3498db',
  'not-urgent': '#f39c12',
  'not-important': '#95a5a6',
};

interface TaskTableProps {
  tasks: TaskWithEisenhower[];
  onUpdate: (id: string, updates: Partial<TaskWithEisenhower>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TaskWithEisenhower>>({});

  const handleEditStart = (task: TaskWithEisenhower) => {
    setEditingId(task.id);
    setEditValues({
      title: task.title,
      status: task.status,
      priority: task.priority,
      label: task.label,
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleEditSave = (id: string) => {
    onUpdate(id, editValues);
    setEditingId(null);
    setEditValues({});
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Label</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No tasks found. Create your first task to get started!
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => {
              const isEditing = editingId === task.id;
              return (
                <TableRow key={task.id} hover>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        fullWidth
                        size="small"
                        value={editValues.title || ''}
                        onChange={(e) =>
                          setEditValues({ ...editValues, title: e.target.value })
                        }
                      />
                    ) : (
                      task.title
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        size="small"
                        value={editValues.status || task.status}
                        onChange={(e) =>
                          setEditValues({ ...editValues, status: e.target.value as ITasksStatus })
                        }
                      >
                        <MenuItem value="backlog">Backlog</MenuItem>
                        <MenuItem value="todo">Todo</MenuItem>
                        <MenuItem value="in progress">In Progress</MenuItem>
                        <MenuItem value="done">Done</MenuItem>
                      </Select>
                    ) : (
                      <Chip
                        size="small"
                        label={task.status}
                        sx={{
                          backgroundColor: STATUS_COLORS[task.status],
                          color: 'white',
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        size="small"
                        value={editValues.priority || task.priority}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            priority: e.target.value as ITasksPriority,
                          })
                        }
                      >
                        <MenuItem value="urgent">Urgent</MenuItem>
                        <MenuItem value="important">Important</MenuItem>
                        <MenuItem value="not-urgent">Not Urgent</MenuItem>
                        <MenuItem value="not-important">Not Important</MenuItem>
                      </Select>
                    ) : (
                      <Chip
                        size="small"
                        label={task.priority}
                        sx={{
                          backgroundColor: PRIORITY_COLORS[task.priority],
                          color: 'white',
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        size="small"
                        value={editValues.label || task.label || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            label: (e.target.value as ITasksLabel) || undefined,
                          })
                        }
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value="bug">Bug</MenuItem>
                        <MenuItem value="feature">Feature</MenuItem>
                        <MenuItem value="documentation">Documentation</MenuItem>
                        <MenuItem value="enhancement">Enhancement</MenuItem>
                        <MenuItem value="question">Question</MenuItem>
                      </Select>
                    ) : task.label ? (
                      <Chip
                        size="small"
                        label={task.label}
                        sx={{
                          backgroundColor: LABEL_COLORS[task.label],
                          color: 'white',
                        }}
                      />
                    ) : (
                      <Box sx={{ color: 'text.secondary' }}>—</Box>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {isEditing ? (
                        <>
                          <Tooltip title="Save">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditSave(task.id)}
                            >
                              <Save />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel">
                            <IconButton size="small" onClick={handleEditCancel}>
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditStart(task)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Duplicate">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => onDuplicate(task.id)}
                            >
                              <ContentCopy />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onDelete(task.id)}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
