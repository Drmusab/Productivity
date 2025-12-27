// @ts-nocheck
/**
 * @fileoverview Theme context for managing dark/light mode.
 * Provides theme switching functionality and persists user preference.
 */

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { createTheme, Theme } from '@mui/material/styles';

type ThemeDirection = 'ltr' | 'rtl';
type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  direction?: ThemeDirection;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Get theme palette based on mode
 * @param {string} mode - 'light' or 'dark'
 * @returns {Object} Theme palette configuration
 */
const getPalette = (mode: ThemeMode) => ({
  mode,
  primary: {
    main: mode === 'light' ? '#6366f1' : '#818cf8',
    light: mode === 'light' ? '#818cf8' : '#a5b4fc',
    dark: mode === 'light' ? '#4f46e5' : '#6366f1',
    contrastText: '#ffffff',
  },
  secondary: {
    main: mode === 'light' ? '#10b981' : '#34d399',
    light: mode === 'light' ? '#34d399' : '#6ee7b7',
    dark: mode === 'light' ? '#059669' : '#10b981',
    contrastText: '#ffffff',
  },
  background: {
    default: mode === 'light' ? '#f8fafc' : '#0f172a',
    paper: mode === 'light' ? '#ffffff' : '#1e293b',
  },
  error: {
    main: mode === 'light' ? '#ef4444' : '#f87171',
    light: mode === 'light' ? '#f87171' : '#fca5a5',
    dark: mode === 'light' ? '#dc2626' : '#ef4444',
  },
  warning: {
    main: mode === 'light' ? '#f59e0b' : '#fbbf24',
    light: mode === 'light' ? '#fbbf24' : '#fcd34d',
    dark: mode === 'light' ? '#d97706' : '#f59e0b',
  },
  success: {
    main: mode === 'light' ? '#10b981' : '#34d399',
    light: mode === 'light' ? '#34d399' : '#6ee7b7',
    dark: mode === 'light' ? '#059669' : '#10b981',
  },
  info: {
    main: mode === 'light' ? '#3b82f6' : '#60a5fa',
    light: mode === 'light' ? '#60a5fa' : '#93c5fd',
    dark: mode === 'light' ? '#2563eb' : '#3b82f6',
  },
  text: {
    primary: mode === 'light' ? '#1e293b' : '#f1f5f9',
    secondary: mode === 'light' ? '#64748b' : '#cbd5e1',
  },
  divider: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)',
});

/**
 * Theme Provider Component
 */
export const ThemeProvider = ({ children, direction = 'rtl' }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Load saved preference or default to light
    const saved = localStorage.getItem('theme-mode');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    // Save preference
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        direction, // Configurable direction, defaults to RTL
        palette: getPalette(mode),
        typography: {
          fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
          h1: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
          },
          h2: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
          },
          h3: {
            fontWeight: 600,
            letterSpacing: '-0.015em',
          },
          h4: {
            fontWeight: 600,
            letterSpacing: '-0.01em',
          },
          h5: {
            fontWeight: 600,
          },
          h6: {
            fontWeight: 600,
          },
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        shadows: [
          'none',
          mode === 'light' 
            ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            : '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
          mode === 'light'
            ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
            : '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
          mode === 'light'
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
          mode === 'light'
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
          mode === 'light'
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
          ...Array(19).fill(mode === 'light' 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          ),
        ],
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                padding: '10px 20px',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: mode === 'light'
                    ? '0 4px 12px rgba(99, 102, 241, 0.25)'
                    : '0 4px 12px rgba(129, 140, 248, 0.35)',
                },
              },
              contained: {
                boxShadow: mode === 'light'
                  ? '0 2px 8px rgba(99, 102, 241, 0.25)'
                  : '0 2px 8px rgba(129, 140, 248, 0.35)',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24)',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: mode === 'light'
                    ? '0 10px 25px rgba(0, 0, 0, 0.1)'
                    : '0 10px 25px rgba(0, 0, 0, 0.4)',
                  transform: 'translateY(-2px)',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                backgroundImage: 'none',
              },
              elevation1: {
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(0, 0, 0, 0.08)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'light'
                  ? '0 1px 3px rgba(0, 0, 0, 0.1)'
                  : '0 1px 3px rgba(0, 0, 0, 0.3)',
              },
            },
          },
          MuiFab: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'light'
                  ? '0 4px 12px rgba(99, 102, 241, 0.35)'
                  : '0 4px 12px rgba(129, 140, 248, 0.45)',
                '&:hover': {
                  boxShadow: mode === 'light'
                    ? '0 6px 20px rgba(99, 102, 241, 0.45)'
                    : '0 6px 20px rgba(129, 140, 248, 0.55)',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                fontWeight: 500,
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 10,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: mode === 'light'
                      ? '0 2px 8px rgba(0, 0, 0, 0.08)'
                      : '0 2px 8px rgba(0, 0, 0, 0.3)',
                  },
                  '&.Mui-focused': {
                    boxShadow: mode === 'light'
                      ? '0 0 0 3px rgba(99, 102, 241, 0.15)'
                      : '0 0 0 3px rgba(129, 140, 248, 0.25)',
                  },
                },
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 20,
                boxShadow: mode === 'light'
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              },
            },
          },
        },
      }),
    [mode, direction]
  );

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to use theme context
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
