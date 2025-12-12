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

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#22c55e' : '#15803d', // Matches index.css --primary
      },
      secondary: {
        main: mode === 'dark' ? '#a855f7' : '#9333ea', // Matches --accent (Purple)
      },
      background: {
        default: mode === 'dark' ? '#0a0a0a' : '#ffffff',
        paper: mode === 'dark' ? '#111111' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#fafafa' : '#000000',
        secondary: mode === 'dark' ? '#a1a1aa' : '#52525b',
      }
    },
    typography: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 24
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: mode === 'dark' ? '#111111' : '#ffffff',
          }
        }
      },
      MuiInputBase: {
          styleOverrides: {
              root: {
                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                  color: mode === 'dark' ? '#fff' : '#000',
              }
          }
      },
      MuiOutlinedInput: {
          styleOverrides: {
              root: {
                  '& fieldset': {
                      borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  },
              }
          }
      },
      MuiButton: {
          styleOverrides: {
              root: {
                  borderRadius: 9999,
                  boxShadow: 'none',
                  '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }
              }
          }
      },
      MuiCard: {
          styleOverrides: {
              root: {
                  borderRadius: 24,
                  // Glass effect by default for cards in Dark Mode
                  backgroundColor: mode === 'dark' ? 'rgba(20, 20, 20, 0.65)' : '#ffffff',
                  backdropFilter: mode === 'dark' ? 'blur(16px) saturate(180%)' : 'none',
                  border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                  boxShadow: mode === 'dark' ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
              }
          }
      }
    }
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
