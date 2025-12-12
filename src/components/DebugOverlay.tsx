
import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, IconButton, Typography, Divider, Button } from '@mui/material';
import { X, Minimize2, Maximize2, Terminal, Copy, Trash2, Bug } from 'lucide-react';

interface LogEntry {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  data?: any[];
}

const DebugOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Hook into console
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    const addLog = (type: LogEntry['type'], args: any[]) => {
      // Defer execution to avoid 'Cannot update during render' error
      setTimeout(() => {
          const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');

          const newLog: LogEntry = {
            id: Date.now().toString() + Math.random(),
            type,
            message,
            timestamp: new Date().toLocaleTimeString(),
            data: args
          };

          setLogs(prev => [...prev.slice(-199), newLog]); // Keep last 200 logs to prevent memory leak
      }, 0);
    };

    console.log = (...args) => {
      addLog('log', args);
      originalLog(...args);
    };

    console.warn = (...args) => {
      addLog('warn', args);
      originalWarn(...args);
    };

    console.error = (...args) => {
      addLog('error', args);
      originalError(...args);
    };

    console.info = (...args) => {
      addLog('info', args);
      originalInfo(...args);
    };

    // Capture global errors
    const handleError = (event: ErrorEvent) => {
        addLog('error', [event.message, event.filename, event.lineno]);
    };
    window.addEventListener('error', handleError);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    if (isOpen && !isMinimized && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, isMinimized]);

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Logs copiados al portapapeles');
  };

  const clearLogs = () => setLogs([]);

  if (!isOpen) {
    return (
      <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999 }}>
        <IconButton
          onClick={() => setIsOpen(true)}
          sx={{ bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' }, boxShadow: 3 }}
        >
          <Bug />
        </IconButton>
      </Box>
    );
  }

  if (isMinimized) {
    return (
      <Paper
        sx={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          width: 200, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          bgcolor: '#1e1e1e', color: '#fff'
        }}
      >
        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Terminal size={14} /> Debug ({logs.length})
        </Typography>
        <Box>
           <IconButton size="small" onClick={() => setIsMinimized(false)} sx={{ color: 'white' }}><Maximize2 size={14} /></IconButton>
           <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: 'white' }}><X size={14} /></IconButton>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        width: '600px', height: '400px', display: 'flex', flexDirection: 'column',
        bgcolor: '#1e1e1e', color: '#fff', border: '1px solid #333', boxShadow: 6,
        borderRadius: 2, overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#252526', borderBottom: '1px solid #333' }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <Bug size={16} color="#4caf50" /> PKGrower - Consola de Depuración
        </Typography>
        <Box>
           <IconButton size="small" onClick={copyLogs} title="Copiar Logs" sx={{ color: '#aaa', '&:hover': { color: '#fff' } }}><Copy size={16} /></IconButton>
           <IconButton size="small" onClick={clearLogs} title="Limpiar" sx={{ color: '#aaa', '&:hover': { color: '#ef5350' } }}><Trash2 size={16} /></IconButton>
           <IconButton size="small" onClick={() => setIsMinimized(true)} sx={{ color: '#aaa', '&:hover': { color: '#fff' } }}><Minimize2 size={16} /></IconButton>
           <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: '#aaa', '&:hover': { color: '#fff' } }}><X size={16} /></IconButton>
        </Box>
      </Box>

      {/* Logs Area */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1, fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: '#1e1e1e' }}>
        {logs.length === 0 ? (
          <Typography variant="caption" sx={{ color: '#555', display: 'block', textAlign: 'center', mt: 4 }}>
            Esperando eventos...
          </Typography>
        ) : (
          logs.map((log) => (
            <Box key={log.id} sx={{ mb: 0.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Typography component="span" sx={{ color: '#666', fontSize: '0.7rem', minWidth: '60px' }}>
                {log.timestamp}
              </Typography>
              <Typography
                component="span"
                sx={{
                  color: log.type === 'error' ? '#ff5252' : log.type === 'warn' ? '#ffb74d' : '#fff',
                  wordBreak: 'break-all'
                }}
              >
                <span style={{ fontWeight: 'bold', marginRight: '4px' }}>[{log.type.toUpperCase()}]</span>
                {log.message}
              </Typography>
            </Box>
          ))
        )}
        <div ref={logsEndRef} />
      </Box>
    </Paper>
  );
};

export default DebugOverlay;
