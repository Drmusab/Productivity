import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';

const ColumnDialog = ({ open, column, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3498db',
    icon: '',
    position: 0
  });

  useEffect(() => {
    if (column) {
      setFormData(column);
    } else {
      setFormData({
        name: '',
        color: '#3498db',
        icon: '',
        position: 0
      });
    }
  }, [column, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const predefinedColors = [
    '#e74c3c', '#e67e22', '#f39c12', '#f1c40f',
    '#2ecc71', '#1abc9c', '#3498db', '#9b59b6',
    '#34495e', '#7f8c8d', '#bdc3c7', '#ecf0f1'
  ];

  const predefinedIcons = [
    'clipboard-list', 'spinner', 'eye', 'check-circle',
    'clock', 'flag', 'star', 'heart',
    'bell', 'bookmark', 'tag', 'folder'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {column?.id ? 'Edit Column' : 'Create New Column'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            name="name"
            label="Name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Color</InputLabel>
            <Select
              name="color"
              value={formData.color}
              onChange={handleChange}
              label="Color"
            >
              {predefinedColors.map(color => (
                <MenuItem key={color} value={color}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: color,
                        borderRadius: '50%',
                        mr: 1
                      }}
                    />
                    {color}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Icon</InputLabel>
            <Select
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              label="Icon"
            >
              <MenuItem value="">None</MenuItem>
              {predefinedIcons.map(icon => (
                <MenuItem key={icon} value={icon}>
                  {icon}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            name="position"
            label="Position"
            type="number"
            value={formData.position}
            onChange={handleChange}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          {column?.id ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnDialog;