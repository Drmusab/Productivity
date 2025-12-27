// @ts-nocheck
/**
 * @fileoverview Planner Mode Component for Chronos
 * Weekly time blocking calendar with drag & drop
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  IconButton,
  Chip
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import TimeBlockDialog from './TimeBlockDialog';
import { API_URL } from '../../utils/config';

interface ChronosSettings {
  work_hours_start?: string;
  work_hours_end?: string;
  [key: string]: any;
}

interface PlannerModeProps {
  settings: ChronosSettings | null;
  onBlockCreated?: () => void;
}

function PlannerMode({ settings, onBlockCreated }: PlannerModeProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);

  useEffect(() => {
    fetchWeekBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  const fetchWeekBlocks = async () => {
    try {
      const token = localStorage.getItem('token');
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      
      const response = await axios.get(
        `${API_URL}/api/chronos/time-blocks?startDate=${format(currentWeekStart, 'yyyy-MM-dd')}&endDate=${format(weekEnd, 'yyyy-MM-dd')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTimeBlocks(response.data);
    } catch (error) {
      console.error('Error fetching time blocks:', error);
    }
  };

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleCreateBlock = (date: Date) => {
    setSelectedBlock({ date: format(date, 'yyyy-MM-dd') });
    setShowDialog(true);
  };

  const handleEditBlock = (block: any) => {
    setSelectedBlock(block);
    setShowDialog(true);
  };

  const handleBlockSaved = () => {
    setShowDialog(false);
    setSelectedBlock(null);
    fetchWeekBlocks();
    if (onBlockCreated) onBlockCreated();
  };

  const getBlocksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return timeBlocks.filter((block: any) => block.date === dateStr);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <Box>
      {/* Week Navigation */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={handlePrevWeek}>
              <PrevIcon />
            </IconButton>
            <Typography variant="h6">
              {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </Typography>
            <IconButton onClick={handleNextWeek}>
              <NextIcon />
            </IconButton>
          </Box>
          <Button onClick={handleToday} variant="outlined">
            Today
          </Button>
        </Box>
      </Paper>

      {/* Weekly Calendar Grid */}
      <Grid container spacing={2}>
        {weekDays.map((day, index) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          const dayBlocks = getBlocksForDate(day);

          return (
            <Grid item xs={12} sm={6} md={1.7} key={index}>
              <Paper
                sx={{
                  p: 2,
                  minHeight: 400,
                  bgcolor: isToday ? 'action.selected' : 'background.paper',
                  border: isToday ? 2 : 1,
                  borderColor: isToday ? 'primary.main' : 'divider'
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      {format(day, 'EEE')}
                    </Typography>
                    <Typography variant="h6">
                      {format(day, 'd')}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleCreateBlock(day)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box>
                  {dayBlocks.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" textAlign="center" sx={{ mt: 4 }}>
                      No blocks
                    </Typography>
                  ) : (
                    dayBlocks.map((block) => (
                      <Box
                        key={block.id}
                        onClick={() => handleEditBlock(block)}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: 1,
                          borderLeft: `4px solid ${block.color || '#3498db'}`,
                          bgcolor: 'background.default',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {block.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {block.start_time} - {block.end_time}
                        </Typography>
                        <Box mt={0.5}>
                          <Chip label={block.category} size="small" variant="outlined" />
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Time Block Dialog */}
      {showDialog && (
        <TimeBlockDialog
          open={showDialog}
          onClose={() => {
            setShowDialog(false);
            setSelectedBlock(null);
          }}
          onSave={handleBlockSaved}
          block={selectedBlock}
          settings={settings}
        />
      )}
    </Box>
  );
}

export default PlannerMode;
