import React, { useState } from 'react';
import { Paper, Box, Typography, Switch as MuiSwitch, CircularProgress, Alert, Snackbar } from '@mui/material';

interface DeviceSwitchProps {
  icon: React.ReactNode;
  name: string;
  isOn: boolean;
  onToggle: () => Promise<void>; // Updated to expect a Promise
}

const DeviceSwitch: React.FC<DeviceSwitchProps> = ({ icon, name, isOn, onToggle }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      await onToggle();
    } catch (err: any) {
      console.error("Device control failed:", err);
      const msg = err.message || '';
      if (msg.includes('401') || msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('login')) {
          setError("Requiere Re-Login (Config)");
      } else {
          setError("Error de conexión");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 2,
        borderRadius: 'var(--squircle-radius)',
        position: 'relative',
        transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
        bgcolor: isOn ? 'rgba(34, 197, 94, 0.15)' : 'var(--glass-bg)',
        backdropFilter: 'var(--backdrop-blur)',
        border: error ? '1px solid #ef4444' : (isOn ? '1px solid rgba(34, 197, 94, 0.4)' : 'var(--glass-border)'),
        boxShadow: isOn ? '0 8px 32px 0 rgba(34, 197, 94, 0.2)' : 'var(--glass-shadow)',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: isOn ? '0 12px 40px rgba(34, 197, 94, 0.3)' : 'var(--glass-shadow)'
        }
      }}
    >
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: '50%',
          bgcolor: isOn ? '#22c55e' : 'rgba(255,255,255,0.1)',
          color: isOn ? 'white' : 'rgba(255,255,255,0.5)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {isLoading ? (
            <CircularProgress size={28} color="inherit" />
        ) : (
            React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 28 }) : icon
        )}
      </Box>

      <Typography
        variant="body1"
        sx={{
          fontWeight: 600,
          mb: 0.5,
          color: isOn ? 'white' : 'text.secondary',
          textAlign: 'center'
        }}
      >
        {name}
      </Typography>

      <Typography
        variant="caption"
        sx={{
          mb: 1.5,
          color: isOn ? '#4ade80' : 'text.disabled',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          fontSize: '0.7rem'
        }}
      >
        {isLoading ? 'ENVIANDO...' : (isOn ? 'ENCENDIDO' : 'APAGADO')}
      </Typography>

      <MuiSwitch
        checked={isOn}
        onChange={handleToggle}
        disabled={isLoading}
        color="success"
        sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#22c55e',
                '&:hover': { backgroundColor: 'rgba(34, 197, 94, 0.08)' },
            },
            '& .MuiSwitch-track': {
                backgroundColor: isOn ? '#22c55e' : undefined,
            },
        }}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default DeviceSwitch;
