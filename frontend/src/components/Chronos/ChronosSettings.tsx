/**
 * @fileoverview Chronos Settings Dialog Component
 * User preferences for time management
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
  Box
} from '@mui/material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function ChronosSettings({ open, onClose, settings, onSettingsUpdated }) {
  const [formData, setFormData] = useState({
    work_hours_start: '09:00',
    work_hours_end: '17:00',
    default_block_duration: 60,
    default_break_duration: 15,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break: 15,
    auto_schedule_enabled: false,
    conflict_warnings_enabled: true,
    buffer_time_enabled: true,
    default_buffer_minutes: 5,
    focus_mode_default: false,
    break_reminders_enabled: true,
    idle_timeout_minutes: 5
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        work_hours_start: settings.work_hours_start || '09:00',
        work_hours_end: settings.work_hours_end || '17:00',
        default_block_duration: settings.default_block_duration || 60,
        default_break_duration: settings.default_break_duration || 15,
        pomodoro_work_duration: settings.pomodoro_work_duration || 25,
        pomodoro_break_duration: settings.pomodoro_break_duration || 5,
        pomodoro_long_break: settings.pomodoro_long_break || 15,
        auto_schedule_enabled: Boolean(settings.auto_schedule_enabled),
        conflict_warnings_enabled: Boolean(settings.conflict_warnings_enabled),
        buffer_time_enabled: Boolean(settings.buffer_time_enabled),
        default_buffer_minutes: settings.default_buffer_minutes || 5,
        focus_mode_default: Boolean(settings.focus_mode_default),
        break_reminders_enabled: Boolean(settings.break_reminders_enabled),
        idle_timeout_minutes: settings.idle_timeout_minutes || 5
      });
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/chronos/settings`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSettingsUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Chronos Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Work Hours
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <TextField
                label="Start Time"
                type="time"
                value={formData.work_hours_start}
                onChange={(e) => handleChange('work_hours_start', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="End Time"
                type="time"
                value={formData.work_hours_end}
                onChange={(e) => handleChange('work_hours_end', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Default Durations (minutes)
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <TextField
                label="Block Duration"
                type="number"
                value={formData.default_block_duration}
                onChange={(e) => handleChange('default_block_duration', parseInt(e.target.value))}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Break Duration"
                type="number"
                value={formData.default_break_duration}
                onChange={(e) => handleChange('default_break_duration', parseInt(e.target.value))}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Pomodoro Settings
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <TextField
                label="Work Duration"
                type="number"
                value={formData.pomodoro_work_duration}
                onChange={(e) => handleChange('pomodoro_work_duration', parseInt(e.target.value))}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Short Break"
                type="number"
                value={formData.pomodoro_break_duration}
                onChange={(e) => handleChange('pomodoro_break_duration', parseInt(e.target.value))}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Long Break"
                type="number"
                value={formData.pomodoro_long_break}
                onChange={(e) => handleChange('pomodoro_long_break', parseInt(e.target.value))}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Buffer Time
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.buffer_time_enabled}
                    onChange={(e) => handleChange('buffer_time_enabled', e.target.checked)}
                  />
                }
                label="Enable automatic buffer time between blocks"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Default Buffer (minutes)"
                type="number"
                value={formData.default_buffer_minutes}
                onChange={(e) => handleChange('default_buffer_minutes', parseInt(e.target.value))}
                fullWidth
                disabled={!formData.buffer_time_enabled}
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Features
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.conflict_warnings_enabled}
                    onChange={(e) => handleChange('conflict_warnings_enabled', e.target.checked)}
                  />
                }
                label="Warn about conflicting time blocks"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.auto_schedule_enabled}
                    onChange={(e) => handleChange('auto_schedule_enabled', e.target.checked)}
                  />
                }
                label="Enable AI-powered auto-scheduling"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.break_reminders_enabled}
                    onChange={(e) => handleChange('break_reminders_enabled', e.target.checked)}
                  />
                }
                label="Enable break reminders"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.focus_mode_default}
                    onChange={(e) => handleChange('focus_mode_default', e.target.checked)}
                  />
                }
                label="Enable Focus Mode by default"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Idle Detection
          </Typography>
          <TextField
            label="Idle Timeout (minutes)"
            type="number"
            value={formData.idle_timeout_minutes}
            onChange={(e) => handleChange('idle_timeout_minutes', parseInt(e.target.value))}
            fullWidth
            helperText="Auto-pause timer after this many minutes of inactivity"
            inputProps={{ min: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ChronosSettings;
