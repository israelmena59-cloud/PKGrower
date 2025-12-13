import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createTheme, ThemeProvider as MUIThemeProvider, CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// iOS Color Palette
const iOS = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  purple: '#AF52DE',
  pink: '#FF2D55',
  teal: '#5AC8FA',
  indigo: '#5856D6',
  gray: '#8E8E93',
  gray2: '#636366',
  gray3: '#48484A',
  gray4: '#3A3A3C',
  gray5: '#2C2C2E',
  gray6: '#1C1C1E',
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Set data-theme attribute for CSS variables
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: iOS.green,
        light: '#4ADE80',
        dark: '#22C55E',
      },
      secondary: {
        main: iOS.purple,
        light: '#C084FC',
        dark: '#9333EA',
      },
      error: {
        main: iOS.red,
      },
      warning: {
        main: iOS.orange,
      },
      info: {
        main: iOS.blue,
      },
      success: {
        main: iOS.green,
      },
      background: {
        default: mode === 'dark' ? '#000000' : '#F2F2F7',
        paper: mode === 'dark' ? iOS.gray6 : '#FFFFFF',
      },
      text: {
        primary: mode === 'dark' ? '#FFFFFF' : '#000000',
        secondary: mode === 'dark' ? 'rgba(235, 235, 245, 0.6)' : 'rgba(60, 60, 67, 0.6)',
      },
      divider: mode === 'dark' ? 'rgba(84, 84, 88, 0.65)' : 'rgba(60, 60, 67, 0.12)',
    },
    typography: {
      fontFamily: '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.025em' },
      h2: { fontWeight: 700, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600, letterSpacing: '-0.015em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.01em' },
      body1: { letterSpacing: '-0.01em' },
      body2: { letterSpacing: '-0.005em' },
    },
    shape: {
      borderRadius: 20,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === 'dark' ? '#000000' : '#F2F2F7',
            backgroundImage: mode === 'dark'
              ? 'radial-gradient(ellipse at top, rgba(52, 199, 89, 0.08) 0%, transparent 50%)'
              : 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: mode === 'dark'
              ? 'rgba(28, 28, 30, 0.72)'
              : 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.32)'
              : '0 8px 32px rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            backgroundColor: mode === 'dark'
              ? 'rgba(28, 28, 30, 0.72)'
              : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.32)'
              : '0 4px 16px rgba(0, 0, 0, 0.06)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: mode === 'dark'
                ? '0 12px 40px rgba(0, 0, 0, 0.4)'
                : '0 8px 24px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 20px',
            boxShadow: 'none',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: 'none',
              transform: 'scale(1.02)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
          contained: {
            background: `linear-gradient(135deg, ${iOS.green} 0%, #2AAE4A 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, #3DD96A 0%, ${iOS.green} 100%)`,
            },
          },
          outlined: {
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            '&:hover': {
              borderColor: iOS.green,
              backgroundColor: `${iOS.green}10`,
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            borderRadius: 12,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
            '&.Mui-focused': {
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            '& fieldset': {
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            },
            '&:hover fieldset': {
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            },
            '&.Mui-focused fieldset': {
              borderColor: iOS.green,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 100,
            fontWeight: 600,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            minHeight: 44,
            borderRadius: 12,
            margin: '0 4px',
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              backgroundColor: `${iOS.green}15`,
              color: iOS.green,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            display: 'none', // Use background instead of indicator
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'dark' ? 'rgba(44, 44, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            color: mode === 'dark' ? '#fff' : '#000',
            backdropFilter: 'blur(20px)',
            border: mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            fontSize: '0.8rem',
            padding: '8px 12px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            backgroundColor: mode === 'dark' ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(40px) saturate(180%)',
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
          },
          standardSuccess: {
            backgroundColor: `${iOS.green}15`,
            color: iOS.green,
          },
          standardWarning: {
            backgroundColor: `${iOS.orange}15`,
            color: iOS.orange,
          },
          standardError: {
            backgroundColor: `${iOS.red}15`,
            color: iOS.red,
          },
          standardInfo: {
            backgroundColor: `${iOS.blue}15`,
            color: iOS.blue,
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
