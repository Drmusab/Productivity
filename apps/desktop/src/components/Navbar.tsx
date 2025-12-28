// @ts-nocheck
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
  useTheme as useMuiTheme,
  useMediaQuery,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Dashboard,
  Event,
  Settings,
  Analytics,
  ExitToApp,
  Repeat,
  CheckBox,
  Today,
  FitnessCenter,
  Mosque,
  ViewKanban,
  Timer,
  Brightness4,
  Brightness7,
  Psychology,
  Note,
  Lightbulb,
  Edit,
  Build,
  AccountTree,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar: React.FC = () => {
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
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

  const handleNavigation = (path: string) => {
    navigate(path);
    handleClose();
  };

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { path: '/vault', icon: <AccountTree />, label: 'خزنة المعرفة' },
    { path: '/eisenhower-matrix', icon: <ViewKanban />, label: 'مصفوفة أيزنهاور' },
    { path: '/planner', icon: <Today />, label: 'المخطط اليومي' },
    { path: '/boards', icon: <Dashboard />, label: 'اللوحات' },
    { path: '/thoughts', icon: <Psychology />, label: 'الأفكار' },
    { path: '/notes', icon: <Note />, label: 'الملاحظات' },
    { path: '/ideas', icon: <Lightbulb />, label: 'الأفكار الملهمة' },
    { path: '/writing', icon: <Edit />, label: 'مساحة الكتابة' },
    { path: '/calendar', icon: <Event />, label: 'التقويم' },
    { path: '/routines', icon: <Repeat />, label: 'الجداول الدورية' },
    { path: '/habits', icon: <CheckBox />, label: 'العادات' },
    { path: '/fitness', icon: <FitnessCenter />, label: 'اللياقة' },
    { path: '/islamic', icon: <Mosque />, label: 'الفلاح' },
    { path: '/chronos', icon: <Timer />, label: 'المؤقت' },
    { path: '/utilities', icon: <Build />, label: 'الأدوات' },
    { path: '/analytics', icon: <Analytics />, label: 'التحليلات' },
    { path: '/settings', icon: <Settings />, label: 'الإعدادات' },
  ];

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Toolbar sx={{ gap: 1, py: 0.5 }}>
        {/* Logo */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            mr: 3,
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          }}
          onClick={() => navigate('/boards')}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1.5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <ViewKanban sx={{ fontSize: 22, color: 'white' }} />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              display: { xs: 'none', sm: 'block' },
              letterSpacing: '-0.02em',
            }}
          >
            كانبان برو
          </Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Tooltip key={item.path} title={item.label} arrow>
                  <Button
                    color="inherit"
                    onClick={() => navigate(item.path)}
                    sx={{
                      minWidth: 'auto',
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.15)',
                        transform: 'translateY(-1px)',
                      },
                      '&::after': isActive ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 20,
                        height: 3,
                        borderRadius: 2,
                        background: 'white',
                      } : {},
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isActive ? 600 : 500,
                          display: { lg: 'none', xl: 'block' },
                          fontSize: '0.85rem',
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Box>
                  </Button>
                </Tooltip>
              );
            })}
          </Box>
        )}
        
        {/* Theme Toggle Button */}
        <Tooltip title={mode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}>
          <IconButton
            onClick={toggleTheme}
            color="inherit"
            sx={{
              ml: 1,
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'rotate(180deg)',
              },
            }}
          >
            {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
          </IconButton>
        </Tooltip>
        
        <Box sx={{ ml: 1 }}>
          <Tooltip title="الملف الشخصي">
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{
                p: 0.75,
                border: '2px solid rgba(255,255,255,0.3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.6)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              {user?.avatar ? (
                <Avatar 
                  src={user.avatar} 
                  alt={user.username} 
                  sx={{ 
                    width: 34, 
                    height: 34,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }} 
                />
              ) : (
                <Avatar 
                  sx={{ 
                    width: 34, 
                    height: 34, 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                >
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              )}
            </IconButton>
          </Tooltip>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 220,
                borderRadius: 3,
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.05)',
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  mx: 1,
                  my: 0.5,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
                  },
                },
              },
            }}
          >
            {/* User info header */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                مرحباً
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                {user?.username || 'المستخدم'}
              </Typography>
            </Box>
            
            {isMobile && (
              <>
                <Box sx={{ px: 1, py: 1 }}>
                  {navItems.map((item) => (
                    <MenuItem key={item.path} onClick={() => handleNavigation(item.path)}>
                      {React.cloneElement(item.icon, { 
                        sx: { 
                          ml: 1.5, 
                          fontSize: 20,
                          color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                        } 
                      })}
                      <Typography
                        sx={{
                          fontWeight: location.pathname === item.path ? 600 : 400,
                          color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {item.label}
                      </Typography>
                    </MenuItem>
                  ))}
                </Box>
                <Divider sx={{ my: 1 }} />
              </>
            )}
            
            <Box sx={{ px: 1, py: 1 }}>
              <MenuItem 
                onClick={handleLogout}
                sx={{
                  color: 'error.main',
                  '&:hover': {
                    background: 'rgba(239,68,68,0.08) !important',
                  },
                }}
              >
                <ExitToApp sx={{ ml: 1.5, fontSize: 20 }} /> 
                <Typography fontWeight={500}>تسجيل الخروج</Typography>
              </MenuItem>
            </Box>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;