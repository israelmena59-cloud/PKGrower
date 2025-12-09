import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Info,
  Eye,
  EyeOff,
  Wifi,
  Database,
} from 'lucide-react';
import { apiClient } from '../api/client';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

interface AppSettings {
  appName: string;
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  enableNotifications: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
}

interface TuyaCredentials {
  accessKey: string;
  secretKey: string;
  apiHost: string;
  region: string;
}

interface XiaomiCredentials {
  humidifierToken: string;
  humidifierId: string;
  humidifierIp: string;
  cameraToken: string;
  cameraId: string;
  cameraIp: string;
}

const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: 'PKGrower',
    theme: 'light',
    autoRefresh: true,
    refreshInterval: 10,
    enableNotifications: true,
    enableLogging: true,
    logLevel: 'info',
  });

  const [tuyaSettings, setTuyaSettings] = useState<TuyaCredentials>({
    accessKey: '',
    secretKey: '',
    apiHost: 'https://openapi.tuyaus.com',
    region: 'US',
  });

  const [xiaomiSettings, setXiaomiSettings] = useState<XiaomiCredentials>({
    humidifierToken: '',
    humidifierId: '',
    humidifierIp: '',
    cameraToken: '',
    cameraId: '',
    cameraIp: '',
  });

  const [showSecrets, setShowSecrets] = useState({
    tuyaSecret: false,
    humidifierToken: false,
    cameraToken: false,
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'reset' | 'backup'>('reset');

  // Cargar configuración
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSettings();
      if (response) {
        setAppSettings(response.app || appSettings);
        setTuyaSettings(response.tuya || tuyaSettings);
        setXiaomiSettings(response.xiaomi || xiaomiSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await apiClient.saveSettings({
        app: appSettings,
        tuya: tuyaSettings,
        xiaomi: xiaomiSettings,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = async () => {
    setOpenDialog(false);
    try {
      await apiClient.resetSettings();
      loadSettings();
      alert('Configuración restaurada a valores predeterminados');
    } catch (error) {
      console.error('Error resetting settings:', error);
      alert('Error al restaurar configuración');
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon size={32} />
          <Typography variant="h4">Configuración</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RotateCcw size={20} />}
            onClick={() => {
              setDialogAction('reset');
              setOpenDialog(true);
            }}
            color="error"
          >
            Restaurar
          </Button>
          <Button
            variant="contained"
            startIcon={<Save size={20} />}
            onClick={handleSaveSettings}
          >
            Guardar
          </Button>
        </Box>
      </Box>

      {/* Mensaje de guardado */}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Configuración guardada exitosamente
        </Alert>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="General" icon={<SettingsIcon size={20} />} iconPosition="start" />
          <Tab label="Tuya Cloud" icon={<Wifi size={20} />} iconPosition="start" />
          <Tab label="Xiaomi" icon={<Database size={20} />} iconPosition="start" />
          <Tab label="Sistema" icon={<Info size={20} />} iconPosition="start" />
        </Tabs>

        {/* Tab: General */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
            <TextField
              label="Nombre de la aplicación"
              fullWidth
              value={appSettings.appName}
              onChange={e => setAppSettings({ ...appSettings, appName: e.target.value })}
            />

            <TextField
              label="Tema"
              select
              fullWidth
              value={appSettings.theme}
              onChange={e => setAppSettings({ ...appSettings, theme: e.target.value as 'light' | 'dark' })}
              SelectProps={{ native: true }}
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={appSettings.autoRefresh}
                  onChange={e => setAppSettings({ ...appSettings, autoRefresh: e.target.checked })}
                />
              }
              label="Actualización automática"
            />

            {appSettings.autoRefresh && (
              <TextField
                label="Intervalo de actualización (segundos)"
                type="number"
                fullWidth
                value={appSettings.refreshInterval}
                onChange={e =>
                  setAppSettings({
                    ...appSettings,
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
                  checked={appSettings.enableNotifications}
                  onChange={e => setAppSettings({ ...appSettings, enableNotifications: e.target.checked })}
                />
              }
              label="Habilitar notificaciones"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={appSettings.enableLogging}
                  onChange={e => setAppSettings({ ...appSettings, enableLogging: e.target.checked })}
                />
              }
              label="Habilitar registro de eventos"
            />

            {appSettings.enableLogging && (
              <TextField
                label="Nivel de registro"
                select
                fullWidth
                value={appSettings.logLevel}
                onChange={e =>
                  setAppSettings({
                    ...appSettings,
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
        </TabPanel>

        {/* Tab: Tuya Cloud */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
            <Alert severity="info">
              Obtén tus credenciales de Tuya en: https://iot.tuya.com/
            </Alert>

            <TextField
              label="Access Key"
              fullWidth
              value={tuyaSettings.accessKey}
              onChange={e => setTuyaSettings({ ...tuyaSettings, accessKey: e.target.value })}
              type="password"
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    onClick={() =>
                      setShowSecrets({
                        ...showSecrets,
                        tuyaSecret: !showSecrets.tuyaSecret,
                      })
                    }
                  >
                    {showSecrets.tuyaSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                ),
              }}
            />

            <TextField
              label="Secret Key"
              fullWidth
              value={tuyaSettings.secretKey}
              onChange={e => setTuyaSettings({ ...tuyaSettings, secretKey: e.target.value })}
              type={showSecrets.tuyaSecret ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    onClick={() =>
                      setShowSecrets({
                        ...showSecrets,
                        tuyaSecret: !showSecrets.tuyaSecret,
                      })
                    }
                  >
                    {showSecrets.tuyaSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                ),
              }}
            />

            <TextField
              label="API Host"
              fullWidth
              value={tuyaSettings.apiHost}
              onChange={e => setTuyaSettings({ ...tuyaSettings, apiHost: e.target.value })}
            />

            <TextField
              label="Región"
              select
              fullWidth
              value={tuyaSettings.region}
              onChange={e => setTuyaSettings({ ...tuyaSettings, region: e.target.value })}
              SelectProps={{ native: true }}
            >
              <option value="US">Estados Unidos</option>
              <option value="EU">Europa</option>
              <option value="CN">China</option>
              <option value="IN">India</option>
            </TextField>

            <Alert severity="warning">
              Tus credenciales se almacenan de forma segura en el servidor. Nunca las compartas con terceros.
            </Alert>
          </Box>
        </TabPanel>

        {/* Tab: Xiaomi */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Alert severity="info">
              Para obtener tokens: https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor
            </Alert>

            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                🌱 Humidificador
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
                <TextField
                  label="ID del dispositivo"
                  fullWidth
                  value={xiaomiSettings.humidifierId}
                  onChange={e =>
                    setXiaomiSettings({
                      ...xiaomiSettings,
                      humidifierId: e.target.value,
                    })
                  }
                />
                <TextField
                  label="Token"
                  fullWidth
                  value={xiaomiSettings.humidifierToken}
                  onChange={e =>
                    setXiaomiSettings({
                      ...xiaomiSettings,
                      humidifierToken: e.target.value,
                    })
                  }
                  type={showSecrets.humidifierToken ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <Button
                        size="small"
                        onClick={() =>
                          setShowSecrets({
                            ...showSecrets,
                            humidifierToken: !showSecrets.humidifierToken,
                          })
                        }
                      >
                        {showSecrets.humidifierToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    ),
                  }}
                />
                <TextField
                  label="Dirección IP"
                  fullWidth
                  placeholder="192.168.1.x"
                  value={xiaomiSettings.humidifierIp}
                  onChange={e =>
                    setXiaomiSettings({
                      ...xiaomiSettings,
                      humidifierIp: e.target.value,
                    })
                  }
                />
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📷 Cámara
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
                <TextField
                  label="ID del dispositivo"
                  fullWidth
                  value={xiaomiSettings.cameraId}
                  onChange={e =>
                    setXiaomiSettings({
                      ...xiaomiSettings,
                      cameraId: e.target.value,
                    })
                  }
                />
                <TextField
                  label="Token"
                  fullWidth
                  value={xiaomiSettings.cameraToken}
                  onChange={e =>
                    setXiaomiSettings({
                      ...xiaomiSettings,
                      cameraToken: e.target.value,
                    })
                  }
                  type={showSecrets.cameraToken ? 'text' : 'password'}
                  InputProps={{
                    endAdornment: (
                      <Button
                        size="small"
                        onClick={() =>
                          setShowSecrets({
                            ...showSecrets,
                            cameraToken: !showSecrets.cameraToken,
                          })
                        }
                      >
                        {showSecrets.cameraToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    ),
                  }}
                />
                <TextField
                  label="Dirección IP"
                  fullWidth
                  placeholder="192.168.1.x"
                  value={xiaomiSettings.cameraIp}
                  onChange={e =>
                    setXiaomiSettings({
                      ...xiaomiSettings,
                      cameraIp: e.target.value,
                    })
                  }
                />
              </Box>
            </Box>

            <Alert severity="warning">
              Tus credenciales se almacenan de forma segura. Recomendamos actualizar tokens cada 6 meses.
            </Alert>
          </Box>
        </TabPanel>

        {/* Tab: Sistema */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Información del Sistema
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Versión:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          v1.0.0
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Backend:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Ejecutándose
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Última actualización:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {new Date().toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Dispositivos conectados:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          8
                        </Typography>
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
                      <Button variant="outlined" fullWidth>
                        📊 Ver Logs
                      </Button>
                      <Button variant="outlined" fullWidth>
                        🔧 Diagnóstico
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        color="error"
                        onClick={() => {
                          setDialogAction('reset');
                          setOpenDialog(true);
                        }}
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
        </TabPanel>
      </Paper>

      {/* Dialog de confirmación */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {dialogAction === 'reset'
            ? 'Restaurar configuración'
            : 'Crear copia de seguridad'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {dialogAction === 'reset'
              ? '¿Estás seguro de que quieres restaurar la configuración a valores predeterminados? Esta acción no se puede deshacer.'
              : '¿Deseas crear una copia de seguridad de tu configuración actual?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            onClick={handleResetSettings}
            variant="contained"
            color={dialogAction === 'reset' ? 'error' : 'primary'}
          >
            {dialogAction === 'reset' ? 'Restaurar' : 'Hacer copia'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;
