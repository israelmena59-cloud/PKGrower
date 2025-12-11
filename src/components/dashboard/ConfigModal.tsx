import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Tabs, Tab, Box, Typography,
  Alert, AlertTitle, CircularProgress, Link
} from '@mui/material';
import { Settings, Cloud, Router, Key, Info } from 'lucide-react';
import { apiClient } from '../../api/client';

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [tuyaConfig, setTuyaConfig] = useState({ accessKey: '', secretKey: '' });
  const [xiaomiConfig, setXiaomiConfig] = useState({
    username: '', password: '',
    humidifierToken: '', humidifierIp: '',
    cameraToken: '', cameraIp: ''
  });
  const [merossConfig, setMerossConfig] = useState({ email: '', password: '' });

  // 2FA State
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [authContext, setAuthContext] = useState<any>(null);

  useEffect(() => {
    if (open) {
      // Init logic if needed
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (showOTP) {
        // Enviar Código OTP
        await apiClient.verify2FA(otpCode, authContext);
        setSuccessMsg('¡Verificación exitosa! Conectado a Xiaomi Cloud.');
        setTimeout(() => {
            setShowOTP(false);
            setOtpCode('');
            onClose();
        }, 1500);
      } else {
        // Guardar configuración normal
        const payload: any = {};
        if (tuyaConfig.accessKey || tuyaConfig.secretKey) {
            payload.tuya = { ...tuyaConfig };
        }
        if (xiaomiConfig.username) {
            payload.xiaomi = { ...xiaomiConfig };
        }
        // Also send manual tokens if present
        if (xiaomiConfig.humidifierToken || xiaomiConfig.humidifierIp || xiaomiConfig.cameraToken || xiaomiConfig.cameraIp) {
             if (!payload.xiaomi) payload.xiaomi = {};
             Object.assign(payload.xiaomi, xiaomiConfig);
        }
        if (merossConfig.email) {
            payload.meross = { ...merossConfig };
        }

        const res: any = await apiClient.saveSettings(payload);

        if (res.require2FA) {
             setAuthContext(res.context);
             setShowOTP(true);
             setSuccessMsg('Credenciales aceptadas. Xiaomi requiere verificación.');
        } else {
             setSuccessMsg('Configuración guardada.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error guardando configuración');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (showOTP) {
        return (
            <>
                <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>El sistema ha solicitado el código por ti.</strong>
                    <br/>
                    1. Revisa tu correo o SMS asociado a la cuenta Xiaomi.
                    <br/>
                    2. Copia el código numérico.
                    <br/>
                    3. Pégalo aquí abajo y pulsa "Verificar".
                    <br/>
                    <small>(No abras ninguna página web externa de Xiaomi, o el código se invalidará).</small>
                </Alert>
                <TextField
                    autoFocus
                    label="Código de Verificación"
                    fullWidth
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Ej: 123456"
                />
            </>
        );
    }

    return (
        <>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} centered variant="fullWidth">
              <Tab icon={<Cloud size={20} />} label="Xiaomi Cloud / 2FA" />
              <Tab icon={<Key size={20} />} label="Xiaomi Tokens (Manual)" />
              <Tab icon={<Router size={20} />} label="Tuya Smart" />
              <Tab icon={<Cloud size={20} />} label="Meross" />
            </Tabs>

            {/* XIAOMI CLOUD TAB */}
            <TabPanel value={tabValue} index={0}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <AlertTitle>Importante sobre Autenticación (2FA)</AlertTitle>
                Si tienes activada la "Verificación en dos pasos", el sistema detectará el requerimiento e intentará enviarte un código.
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Xiaomi Cloud Email/ID"
                  fullWidth
                  value={xiaomiConfig.username}
                  onChange={(e) => setXiaomiConfig({ ...xiaomiConfig, username: e.target.value })}
                  placeholder="ejemplo@gmail.com"
                />
                <TextField
                  label="Xiaomi Cloud Password"
                  type="password"
                  fullWidth
                  value={xiaomiConfig.password}
                  onChange={(e) => setXiaomiConfig({ ...xiaomiConfig, password: e.target.value })}
                />
              </Box>
            </TabPanel>

            {/* XIAOMI TOKENS TAB */}
            <TabPanel value={tabValue} index={1}>
              <Alert severity="warning" icon={<Info />} sx={{ mb: 2 }}>
                Usa esta opción si la conexión por Nube falla o prefieres conexión local directa.
                Necesitas extraer los tokens.
              </Alert>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Humidificador (Deerma)</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    label="IP Address"
                    size="small"
                    sx={{ width: '140px' }}
                    value={xiaomiConfig.humidifierIp}
                    onChange={(e) => setXiaomiConfig({...xiaomiConfig, humidifierIp: e.target.value})}
                />
                <TextField
                    label="Token (32 chars)"
                    fullWidth size="small"
                    value={xiaomiConfig.humidifierToken}
                    onChange={(e) => setXiaomiConfig({...xiaomiConfig, humidifierToken: e.target.value})}
                />
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Cámara (Mijia)</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    label="IP Address"
                    size="small"
                    sx={{ width: '140px' }}
                    value={xiaomiConfig.cameraIp}
                    onChange={(e) => setXiaomiConfig({...xiaomiConfig, cameraIp: e.target.value})}
                />
                <TextField
                    label="Token"
                    fullWidth size="small"
                    value={xiaomiConfig.cameraToken}
                    onChange={(e) => setXiaomiConfig({...xiaomiConfig, cameraToken: e.target.value})}
                />
              </Box>
            </TabPanel>

            {/* TUYA TAB */}
            <TabPanel value={tabValue} index={2}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Credenciales de Tuya IoT Platform.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Access Key (Client ID)"
                      fullWidth
                      value={tuyaConfig.accessKey}
                      onChange={(e) => setTuyaConfig({ ...tuyaConfig, accessKey: e.target.value })}
                    />
                    <TextField
                      label="Secret Key"
                      type="password"
                      fullWidth
                      value={tuyaConfig.secretKey}
                      onChange={(e) => setTuyaConfig({ ...tuyaConfig, secretKey: e.target.value })}
                    />
                </Box>
            </TabPanel>

            {/* MEROSS TAB */}
            <TabPanel value={tabValue} index={3}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Credenciales de Meross Cloud (Email/Password).
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Email"
                      fullWidth
                      value={merossConfig.email}
                      onChange={(e) => setMerossConfig({ ...merossConfig, email: e.target.value })}
                    />
                    <TextField
                      label="Password"
                      type="password"
                      fullWidth
                      value={merossConfig.password}
                      onChange={(e) => setMerossConfig({ ...merossConfig, password: e.target.value })}
                    />
                </Box>
            </TabPanel>
        </>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings size={24} />
        {showOTP ? 'Verificación de Dos Pasos' : 'Configuración de Conexiones'}
      </DialogTitle>

      <DialogContent dividers>
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

        {renderContent()}

      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!showOTP && <Button onClick={onClose} color="inherit">Cancelar</Button>}
        {showOTP && <Button onClick={() => setShowOTP(false)} color="inherit">Volver</Button>}

        <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : (showOTP ? <Key size={18}/> : <Settings size={18} />)}
        >
          {loading ? 'Procesando...' : (showOTP ? 'Verificar Código' : 'Guardar y Reconectar')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default ConfigModal;
