import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Box sx={{
            height: '100%',
            minHeight: 150,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,0,0,0.05)',
            border: '1px dashed rgba(255,0,0,0.3)',
            borderRadius: 2,
            p: 2,
            gap: 1
        }}>
          <AlertTriangle color="#ef4444" size={24} />
          <Typography variant="body2" color="error">Error en widget</Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<RefreshCw size={14}/>}
            onClick={() => this.setState({ hasError: false })}
          >
            Reintentar
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
