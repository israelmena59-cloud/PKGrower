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
  Avatar,
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
  Leaf,
  Sun,
  Moon,
  LogOut,
  User
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';


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
  const { user, logout } = useAuth();
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

  const [lightingSettings, setLightingSettings] = useState({
    onTime: '06:00',
    offTime: '00:00',
    mode: 'manual'
  });

  // Crop Steering Settings
  const [cropSteeringSettings, setCropSteeringSettings] = useState({
    stage: 'none' as 'veg' | 'flower' | 'none',
    targetVWC: 50,
    targetDryback: 15
  });

  const [showSecrets, setShowSecrets] = useState({
    tuyaSecret: false,
    humidifierToken: false,
    cameraToken: false,
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'reset' | 'backup'>('reset');

  // Xiaomi Login State
  const [xiaomiLogin, setXiaomiLogin] = useState({ username: '', password: '' });
  const [xiaomiAuthSession, setXiaomiAuthSession] = useState<string | null>(null);
  const [xiaomiAuthStatus, setXiaomiAuthStatus] = useState<string>('');
  const [twoFA, setTwoFA] = useState({ open: false, code: '' });

  const handleXiaomiLogin = async () => {
    try {
        setLoading(true);
        setXiaomiAuthStatus('Iniciando sesión con Puppeteer...');

        const res = await apiClient.loginXiaomi(xiaomiLogin);

        if (res.success && res.sessionId) {
            setXiaomiAuthSession(res.sessionId);
            setXiaomiAuthStatus('Procesando login... verificando 2FA');

            // Poll for status
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max

            const pollStatus = async () => {
                attempts++;
                const status = await apiClient.getXiaomiAuthStatus(res.sessionId);

                if (status.status === '2fa_required') {
                    setXiaomiAuthStatus('Se requiere código 2FA');
                    setTwoFA({ open: true, code: '' });
                    return;
                }

                if (status.status === 'authenticated') {
                    setXiaomiAuthStatus('✅ Autenticación exitosa!');
                    alert('✅ Conexión exitosa con Xiaomi Cloud!');
                    loadSettings();
                    return;
                }

                if (status.status === 'error') {
                    setXiaomiAuthStatus(`❌ Error: ${status.error}`);
                    alert('Error: ' + status.error);
                    return;
                }

                if (attempts < maxAttempts && status.status === 'processing') {
                    setTimeout(pollStatus, 1000);
                } else if (attempts >= maxAttempts) {
                    setXiaomiAuthStatus('Tiempo de espera agotado');
                }
            };

            setTimeout(pollStatus, 2000);
        } else {
            alert('Error: ' + JSON.stringify(res));
        }
    } catch (e: any) {
        console.error('Xiaomi login error:', e);
        setXiaomiAuthStatus(`❌ Error: ${e.message}`);
        alert('Error Login: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
      if (!xiaomiAuthSession) {
          alert('No hay sesión activa');
          return;
      }

      try {
          setLoading(true);
          setXiaomiAuthStatus('Verificando código 2FA...');

          const res = await apiClient.verifyXiaomi2FA({
              sessionId: xiaomiAuthSession,
              code: twoFA.code
          });

          if (res.success || res.status === 'authenticated') {
              setXiaomiAuthStatus('✅ Verificación 2FA Exitosa!');
              alert('✅ Verificación 2FA Exitosa! Tokens guardados.');
              setTwoFA({ ...twoFA, open: false });
              loadSettings();
          } else if (res.status === '2fa_required') {
              setXiaomiAuthStatus('Código incorrecto, intenta de nuevo');
              alert('Código incorrecto, intenta con otro código');
          } else {
              alert('Error 2FA: ' + JSON.stringify(res));
          }
      } catch (e: any) {
          setXiaomiAuthStatus(`❌ Error: ${e.message}`);
          alert('Error 2FA Verification: ' + e.message);
      } finally {
          setLoading(false);
      }
  };

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
        setLightingSettings(response.lighting || lightingSettings);
        if (response.cropSteering) {
          setCropSteeringSettings(response.cropSteering);
        }
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
        lighting: lightingSettings,
        cropSteering: cropSteeringSettings
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
          <Tab label="Cultivo" icon={<Leaf size={20} />} iconPosition="start" />
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

            {/* LOGIN AUTOMATICO */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="h6" gutterBottom>🔐 Conexión Automática (Puppeteer OAuth)</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Ingresa tu cuenta de Xiaomi. El sistema abrirá un navegador headless para autenticarse.
                    Si se requiere 2FA, recibirás el código en tu dispositivo/email.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                    <TextField
                        label="Email / Teléfono Xiaomi (+569...)"
                        size="small"
                        fullWidth
                        value={xiaomiLogin.username}
                        onChange={(e) => setXiaomiLogin({ ...xiaomiLogin, username: e.target.value })}
                        disabled={loading}
                    />
                    <TextField
                        label="Contraseña"
                        size="small"
                        type="password"
                        fullWidth
                        value={xiaomiLogin.password}
                        onChange={(e) => setXiaomiLogin({ ...xiaomiLogin, password: e.target.value })}
                        disabled={loading}
                    />
                    <Button
                        variant="contained"
                        onClick={handleXiaomiLogin}
                        disabled={loading || !xiaomiLogin.username || !xiaomiLogin.password}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                        {loading ? 'Conectando...' : 'Conectar Cuenta Xiaomi'}
                    </Button>

                    {/* Status Indicator */}
                    {xiaomiAuthStatus && (
                        <Alert
                            severity={
                                xiaomiAuthStatus.includes('✅') ? 'success' :
                                xiaomiAuthStatus.includes('❌') ? 'error' :
                                'info'
                            }
                            sx={{ mt: 1 }}
                        >
                            {xiaomiAuthStatus}
                        </Alert>
                    )}
                </Box>
            </Paper>

            <Divider />

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



        {/* Tab: Cultivo (Lighting) */}
        <TabPanel value={tabValue} index={3}>
            <Box sx={{ p: 3, maxWidth: 600 }}>
                <Typography variant="h6" gutterBottom>🌱 Etapa de Crecimiento</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                    Selecciona la etapa actual de tu cultivo para ver los rangos ideales de temperatura, humedad y VPD en los widgets.
                </Alert>
                <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                    {['veg', 'flower', 'none'].map(stage => (
                        <Button
                            key={stage}
                            variant={cropSteeringSettings.stage === stage ? 'contained' : 'outlined'}
                            onClick={() => setCropSteeringSettings({ ...cropSteeringSettings, stage: stage as any })}
                            sx={{ flex: 1, py: 1.5 }}
                            color={stage === 'veg' ? 'success' : stage === 'flower' ? 'secondary' : 'inherit'}
                        >
                            {stage === 'veg' ? '🌿 Vegetación' : stage === 'flower' ? '🌸 Floración' : '❌ Sin Etapa'}
                        </Button>
                    ))}
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>🌞 Fotoperiodo (Ciclo de Luz)</Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                    Configura el horario de encendido y apagado de las luces para visualizar el ciclo Día/Noche en las gráficas.
                </Alert>
                <Grid container spacing={3}>
                    <Grid item xs={6}>
                         <TextField
                            label="Hora Encendido (Lights On)"
                            type="time"
                            fullWidth
                            value={lightingSettings.onTime}
                            onChange={e => setLightingSettings({ ...lightingSettings, onTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ startAdornment: <Sun size={18} className="mr-2 text-yellow-500"/> }}
                         />
                    </Grid>
                    <Grid item xs={6}>
                         <TextField
                            label="Hora Apagado (Lights Off)"
                            type="time"
                            fullWidth
                            value={lightingSettings.offTime}
                            onChange={e => setLightingSettings({ ...lightingSettings, offTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ startAdornment: <Moon size={18} className="mr-2 text-blue-400"/> }}
                         />
                    </Grid>
                </Grid>
            </Box>
        </TabPanel>

        {/* Tab: Sistema */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 3 }}>
            {/* User Profile Section */}
            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'white' }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <User size={28} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold">Mi Cuenta</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {user?.email || 'No conectado'}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<LogOut size={18} />}
                    onClick={logout}
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,59,48,0.8)' } }}
                  >
                    Cerrar Sesión
                  </Button>
                </Box>
              </CardContent>
            </Card>

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
            // onClick={null} // was handleResetSettings
            onClick={dialogAction === 'reset' ? handleResetSettings : () => setOpenDialog(false)}
            variant="contained"
            color={dialogAction === 'reset' ? 'error' : 'primary'}
          >
            {dialogAction === 'reset' ? 'Restaurar' : 'Hacer copia'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2FA Dialog */}
      <Dialog open={twoFA.open} onClose={() => setTwoFA({ ...twoFA, open: false })}>
          <DialogTitle>🔐 Verificación de Dos Pasos</DialogTitle>
          <DialogContent>
              <Typography gutterBottom>
                  Xiaomi ha enviado un código de verificación (SMS o Email). Ingrésalo aquí:
              </Typography>
              <TextField
                  autoFocus
                  margin="dense"
                  label="Código de Verificación"
                  fullWidth
                  variant="outlined"
                  value={twoFA.code}
                  onChange={(e) => setTwoFA({ ...twoFA, code: e.target.value })}
              />
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setTwoFA({ ...twoFA, open: false })}>Cancelar</Button>
              <Button onClick={handleVerify2FA} variant="contained" color="primary">
                  Verificar
              </Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;
