// @ts-nocheck
/**
 * @fileoverview Time Block Dialog Component
 * Create and edit time blocks
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Box
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../../utils/config';

const CATEGORIES = [
  'general',
  'deep_work',
  'meeting',
  'admin',
  'break',
  'learning',
  'creative',
  'planning'
];

const COLORS = [
  { name: 'Blue', value: '#3498db' },
  { name: 'Green', value: '#2ecc71' },
  { name: 'Red', value: '#e74c3c' },
  { name: 'Orange', value: '#e67e22' },
  { name: 'Purple', value: '#9b59b6' },
  { name: 'Teal', value: '#1abc9c' },
  { name: 'Yellow', value: '#f1c40f' }
];

interface TimeBlock {
  id?: number;
  title?: string;
  description?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  color?: string;
  category?: string;
  energy_required?: string;
  focus_level?: string;
  notes?: string;
  [key: string]: any;
}

interface ChronosSettings {
  work_hours_start?: string;
  work_hours_end?: string;
  [key: string]: any;
}

interface TimeBlockDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  block?: TimeBlock | null;
  settings?: ChronosSettings | null;
}

function TimeBlockDialog({ open, onClose, onSave, block, settings }: TimeBlockDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    color: '#3498db',
    category: 'general',
    energy_required: 'medium',
    focus_level: 'normal',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (block) {
      setFormData(f => ({
        ...f,
        ...block
      }));
    }
  }, [block]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (block?.id) {
        // Update existing block
        await axios.put(
          `${API_URL}/api/chronos/time-blocks/${block.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new block
        await axios.post(
          `${API_URL}/api/chronos/time-blocks`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      onSave();
    } catch (error: any) {
      console.error('Error saving time block:', error);
      alert(error.response?.data?.error || 'Failed to save time block');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!block?.id || !window.confirm('Delete this time block?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/chronos/time-blocks/${block.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSave();
    } catch (error) {
      console.error('Error deleting time block:', error);
      alert('Failed to delete time block');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {block?.id ? 'Edit Time Block' : 'Create Time Block'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                fullWidth
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <TextField
                label="Start Time"
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6} sm={4}>
              <TextField
                label="End Time"
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange('end_time', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  label="Category"
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Color</InputLabel>
                <Select
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  label="Color"
                >
                  {COLORS.map((color) => (
                    <MenuItem key={color.value} value={color.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            bgcolor: color.value,
                            borderRadius: 1
                          }}
                        />
                        {color.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Energy Required</InputLabel>
                <Select
                  value={formData.energy_required}
                  onChange={(e) => handleChange('energy_required', e.target.value)}
                  label="Energy Required"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Focus Level</InputLabel>
                <Select
                  value={formData.focus_level}
                  onChange={(e) => handleChange('focus_level', e.target.value)}
                  label="Focus Level"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="deep">Deep Focus</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        {block?.id && (
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        )}
        <Box flex={1} />
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TimeBlockDialog;
