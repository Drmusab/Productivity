/**
 * @fileoverview Chronos Time Intelligence System Main Page
 * Provides time blocking, tracking, and analytics in multiple view modes
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  IconButton,
  Button,
  CircularProgress
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Timer as TimerIcon,
  Analytics as AnalyticsIcon,
  Today as TodayIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';

// Import sub-components (to be created)
import PlannerMode from '../components/Chronos/PlannerMode';
import TrackerMode from '../components/Chronos/TrackerMode';
import AnalystMode from '../components/Chronos/AnalystMode';
import DailyView from '../components/Chronos/DailyView';
import ChronosSettings from '../components/Chronos/ChronosSettings';
import TimeBlockDialog from '../components/Chronos/TimeBlockDialog';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Chronos() {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchActiveSession();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/chronos/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching Chronos settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/chronos/time-sessions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveSession(response.data);
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleCreateBlock = () => {
    setShowBlockDialog(true);
  };

  const handleBlockCreated = () => {
    setShowBlockDialog(false);
    // Refresh data based on current tab
    // This will be handled by the individual components
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          ⏱️ Chronos Time Intelligence
        </Typography>
        <Box>
          {activeSession && (
            <Button
              variant="outlined"
              color="success"
              sx={{ mr: 2 }}
              onClick={() => setCurrentTab(1)}
            >
              Session Active • {activeSession.title}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateBlock}
            sx={{ mr: 1 }}
          >
            New Time Block
          </Button>
          <IconButton onClick={() => setShowSettingsDialog(true)}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<TodayIcon />}
            label="Daily View"
            iconPosition="start"
          />
          <Tab
            icon={<CalendarIcon />}
            label="Planner"
            iconPosition="start"
          />
          <Tab
            icon={<TimerIcon />}
            label="Tracker"
            iconPosition="start"
          />
          <Tab
            icon={<AnalyticsIcon />}
            label="Analytics"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      <Box>
        {currentTab === 0 && (
          <DailyView
            settings={settings}
            activeSession={activeSession}
            onSessionUpdate={fetchActiveSession}
          />
        )}
        {currentTab === 1 && (
          <PlannerMode
            settings={settings}
            onBlockCreated={handleBlockCreated}
          />
        )}
        {currentTab === 2 && (
          <TrackerMode
            settings={settings}
            activeSession={activeSession}
            onSessionUpdate={fetchActiveSession}
          />
        )}
        {currentTab === 3 && (
          <AnalystMode settings={settings} />
        )}
      </Box>

      {showBlockDialog && (
        <TimeBlockDialog
          open={showBlockDialog}
          onClose={() => setShowBlockDialog(false)}
          onSave={handleBlockCreated}
          settings={settings}
        />
      )}

      {showSettingsDialog && (
        <ChronosSettings
          open={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          settings={settings}
          onSettingsUpdated={fetchSettings}
        />
      )}
    </Container>
  );
}

export default Chronos;
