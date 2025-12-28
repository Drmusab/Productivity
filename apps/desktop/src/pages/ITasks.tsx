// @ts-nocheck
/**
 * @fileoverview iTasks page component with tab-based interface
 * @module pages/ITasks
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Tab,
  Tabs,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add, GridView, ViewList, ViewModule } from '@mui/icons-material';

import {
  AddTaskForm,
  EisenhowerMatrix,
  ITasksProvider,
  TaskTable,
  useITasks,
} from '../modules/itasks';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const ITasksContent: React.FC = () => {
  const { tasks, loading, error, addTask, updateTask, deleteTask, duplicateTask } = useITasks();
  const [currentTab, setCurrentTab] = useState(0);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleTaskUpdate = async (id: string, updates: any) => {
    try {
      await updateTask(id, updates);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleQuadrantChange = async (taskId: string, quadrant: string) => {
    // Map quadrant back to priority
    let priority = 'not-important';
    switch (quadrant) {
      case 'do_first':
        priority = 'urgent';
        break;
      case 'schedule':
        priority = 'important';
        break;
      case 'delegate':
        priority = 'not-urgent';
        break;
      case 'eliminate':
        priority = 'not-important';
        break;
    }
    await handleTaskUpdate(taskId, { priority });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            iTasks
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Task management with Eisenhower Matrix integration
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddTaskOpen(true)}
          size="large"
        >
          Add Task
        </Button>
      </Stack>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<GridView />} label="Eisenhower Matrix" iconPosition="start" />
          <Tab icon={<ViewList />} label="Task List" iconPosition="start" />
          <Tab icon={<ViewModule />} label="Kanban Board" iconPosition="start" disabled />
        </Tabs>
      </Paper>

      {/* Loading Indicator */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Tab Panels */}
      {!loading && (
        <>
          <TabPanel value={currentTab} index={0}>
            <EisenhowerMatrix tasks={tasks} onTaskUpdate={handleQuadrantChange} />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <TaskTable
              tasks={tasks}
              onUpdate={handleTaskUpdate}
              onDelete={deleteTask}
              onDuplicate={duplicateTask}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                Kanban Board view coming soon!
              </Typography>
            </Box>
          </TabPanel>
        </>
      )}

      {/* Add Task Dialog */}
      <AddTaskForm open={addTaskOpen} onClose={() => setAddTaskOpen(false)} onSubmit={addTask} />
    </Container>
  );
};

const ITasksPage: React.FC = () => {
  return (
    <ITasksProvider>
      <ITasksContent />
    </ITasksProvider>
  );
};

export default ITasksPage;
