// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import { Delete, Edit, Pause, PlayArrow } from '@mui/icons-material';
import dayjs from 'dayjs';

import { getBoard, getBoards } from '../services/boardService';
import { createRoutine, deleteRoutine, getRoutines, setRoutineStatus, updateRoutine } from '../services/routineService';
import RoutineDialog from '../components/RoutineDialog';
import { useNotification } from '../contexts/NotificationContext';

const formatSchedule = (routine) => {
  const { recurringRule, dueDate } = routine;
  if (!recurringRule) return 'No schedule';

  const base = `${recurringRule.frequency?.toUpperCase() || 'DAILY'} every ${recurringRule.interval || 1}x`;
  const start = dueDate ? dayjs(dueDate).format('MMM D, YYYY h:mm A') : 'No start date';
  const endPart = recurringRule.endDate ? ` until ${dayjs(recurringRule.endDate).format('MMM D, YYYY')}` : '';
  return `${base} starting ${start}${endPart}`;
};

const Routines = () => {
  const { showError, showSuccess } = useNotification();
  const [routines, setRoutines] = useState([]);
  const [columns, setColumns] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

  const activeRoutines = useMemo(() => routines.filter(r => (r.recurringRule?.status || 'active') === 'active'), [routines]);
  const pausedRoutines = useMemo(() => routines.filter(r => (r.recurringRule?.status || 'active') === 'paused'), [routines]);

  const broadcastRoutinesChange = () => {
    window.dispatchEvent(new Event('routines:changed'));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const routineResponse = await getRoutines();
        setRoutines(routineResponse.data);

        const boardResponse = await getBoards();
        const firstBoard = boardResponse.data?.[0];
        if (firstBoard?.id) {
          const detailedBoard = await getBoard(firstBoard.id);
          setColumns(detailedBoard.data?.columns || []);
        }
      } catch (error) {
        showError('Failed to load routines');
      }
    };

    load();
  }, [showError]);

  const refreshRoutines = async () => {
    try {
      const response = await getRoutines();
      setRoutines(response.data);
      broadcastRoutinesChange();
    } catch (error) {
      showError('Unable to refresh routines');
    }
  };

  const handleSaveRoutine = async (payload) => {
    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, payload);
        showSuccess('Routine updated');
      } else {
        await createRoutine(payload);
        showSuccess('Routine created');
      }
      setDialogOpen(false);
      setEditingRoutine(null);
      refreshRoutines();
    } catch (error) {
      showError('Unable to save routine');
    }
  };

  const handleDeleteRoutine = async (id) => {
    try {
      await deleteRoutine(id);
      showSuccess('Routine deleted');
      refreshRoutines();
    } catch (error) {
      showError('Unable to delete routine');
    }
  };

  const handleToggleStatus = async (routine) => {
    try {
      const nextStatus = (routine.recurringRule?.status || 'active') === 'active' ? 'paused' : 'active';
      await setRoutineStatus(routine.id, nextStatus);
      showSuccess(`Routine ${nextStatus === 'active' ? 'resumed' : 'paused'}`);
      refreshRoutines();
    } catch (error) {
      showError('Unable to update routine');
    }
  };

  const renderRoutineCard = (routine) => (
    <Grid item xs={12} md={6} key={routine.id}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography variant="h6">{routine.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {routine.description || 'No description provided'}
              </Typography>
              <Chip
                label={formatSchedule(routine)}
                color={(routine.recurringRule?.status || 'active') === 'active' ? 'primary' : 'default'}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label={`Notify ${routine.recurringRule?.notificationLeadTime || 60}m before`}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
              <Chip
                label={`Column: ${routine.columnName || routine.columnId}`}
                size="small"
              />
            </Box>
            <Stack direction="row" spacing={1}>
              <IconButton size="small" onClick={() => { setEditingRoutine(routine); setDialogOpen(true); }}>
                <Edit fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleToggleStatus(routine)}>
                {(routine.recurringRule?.status || 'active') === 'active' ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleDeleteRoutine(routine.id)}>
                <Delete fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Routines</Typography>
          <Typography color="text.secondary">Manage recurring daily routines and pre-notifications sent to n8n.</Typography>
        </Box>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>Add New Routine</Button>
      </Stack>

      <Typography variant="h6" sx={{ mb: 1 }}>Active routines</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {activeRoutines.map(renderRoutineCard)}
        {activeRoutines.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">No active routines yet.</Typography>
          </Grid>
        )}
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>Paused routines</Typography>
      <Grid container spacing={2}>
        {pausedRoutines.map(renderRoutineCard)}
        {pausedRoutines.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">No paused routines.</Typography>
          </Grid>
        )}
      </Grid>

      <RoutineDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingRoutine(null); }}
        onSave={handleSaveRoutine}
        initialValues={editingRoutine}
        columns={columns}
      />
    </Box>
  );
};

export default Routines;
