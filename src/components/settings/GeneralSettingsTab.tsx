/**
 * GeneralSettingsTab - App general settings component
 */

import React from 'react';
import { Box, TextField, Switch, FormControlLabel, Divider } from '@mui/material';

interface AppSettings {
  appName: string;
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  enableNotifications: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
}

interface GeneralSettingsTabProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
}

const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ settings, onChange }) => {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
      <TextField
        label="Nombre de la aplicación"
        fullWidth
        value={settings.appName}
        onChange={e => onChange({ ...settings, appName: e.target.value })}
      />

      <TextField
        label="Tema"
        select
        fullWidth
        value={settings.theme}
        onChange={e => onChange({ ...settings, theme: e.target.value as 'light' | 'dark' })}
        SelectProps={{ native: true }}
      >
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </TextField>

      <FormControlLabel
        control={
          <Switch
            checked={settings.autoRefresh}
            onChange={e => onChange({ ...settings, autoRefresh: e.target.checked })}
          />
        }
        label="Actualización automática"
      />

      {settings.autoRefresh && (
        <TextField
          label="Intervalo de actualización (segundos)"
          type="number"
          fullWidth
          value={settings.refreshInterval}
          onChange={e =>
            onChange({
              ...settings,
              refreshInterval: parseInt(e.target.value) || 10,
            })
          }
          inputProps={{ min: 5, max: 300 }}
        />
      )}

      <Divider />

      <FormControlLabel
        control={
          <Switch
            checked={settings.enableNotifications}
            onChange={e => onChange({ ...settings, enableNotifications: e.target.checked })}
          />
        }
        label="Habilitar notificaciones"
      />

      <FormControlLabel
        control={
          <Switch
            checked={settings.enableLogging}
            onChange={e => onChange({ ...settings, enableLogging: e.target.checked })}
          />
        }
        label="Habilitar registro de eventos"
      />

      {settings.enableLogging && (
        <TextField
          label="Nivel de registro"
          select
          fullWidth
          value={settings.logLevel}
          onChange={e =>
            onChange({
              ...settings,
              logLevel: e.target.value as 'debug' | 'info' | 'warning' | 'error',
            })
          }
          SelectProps={{ native: true }}
        >
          <option value="debug">Debug</option>
          <option value="info">Información</option>
          <option value="warning">Advertencia</option>
          <option value="error">Error</option>
        </TextField>
      )}
    </Box>
  );
};

export default GeneralSettingsTab;
