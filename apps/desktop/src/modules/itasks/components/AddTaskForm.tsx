/**
 * @fileoverview Add Task Form component for creating new iTasks
 * @module modules/itasks/components
 */

import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import type { ITask, ITasksPriority, ITasksStatus, ITasksLabel } from '../types';

interface AddTaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<ITask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const AddTaskForm: React.FC<AddTaskFormProps> = ({ open, onClose, onSubmit }) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<ITasksStatus>('todo');
  const [priority, setPriority] = React.useState<ITasksPriority>('not-important');
  const [label, setLabel] = React.useState<ITasksLabel | ''>('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        label: label || undefined,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('not-important');
      setLabel('');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('not-important');
      setLabel('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              required
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description (supports [[wikilinks]])"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              helperText="Use [[Note Title]] to link to notes"
            />

            <FormControl fullWidth disabled={submitting}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value as ITasksStatus)}
              >
                <MenuItem value="backlog">Backlog</MenuItem>
                <MenuItem value="todo">Todo</MenuItem>
                <MenuItem value="in progress">In Progress</MenuItem>
                <MenuItem value="done">Done</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={submitting}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                label="Priority"
                onChange={(e) => setPriority(e.target.value as ITasksPriority)}
              >
                <MenuItem value="urgent">Urgent (Do First)</MenuItem>
                <MenuItem value="important">Important (Schedule)</MenuItem>
                <MenuItem value="not-urgent">Not Urgent (Delegate)</MenuItem>
                <MenuItem value="not-important">Not Important (Eliminate)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={submitting}>
              <InputLabel>Label</InputLabel>
              <Select
                value={label}
                label="Label"
                onChange={(e) => setLabel(e.target.value as ITasksLabel | '')}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="bug">Bug</MenuItem>
                <MenuItem value="feature">Feature</MenuItem>
                <MenuItem value="documentation">Documentation</MenuItem>
                <MenuItem value="enhancement">Enhancement</MenuItem>
                <MenuItem value="question">Question</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting || !title.trim()}
            startIcon={<Add />}
          >
            {submitting ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
