import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// Detect if the document has the `dark` class (shadcn style) and map CSS variables.
const prefersDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

// Helper: read CSS variable value from :root
const getCSSVar = (name: string) => {
  if (typeof window === 'undefined') return undefined
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined
}

// Compute border radius from --radius (supports rem and px)
const radiusVar = getCSSVar('--radius') || '0.5rem'
let radiusPx = 8
if (radiusVar.endsWith('rem')) {
  const v = parseFloat(radiusVar.replace('rem', ''))
  if (!Number.isNaN(v)) radiusPx = Math.round(v * 16)
} else if (radiusVar.endsWith('px')) {
  const v = parseFloat(radiusVar.replace('px', ''))
  if (!Number.isNaN(v)) radiusPx = Math.round(v)
}

const theme = createTheme({
  palette: {
    mode: prefersDark ? 'dark' : 'light',
    primary: {
      main: `hsl(var(--primary))`,
      contrastText: `hsl(var(--primary-foreground))`,
    },
    secondary: {
      main: `hsl(var(--secondary))`,
      contrastText: `hsl(var(--secondary-foreground))`,
    },
    background: {
      default: `hsl(var(--background))`,
      paper: `hsl(var(--card))`,
    },
    text: {
      primary: `hsl(var(--foreground))`,
      secondary: `hsl(var(--muted-foreground))`,
    },
    error: {
      main: `hsl(var(--destructive))`,
      contrastText: `hsl(var(--destructive-foreground))`,
    },
    // custom tokens (accessible via theme.palette.custom)
    custom: {
      // @ts-ignore - add custom palette tokens
      muted: `hsl(var(--muted))`,
    },
  } as any,
  shape: {
    borderRadius: radiusPx,
  },
  typography: {
    fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'hsl(var(--card))',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radiusPx,
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: radiusPx,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: radiusPx,
          textTransform: 'none',
        },
        containedPrimary: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          '&:hover': {
            filter: 'brightness(0.95)'
          }
        },
        containedSecondary: {
          backgroundColor: 'hsl(var(--secondary))',
          color: 'hsl(var(--secondary-foreground))',
        },
        outlined: {
          borderColor: 'hsl(var(--border))'
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: {
          backgroundColor: 'hsl(var(--input))',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radiusPx,
        },
        notchedOutline: {
          borderColor: 'hsl(var(--border))'
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'hsl(var(--muted-foreground))'
        }
      }
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
