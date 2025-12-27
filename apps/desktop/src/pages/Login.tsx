// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Person,
  Lock,
  Visibility,
  VisibilityOff,
  Dashboard,
  Speed,
  AutoAwesome
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    navigate('/boards');
    // Don't set loading to false - let the component unmount during navigation
  };

  const features = [
    { icon: <Dashboard />, text: 'إدارة المهام بأسلوب كانبان' },
    { icon: <Speed />, text: 'تتبع الإنتاجية والتحليلات' },
    { icon: <AutoAwesome />, text: 'أتمتة ذكية للمهام' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B8DD6 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          top: -100,
          right: -100,
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-20px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          bottom: -50,
          left: -50,
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'center',
          padding: 3,
          gap: 6,
          maxWidth: 1200,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left side - Branding */}
        <Fade in timeout={800}>
          <Box
            sx={{
              flex: 1,
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              alignItems: 'flex-start',
              color: 'white',
              maxWidth: 450,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <Dashboard sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Typography variant="h3" fontWeight={700}>
                كانبان برو
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, lineHeight: 1.6 }}>
              نظام إدارة المهام الذكي لتحقيق أقصى إنتاجية
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {features.map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(5px)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.15)',
                      transform: 'translateX(-5px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="body1" fontWeight={500}>
                    {feature.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Fade>

        {/* Right side - Login Card */}
        <Fade in timeout={1000}>
          <Card
            sx={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 4,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'visible',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <CardContent sx={{ p: 5 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <Dashboard sx={{ fontSize: 36, color: 'white' }} />
                </Box>
                <Typography component="h1" variant="h4" fontWeight={700} color="text.primary">
                  أهلاً بعودتك
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  سجّل الدخول للمتابعة
                </Typography>
              </Box>
              
              {error && (
                <Fade in>
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3, 
                      borderRadius: 2,
                      '& .MuiAlert-icon': { alignItems: 'center' }
                    }}
                  >
                    {error}
                  </Alert>
                </Fade>
              )}
              
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="اسم المستخدم"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    mt: 4,
                    mb: 2,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.35)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                      boxShadow: '0 12px 28px rgba(102, 126, 234, 0.45)',
                      transform: 'translateY(-2px)',
                    },
                    '&:disabled': {
                      background: 'linear-gradient(135deg, #a0aec0 0%, #cbd5e0 100%)',
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
              </Box>

              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%)',
                  border: '1px dashed rgba(102,126,234,0.3)',
                }}
              >
                <Typography variant="body2" align="center" color="text.secondary">
                  <strong>بيانات تجريبية:</strong> اسم المستخدم: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>demo</code> 
                  {' '}كلمة المرور: <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>demo123</code>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Box>
    </Box>
  );
};

export default Login;