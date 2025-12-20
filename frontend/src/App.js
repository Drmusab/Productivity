import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: '#3498db',
    },
    secondary: {
      main: '#2ecc71',
    },
  },
});

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
          <Route path="/planner" element={isAuthenticated ? <DailyPlanner /> : <Navigate to="/login" />} />
          <Route path="/routines" element={isAuthenticated ? <Routines /> : <Navigate to="/login" />} />
          <Route path="/habits" element={isAuthenticated ? <Habits /> : <Navigate to="/login" />} />
          <Route path="/fitness" element={isAuthenticated ? <Fitness /> : <Navigate to="/login" />} />
          <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} />
          <Route path="/analytics" element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />} />
          <Route path="/calendar" element={isAuthenticated ? <Calendar /> : <Navigate to="/login" />} />
          <Route path="/" element={isAuthenticated ? <Navigate to="/boards" /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3}>
          <AuthProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;