/**
 * ActionFeedback - Toast Notification System
 * Shows visual feedback for user actions with auto-dismiss
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Box, Typography, Slide, IconButton } from '@mui/material';
import { CheckCircle, AlertTriangle, Info, X, Zap, Droplet, Lightbulb } from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'warning' | 'info' | 'action';
  message: string;
  icon?: ReactNode;
  duration?: number;
}

interface FeedbackContextType {
  showFeedback: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  showAction: (message: string, icon?: ReactNode) => void;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showFeedback = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now();
    const newToast: Toast = { ...toast, id, duration: toast.duration || 4000 };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showFeedback({ type: 'success', message, icon: <CheckCircle size={18} /> });
  }, [showFeedback]);

  const showWarning = useCallback((message: string) => {
    showFeedback({ type: 'warning', message, icon: <AlertTriangle size={18} /> });
  }, [showFeedback]);

  const showInfo = useCallback((message: string) => {
    showFeedback({ type: 'info', message, icon: <Info size={18} /> });
  }, [showFeedback]);

  const showAction = useCallback((message: string, icon?: ReactNode) => {
    showFeedback({ type: 'action', message, icon: icon || <Zap size={18} /> });
  }, [showFeedback]);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const typeStyles = {
    success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#22c55e', icon: '#fff' },
    warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b', icon: '#fff' },
    info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6', icon: '#fff' },
    action: { bg: 'rgba(139, 92, 246, 0.95)', border: '#8b5cf6', icon: '#fff' }
  };

  return (
    <FeedbackContext.Provider value={{ showFeedback, showSuccess, showWarning, showInfo, showAction }}>
      {children}

      {/* Toast Container */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          maxWidth: 400
        }}
      >
        {toasts.map((toast) => (
          <Slide key={toast.id} direction="left" in={true} mountOnEnter unmountOnExit>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                pr: 1.5,
                borderRadius: '14px',
                bgcolor: typeStyles[toast.type].bg,
                border: `1px solid ${typeStyles[toast.type].border}`,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                animation: 'slideInRight 0.3s ease-out',
                minWidth: 280
              }}
            >
              <Box sx={{ color: typeStyles[toast.type].icon }}>
                {toast.icon}
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: '#fff',
                  fontWeight: 500,
                  flex: 1,
                  lineHeight: 1.4
                }}
              >
                {toast.message}
              </Typography>

              <IconButton
                size="small"
                onClick={() => dismissToast(toast.id)}
                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}
              >
                <X size={16} />
              </IconButton>
            </Box>
          </Slide>
        ))}
      </Box>
    </FeedbackContext.Provider>
  );
};

// Pre-configured feedback helpers
export const feedbackMessages = {
  irrigationStarted: (volume: number, duration: number) =>
    `💧 Riego iniciado: ${volume}ml en ${Math.round(duration/1000)}s`,
  irrigationComplete: (volume: number) =>
    `✓ Riego completado: ${volume}ml aplicados`,
  deviceOn: (name: string) =>
    `⚡ ${name} encendido`,
  deviceOff: (name: string) =>
    `○ ${name} apagado`,
  settingsSaved: () =>
    '✓ Configuración guardada',
  connectionError: () =>
    '⚠ Error de conexión - reintentando...',
  sensorAlert: (metric: string, value: number) =>
    `⚠ ${metric}: ${value} fuera de rango`
};

export default FeedbackProvider;
