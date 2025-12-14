/**
 * Device Configuration Modal
 * Allows users to configure device name, type, capabilities, and page assignment
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import {
  Settings,
  Thermometer,
  Droplets,
  Power,
  Sun,
  Wind,
  Camera,
  Zap
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface DeviceConfigModalProps {
  open: boolean;
  onClose: () => void;
  device: {
    id: string;
    name: string;
    type: string;
    platform: string;
    capabilities?: string[];
    temperature?: number;
    humidity?: number;
    status?: boolean;
  } | null;
  onSave?: () => void;
}

const DEVICE_TYPES = [
  { value: 'sensor', label: 'Sensor', icon: <Thermometer size={18} /> },
  { value: 'switch', label: 'Interruptor', icon: <Power size={18} /> },
  { value: 'light', label: 'Luz/Panel', icon: <Sun size={18} /> },
  { value: 'humidifier', label: 'Humidificador', icon: <Droplets size={18} /> },
  { value: 'fan', label: 'Ventilador', icon: <Wind size={18} /> },
  { value: 'pump', label: 'Bomba', icon: <Droplets size={18} /> },
  { value: 'camera', label: 'Cámara', icon: <Camera size={18} /> },
];

const PAGE_ASSIGNMENTS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'environment', label: 'Atmósfera' },
  { value: 'lighting', label: 'Iluminación' },
  { value: 'irrigation', label: 'Riego' },
  { value: 'cropsteering', label: 'Crop Steering' },
];

const CAPABILITIES = [
  { value: 'temperature', label: 'Temperatura' },
  { value: 'humidity', label: 'Humedad' },
  { value: 'switch', label: 'On/Off' },
  { value: 'dimmer', label: 'Dimmer' },
  { value: 'power_monitoring', label: 'Monitoreo de Potencia' },
  { value: 'soil_moisture', label: 'Humedad Sustrato' },
];

export const DeviceConfigModal: React.FC<DeviceConfigModalProps> = ({
  open,
  onClose,
  device,
  onSave
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('switch');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>(['dashboard']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form when device changes
  useEffect(() => {
    if (device) {
      setName(device.name || '');
      setType(device.type || 'switch');
      setCapabilities(device.capabilities || []);
      setPages(['dashboard']);
      setError(null);
      setSuccess(false);
    }
  }, [device]);

  const handleCapabilityToggle = (capability: string) => {
    setCapabilities(prev =>
      prev.includes(capability)
        ? prev.filter(c => c !== capability)
        : [...prev, capability]
    );
  };

  const handlePageToggle = (page: string) => {
    setPages(prev =>
      prev.includes(page)
        ? prev.filter(p => p !== page)
        : [...prev, page]
    );
  };

  const handleSave = async () => {
    if (!device) return;

    try {
      setSaving(true);
      setError(null);

      await apiClient.request('/api/devices/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: device.id,
          name,
          type,
          capabilities,
          platform: device.platform,
          pages, // For frontend use
          integrate: true
        })
      });

      setSuccess(true);
      setTimeout(() => {
        onSave?.();
        onClose();
      }, 1000);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!device) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings size={24} />
        Configurar Dispositivo
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>¡Dispositivo configurado!</Alert>}

        {/* Device Info */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">ID del Dispositivo</Typography>
          <Typography variant="body2" fontFamily="monospace">{device.id}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Plataforma</Typography>
          <Chip label={device.platform.toUpperCase()} size="small" color="primary" />
        </Box>

        {/* Name */}
        <TextField
          fullWidth
          label="Nombre del Dispositivo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 3 }}
        />

        {/* Type */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Tipo de Dispositivo</InputLabel>
          <Select
            value={type}
            label="Tipo de Dispositivo"
            onChange={(e) => setType(e.target.value)}
          >
            {DEVICE_TYPES.map((dt) => (
              <MenuItem key={dt.value} value={dt.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {dt.icon}
                  {dt.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Capabilities */}
        <Typography variant="subtitle2" gutterBottom>Capacidades</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {CAPABILITIES.map((cap) => (
            <Chip
              key={cap.value}
              label={cap.label}
              onClick={() => handleCapabilityToggle(cap.value)}
              color={capabilities.includes(cap.value) ? 'primary' : 'default'}
              variant={capabilities.includes(cap.value) ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Page Assignments */}
        <Typography variant="subtitle2" gutterBottom>Mostrar en Páginas</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {PAGE_ASSIGNMENTS.map((page) => (
            <Chip
              key={page.value}
              label={page.label}
              onClick={() => handlePageToggle(page.value)}
              color={pages.includes(page.value) ? 'success' : 'default'}
              variant={pages.includes(page.value) ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>

        {/* Current Values (if sensor) */}
        {(device.temperature !== undefined || device.humidity !== undefined) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Valores Actuales</Typography>
            <Grid container spacing={2}>
              {device.temperature !== undefined && (
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(255, 59, 48, 0.1)', borderRadius: 2, textAlign: 'center' }}>
                    <Thermometer size={20} />
                    <Typography variant="h5">{device.temperature}°C</Typography>
                  </Box>
                </Grid>
              )}
              {device.humidity !== undefined && (
                <Grid item xs={6}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(0, 122, 255, 0.1)', borderRadius: 2, textAlign: 'center' }}>
                    <Droplets size={20} />
                    <Typography variant="h5">{device.humidity}%</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !name.trim()}
          startIcon={saving ? <CircularProgress size={16} /> : <Zap size={16} />}
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeviceConfigModal;
