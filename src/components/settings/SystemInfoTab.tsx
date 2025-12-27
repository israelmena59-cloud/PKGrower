/**
 * SystemInfoTab - System information and actions
 */

import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, Avatar, Divider } from '@mui/material';
import { LogOut, User } from 'lucide-react';

interface SystemInfoTabProps {
  user: { email?: string; displayName?: string | null } | null;
  onLogout: () => void;
  onResetSettings: () => void;
}

const SystemInfoTab: React.FC<SystemInfoTabProps> = ({ user, onLogout, onResetSettings }) => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Account Section */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        👤 Cuenta
      </Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <User size={24} />
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {user?.displayName || user?.email || 'Usuario'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {user?.email || 'No email'}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogOut size={18} />}
            onClick={onLogout}
          >
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* System Info Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Información del Sistema
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">Versión:</Typography>
                  <Typography variant="body2" fontWeight="bold">v1.0.0</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">Backend:</Typography>
                  <Typography variant="body2" fontWeight="bold">Ejecutándose</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">Última actualización:</Typography>
                  <Typography variant="body2" fontWeight="bold">{new Date().toLocaleDateString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">Dispositivos conectados:</Typography>
                  <Typography variant="body2" fontWeight="bold">8</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Acciones de Sistema
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button variant="outlined" fullWidth>📊 Ver Logs</Button>
                <Button variant="outlined" fullWidth>🔧 Diagnóstico</Button>
                <Button
                  variant="outlined"
                  fullWidth
                  color="error"
                  onClick={onResetSettings}
                >
                  ⚠️ Restaurar valores por defecto
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Documentación
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Button variant="outlined" fullWidth href="/docs/api" target="_blank">
            📚 Documentación de API
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button variant="outlined" fullWidth href="/docs/devices" target="_blank">
            🔌 Guía de Dispositivos
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemInfoTab;
