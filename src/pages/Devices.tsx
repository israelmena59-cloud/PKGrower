import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Slider,
} from '@mui/material';
import {
  Power,
  RefreshCw,
  Settings as SettingsIcon,
  Zap,
  Droplets,
  Thermometer,
  Video,
} from 'lucide-react';
import { apiClient } from '../api/client';
import DeviceConfigModal from '../components/devices/DeviceConfigModal';

interface Device {
  id: string;
  name: string;
  type: 'light' | 'sensor' | 'switch' | 'camera' | 'humidifier' | 'pump' | 'other';
  status: boolean;
  platform: 'tuya' | 'xiaomi' | 'meross';
  value?: number | string;
  unit?: string;
  description?: string;
  lastUpdate?: string;
  properties?: Record<string, any>;
}

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [openControlDialog, setOpenControlDialog] = useState(false);
  const [openConfigModal, setOpenConfigModal] = useState(false);
  const [configDevice, setConfigDevice] = useState<any>(null);
  const [controlValue, setControlValue] = useState<number>(50);

  // Obtener dispositivos
  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllDevices();
      setDevices(response);
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Datos simulados si la API falla
      setDevices([
        {
          id: 'tuya-sensor-1',
          name: 'Sensor Sustrato 1',
          type: 'sensor',
          status: true,
          platform: 'tuya',
          value: 65,
          unit: '%',
          description: 'Sensor de humedad del sustrato',
          lastUpdate: new Date().toLocaleTimeString(),
        },
        {
          id: 'tuya-sensor-2',
          name: 'Sensor Sustrato 2',
          type: 'sensor',
          status: true,
          platform: 'tuya',
          value: 72,
          unit: '%',
          description: 'Sensor de humedad del sustrato',
          lastUpdate: new Date().toLocaleTimeString(),
        },
        {
          id: 'tuya-sensor-3',
          name: 'Sensor Sustrato 3',
          type: 'sensor',
          status: true,
          platform: 'tuya',
          value: 58,
          unit: '%',
          description: 'Sensor de humedad del sustrato',
          lastUpdate: new Date().toLocaleTimeString(),
        },
        {
          id: 'tuya-light-1',
          name: 'Panel LED 1',
          type: 'light',
          status: true,
          platform: 'tuya',
          value: 100,
          unit: '%',
          description: 'Panel LED de cultivo',
          lastUpdate: new Date().toLocaleTimeString(),
        },
        {
          id: 'tuya-light-2',
          name: 'Panel LED 2',
          type: 'light',
          status: false,
          platform: 'tuya',
          value: 0,
          unit: '%',
          description: 'Panel LED de cultivo',
          lastUpdate: new Date().toLocaleTimeString(),
        },
        {
          id: 'xiaomi-humidifier',
          name: 'Humidificador Xiaomi',
          type: 'humidifier',
          status: true,
          platform: 'xiaomi',
          value: 55,
          unit: '%',
          description: 'Humidificador inteligente',
          lastUpdate: new Date().toLocaleTimeString(),
        },
        {
          id: 'xiaomi-camera',
          name: 'Cámara Xiaomi',
          type: 'camera',
          status: true,
          platform: 'xiaomi',
          description: 'Cámara de vigilancia 1080p',
          lastUpdate: new Date().toLocaleTimeString(),
        },
        {
          id: 'tuya-pump',
          name: 'Bomba de Agua',
          type: 'pump',
          status: false,
          platform: 'tuya',
          description: 'Sistema de riego automático',
          lastUpdate: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDevice = async (device: Device) => {
    try {
      const action = !device.status ? 'on' : 'off';
      await apiClient.controlDevice(device.id, action);
      setDevices(
        devices.map(d =>
          d.id === device.id ? { ...d, status: !d.status } : d
        )
      );
    } catch (error) {
      console.error('Error toggling device:', error);
      alert('Error al controlar dispositivo');
    }
  };

  const handleOpenControlDialog = (device: Device) => {
    setSelectedDevice(device);
    setControlValue(typeof device.value === 'number' ? device.value : 50);
    setOpenControlDialog(true);
  };

  const handleApplyControl = async () => {
    if (!selectedDevice) return;

    try {
      const action = controlValue > 50 ? 'on' : 'off';
      await apiClient.controlDevice(selectedDevice.id, action);
      setDevices(
        devices.map(d =>
          d.id === selectedDevice.id
            ? { ...d, value: controlValue, lastUpdate: new Date().toLocaleTimeString() }
            : d
        )
      );
      setOpenControlDialog(false);
    } catch (error) {
      console.error('Error controlling device:', error);
      alert('Error al aplicar control');
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'light':
        return <Zap size={24} />;
      case 'sensor':
        return <Thermometer size={24} />;
      case 'camera':
        return <Video size={24} />;
      case 'humidifier':
        return <Droplets size={24} />;
      case 'pump':
        return <Zap size={24} />;
      default:
        return <Power size={24} />;
    }
  };

  const getDeviceColor = (type: string) => {
    switch (type) {
      case 'light':
        return '#FDB913';
      case 'sensor':
        return '#2196F3';
      case 'camera':
        return '#FF5722';
      case 'humidifier':
        return '#00BCD4';
      case 'pump':
        return '#4CAF50';
      default:
        return '#9C27B0';
    }
  };

  // Agrupar dispositivos por plataforma
  const tuyaDevices = devices.filter(d => d.platform === 'tuya');
  const xiaomiDevices = devices.filter(d => d.platform === 'xiaomi');
  const merossDevices = devices.filter(d => d.platform === 'meross');

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Control de Dispositivos</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} sm={6} md={3} key={i}>
              <Box className="loading-shimmer glass-panel" sx={{ p: 2, height: 80, borderRadius: '16px' }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Box className="loading-shimmer glass-panel" sx={{ height: 180, borderRadius: '16px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Power size={32} />
          <Typography variant="h4">Control de Dispositivos</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={20} />}
          onClick={fetchDevices}
        >
          Actualizar
        </Button>
      </Box>

      {/* Resumen de dispositivos - Improved Glass Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Box className="glass-panel" sx={{ p: 2, textAlign: 'center', borderRadius: '16px' }}>
            <Typography variant="h4" fontWeight="bold" color="primary">
              {devices.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Dispositivos
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Box className="glass-panel" sx={{
            p: 2,
            textAlign: 'center',
            borderRadius: '16px',
            borderLeft: '3px solid #22c55e'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Box className="status-online" sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#22c55e'
              }} />
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#22c55e' }}>
                {devices.filter(d => d.status).length}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Activos
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Box className="glass-panel" sx={{
            p: 2,
            textAlign: 'center',
            borderRadius: '16px',
            borderLeft: '3px solid #ef4444'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
              <Typography variant="h4" fontWeight="bold" sx={{ color: '#ef4444' }}>
                {devices.filter(d => !d.status).length}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Inactivos
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Box className="glass-panel" sx={{ p: 2, textAlign: 'center', borderRadius: '16px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
              <Chip label={`T:${tuyaDevices.length}`} size="small" sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', color: '#2196f3' }} />
              <Chip label={`X:${xiaomiDevices.length}`} size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }} />
              <Chip label={`M:${merossDevices.length}`} size="small" sx={{ bgcolor: 'rgba(156, 39, 176, 0.2)', color: '#9c27b0' }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Por Plataforma
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Dispositivos Tuya */}
      {tuyaDevices.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Tuya Cloud" color="primary" />
          </Typography>
          <Grid container spacing={2}>
            {tuyaDevices.map(device => (
              <Grid item xs={12} sm={6} md={4} key={device.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: getDeviceColor(device.type) + '20',
                          borderRadius: 1,
                          color: getDeviceColor(device.type),
                        }}
                      >
                        {getDeviceIcon(device.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {device.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {device.type}
                        </Typography>
                      </Box>
                    </Box>
                    {device.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {device.description}
                      </Typography>
                    )}
                    {device.value !== undefined && (
                      <Typography variant="body1" sx={{ my: 1 }}>
                        <strong>Valor:</strong> {device.value} {device.unit || ''}
                      </Typography>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      Actualizado: {device.lastUpdate}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ display: 'flex', gap: 1 }}>
                    {['light', 'switch', 'pump', 'humidifier'].includes(device.type) && (
                      <Button
                        size="small"
                        variant={device.status ? 'contained' : 'outlined'}
                        onClick={() => handleToggleDevice(device)}
                        fullWidth
                      >
                        {device.status ? 'Encendido' : 'Apagado'}
                      </Button>
                    )}
                    {['light', 'pump', 'humidifier'].includes(device.type) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenControlDialog(device)}
                      >
                        <SettingsIcon size={16} />
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setConfigDevice(device);
                        setOpenConfigModal(true);
                      }}
                    >
                      Configurar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Dispositivos Xiaomi */}
      {xiaomiDevices.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Xiaomi Local" color="success" />
          </Typography>
          <Grid container spacing={2}>
            {xiaomiDevices.map(device => (
              <Grid item xs={12} sm={6} md={4} key={device.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: getDeviceColor(device.type) + '20',
                          borderRadius: 1,
                          color: getDeviceColor(device.type),
                        }}
                      >
                        {getDeviceIcon(device.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {device.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {device.type}
                        </Typography>
                      </Box>
                    </Box>
                    {device.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {device.description}
                      </Typography>
                    )}
                    {device.value !== undefined && (
                      <Typography variant="body1" sx={{ my: 1 }}>
                        <strong>Valor:</strong> {device.value} {device.unit || ''}
                      </Typography>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      Actualizado: {device.lastUpdate}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ display: 'flex', gap: 1 }}>
                    {['light', 'switch', 'pump', 'humidifier'].includes(device.type) && (
                      <Button
                        size="small"
                        variant={device.status ? 'contained' : 'outlined'}
                        onClick={() => handleToggleDevice(device)}
                        fullWidth
                      >
                        {device.status ? 'Encendido' : 'Apagado'}
                      </Button>
                    )}
                    {['light', 'pump', 'humidifier'].includes(device.type) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenControlDialog(device)}
                      >
                        <SettingsIcon size={16} />
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Dispositivos Meross */}
      {merossDevices.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="Meross Cloud" color="secondary" />
          </Typography>
          <Grid container spacing={2}>
            {merossDevices.map(device => (
              <Grid item xs={12} sm={6} md={4} key={device.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: '#9C27B0' + '20', borderRadius: 1, color: '#9C27B0' }}>
                        {getDeviceIcon(device.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{device.name}</Typography>
                        <Typography variant="caption" color="textSecondary">{device.type}</Typography>
                      </Box>
                    </Box>
                    {device.value !== undefined && (
                      <Typography variant="body1" sx={{ my: 1 }}>
                        <strong>Valor:</strong> {device.value} {device.unit || ''}
                      </Typography>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      Actualizado: {device.lastUpdate}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={device.status ? 'contained' : 'outlined'}
                      onClick={() => handleToggleDevice(device)}
                      fullWidth
                    >
                      {device.status ? 'Encendido' : 'Apagado'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {devices.length === 0 && (
        <Alert severity="info">
          No hay dispositivos configurados. Verifica tu conexión y las credenciales.
        </Alert>
      )}

      {/* Dialog de control */}
      <Dialog open={openControlDialog} onClose={() => setOpenControlDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Controlar {selectedDevice?.name}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedDevice?.type === 'humidifier' && (
            <Box>
              <Typography gutterBottom>
                Humedad objetivo: {controlValue}%
              </Typography>
              <Slider
                value={controlValue}
                onChange={(_, value) => setControlValue(value as number)}
                min={0}
                max={100}
                step={1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          )}
          {['light', 'pump'].includes(selectedDevice?.type || '') && (
            <Box>
              <Typography gutterBottom>
                Intensidad: {controlValue}%
              </Typography>
              <Slider
                value={controlValue}
                onChange={(_, value) => setControlValue(value as number)}
                min={0}
                max={100}
                step={1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenControlDialog(false)}>Cancelar</Button>
          <Button onClick={handleApplyControl} variant="contained">
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Config Modal */}
      <DeviceConfigModal
        open={openConfigModal}
        onClose={() => setOpenConfigModal(false)}
        device={configDevice}
        onSave={() => {
          fetchDevices();
          setOpenConfigModal(false);
        }}
      />
    </Box>
  );
};

export default DevicesPage;
