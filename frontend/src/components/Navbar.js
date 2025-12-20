import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  AccountCircle,
  Dashboard,
  Event,
  Settings,
  Analytics,
  ExitToApp,
  Repeat,
  CheckBox,
  Today,
  FitnessCenter
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleClose();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          مدير مهام كانبان
        </Typography>
        
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              startIcon={<Today />}
              onClick={() => navigate('/planner')}
              variant={location.pathname === '/planner' ? 'outlined' : 'text'}
            >
              المخطط اليومي
            </Button>
            <Button
              color="inherit"
              startIcon={<Dashboard />}
              onClick={() => navigate('/boards')}
              variant={location.pathname === '/boards' ? 'outlined' : 'text'}
            >
              اللوحات
            </Button>
            <Button
              color="inherit"
              startIcon={<Event />}
              onClick={() => navigate('/calendar')}
              variant={location.pathname === '/calendar' ? 'outlined' : 'text'}
            >
              التقويم
            </Button>
            <Button
              color="inherit"
              startIcon={<Repeat />}
              onClick={() => navigate('/routines')}
              variant={location.pathname === '/routines' ? 'outlined' : 'text'}
            >
              الجداول الدورية
            </Button>
            <Button
              color="inherit"
              startIcon={<CheckBox />}
              onClick={() => navigate('/habits')}
              variant={location.pathname === '/habits' ? 'outlined' : 'text'}
            >
              العادات
            </Button>
            <Button
              color="inherit"
              startIcon={<FitnessCenter />}
              onClick={() => navigate('/fitness')}
              variant={location.pathname === '/fitness' ? 'outlined' : 'text'}
            >
              اللياقة
            </Button>
            <Button
              color="inherit"
              startIcon={<Analytics />}
              onClick={() => navigate('/analytics')}
              variant={location.pathname === '/analytics' ? 'outlined' : 'text'}
            >
              التحليلات
            </Button>
            <Button
              color="inherit"
              startIcon={<Settings />}
              onClick={() => navigate('/settings')}
              variant={location.pathname === '/settings' ? 'outlined' : 'text'}
            >
              الإعدادات
            </Button>
          </Box>
        )}
        
        <div>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            {user?.avatar ? (
              <Avatar src={user.avatar} alt={user.username} sx={{ width: 32, height: 32 }} />
            ) : (
              <AccountCircle />
            )}
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {isMobile && (
              <>
                <MenuItem onClick={() => handleNavigation('/planner')}>
                  <Today sx={{ mr: 1 }} /> المخطط اليومي
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/boards')}>
                  <Dashboard sx={{ mr: 1 }} /> اللوحات
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/calendar')}>
                  <Event sx={{ mr: 1 }} /> التقويم
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/routines')}>
                  <Repeat sx={{ mr: 1 }} /> الجداول الدورية
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/habits')}>
                  <CheckBox sx={{ mr: 1 }} /> العادات
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/fitness')}>
                  <FitnessCenter sx={{ mr: 1 }} /> اللياقة
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/analytics')}>
                  <Analytics sx={{ mr: 1 }} /> التحليلات
                </MenuItem>
                <MenuItem onClick={() => handleNavigation('/settings')}>
                  <Settings sx={{ mr: 1 }} /> الإعدادات
                </MenuItem>
              </>
            )}
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} /> تسجيل الخروج
            </MenuItem>
          </Menu>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;