import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import dayjs from 'dayjs';

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const RoutineDialog = ({ open, onClose, onSave, initialValues, columns }) => {
  const columnOptions = useMemo(() => columns || [], [columns]);
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    columnId: columnOptions[0]?.id || '',
    startAt: dayjs().toISOString(),
    frequency: 'daily',
    interval: 1,
    occurrences: '',
    endDate: '',
    notificationLeadTime: 60,
    status: 'active',
  });

  useEffect(() => {
    if (initialValues) {
      setFormValues({
        title: initialValues.title || '',
        description: initialValues.description || '',
        columnId: initialValues.columnId || columnOptions[0]?.id || '',
        startAt: initialValues.dueDate || dayjs().toISOString(),
        frequency: initialValues.recurringRule?.frequency || 'daily',
        interval: initialValues.recurringRule?.interval || 1,
        occurrences: initialValues.recurringRule?.maxOccurrences || '',
        endDate: initialValues.recurringRule?.endDate || '',
        notificationLeadTime: initialValues.recurringRule?.notificationLeadTime || 60,
        status: initialValues.recurringRule?.status || 'active',
      });
    } else {
      setFormValues(prev => ({
        ...prev,
        columnId: columnOptions[0]?.id || prev.columnId,
      }));
    }
  }, [initialValues, columnOptions]);

  const handleChange = (field) => (event) => {
    setFormValues(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = () => {
    onSave({
      ...formValues,
      occurrences: formValues.occurrences ? Number(formValues.occurrences) : undefined,
      interval: formValues.interval ? Number(formValues.interval) : 1,
      notificationLeadTime: formValues.notificationLeadTime ? Number(formValues.notificationLeadTime) : 60,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{initialValues ? 'Edit Routine' : 'Add New Routine'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Title"
              value={formValues.title}
              onChange={handleChange('title')}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="routine-column-label">Column</InputLabel>
              <Select
                labelId="routine-column-label"
                label="Column"
                value={formValues.columnId}
                onChange={handleChange('columnId')}
              >
                {columnOptions.map(column => (
                  <MenuItem key={column.id} value={column.id}>{column.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formValues.description}
              onChange={handleChange('description')}
              multiline
              minRows={3}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Start Time"
              type="datetime-local"
              value={dayjs(formValues.startAt).format('YYYY-MM-DDTHH:mm')}
              onChange={(event) => setFormValues(prev => ({ ...prev, startAt: dayjs(event.target.value).toISOString() }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Notification lead time (minutes)"
              type="number"
              value={formValues.notificationLeadTime}
              onChange={handleChange('notificationLeadTime')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="routine-frequency-label">Frequency</InputLabel>
              <Select
                labelId="routine-frequency-label"
                label="Frequency"
                value={formValues.frequency}
                onChange={handleChange('frequency')}
              >
                {frequencyOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Interval"
              type="number"
              value={formValues.interval}
              onChange={handleChange('interval')}
              helperText="How often to repeat"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Max occurrences"
              type="number"
              value={formValues.occurrences}
              onChange={handleChange('occurrences')}
              helperText="Leave blank for ongoing"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="End date"
              type="date"
              value={formValues.endDate ? dayjs(formValues.endDate).format('YYYY-MM-DD') : ''}
              onChange={(event) => setFormValues(prev => ({ ...prev, endDate: event.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="routine-status-label">Status</InputLabel>
              <Select
                labelId="routine-status-label"
                label="Status"
                value={formValues.status}
                onChange={handleChange('status')}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save Routine</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoutineDialog;
