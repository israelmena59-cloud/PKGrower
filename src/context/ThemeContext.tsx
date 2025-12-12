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
        main: mode === 'dark' ? '#00ff41' : '#15803d', // Neon Green (Matrix/Cyber/Agro)
      },
      secondary: {
        main: mode === 'dark' ? '#ffffff' : '#000000', // High contrast bw
      },
      background: {
        default: mode === 'dark' ? '#000000' : '#ffffff',
        paper: mode === 'dark' ? '#0a0a0a' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#ffffff' : '#000000',
        secondary: mode === 'dark' ? '#a0a0a0' : '#666666',
      }
    },
    typography: {
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 16 // iOS Squircle approx
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: mode === 'dark' ? '1px solid #222' : '1px solid #eee',
          }
        }
      },
      MuiButton: {
          styleOverrides: {
              root: {
                  borderRadius: 9999, // Pill shape
              }
          }
      },
      MuiCard: {
          styleOverrides: {
              root: {
                  borderRadius: 24,
                  border: mode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.05)',
                  boxShadow: 'none', // Flat IOS style
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
