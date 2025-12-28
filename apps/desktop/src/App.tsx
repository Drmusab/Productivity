import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Board from './pages/Board';
import Boards from './pages/Boards';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Routines from './pages/Routines';
import Calendar from './pages/Calendar';
import Habits from './pages/Habits';
import DailyPlanner from './pages/DailyPlanner';
import Fitness from './pages/Fitness';
import Islamic from './pages/Islamic';
import EisenhowerMatrix from './pages/EisenhowerMatrix';
import Chronos from './pages/Chronos';
import ThoughtOrganizer from './pages/ThoughtOrganizer';
import NotesHub from './pages/NotesHub';
import IdeaTracker from './pages/IdeaTracker';
import WritingHub from './pages/WritingHub';
import Utilities from './pages/Utilities';
import KnowledgeVault from './pages/KnowledgeVault';
import ObsidianDemo from './pages/ObsidianDemo';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div dir="rtl">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/boards" element={isAuthenticated ? <Boards /> : <Navigate to="/login" />} />
          <Route path="/board/:id" element={isAuthenticated ? <Board /> : <Navigate to="/login" />} />
          <Route path="/eisenhower-matrix" element={isAuthenticated ? <EisenhowerMatrix /> : <Navigate to="/login" />} />
          <Route path="/planner" element={isAuthenticated ? <DailyPlanner /> : <Navigate to="/login" />} />
          <Route path="/routines" element={isAuthenticated ? <Routines /> : <Navigate to="/login" />} />
          <Route path="/habits" element={isAuthenticated ? <Habits /> : <Navigate to="/login" />} />
          <Route path="/fitness" element={isAuthenticated ? <Fitness /> : <Navigate to="/login" />} />
          <Route path="/islamic" element={isAuthenticated ? <Islamic /> : <Navigate to="/login" />} />
          <Route path="/chronos" element={isAuthenticated ? <Chronos /> : <Navigate to="/login" />} />
          <Route path="/thoughts" element={isAuthenticated ? <ThoughtOrganizer /> : <Navigate to="/login" />} />
          <Route path="/notes" element={isAuthenticated ? <NotesHub /> : <Navigate to="/login" />} />
          <Route path="/ideas" element={isAuthenticated ? <IdeaTracker /> : <Navigate to="/login" />} />
          <Route path="/writing" element={isAuthenticated ? <WritingHub /> : <Navigate to="/login" />} />
          <Route path="/utilities" element={isAuthenticated ? <Utilities /> : <Navigate to="/login" />} />
          <Route path="/vault" element={isAuthenticated ? <KnowledgeVault /> : <Navigate to="/login" />} />
          <Route path="/obsidian" element={<ObsidianDemo />} />
          <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
          <Route path="/analytics" element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />} />
          <Route path="/calendar" element={isAuthenticated ? <Calendar /> : <Navigate to="/login" />} />
          <Route path="/" element={isAuthenticated ? <Navigate to="/boards" /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

function AppContent() {
  const { theme } = useTheme();
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </AuthProvider>
      </SnackbarProvider>
    </MuiThemeProvider>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;