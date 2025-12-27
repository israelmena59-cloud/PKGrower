/**
 * MerossSettingsTab - Meross account connection
 */

import React, { useState } from 'react';
import { Box, TextField, Button, Alert } from '@mui/material';
import { API_BASE_URL } from '../../api/client';

interface MerossSettingsTabProps {
  onSuccess?: () => void;
}

const MerossSettingsTab: React.FC<MerossSettingsTabProps> = ({ onSuccess }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      alert('Ingresa email y contraseña de Meross');
      return;
    }
    setLoading(true);
    setStatus('Conectando...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/meross/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: credentials.email, password: credentials.password })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('✅ ' + data.message);
        alert('Meross conectado correctamente');
        onSuccess?.();
      } else {
        setStatus('❌ ' + data.error);
        alert('Error: ' + data.error);
      }
    } catch (e: any) {
      setStatus('❌ Error de conexión');
      alert('Error de conexión: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
      <Alert severity="info">
        Ingresa tus credenciales de la cuenta Meross para conectar tus dispositivos inteligentes.
      </Alert>

      <TextField
        label="Email Meross"
        fullWidth
        placeholder="tu@email.com"
        value={credentials.email}
        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
        helperText="Email de tu cuenta Meross"
        disabled={loading}
      />

      <TextField
        label="Contraseña Meross"
        type="password"
        fullWidth
        value={credentials.password}
        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        helperText="Tu contraseña de Meross"
        disabled={loading}
      />

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? 'Conectando...' : 'Conectar Meross'}
      </Button>

      {status && (
        <Alert
          severity={status.includes('✅') ? 'success' : status.includes('❌') ? 'error' : 'info'}
          sx={{ mt: 2 }}
        >
          {status}
        </Alert>
      )}

      <Alert severity="warning" sx={{ mt: 2 }}>
        Las credenciales se almacenan de forma segura en el servidor. Solo se usan para autenticación con Meross Cloud.
      </Alert>
    </Box>
  );
};

export default MerossSettingsTab;
